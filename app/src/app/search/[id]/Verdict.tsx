"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "Found it" / "Nope". Once per search; "Nope" puts the credit back. */
export function Verdict({ id, verdict }: { id: string; verdict: "found" | "nope" | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(v: "found" | "nope") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/searches/${id}/verdict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ verdict: v }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "That didn't work.");
    setBusy(false);
    router.refresh();
  }

  if (verdict === "found") {
    return (
      <div className="pop rounded-3xl bg-mint p-6" data-testid="verdict">
        <p className="text-3xl font-extrabold tracking-tight">Found it. One less lost cause.</p>
        <p className="mt-1 font-semibold text-ink/70">Thanks for telling us. It helps the circles get better.</p>
      </div>
    );
  }
  if (verdict === "nope") {
    return (
      <div className="pop rounded-3xl bg-white p-6" data-testid="verdict">
        <p className="text-3xl font-extrabold tracking-tight">Nope. Your credit is back.</p>
        <p className="mt-1 font-semibold text-ink/70">No find, no charge. Try another photo from a different angle.</p>
      </div>
    );
  }
  return (
    <div className="pop rounded-3xl bg-ink p-6 text-cream" data-testid="verdict">
      <p className="text-2xl font-extrabold tracking-tight">Did you find it?</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <button
          onClick={() => send("found")}
          disabled={busy}
          className="pop-sm rounded-2xl bg-mint px-7 py-4 text-lg font-extrabold text-ink transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          Found it
        </button>
        <button
          onClick={() => send("nope")}
          disabled={busy}
          className="pop-sm rounded-2xl bg-cream px-7 py-4 text-lg font-extrabold text-ink transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          Nope (credit back)
        </button>
      </div>
      {error && <p className="mt-3 font-bold text-sun">{error}</p>}
    </div>
  );
}
