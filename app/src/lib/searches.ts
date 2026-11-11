import "server-only";
import crypto from "node:crypto";
import sharp from "sharp";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { rateLimit, userRef } from "./auth";
import { bucket, db, iso } from "./firebase";
import { spendPaused } from "./spend";

export const MAX_PHOTOS = 5;
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_DESCRIPTION = 500;
export const PHOTO_DAYS = 7; // photos are deleted after this by the scheduled cleanup (functions/)
const SEARCHES_PER_HOUR = Number(process.env.LOST_CAUSE_SEARCHES_PER_HOUR || 10);

export type SearchPhoto = { idx: number; path: string; mime: string; bytes: number };
export type Search = {
  id: string;
  user_id: string;
  description: string;
  status: "waiting" | "searching" | "done" | "failed";
  created_at: string | null;
  result_json: string | null;
  error: string | null;
  verdict: "found" | "nope" | null;
  started_at: string | null;
  duration_ms: number | null;
  photos: SearchPhoto[];
  photos_deleted: boolean;
};

export const searchRef = (id: string) => db.collection("searches").doc(id);

function toSearch(snap: FirebaseFirestore.DocumentSnapshot): Search | null {
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    id: snap.id,
    user_id: d.user_id,
    description: d.description,
    status: d.status,
    created_at: iso(d.created_at),
    result_json: d.result_json ?? null,
    error: d.error ?? null,
    verdict: d.verdict ?? null,
    started_at: iso(d.started_at),
    duration_ms: d.duration_ms ?? null,
    photos: d.photos ?? [],
    photos_deleted: Boolean(d.photos_deleted_at),
  };
}

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

/**
 * Re-encode the photo with no metadata at all: EXIF, GPS, camera serials and XMP are gone
 * before anything is stored. rotate() bakes the EXIF orientation into the pixels first.
 */
async function stripMetadata(buf: Buffer, mime: string) {
  const img = sharp(buf).rotate();
  if (mime === "image/png") return img.png().toBuffer();
  if (mime === "image/webp") return img.webp({ quality: 90 }).toBuffer();
  return img.jpeg({ quality: 90 }).toBuffer();
}

export type CreateResult = { ok: true; searchId: string } | { ok: false; status: number; error: string };

/**
 * Validate, strip metadata, store the photos (private, in Cloud Storage), then take 1 credit
 * and create the search in ONE Firestore transaction. If the credit can't be taken, the
 * stored files are removed again.
 */
export async function createSearch(userId: string, description: string, files: File[]): Promise<CreateResult> {
  const desc = description.trim();
  if (desc.length < 3) return { ok: false, status: 400, error: "Tell us what you lost (a few words is fine)." };
  if (desc.length > MAX_DESCRIPTION) return { ok: false, status: 400, error: `Keep it under ${MAX_DESCRIPTION} characters.` };
  if (files.length < 1) return { ok: false, status: 400, error: "Add at least one photo of the scene." };
  if (files.length > MAX_PHOTOS) return { ok: false, status: 400, error: `Up to ${MAX_PHOTOS} photos per search.` };

  const photos: { buf: Buffer; mime: string; ext: string }[] = [];
  for (const f of files) {
    if (f.size > MAX_BYTES) return { ok: false, status: 413, error: `"${f.name}" is over 10 MB.` };
    const raw = Buffer.from(await f.arrayBuffer());
    const kind = sniffImage(raw);
    if (!kind) return { ok: false, status: 415, error: `"${f.name}" isn't a JPEG, PNG or WebP photo.` };
    // We can't decode HEIC here, so we couldn't strip its location data. Decline it instead.
    if (kind.mime === "image/heic") return { ok: false, status: 415, error: `"${f.name}" is HEIC. Please send a JPEG (most phones offer "Most Compatible").` };
    try {
      photos.push({ buf: await stripMetadata(raw, kind.mime), ...kind });
    } catch {
      return { ok: false, status: 415, error: `"${f.name}" couldn't be read as a photo.` };
    }
  }

  // Quick check before uploading anything; the transaction checks again.
  if (await spendPaused()) return { ok: false, status: 503, error: PAUSED };

  const searchId = crypto.randomBytes(9).toString("base64url");
  const stored: SearchPhoto[] = await Promise.all(
    photos.map(async (p, i) => {
      const path = `searches/${searchId}/${i + 1}.${p.ext}`;
      await bucket().file(path).save(p.buf, { contentType: p.mime, resumable: false, metadata: { cacheControl: "private, no-store" } });
      return { idx: i + 1, path, mime: p.mime, bytes: p.buf.length };
    }),
  );

  const outcome = await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef(userId));
    if (!user.exists || (user.get("credits") ?? 0) < 1) return "no-credits" as const;
    const limit = rateLimit(user, "searches", SEARCHES_PER_HOUR, 3_600_000);
    if (!limit) return "rate" as const;
    if (await spendPaused(tx)) return "paused" as const;
    tx.update(user.ref, { credits: FieldValue.increment(-1), ...limit });
    tx.create(searchRef(searchId), {
      user_id: userId,
      description: desc,
      status: "waiting",
      photos: stored,
      created_at: FieldValue.serverTimestamp(),
      photos_expire_at: Timestamp.fromMillis(Date.now() + PHOTO_DAYS * 86_400_000),
      credit_refunded: false,
      verdict: null,
    });
    return "ok" as const;
  });

  if (outcome !== "ok") {
    await deletePhotos(searchId);
    if (outcome === "rate") return { ok: false, status: 429, error: `That's ${SEARCHES_PER_HOUR} searches in an hour. Have a cup of tea and try again soon.` };
    if (outcome === "paused") return { ok: false, status: 503, error: PAUSED };
    return { ok: false, status: 402, error: "You're out of lost causes. Buy credits to search." };
  }
  return { ok: true, searchId };
}

const PAUSED = "Searches are paused for today: we've hit our daily AI budget. No credit was taken. Try again tomorrow.";

export const deletePhotos = (searchId: string) => bucket().deleteFiles({ prefix: `searches/${searchId}/` }).catch(() => {});

export const getSearch = async (id: string) => (id ? toSearch(await searchRef(id).get()) : null);

/**
 * Put the credit back for a search that failed, exactly once (credit_refunded guards it).
 * Only a search that was actually running can fail this way.
 */
export async function failAndRefund(searchId: string, error: string) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(searchRef(searchId));
    if (!snap.exists || snap.get("status") !== "searching" || snap.get("credit_refunded")) return false;
    tx.update(snap.ref, { status: "failed", error, credit_refunded: true, finished_at: FieldValue.serverTimestamp() });
    tx.update(userRef(snap.get("user_id")), { credits: FieldValue.increment(1) });
    return true;
  });
}

/** A search stuck "searching" this long (its server went away mid-search) fails, credit back. */
const STUCK_MS = 3 * 60_000;
export async function failIfStuck(s: Search) {
  if (s.status === "searching" && s.started_at && Date.now() - Date.parse(s.started_at) > STUCK_MS) {
    await failAndRefund(s.id, "The search took too long and was stopped.");
    return true;
  }
  return false;
}

export type VerdictResult = { ok: true; verdict: "found" | "nope"; refunded: boolean } | { ok: false; status: number; error: string };

/**
 * "Found it" or "Nope", once per finished search. "Nope" puts the credit back, in the same
 * transaction that records the verdict, so a double-click or replay can never refund twice.
 */
export async function setVerdict(userId: string, searchId: string, verdict: "found" | "nope"): Promise<VerdictResult> {
  return db.runTransaction(async (tx): Promise<VerdictResult> => {
    const snap = await tx.get(searchRef(searchId));
    if (!snap.exists || snap.get("user_id") !== userId) return { ok: false, status: 404, error: "Not found" };
    if (snap.get("status") !== "done") return { ok: false, status: 409, error: "This search hasn't finished yet." };
    const had = snap.get("verdict");
    if (had) return { ok: false, status: 409, error: `Already marked "${had === "found" ? "Found it" : "Nope"}".` };
    const refund = verdict === "nope" && !snap.get("credit_refunded");
    tx.update(snap.ref, { verdict, verdict_at: FieldValue.serverTimestamp(), ...(refund ? { credit_refunded: true } : {}) });
    if (refund) tx.update(userRef(userId), { credits: FieldValue.increment(1) });
    return { ok: true, verdict, refunded: refund };
  });
}
