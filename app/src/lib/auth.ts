import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, type User } from "./db";

export const SESSION_COOKIE = "lc_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_15_MIN = 5;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or too short (set it in .env.local)");
  return s;
}

const hmac = (value: string) => crypto.createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

const sqlTime = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

export function normaliseEmail(raw: string) {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

// ---------- login codes ----------

export type RequestCodeResult = { ok: true } | { ok: false; error: string };

/** Make a 6-digit code, store only its HMAC, and "send" it to the DEV mailbox. */
export function requestLoginCode(email: string): RequestCodeResult {
  const recent = db
    .prepare("SELECT COUNT(*) AS n FROM login_codes WHERE email = ? AND created_at > ?")
    .get(email, sqlTime(new Date(Date.now() - 15 * 60_000))) as { n: number };
  if (recent.n >= MAX_CODES_PER_15_MIN) {
    return { ok: false, error: "Too many codes. Have a cup of tea and try again in 15 minutes." };
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expires = new Date(Date.now() + CODE_MINUTES * 60_000);

  db.transaction(() => {
    // Only the newest code is valid.
    db.prepare("UPDATE login_codes SET used_at = datetime('now') WHERE email = ? AND used_at IS NULL").run(email);
    db.prepare("INSERT INTO login_codes (email, code_hash, expires_at) VALUES (?, ?, ?)").run(
      email,
      hmac(`${email}:${code}`),
      sqlTime(expires),
    );
    deliver(email, code);
  })();

  return { ok: true };
}

/**
 * Stage 2 has no email provider. In development the "email" lands in the DEV mailbox
 * (/dev/mailbox). In production we refuse rather than silently drop the code.
 */
function deliver(email: string, code: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("No email provider configured: sign-in codes can only be delivered in development.");
  }
  db.prepare("INSERT INTO dev_mailbox (to_email, subject, body) VALUES (?, ?, ?)").run(
    email,
    `Your Lost Cause code: ${code}`,
    `Your sign-in code is ${code}. It expires in ${CODE_MINUTES} minutes.\n\nIf you didn't ask for this, someone else has lost something. Probably their way.`,
  );
}

export type VerifyResult = { ok: true; userId: number } | { ok: false; error: string };

export function verifyLoginCode(email: string, code: string): VerifyResult {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "That's not 6 digits." };

  const row = db
    .prepare(
      "SELECT id, code_hash, attempts, expires_at FROM login_codes WHERE email = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1",
    )
    .get(email) as { id: number; code_hash: string; attempts: number; expires_at: string } | undefined;

  if (!row || row.expires_at < sqlTime(new Date())) return { ok: false, error: "That code has expired. Ask for a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong guesses. Ask for a new code." };

  if (!safeEqual(row.code_hash, hmac(`${email}:${code}`))) {
    db.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    return { ok: false, error: "Wrong code. Even Mom gets it wrong sometimes." };
  }

  const userId = db.transaction(() => {
    db.prepare("UPDATE login_codes SET used_at = datetime('now') WHERE id = ?").run(row.id);
    db.prepare("INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING").run(email);
    return (db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number }).id;
  })();

  return { ok: true, userId };
}

// ---------- sessions (signed cookie: "<sessionId>.<hmac>") ----------

export async function startSession(userId: number) {
  const id = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, sqlTime(expires));
  (await cookies()).set(SESSION_COOKIE, `${id}.${hmac(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

function sessionIdFromCookie(value: string | undefined) {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const id = value.slice(0, dot);
  return safeEqual(value.slice(dot + 1), hmac(id)) ? id : null;
}

/** The signed-in user, or null. Safe to call from Server Components. */
export async function currentUser(): Promise<User | null> {
  const id = sessionIdFromCookie((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return (
    (db
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > datetime('now')`,
      )
      .get(id) as User | undefined) ?? null
  );
}

export async function endSession() {
  const store = await cookies();
  const id = sessionIdFromCookie(store.get(SESSION_COOKIE)?.value);
  if (id) db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  store.delete(SESSION_COOKIE);
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}
