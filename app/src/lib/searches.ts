import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

// Photos live outside public/, so they're only reachable through our ownership-checked route.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads"); // gitignored

export const MAX_PHOTOS = 5;
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_DESCRIPTION = 500;

export type Search = {
  id: string;
  user_id: number;
  description: string;
  status: "waiting" | "searching" | "done" | "failed";
  created_at: string;
  result_json: string | null;
  error: string | null;
  verdict: "found" | "nope" | null;
  started_at: string | null;
  duration_ms: number | null;
};
export type SearchPhoto = { search_id: string; idx: number; file_name: string; mime: string; bytes: number };

/** Trust the bytes, not the file name or the browser's Content-Type. */
export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return { mime: "image/heic", ext: "heic" };
  }
  return null;
}

export type CreateResult =
  | { ok: true; searchId: string }
  | { ok: false; status: number; error: string };

/**
 * Validate, write the photos to uploads/<id>/, then create the search and take 1 credit
 * in ONE SQLite transaction. If the credit can't be taken, the files are removed again.
 */
export async function createSearch(userId: number, description: string, files: File[]): Promise<CreateResult> {
  const desc = description.trim();
  if (desc.length < 3) return { ok: false, status: 400, error: "Tell us what you lost (a few words is fine)." };
  if (desc.length > MAX_DESCRIPTION) return { ok: false, status: 400, error: `Keep it under ${MAX_DESCRIPTION} characters.` };
  if (files.length < 1) return { ok: false, status: 400, error: "Add at least one photo of the scene." };
  if (files.length > MAX_PHOTOS) return { ok: false, status: 400, error: `Up to ${MAX_PHOTOS} photos per search.` };

  const photos: { buf: Buffer; mime: string; ext: string }[] = [];
  for (const f of files) {
    if (f.size > MAX_BYTES) return { ok: false, status: 413, error: `"${f.name}" is over 10 MB.` };
    const buf = Buffer.from(await f.arrayBuffer());
    const kind = sniffImage(buf);
    if (!kind) return { ok: false, status: 415, error: `"${f.name}" isn't a JPEG, PNG, WebP or HEIC photo.` };
    photos.push({ buf, ...kind });
  }

  const searchId = crypto.randomBytes(9).toString("base64url");
  const dir = path.join(UPLOADS_DIR, searchId);
  await fs.mkdir(dir, { recursive: true });
  const rows = await Promise.all(
    photos.map(async (p, i) => {
      const file_name = `${i + 1}.${p.ext}`;
      await fs.writeFile(path.join(dir, file_name), p.buf, { mode: 0o600 });
      return { idx: i + 1, file_name, mime: p.mime, bytes: p.buf.length };
    }),
  );

  const spent = db.transaction(() => {
    const take = db.prepare("UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1").run(userId);
    if (take.changes !== 1) return false;
    db.prepare("INSERT INTO searches (id, user_id, description) VALUES (?, ?, ?)").run(searchId, userId, desc);
    const ins = db.prepare("INSERT INTO search_photos (search_id, idx, file_name, mime, bytes) VALUES (?, ?, ?, ?, ?)");
    for (const r of rows) ins.run(searchId, r.idx, r.file_name, r.mime, r.bytes);
    return true;
  })();

  if (!spent) {
    await fs.rm(dir, { recursive: true, force: true });
    return { ok: false, status: 402, error: "You're out of lost causes. Buy credits to search." };
  }
  return { ok: true, searchId };
}

export const getSearch = (id: string) =>
  (db.prepare("SELECT * FROM searches WHERE id = ?").get(id) as Search | undefined) ?? null;

export const photosFor = (id: string) =>
  db.prepare("SELECT * FROM search_photos WHERE search_id = ? ORDER BY idx").all(id) as SearchPhoto[];

export const searchesFor = (userId: number, limit = 5) =>
  db.prepare("SELECT * FROM searches WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?").all(userId, limit) as Search[];

export type VerdictResult = { ok: true; verdict: "found" | "nope"; refunded: boolean } | { ok: false; status: number; error: string };

/**
 * "Found it" or "Nope", once per finished search. "Nope" puts the credit back, in the same
 * transaction that records the verdict, so a double-click or replay can never refund twice.
 */
export function setVerdict(userId: number, searchId: string, verdict: "found" | "nope"): VerdictResult {
  return db.transaction((): VerdictResult => {
    const res = db
      .prepare("UPDATE searches SET verdict = ?, verdict_at = datetime('now') WHERE id = ? AND user_id = ? AND status = 'done' AND verdict IS NULL")
      .run(verdict, searchId, userId);
    if (res.changes !== 1) {
      const s = getSearch(searchId);
      if (!s || s.user_id !== userId) return { ok: false, status: 404, error: "Not found" };
      if (s.status !== "done") return { ok: false, status: 409, error: "This search hasn't finished yet." };
      return { ok: false, status: 409, error: `Already marked "${s.verdict === "found" ? "Found it" : "Nope"}".` };
    }
    if (verdict === "nope") db.prepare("UPDATE users SET credits = credits + 1 WHERE id = ?").run(userId);
    return { ok: true, verdict, refunded: verdict === "nope" };
  })();
}
