import { after } from "next/server";
import { db } from "@/lib/db";
import { creditOrder, getOrder, setOrderStatus } from "@/lib/orders";
import { rands } from "@/lib/packs";
import { itnAmountValid, itnServerConfirms, itnSignatureValid, itnSourceValid, parseItn, payfast } from "@/lib/payfast";

/**
 * PayFast ITN (Instant Transaction Notification): the *real* way an order gets paid.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │  WHY THIS NEVER FIRES IN DEVELOPMENT                                         │
 * │  PayFast's servers POST here from the internet. "localhost:3000" is this     │
 * │  laptop, so PayFast can't reach it, and we don't open a public tunnel.       │
 * │  So in dev the return URL confirms the order through a clearly labelled      │
 * │  DEV-only path (see /checkout/return). This handler is still complete: the   │
 * │  moment the app has a public URL, this is what credits accounts.             │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * PayFast's four checks, all of which must pass before we credit anything:
 *   1. signature: md5 of the posted fields (in posted order) + our passphrase
 *   2. source:    the request IP belongs to a PayFast host
 *   3. amount:    amount_gross equals what we charged for this order
 *   4. server:    PayFast's /eng/query/validate says "VALID" for this exact data
 * Plus our own: merchant_id is ours, and the order exists and is still pending.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip");

  // PayFast wants a 200 straight away; do the checks after responding.
  after(async () => {
    const { data, paramString } = parseItn(raw);
    const order = data.m_payment_id ? getOrder(data.m_payment_id) : null;

    const checks = {
      signature: itnSignatureValid(data, paramString),
      ip: await itnSourceValid(ip),
      amount: order ? itnAmountValid(rands(order.amount_cents), data) : false,
      merchant: data.merchant_id === payfast.merchantId,
      server: false,
    };
    // Only bother PayFast's validate endpoint if everything local already passed.
    if (checks.signature && checks.ip && checks.amount && checks.merchant) {
      checks.server = await itnServerConfirms(paramString);
    }

    let outcome = "rejected";
    if (Object.values(checks).every(Boolean) && order) {
      if (data.payment_status === "COMPLETE") {
        outcome = creditOrder(order.id, "itn", data.pf_payment_id ?? null) ? "credited" : "already-handled";
      } else if (data.payment_status === "CANCELLED") {
        setOrderStatus(order.id, "cancelled");
        outcome = "cancelled";
      } else {
        outcome = `status:${data.payment_status}`;
      }
    }

    db.prepare("INSERT INTO itn_log (order_id, source_ip, checks, outcome) VALUES (?, ?, ?, ?)").run(
      data.m_payment_id ?? null,
      ip,
      JSON.stringify(checks),
      outcome,
    );
  });

  return new Response(null, { status: 200 });
}
