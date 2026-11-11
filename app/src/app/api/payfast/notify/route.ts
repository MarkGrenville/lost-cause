import { processItn, sourceIp } from "@/lib/itn";

/**
 * PayFast ITN (Instant Transaction Notification): the ONLY way an order gets paid in production.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │  WHY THIS NEVER FIRES IN DEVELOPMENT                                         │
 * │  PayFast's servers POST here from the internet. "localhost:3000" is this     │
 * │  laptop, so PayFast can't reach it, and we don't open a public tunnel.       │
 * │  So in dev the return URL confirms the order through a clearly labelled      │
 * │  DEV-only path (see /checkout/return). On the public URL, this is it.        │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * The checks run before we answer (a few seconds at most). Cloud Run may slow a container
 * down once a response is sent, so work after the response isn't safe there.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const { ip, chain } = sourceIp(req.headers);
  try {
    await processItn(raw, ip, chain);
  } catch (err) {
    console.error("[itn]", err); // still 200: PayFast retries on errors, and our log has the details
  }
  return new Response(null, { status: 200 });
}
