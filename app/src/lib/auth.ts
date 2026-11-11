import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { auth, db } from "./firebase";

/**
 * Sign-in is Firebase Auth with Google. The browser does the Google popup and hands us a
 * short-lived ID token once; we swap it for a Firebase *session cookie* (httpOnly, 14 days)
 * and from then on every request is checked on the server with verifySessionCookie.
 *
 * The cookie is called "__session" because that is the one cookie Firebase's CDN passes through.
 */
export const SESSION_COOKIE = "__session";
const SESSION_MS = 14 * 86_400_000; // Firebase's maximum

export type User = { id: string; email: string; credits: number };

export const userRef = (uid: string) => db.collection("users").doc(uid);

/** Exchange a fresh Google ID token for a session cookie, and make sure the user doc exists. */
export async function startSession(idToken: string) {
  const decoded = await auth.verifyIdToken(idToken, true);
  // Only accept a token minted in the last 5 minutes (Firebase's recommendation).
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) throw new Error("Sign-in is too old. Try again.");
  if (!decoded.email || !decoded.email_verified) throw new Error("Your Google account has no verified email.");

  const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MS });
  await db.runTransaction(async (tx) => {
    const ref = userRef(decoded.uid);
    const snap = await tx.get(ref);
    if (!snap.exists) tx.create(ref, { email: decoded.email, credits: 0, created_at: FieldValue.serverTimestamp() });
    else if (snap.get("email") !== decoded.email) tx.update(ref, { email: decoded.email });
  });

  (await cookies()).set(SESSION_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

/** The signed-in user, or null. Safe to call from Server Components. */
export async function currentUser(): Promise<User | null> {
  await connection(); // request-time only: verifying the cookie reads the clock (Cache Components)
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const decoded = await auth.verifySessionCookie(value, true); // true: honour sign-out everywhere
    const snap = await userRef(decoded.uid).get();
    if (!snap.exists) return null;
    return { id: decoded.uid, email: snap.get("email"), credits: snap.get("credits") ?? 0 };
  } catch {
    return null;
  }
}

export async function endSession() {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (value) {
    try {
      const decoded = await auth.verifySessionCookie(value);
      await auth.revokeRefreshTokens(decoded.sub);
    } catch {
      // already invalid: nothing to revoke
    }
  }
  store.delete(SESSION_COOKIE);
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

/**
 * A simple per-user rate limit, inside the caller's transaction: at most `limit` events of
 * `kind` per `windowMs`. Returns the update to write, or null if the user is over the limit.
 */
export function rateLimit(user: FirebaseFirestore.DocumentSnapshot, kind: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = ((user.get(`rate.${kind}`) as number[] | undefined) ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= limit) return null;
  return { [`rate.${kind}`]: [...recent, now] };
}
