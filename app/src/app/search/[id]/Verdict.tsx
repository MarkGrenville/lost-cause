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
      <div className="case p-6" data-testid="verdict">
        <p className="label text-mint">Status: located</p>
        <p className="mt-2 text-3xl uppercase">Marked as found.</p>
        <p className="mt-1 text-ink/70">Case closed. Thanks for telling us.</p>
      </div>
    );
  }
  if (verdict === "nope") {
    return (
      <div className="case p-6" data-testid="verdict">
        <p className="label text-ink/60">Status: not found</p>
        <p className="mt-2 text-3xl uppercase">Your credit is back.</p>
        <p className="mt-1 text-ink/70">No find, no charge. A photo from another angle often helps.</p>
      </div>
    );
  }
  return (
    <div className="case p-6" data-testid="verdict">
      <p className="text-2xl uppercase">Did you find it?</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <button
          onClick={() => send("found")}
          disabled={busy}
          className="label rounded-[3px] bg-mint px-7 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          Found it
        </button>
        <button
          onClick={() => send("nope")}
          disabled={busy}
          className="label rounded-[3px] border border-ink/30 px-7 py-4 text-sm font-semibold transition hover:border-flare hover:text-flare disabled:opacity-60"
        >
          Nope (credit back)
        </button>
      </div>
      {error && <p className="mt-3 font-semibold text-flare">{error}</p>}
    </div>
  );
}
