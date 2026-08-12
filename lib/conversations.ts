import { getDb } from "@/lib/db";
import { Category, ChatMessage, MessageStatus } from "@/lib/types";

/** SQLite datetime('now')는 "YYYY-MM-DD HH:MM:SS" (UTC, 타임존 표기 없음)를 반환한다. */
export function sqliteDateToMs(sqliteDate: string): number {
  return new Date(sqliteDate + "Z").getTime();
}

export function secondsBetween(startSqliteDate: string, endSqliteDate: string): number {
  return Math.max(
    0,
    Math.round((sqliteDateToMs(endSqliteDate) - sqliteDateToMs(startSqliteDate)) / 1000)
  );
}

export async function createConversation(repName: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: "INSERT INTO conversations (rep_name) VALUES (?)",
    args: [repName],
  });
  return Number(result.lastInsertRowid);
}

export async function getConversationRepName(conversationId: number): Promise<string | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT rep_name as repName FROM conversations WHERE id = ?",
    args: [conversationId],
  });
  const row = result.rows[0] as unknown as { repName: string } | undefined;
  return row?.repName ?? null;
}

interface InsertMessageParams {
  conversationId: number;
  role: "rep" | "ai" | "pm";
  content: string;
  category?: Category | null;
  status?: MessageStatus | null;
  confidence?: number | null;
  sourceChunkIds?: number[];
}

export async function insertMessage(params: InsertMessageParams): Promise<ChatMessage> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO messages (conversation_id, role, content, category, status, confidence, source_chunk_ids_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      params.conversationId,
      params.role,
      params.content,
      params.category ?? null,
      params.status ?? null,
      params.confidence ?? null,
      params.sourceChunkIds ? JSON.stringify(params.sourceChunkIds) : null,
    ],
  });
  return (await getMessageById(Number(result.lastInsertRowid)))!;
}

export async function getMessageById(id: number): Promise<ChatMessage | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, conversation_id as conversationId, role, content, category, status, confidence, created_at as createdAt
          FROM messages WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0] as unknown as ChatMessage | undefined;
  return row ?? null;
}

/** 이 대화 안에서 이 rep 메시지가 몇 번째 질문인지(1부터 시작) */
export async function getConversationQuestionSeq(
  conversationId: number,
  repMessageId: number
): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT COUNT(*) as seq FROM messages
          WHERE conversation_id = ? AND role = 'rep' AND id <= ?`,
    args: [conversationId, repMessageId],
  });
  const row = result.rows[0] as unknown as { seq: number };
  return row.seq;
}

export async function getConversationMessages(conversationId: number): Promise<ChatMessage[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, conversation_id as conversationId, role, content, category, status, confidence, created_at as createdAt
          FROM messages WHERE conversation_id = ? ORDER BY id ASC`,
    args: [conversationId],
  });
  return result.rows as unknown as ChatMessage[];
}

interface CreateEscalationParams {
  conversationId: number;
  repMessageId: number;
  repName: string;
  category: Category;
  question: string;
  confidence: number | null;
  hospital?: string | null;
  procedureDate?: string | null;
  procedureProtocol?: string | null;
  photoDataUrl?: string | null;
}

export async function createEscalation(params: CreateEscalationParams): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO escalations (conversation_id, rep_message_id, rep_name, category, question, confidence, hospital, procedure_date, procedure_protocol, photo_data_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      params.conversationId,
      params.repMessageId,
      params.repName,
      params.category,
      params.question,
      params.confidence,
      params.hospital ?? null,
      params.procedureDate ?? null,
      params.procedureProtocol ?? null,
      params.photoDataUrl ?? null,
    ],
  });
  return Number(result.lastInsertRowid);
}

export interface EscalationRow {
  id: number;
  conversationId: number;
  repMessageId: number;
  repName: string;
  category: Category;
  question: string;
  confidence: number | null;
  status: "pending" | "answered";
  pmAnswer: string | null;
  pmName: string | null;
  createdAt: string;
  answeredAt: string | null;
  hospital: string | null;
  procedureDate: string | null;
  procedureProtocol: string | null;
  photoDataUrl: string | null;
}

const ESCALATION_COLUMNS = `id, conversation_id as conversationId, rep_message_id as repMessageId, rep_name as repName,
      category, question, confidence, status, pm_answer as pmAnswer, pm_name as pmName,
      created_at as createdAt, answered_at as answeredAt,
      hospital, procedure_date as procedureDate, procedure_protocol as procedureProtocol,
      photo_data_url as photoDataUrl`;

export async function listEscalations(
  status?: "pending" | "answered"
): Promise<EscalationRow[]> {
  const db = await getDb();
  const sql = `SELECT ${ESCALATION_COLUMNS}
    FROM escalations
    ${status ? "WHERE status = ?" : ""}
    ORDER BY created_at ASC`;
  const result = await db.execute({ sql, args: status ? [status] : [] });
  return result.rows as unknown as EscalationRow[];
}

export async function getEscalationById(id: number): Promise<EscalationRow | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT ${ESCALATION_COLUMNS} FROM escalations WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0] as unknown as EscalationRow | undefined;
  return row ?? null;
}

export async function getEscalationByRepMessageId(
  repMessageId: number
): Promise<EscalationRow | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT ${ESCALATION_COLUMNS} FROM escalations WHERE rep_message_id = ?`,
    args: [repMessageId],
  });
  const row = result.rows[0] as unknown as EscalationRow | undefined;
  return row ?? null;
}

export async function answerEscalation(id: number, pmAnswer: string, pmName: string) {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE escalations SET status = 'answered', pm_answer = ?, pm_name = ?, answered_at = datetime('now')
          WHERE id = ?`,
    args: [pmAnswer, pmName, id],
  });
}
