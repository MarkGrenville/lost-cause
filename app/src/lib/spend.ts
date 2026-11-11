import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase";

/**
 * The global daily AI spend cap. Every vision call reserves a worst-case estimate in
 * ai_spend/<UTC day> *before* it is made, inside a transaction, so parallel searches can't
 * overshoot; the real cost replaces the estimate afterwards. Once the day's total reaches the
 * cap, new searches are refused before a credit is taken, and a search caught mid-way fails
 * and gets its credit back.
 */
export const dailyCapUsd = () => Number(process.env.LOST_CAUSE_DAILY_SPEND_CAP_USD ?? 5);
export const CALL_ESTIMATE_USD = 0.04; // measured: $0.014–0.019 per photo; reserve about twice that

const AI_CALL_LIMIT = Number(process.env.LOST_CAUSE_AI_CALL_LIMIT || 30); // development budget per stage

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const dayRef = () => db.collection("ai_spend").doc(dayKey());
const devRef = () => db.collection("ai_spend").doc("dev-total");

export class SpendCapReached extends Error {}

/** True once today's (reserved + actual) spend has reached the cap. */
export async function spendPaused(tx?: FirebaseFirestore.Transaction) {
  const snap = tx ? await tx.get(dayRef()) : await dayRef().get();
  return (snap.get("usd") ?? 0) >= dailyCapUsd();
}

/** Reserve one call against today's cap (and, outside production, the dev budget). Returns the ai_calls id. */
export async function reserveCall(searchId: string, photoIdx: number, model: string) {
  const call = db.collection("ai_calls").doc();
  await db.runTransaction(async (tx) => {
    const day = await tx.get(dayRef());
    const dev = process.env.NODE_ENV !== "production" ? await tx.get(devRef()) : null;
    const usd = day.get("usd") ?? 0;
    if (usd + CALL_ESTIMATE_USD > dailyCapUsd()) throw new SpendCapReached(`Daily AI budget reached ($${usd.toFixed(2)} of $${dailyCapUsd()}).`);
    if (dev && (dev.get("calls") ?? 0) >= AI_CALL_LIMIT) throw new SpendCapReached(`Dev AI budget used up (${dev.get("calls")}/${AI_CALL_LIMIT} vision calls).`);
    tx.set(day.ref, { usd: FieldValue.increment(CALL_ESTIMATE_USD), calls: FieldValue.increment(1) }, { merge: true });
    if (dev) tx.set(dev.ref, { calls: FieldValue.increment(1) }, { merge: true });
    tx.create(call, {
      search_id: searchId,
      photo_idx: photoIdx,
      model,
      day: dayKey(),
      reserved_usd: CALL_ESTIMATE_USD,
      created_at: FieldValue.serverTimestamp(),
    });
  });
  return call.id;
}

/** Record how the call went, and swap the estimate for the real cost (0 if it never got an answer). */
export async function settleCall(callId: string, costUsd: number, fields: Record<string, unknown>) {
  const ref = db.collection("ai_calls").doc(callId);
  const snap = await ref.get();
  await Promise.all([
    ref.update({ ...fields, cost_usd: costUsd }),
    db.collection("ai_spend").doc(snap.get("day")).set({ usd: FieldValue.increment(costUsd - snap.get("reserved_usd")) }, { merge: true }),
  ]);
}
