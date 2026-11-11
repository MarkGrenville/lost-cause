import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { z } from "zod";
import { db } from "./db";
import { getSearch, photosFor, UPLOADS_DIR, type SearchPhoto } from "./searches";

export const MODEL = process.env.LOST_CAUSE_MODEL || "claude-sonnet-5-5";
const TILE_PX = 1024; // every image we send is shrunk (or zoomed) to fit 1024px
const AI_CALL_LIMIT = Number(process.env.LOST_CAUSE_AI_CALL_LIMIT || 30); // dev budget for the stage
// USD per million tokens (input, output). Unknown models are priced as Sonnet and flagged.
const PRICES: Record<string, [number, number]> = {
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};

// The key is passed explicitly: never ANTHROPIC_API_KEY, which would change how Claude Code itself bills.
const client = new Anthropic({ apiKey: process.env.LOST_CAUSE_ANTHROPIC_API_KEY });

// ---------------------------------------------------------------- tiles

// x/y/w/h: the region of the original photo. sw/sh: the pixel size of the image we actually send.
type Tile = { id: string; label: string; x: number; y: number; w: number; h: number; sw: number; sh: number; jpeg: Buffer };

/**
 * T0 is the whole photo shrunk to 1024px. T1–T4 are four overlapping crops (each 60% of the
 * width and height, overlapping 20% in the middle) enlarged to 1024px: the "zoom".
 */
async function makeTiles(file: Buffer) {
  // rotate() applies EXIF orientation; re-encoding drops EXIF/GPS from what we send.
  const { data: base, info } = await sharp(file).rotate().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const tw = Math.round(W * 0.6);
  const th = Math.round(H * 0.6);
  const spots = [
    ["T1", "top-left", 0, 0],
    ["T2", "top-right", W - tw, 0],
    ["T3", "bottom-left", 0, H - th],
    ["T4", "bottom-right", W - tw, H - th],
  ] as const;
  const fit = { width: TILE_PX, height: TILE_PX, fit: "inside" as const };

  const encode = async (img: ReturnType<typeof sharp>) => {
    const { data, info } = await img.jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
    return { jpeg: data, sw: info.width, sh: info.height };
  };
  const overview = await encode(sharp(base).resize({ ...fit, withoutEnlargement: true }));
  const tiles: Tile[] = [
    { id: "T0", label: `overview of the whole photo, ${overview.sw}x${overview.sh} px`, x: 0, y: 0, w: W, h: H, ...overview },
  ];
  for (const [id, where, x, y] of spots) {
    const img = await encode(sharp(base).extract({ left: x, top: y, width: tw, height: th }).resize(fit));
    tiles.push({
      id,
      label: `zoomed ${where} tile, ${img.sw}x${img.sh} px, covering x ${Math.round((x / W) * 100)}–${Math.round(((x + tw) / W) * 100)}% and y ${Math.round((y / H) * 100)}–${Math.round(((y + th) / H) * 100)}% of the photo`,
      x, y, w: tw, h: th, ...img,
    });
  }
  return { W, H, tiles };
}

// ---------------------------------------------------------------- the model's answer

const TILE_IDS = ["T0", "T1", "T2", "T3", "T4"] as const;

// Sent as the JSON schema (no min/max: structured outputs doesn't support them; zod checks ranges below).
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates", "where_to_look_next", "summary"],
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tile", "box", "confidence", "label", "why"],
        properties: {
          tile: { type: "string", enum: [...TILE_IDS] },
          box: {
            type: "object",
            additionalProperties: false,
            required: ["x0", "y0", "x1", "y1"],
            properties: { x0: { type: "integer" }, y0: { type: "integer" }, x1: { type: "integer" }, y1: { type: "integer" } },
          },
          confidence: { type: "number" },
          label: { type: "string" },
          why: { type: "string" },
        },
      },
    },
    where_to_look_next: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
} as const;

const Answer = z.object({
  candidates: z.array(
    z.object({
      tile: z.enum(TILE_IDS),
      box: z.object({ x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() }),
      confidence: z.number(),
      label: z.string(),
      why: z.string(),
    }),
  ),
  where_to_look_next: z.array(z.string()),
  summary: z.string(),
});

const SYSTEM = `You are the finder for Lost Cause, a service that helps people find a lost physical object in photos of the place they lost it.

You get several images of ONE photo: T0 is the whole photo, T1-T4 are zoomed, overlapping crops of it. Look carefully at every tile; small objects are often only clear in a zoomed tile.

Return every spot where the described object could plausibly be, as candidates:
- tile: the tile you are drawing the box on (use a zoomed tile when the object is clearer there).
- box: a tight box around the object in THAT tile image's own pixel coordinates (0,0 = its top-left; each tile's size in pixels is given in its label).
- confidence: 0 to 1, calibrated. 0.9+ only if you can actually see the object. Use 0.1-0.4 for "it could be hidden here" spots where nothing is visible.
- label: 2-5 words, e.g. "keys in cushion gap".
- why: one short sentence on what you see.
If you see the same thing in two overlapping tiles, report it once. If nothing matches, return no candidates; never invent one.

where_to_look_next: 2-4 short, practical places to check in real life, based on this scene.
summary: one friendly sentence.`;

type Mapped = { x0: number; y0: number; x1: number; y1: number; confidence: number; label: string; why: string; tile: string };
export type PhotoResult = {
  idx: number;
  width: number;
  height: number;
  candidates: Mapped[];
  where_to_look_next: string[];
  summary: string;
  skipped?: string;
};
export type SearchResult = { model: string; calls: number; cost_usd: number; photos: PhotoResult[] };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function iou(a: Mapped, b: Mapped) {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = ix * iy;
  const area = (m: Mapped) => (m.x1 - m.x0) * (m.y1 - m.y0);
  return inter / (area(a) + area(b) - inter || 1);
}

/**
 * Tile-image pixels -> original photo pixels, then drop duplicates from overlapping tiles.
 * (Stage 5 bug: this first assumed a 0-1000 scale; the model answers in the sent image's pixels.)
 */
function mapToPhoto(answer: z.infer<typeof Answer>, tiles: Tile[]): Mapped[] {
  const mapped = answer.candidates.flatMap((c) => {
    const t = tiles.find((t) => t.id === c.tile);
    if (!t) return [];
    const [bx0, bx1] = [clamp(Math.min(c.box.x0, c.box.x1), 0, t.sw), clamp(Math.max(c.box.x0, c.box.x1), 0, t.sw)];
    const [by0, by1] = [clamp(Math.min(c.box.y0, c.box.y1), 0, t.sh), clamp(Math.max(c.box.y0, c.box.y1), 0, t.sh)];
    return [{
      x0: Math.round(t.x + (bx0 / t.sw) * t.w),
      y0: Math.round(t.y + (by0 / t.sh) * t.h),
      x1: Math.round(t.x + (bx1 / t.sw) * t.w),
      y1: Math.round(t.y + (by1 / t.sh) * t.h),
      confidence: clamp(c.confidence, 0, 1),
      label: c.label.slice(0, 60),
      why: c.why.slice(0, 240),
      tile: c.tile,
    }];
  });
  mapped.sort((a, b) => b.confidence - a.confidence);
  const kept: Mapped[] = [];
  for (const m of mapped) if (!kept.some((k) => iou(k, m) > 0.3)) kept.push(m);
  return kept.slice(0, 5);
}

// ---------------------------------------------------------------- one vision call per photo

class BudgetExceeded extends Error {}

/** Reserve a row in ai_calls before calling, so the dev budget can't be overrun by parallel calls. */
function reserveCall(searchId: string, idx: number) {
  return db.transaction(() => {
    if (process.env.NODE_ENV !== "production") {
      const used = (db.prepare("SELECT COUNT(*) AS n FROM ai_calls").get() as { n: number }).n;
      if (used >= AI_CALL_LIMIT) throw new BudgetExceeded(`Dev AI budget used up (${used}/${AI_CALL_LIMIT} vision calls).`);
    }
    return Number(db.prepare("INSERT INTO ai_calls (search_id, photo_idx, model) VALUES (?, ?, ?)").run(searchId, idx, MODEL).lastInsertRowid);
  })();
}

async function searchPhoto(searchId: string, description: string, photo: SearchPhoto): Promise<PhotoResult & { cost: number }> {
  if (photo.mime === "image/heic") {
    return { idx: photo.idx, width: 0, height: 0, candidates: [], where_to_look_next: [], summary: "", cost: 0,
      skipped: "HEIC photos can't be read by the AI step yet. Try a JPEG or PNG of the same spot." };
  }
  const file = await fs.readFile(path.join(UPLOADS_DIR, searchId, photo.file_name));
  const { W, H, tiles } = await makeTiles(file);

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const t of tiles) {
    content.push({ type: "text", text: `${t.id}: ${t.label}` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: t.jpeg.toString("base64") } });
  }
  content.push({ type: "text", text: `What they lost, in their words: """${description}"""\n\nFind it in this photo.` });

  const callId = reserveCall(searchId, photo.idx);
  const started = Date.now();
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // on a safety refusal, the API retries on a suitable model in the same call
      output_config: { effort: "high", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });

    const [inP, outP] = PRICES[res.model] ?? PRICES["claude-sonnet-5-5"];
    const cost = (res.usage.input_tokens * inP + res.usage.output_tokens * outP) / 1e6;
    db.prepare(
      "UPDATE ai_calls SET served_by = ?, input_tokens = ?, output_tokens = ?, cost_usd = ?, stop_reason = ?, ms = ? WHERE id = ?",
    ).run(res.model, res.usage.input_tokens, res.usage.output_tokens, cost, res.stop_reason, Date.now() - started, callId);

    if (res.stop_reason === "refusal") throw new Error("The AI declined to search this photo.");
    if (res.stop_reason === "max_tokens") throw new Error("The AI ran out of room before finishing.");
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("The AI returned no answer.");
    const answer = Answer.parse(JSON.parse(text.text));

    return {
      idx: photo.idx, width: W, height: H, cost,
      candidates: mapToPhoto(answer, tiles),
      where_to_look_next: answer.where_to_look_next.slice(0, 4),
      summary: answer.summary,
    };
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `API ${err.status}: ${err.message}` : (err as Error).message;
    db.prepare("UPDATE ai_calls SET error = ?, ms = ? WHERE id = ?").run(msg.slice(0, 500), Date.now() - started, callId);
    throw err;
  }
}

/** Run a waiting search exactly once. On a technical failure the credit goes back. */
export async function runSearch(searchId: string) {
  const claim = db.prepare("UPDATE searches SET status = 'searching', started_at = datetime('now') WHERE id = ? AND status = 'waiting'").run(searchId);
  if (claim.changes !== 1) return;
  const search = getSearch(searchId)!;
  const t0 = Date.now();

  try {
    const photos = await Promise.all(photosFor(searchId).map((p) => searchPhoto(searchId, search.description, p)));
    const result: SearchResult = {
      model: MODEL,
      calls: photos.filter((p) => !p.skipped).length,
      cost_usd: photos.reduce((s, p) => s + p.cost, 0),
      photos: photos.map(({ cost: _cost, ...p }) => p), // eslint-disable-line @typescript-eslint/no-unused-vars
    };
    db.prepare("UPDATE searches SET status = 'done', result_json = ?, duration_ms = ?, finished_at = datetime('now') WHERE id = ?").run(
      JSON.stringify(result),
      Date.now() - t0,
      searchId,
    );
  } catch (err) {
    const msg = err instanceof BudgetExceeded ? err.message : "The search hit a technical problem.";
    console.error(`[search ${searchId}]`, err);
    db.transaction(() => {
      db.prepare("UPDATE searches SET status = 'failed', error = ?, finished_at = datetime('now') WHERE id = ?").run(msg, searchId);
      db.prepare("UPDATE users SET credits = credits + 1 WHERE id = ?").run(search.user_id);
    })();
  }
}

export const parseResult = (json: string | null) => (json ? (JSON.parse(json) as SearchResult) : null);
