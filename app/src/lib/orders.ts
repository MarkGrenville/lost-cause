import "server-only";
import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimit, userRef } from "./auth";
import { db, iso } from "./firebase";
import type { Pack } from "./packs";

export type Order = {
  id: string;
  user_id: string;
  pack_id: string;
  credits: number;
  amount_cents: number;
  status: "pending" | "paid" | "cancelled" | "failed";
  confirmed_via: "itn" | "dev_return" | null;
  pf_payment_id: string | null;
  created_at: string | null;
  paid_at: string | null;
};

const orders = () => db.collection("orders");

const toOrder = (snap: FirebaseFirestore.DocumentSnapshot): Order | null => {
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    id: snap.id,
    user_id: d.user_id,
    pack_id: d.pack_id,
    credits: d.credits,
    amount_cents: d.amount_cents,
    status: d.status,
    confirmed_via: d.confirmed_via ?? null,
    pf_payment_id: d.pf_payment_id ?? null,
    created_at: iso(d.created_at),
    paid_at: iso(d.paid_at),
  };
};

const ORDERS_PER_HOUR = 10;

/** A pending order, priced from the server's pack list. Null if the user is over the rate limit. */
export async function createOrder(userId: string, pack: Pack): Promise<Order | null> {
  const id = `LC-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const ok = await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef(userId));
    const limit = user.exists ? rateLimit(user, "orders", ORDERS_PER_HOUR, 3_600_000) : null;
    if (!limit) return false;
    tx.update(user.ref, limit);
    tx.create(orders().doc(id), {
      user_id: userId,
      pack_id: pack.id,
      credits: pack.searches,
      amount_cents: pack.priceCents,
      status: "pending",
      confirmed_via: null,
      pf_payment_id: null,
      created_at: FieldValue.serverTimestamp(),
      paid_at: null,
    });
    return true;
  });
  return ok ? getOrder(id) : null;
}

export const getOrder = async (id: string) => (id ? toOrder(await orders().doc(id).get()) : null);

export const ordersFor = async (userId: string, limit = 5) =>
  (await orders().where("user_id", "==", userId).orderBy("created_at", "desc").limit(limit).get()).docs.map((d) => toOrder(d)!);

/**
 * Mark a pending order paid and add its credits, atomically and exactly once.
 * Returns false if the order was already handled (e.g. a repeated ITN).
 */
export async function creditOrder(orderId: string, via: "itn" | "dev_return", pfPaymentId: string | null = null) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orders().doc(orderId));
    if (!snap.exists || snap.get("status") !== "pending") return false;
    tx.update(snap.ref, { status: "paid", confirmed_via: via, pf_payment_id: pfPaymentId, paid_at: FieldValue.serverTimestamp() });
    tx.update(userRef(snap.get("user_id")), { credits: FieldValue.increment(snap.get("credits")) });
    return true;
  });
}

export async function setOrderStatus(orderId: string, status: "cancelled" | "failed") {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orders().doc(orderId));
    if (snap.exists && snap.get("status") === "pending") tx.update(snap.ref, { status });
  });
}
