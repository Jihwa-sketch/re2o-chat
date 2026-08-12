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

export function createConversation(repName: string): number {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO conversations (rep_name) VALUES (?)")
    .run(repName);
  return result.lastInsertRowid as number;
}

export function getConversationRepName(conversationId: number): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT rep_name as repName FROM conversations WHERE id = ?")
    .get(conversationId) as { repName: string } | undefined;
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

export function insertMessage(params: InsertMessageParams): ChatMessage {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO messages (conversation_id, role, content, category, status, confidence, source_chunk_ids_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.conversationId,
      params.role,
      params.content,
      params.category ?? null,
      params.status ?? null,
      params.confidence ?? null,
      params.sourceChunkIds ? JSON.stringify(params.sourceChunkIds) : null
    );
  return getMessageById(result.lastInsertRowid as number)!;
}

export function getMessageById(id: number): ChatMessage | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, conversation_id as conversationId, role, content, category, status, confidence, created_at as createdAt
       FROM messages WHERE id = ?`
    )
    .get(id) as ChatMessage | undefined;
  return row ?? null;
}

/** 이 대화 안에서 이 rep 메시지가 몇 번째 질문인지(1부터 시작) */
export function getConversationQuestionSeq(
  conversationId: number,
  repMessageId: number
): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as seq FROM messages
       WHERE conversation_id = ? AND role = 'rep' AND id <= ?`
    )
    .get(conversationId, repMessageId) as { seq: number };
  return row.seq;
}

export function getConversationMessages(conversationId: number): ChatMessage[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, conversation_id as conversationId, role, content, category, status, confidence, created_at as createdAt
       FROM messages WHERE conversation_id = ? ORDER BY id ASC`
    )
    .all(conversationId) as ChatMessage[];
}

interface CreateEscalationParams {
  conversationId: number;
  repMessageId: number;
  repName: string;
  category: Category;
  question: string;
  confidence: number | null;
}

export function createEscalation(params: CreateEscalationParams): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO escalations (conversation_id, rep_message_id, rep_name, category, question, confidence)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.conversationId,
      params.repMessageId,
      params.repName,
      params.category,
      params.question,
      params.confidence
    );
  return result.lastInsertRowid as number;
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
}

export function listEscalations(status?: "pending" | "answered"): EscalationRow[] {
  const db = getDb();
  const query = `SELECT id, conversation_id as conversationId, rep_message_id as repMessageId, rep_name as repName,
      category, question, confidence, status, pm_answer as pmAnswer, pm_name as pmName,
      created_at as createdAt, answered_at as answeredAt
    FROM escalations
    ${status ? "WHERE status = ?" : ""}
    ORDER BY created_at ASC`;
  return status
    ? (db.prepare(query).all(status) as EscalationRow[])
    : (db.prepare(query).all() as EscalationRow[]);
}

export function getEscalationById(id: number): EscalationRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, conversation_id as conversationId, rep_message_id as repMessageId, rep_name as repName,
        category, question, confidence, status, pm_answer as pmAnswer, pm_name as pmName,
        created_at as createdAt, answered_at as answeredAt
       FROM escalations WHERE id = ?`
    )
    .get(id) as EscalationRow | undefined;
  return row ?? null;
}

export function answerEscalation(id: number, pmAnswer: string, pmName: string) {
  const db = getDb();
  db.prepare(
    `UPDATE escalations SET status = 'answered', pm_answer = ?, pm_name = ?, answered_at = datetime('now')
     WHERE id = ?`
  ).run(pmAnswer, pmName, id);
}
