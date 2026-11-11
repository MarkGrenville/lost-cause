import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import type { Pack } from "./packs";

export type Order = {
  id: string;
  user_id: number;
  pack_id: string;
  credits: number;
  amount_cents: number;
  status: "pending" | "paid" | "cancelled" | "failed";
  confirmed_via: "itn" | "dev_return" | null;
  pf_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export function createOrder(userId: number, pack: Pack): Order {
  const id = `LC-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  db.prepare("INSERT INTO orders (id, user_id, pack_id, credits, amount_cents) VALUES (?, ?, ?, ?, ?)").run(
    id,
    userId,
    pack.id,
    pack.searches,
    pack.priceCents,
  );
  return getOrder(id)!;
}

export const getOrder = (id: string) =>
  (db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Order | undefined) ?? null;

export const ordersFor = (userId: number, limit = 5) =>
  db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?").all(userId, limit) as Order[];

/**
 * Mark a pending order paid and add its credits, atomically and exactly once.
 * Returns false if the order was already handled (e.g. ITN and return URL both fire).
 */
export function creditOrder(orderId: string, via: "itn" | "dev_return", pfPaymentId: string | null = null) {
  return db.transaction(() => {
    const res = db
      .prepare(
        `UPDATE orders SET status = 'paid', confirmed_via = ?, pf_payment_id = ?, paid_at = datetime('now')
         WHERE id = ? AND status = 'pending'`,
      )
      .run(via, pfPaymentId, orderId);
    if (res.changes !== 1) return false;
    db.prepare("UPDATE users SET credits = credits + (SELECT credits FROM orders WHERE id = ?) WHERE id = (SELECT user_id FROM orders WHERE id = ?)").run(
      orderId,
      orderId,
    );
    return true;
  })();
}

export function setOrderStatus(orderId: string, status: "cancelled" | "failed") {
  db.prepare("UPDATE orders SET status = ? WHERE id = ? AND status = 'pending'").run(status, orderId);
}
