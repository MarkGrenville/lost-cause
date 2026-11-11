"use client";

import { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

type Props = { next: string; config: { apiKey: string; authDomain: string; projectId: string }; emulator: string | null };

function firebaseAuth({ config, emulator }: Pick<Props, "config" | "emulator">) {
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  if (emulator && !auth.emulatorConfig) connectAuthEmulator(auth, emulator, { disableWarnings: true });
  return auth;
}

export function SignInForm({ next, config, emulator }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function google() {
    setBusy(true);
    setError(null);
    try {
      const auth = firebaseAuth({ config, emulator });
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await user.getIdToken() }),
      });
      await signOut(auth); // the server's session cookie is the only sign-in from here on
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Sign-in failed");
      window.location.assign(next);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "auth/popup-closed-by-user" ? "You closed the Google window. No harm done." : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <button
        onClick={google}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-[3px] bg-ink px-6 py-4 text-lg font-semibold text-cream transition hover:brightness-95 disabled:opacity-60"
      >
        <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <p className="mt-3 font-bold text-flare">{error}</p>}
      <p className="mt-4 text-sm text-ink/60">We keep your email address from Google and nothing else.</p>
      {emulator && (
        <p className="label mt-4 inline-block border border-dashed border-ink/40 px-3 py-1.5">
          DEV: Firebase Auth emulator. No real Google account is used.
        </p>
      )}
    </div>
  );
}
