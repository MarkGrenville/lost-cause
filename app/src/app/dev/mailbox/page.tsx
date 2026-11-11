import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AutoRefresh } from "./AutoRefresh";

export const metadata: Metadata = { title: "DEV mailbox · Lost Cause" };

type Mail = { id: number; to_email: string; subject: string; body: string; created_at: string };

async function Inbox() {
  await connection();
  const mails = db.prepare("SELECT * FROM dev_mailbox ORDER BY id DESC LIMIT 20").all() as Mail[];
  if (mails.length === 0) {
    return <p className="mt-10 text-center text-lg text-ink/60">Empty. Go and ask for a code.</p>;
  }
  return (
    <ul className="mt-8 space-y-4">
      {mails.map((m, i) => {
        const code = m.subject.match(/\b\d{6}\b/)?.[0];
        return (
          <li key={m.id} className={`pop-sm rounded-2xl p-5 ${i === 0 ? "bg-sun" : "bg-white opacity-70"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs font-semibold">
              <span>To: {m.to_email}</span>
              <span>{m.created_at} UTC</span>
            </div>
            <p className="mt-2 text-lg font-extrabold">{m.subject}</p>
            {code && i === 0 && (
              <p className="mt-3 font-mono text-5xl font-extrabold tracking-[0.3em]" data-testid="latest-code">
                {code}
              </p>
            )}
            <p className="mt-3 whitespace-pre-line text-sm text-ink/70">{m.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-screen bg-[repeating-linear-gradient(45deg,#fff4e0_0_24px,#ffe9c2_24px_48px)] px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="pop rounded-3xl bg-ink p-6 text-cream">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-sun">Development only</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">DEV mailbox</h1>
          <p className="mt-2 text-cream/70">
            Not real email. The dev server writes sign-in codes here instead of sending them. This page 404s in
            production.
          </p>
        </div>
        <Suspense fallback={<p className="mt-10 text-center">Checking the post…</p>}>
          <Inbox />
        </Suspense>
        <AutoRefresh />
      </div>
    </div>
  );
}
