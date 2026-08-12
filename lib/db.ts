import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

declare global {
  var __re2oDbPromise: Promise<Client> | undefined;
}

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "re2o.sqlite");

async function migrate(client: Client) {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rep_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('rep', 'ai', 'pm')),
        content TEXT NOT NULL,
        category TEXT,
        status TEXT CHECK (status IN ('answered_ai', 'escalated', 'answered_pm')),
        confidence REAL,
        source_chunk_ids_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS escalations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        rep_message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        rep_name TEXT NOT NULL,
        category TEXT NOT NULL,
        question TEXT NOT NULL,
        confidence REAL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
        pm_answer TEXT,
        pm_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        answered_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status)`,
    ],
    "write"
  );

  // 부작용 사례 추가정보 컬럼 (기존 테이블에 없을 수 있어 개별적으로, 실패는 무시)
  for (const column of [
    "hospital",
    "procedure_date",
    "procedure_protocol",
    "photo_data_url",
  ]) {
    try {
      await client.execute(`ALTER TABLE escalations ADD COLUMN ${column} TEXT`);
    } catch {
      // 이미 컬럼이 존재하면 무시
    }
  }
}

async function init(): Promise<Client> {
  const url = process.env.DATABASE_URL;

  const client = url
    ? createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })
    : (() => {
        fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
        return createClient({ url: `file:${LOCAL_DB_PATH}` });
      })();

  await migrate(client);
  return client;
}

/**
 * DATABASE_URL이 설정되어 있으면 Turso(원격 libSQL)에, 없으면 로컬 SQLite 파일에 연결한다.
 * 같은 클라이언트 API로 두 환경을 동일하게 다룰 수 있다.
 */
export function getDb(): Promise<Client> {
  if (!global.__re2oDbPromise) {
    global.__re2oDbPromise = init();
  }
  return global.__re2oDbPromise;
}
