"use server";

import { redirect } from "next/navigation";
import { endSession, normaliseEmail, requestLoginCode, safeNext, startSession, verifyLoginCode } from "@/lib/auth";

export type SignInState = { step: "email" | "code"; email?: string; next?: string; error?: string };

export async function sendCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  const next = safeNext(form.get("next"));
  const email = normaliseEmail(String(form.get("email") ?? ""));
  if (!email) return { step: "email", next, error: "That doesn't look like an email address." };

  const res = requestLoginCode(email);
  if (!res.ok) return { step: "email", email, next, error: res.error };
  return { step: "code", email, next };
}

export async function checkCode(prev: SignInState, form: FormData): Promise<SignInState> {
  const email = normaliseEmail(String(form.get("email") ?? ""));
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(form.get("next"));
  if (!email) return { step: "email", next, error: "Start again with your email." };

  const res = verifyLoginCode(email, code);
  if (!res.ok) return { ...prev, step: "code", email, next, error: res.error };

  await startSession(res.userId);
  redirect(next);
}

export async function signOut() {
  await endSession();
  redirect("/");
}
