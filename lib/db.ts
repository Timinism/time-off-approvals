import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as typeof globalThis & {
  __timeoffDb?: DatabaseSync;
  __timeoffDbPath?: string;
};

function databasePath(): string {
  return process.env.TIMEOFF_DB_PATH || path.join(process.cwd(), "data", "timeoff.db");
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      job_title TEXT,
      department TEXT,
      manager_id TEXT,
      manager_name TEXT,
      manager_email TEXT,
      access_token_enc TEXT,
      refresh_token_enc TEXT,
      token_expires_at INTEGER,
      profile_refreshed_at TEXT,
      directory_error TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS report_edges (
      manager_id TEXT NOT NULL,
      report_id TEXT NOT NULL,
      report_name TEXT NOT NULL,
      report_email TEXT NOT NULL,
      report_title TEXT,
      PRIMARY KEY (manager_id, report_id)
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      approver_name TEXT NOT NULL,
      approver_email TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('pto', 'sick')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
      decision_note TEXT,
      created_at TEXT NOT NULL,
      decided_at TEXT,
      decided_by_id TEXT,
      decided_by_name TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES requests(id),
      kind TEXT NOT NULL CHECK (kind IN ('request_email', 'decision_email', 'cancel_email', 'calendar_invite')),
      from_email TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('sent', 'simulated', 'failed')),
      detail TEXT,
      graph_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(requester_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_requests_approver ON requests(approver_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_request ON notifications(request_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_edges_manager ON report_edges(manager_id);
  `);
}

export function db(): DatabaseSync {
  const location = databasePath();
  if (globalForDb.__timeoffDb && globalForDb.__timeoffDbPath === location) {
    return globalForDb.__timeoffDb;
  }
  if (globalForDb.__timeoffDb) {
    globalForDb.__timeoffDb.close();
    globalForDb.__timeoffDb = undefined;
  }
  if (location !== ":memory:") {
    fs.mkdirSync(path.dirname(location), { recursive: true });
  }
  const database = new DatabaseSync(location, {
    timeout: 5000,
    enableForeignKeyConstraints: true,
  });
  if (location !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL;");
  }
  migrate(database);
  globalForDb.__timeoffDb = database;
  globalForDb.__timeoffDbPath = location;
  return database;
}

export function resetDatabaseForTests() {
  if (globalForDb.__timeoffDb) {
    globalForDb.__timeoffDb.close();
  }
  globalForDb.__timeoffDb = undefined;
  globalForDb.__timeoffDbPath = undefined;
}

type SqlValue = string | number | bigint | null;

export function sqlAll(sql: string, params: SqlValue[] = []): Record<string, unknown>[] {
  return db().prepare(sql).all(...params);
}

export function sqlGet(sql: string, params: SqlValue[] = []): Record<string, unknown> | undefined {
  return db().prepare(sql).get(...params);
}

export function sqlRun(sql: string, params: SqlValue[] = []) {
  return db().prepare(sql).run(...params);
}

export function transaction(fn: () => void) {
  const database = db();
  database.exec("BEGIN");
  try {
    fn();
    database.exec("COMMIT");
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      /* The original error is the one that matters. */
    }
    throw error;
  }
}
