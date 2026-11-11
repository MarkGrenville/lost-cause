import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase";
import { creditOrder, getOrder, setOrderStatus } from "./orders";
import { rands } from "./packs";
import { itnAmountValid, itnServerConfirms, itnSignatureValid, itnSourceValid, parseItn, payfast } from "./payfast";

/**
 * The caller's IP as seen by OUR edge, not as claimed by the caller. Proxies append to
 * X-Forwarded-For, so anything before them is caller-supplied and can be forged.
 * ITN_PROXY_HOPS = how many trusted proxies append to it (1 locally; on App Hosting see apphosting.yaml).
 * Every ITN logs the whole chain, so this can be checked against a real sandbox ITN.
 */
export function sourceIp(headers: Headers) {
  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const hops = Math.max(1, Number(process.env.ITN_PROXY_HOPS || 1));
  return { ip: chain.length >= hops ? chain[chain.length - hops] : null, chain };
}

type Deps = { sourceValid: typeof itnSourceValid; serverConfirms: typeof itnServerConfirms };
const realDeps: Deps = { sourceValid: itnSourceValid, serverConfirms: itnServerConfirms };

/**
 * PayFast's four checks, all of which must pass before we credit anything:
 *   1. signature: md5 of the posted fields (in posted order) + our passphrase
 *   2. source:    the request IP belongs to a PayFast host
 *   3. amount:    amount_gross equals what we charged for this order
 *   4. server:    PayFast's /eng/query/validate says "VALID" for this exact data
 * Plus our own: merchant_id is ours, and the order exists and is still pending.
 * `deps` exists only so the emulator tests can stand in for checks 2 and 4.
 */
export async function processItn(raw: string, ip: string | null, chain: string[], deps: Deps = realDeps) {
  const { data, paramString } = parseItn(raw);
  const order = data.m_payment_id ? await getOrder(data.m_payment_id) : null;

  const checks = {
    signature: itnSignatureValid(data, paramString),
    ip: await deps.sourceValid(ip),
    amount: order ? itnAmountValid(rands(order.amount_cents), data) : false,
    merchant: data.merchant_id === payfast.merchantId,
    server: false,
  };
  // Only bother PayFast's validate endpoint if everything local already passed.
  if (checks.signature && checks.ip && checks.amount && checks.merchant) checks.server = await deps.serverConfirms(paramString);

  let outcome = "rejected";
  if (Object.values(checks).every(Boolean) && order) {
    if (data.payment_status === "COMPLETE") {
      outcome = (await creditOrder(order.id, "itn", data.pf_payment_id ?? null)) ? "credited" : "already-handled";
    } else if (data.payment_status === "CANCELLED") {
      await setOrderStatus(order.id, "cancelled");
      outcome = "cancelled";
    } else {
      outcome = `status:${data.payment_status}`;
    }
  }

  await db.collection("itn_log").add({
    order_id: data.m_payment_id ?? null,
    source_ip: ip,
    forwarded_chain: chain,
    mode: payfast.mode,
    checks,
    outcome,
    created_at: FieldValue.serverTimestamp(),
  });
  return { checks, outcome };
}
