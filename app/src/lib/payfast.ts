import "server-only";
import crypto from "node:crypto";
import dns from "node:dns/promises";

/**
 * PayFast custom integration, following https://developers.payfast.co.za/docs
 * (checkout signature + the four ITN security checks). Secrets come only from env
 * (.env.local, copied from secrets.env) and never leave the server, except merchant_key,
 * which PayFast's form itself requires.
 */

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const payfast = {
  get merchantId() { return env("PAYFAST_MERCHANT_ID"); },
  get merchantKey() { return env("PAYFAST_MERCHANT_KEY"); },
  get passphrase() { return process.env.PAYFAST_PASSPHRASE?.trim() || null; },
  get processUrl() { return env("PAYFAST_PROCESS_URL"); },
  get sandbox() { return process.env.PAYFAST_MODE !== "live"; },
  get host() { return this.sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za"; },
};

/** PHP urlencode(): what PayFast hashes. Spaces become "+", and !'()*~ are percent-encoded too. */
export const pfEncode = (value: string) =>
  encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, "+");

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

const withPassphrase = (paramString: string) =>
  payfast.passphrase ? `${paramString}&passphrase=${pfEncode(payfast.passphrase)}` : paramString;

// ---------------------------------------------------------------- checkout

export type CheckoutInput = {
  orderId: string;
  amount: string; // "49.00"
  itemName: string;
  itemDescription: string;
  email: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
};

/**
 * The fields for the POST to PayFast, in PayFast's documented order (the signature
 * depends on the order). Empty values are left out of both the form and the signature.
 */
export function checkoutFields(input: CheckoutInput): [string, string][] {
  const ordered: [string, string][] = [
    ["merchant_id", payfast.merchantId],
    ["merchant_key", payfast.merchantKey],
    ["return_url", input.returnUrl],
    ["cancel_url", input.cancelUrl],
    ["notify_url", input.notifyUrl],
    ["email_address", input.email],
    ["m_payment_id", input.orderId],
    ["amount", input.amount],
    ["item_name", input.itemName],
    ["item_description", input.itemDescription],
  ];
  const fields = ordered.map(([k, v]) => [k, v.trim()] as [string, string]).filter(([, v]) => v !== "");
  const paramString = fields.map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");
  return [...fields, ["signature", md5(withPassphrase(paramString))]];
}

// ---------------------------------------------------------------- ITN

/**
 * Parse the raw ITN body keeping PayFast's field order: the signature is computed over the
 * fields *in the order they were posted*, every field before `signature` (empty ones included).
 */
export function parseItn(rawBody: string) {
  const pairs = [...new URLSearchParams(rawBody)];
  const data = Object.fromEntries(pairs) as Record<string, string>;
  const signed: string[] = [];
  for (const [k, v] of pairs) {
    if (k === "signature") break;
    signed.push(`${k}=${pfEncode(v.trim())}`);
  }
  return { data, paramString: signed.join("&") };
}

/** Check 1: the signature matches what we compute with our passphrase. */
export function itnSignatureValid(data: Record<string, string>, paramString: string) {
  const expected = md5(withPassphrase(paramString));
  const got = data.signature ?? "";
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/** Check 2: the request came from one of PayFast's published hosts. */
export async function itnSourceValid(ip: string | null) {
  if (!ip) return false;
  const hosts = ["www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"];
  const lookups = await Promise.allSettled(hosts.map((h) => dns.lookup(h, { all: true })));
  const valid = new Set(lookups.flatMap((r) => (r.status === "fulfilled" ? r.value.map((a) => a.address) : [])));
  return valid.has(ip.replace(/^::ffff:/, ""));
}

/** Check 3: amount_gross matches what *we* charged for this order (to the cent). */
export const itnAmountValid = (expectedRands: string, data: Record<string, string>) =>
  Math.abs(parseFloat(expectedRands) - parseFloat(data.amount_gross ?? "NaN")) <= 0.01;

/** Check 4: ask PayFast to confirm it really sent this exact data. */
export async function itnServerConfirms(paramString: string) {
  try {
    const res = await fetch(`https://${payfast.host}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: paramString,
      signal: AbortSignal.timeout(10_000),
    });
    return (await res.text()).trim() === "VALID";
  } catch {
    return false;
  }
}
