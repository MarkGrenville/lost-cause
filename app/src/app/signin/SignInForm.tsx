"use client";

import { useActionState } from "react";
import { checkCode, sendCode, type SignInState } from "./actions";

const input =
  "pop-sm w-full rounded-2xl bg-white px-5 py-4 text-xl font-bold outline-none placeholder:text-ink/30 focus:bg-sun/20";
const button =
  "pop mt-5 w-full rounded-2xl bg-flare px-6 py-4 text-lg font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-60";

export function SignInForm({ next }: { next: string }) {
  const [emailState, emailAction, sending] = useActionState<SignInState, FormData>(sendCode, { step: "email", next });
  const [codeState, codeAction, checking] = useActionState<SignInState, FormData>(checkCode, { step: "code" });

  if (emailState.step === "email") {
    return (
      <form action={emailAction} className="mt-8">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="mb-2 block font-mono text-xs font-semibold uppercase tracking-wider">
          Your email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          defaultValue={emailState.email}
          placeholder="you@example.com"
          className={input}
        />
        {emailState.error && <p className="mt-3 font-bold text-flare">{emailState.error}</p>}
        <button className={button} disabled={sending}>
          {sending ? "Sending…" : "Send me a code →"}
        </button>
        <p className="mt-4 text-sm text-ink/60">No password. We send a 6-digit code. Nothing to forget, which is on brand.</p>
      </form>
    );
  }

  return (
    <form action={codeAction} className="mt-8">
      <input type="hidden" name="email" value={emailState.email} />
      <input type="hidden" name="next" value={next} />
      <p className="text-lg">
        We sent a code to <strong>{emailState.email}</strong>.
      </p>
      <label htmlFor="code" className="mb-2 mt-6 block font-mono text-xs font-semibold uppercase tracking-wider">
        6-digit code
      </label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        placeholder="••••••"
        className={`${input} text-center font-mono text-4xl tracking-[0.5em]`}
      />
      {codeState.error && <p className="mt-3 font-bold text-flare">{codeState.error}</p>}
      <button className={button} disabled={checking}>
        {checking ? "Checking…" : "Sign in"}
      </button>
      {process.env.NODE_ENV !== "production" && (
        <a
          href="/dev/mailbox"
          target="_blank"
          className="mt-4 inline-block rounded-lg border-2 border-dashed border-ink px-3 py-1.5 font-mono text-xs font-bold"
        >
          DEV: open the mailbox →
        </a>
      )}
    </form>
  );
}
