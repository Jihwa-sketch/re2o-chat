import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "re2o.sqlite");

declare global {
  var __re2oDb: Database.Database | undefined;
}

function createConnection() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      chunk_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rep_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('rep', 'ai', 'pm')),
      content TEXT NOT NULL,
      category TEXT,
      status TEXT CHECK (status IN ('answered_ai', 'escalated', 'answered_pm')),
      confidence REAL,
      source_chunk_ids_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS escalations (
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
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
  `);
}

export function getDb(): Database.Database {
  if (!global.__re2oDb) {
    global.__re2oDb = createConnection();
  }
  return global.__re2oDb;
}
