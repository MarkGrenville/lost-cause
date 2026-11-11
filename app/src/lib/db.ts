import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// One SQLite file for the whole app. `*.sqlite` is gitignored.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "lost-cause.sqlite");

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

// Idempotent schema; runs on every module load so hot reloads pick up new tables.
function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      credits     INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,           -- random 32 bytes, base64url
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_codes (
      id          INTEGER PRIMARY KEY,
      email       TEXT NOT NULL,
      code_hash   TEXT NOT NULL,              -- HMAC of the code, never the code itself
      attempts    INTEGER NOT NULL DEFAULT 0,
      expires_at  TEXT NOT NULL,
      used_at     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS login_codes_email ON login_codes(email, created_at);

    -- DEV ONLY: stands in for an email provider. Nothing here is ever sent anywhere.
    CREATE TABLE IF NOT EXISTS dev_mailbox (
      id          INTEGER PRIMARY KEY,
      to_email    TEXT NOT NULL,
      subject     TEXT NOT NULL,
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id             TEXT PRIMARY KEY,         -- sent to PayFast as m_payment_id
      user_id        INTEGER NOT NULL REFERENCES users(id),
      pack_id        TEXT NOT NULL,
      credits        INTEGER NOT NULL,
      amount_cents   INTEGER NOT NULL,          -- ZAR cents, fixed when the order is created
      status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled','failed')),
      confirmed_via  TEXT,                      -- 'itn' (real) or 'dev_return' (DEV-only path)
      pf_payment_id  TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at        TEXT
    );
    CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, created_at);

    CREATE TABLE IF NOT EXISTS searches (
      id           TEXT PRIMARY KEY,           -- random, also the uploads/<id>/ folder name
      user_id      INTEGER NOT NULL REFERENCES users(id),
      description  TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'waiting',  -- 'waiting' until the AI step (stage 5)
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS searches_user ON searches(user_id, created_at);

    CREATE TABLE IF NOT EXISTS search_photos (
      search_id    TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
      idx          INTEGER NOT NULL,
      file_name    TEXT NOT NULL,              -- our name on disk, e.g. "1.jpg"
      mime         TEXT NOT NULL,
      bytes        INTEGER NOT NULL,
      PRIMARY KEY (search_id, idx)
    );

    -- Every vision call we make: what it cost and how it ended. Also the dev budget counter.
    CREATE TABLE IF NOT EXISTS ai_calls (
      id             INTEGER PRIMARY KEY,
      search_id      TEXT,
      photo_idx      INTEGER,
      model          TEXT NOT NULL,
      served_by      TEXT,
      input_tokens   INTEGER NOT NULL DEFAULT 0,
      output_tokens  INTEGER NOT NULL DEFAULT 0,
      cost_usd       REAL NOT NULL DEFAULT 0,
      stop_reason    TEXT,
      ms             INTEGER,
      error          TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Every ITN we receive and what our checks said about it.
    CREATE TABLE IF NOT EXISTS itn_log (
      id          INTEGER PRIMARY KEY,
      order_id    TEXT,
      source_ip   TEXT,
      checks      TEXT NOT NULL,               -- JSON: { signature, ip, amount, merchant, server }
      outcome     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// Columns added after a table first shipped (CREATE TABLE IF NOT EXISTS won't add them).
function addColumns(db: Database.Database, table: string, cols: Record<string, string>) {
  const have = new Set((db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name));
  for (const [name, type] of Object.entries(cols)) if (!have.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
}

// Reuse one connection across hot reloads in dev.
const g = globalThis as unknown as { __lcDb?: Database.Database };
export const db = g.__lcDb ?? (g.__lcDb = open());
migrate(db);
addColumns(db, "searches", {
  result_json: "TEXT", error: "TEXT", started_at: "TEXT", finished_at: "TEXT",
  verdict: "TEXT", // "found" | "nope", set once
  verdict_at: "TEXT",
  duration_ms: "INTEGER", // how long the AI step took, measured on the server
});

export type User = { id: number; email: string; credits: number; created_at: string };
