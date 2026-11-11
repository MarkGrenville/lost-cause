import { startSession } from "@/lib/auth";
import { publicBaseUrl } from "@/lib/payfast";

/**
 * POST {"idToken": "..."} after the Google popup: swaps the ID token for our session cookie.
 * Only same-origin requests (the cookie is SameSite=Lax, and this blocks login CSRF).
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  // Compare with the public address: behind App Hosting, req.url is the container (0.0.0.0:8080).
  if (!origin || origin !== publicBaseUrl()) return Response.json({ error: "Bad origin" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.idToken !== "string") return Response.json({ error: "Missing idToken" }, { status: 400 });
  try {
    await startSession(body.idToken);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[session]", (err as Error).message);
    return Response.json({ error: "That sign-in didn't work. Try again?" }, { status: 401 });
  }
}
