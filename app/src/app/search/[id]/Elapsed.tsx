"use client";

import { useEffect, useState } from "react";

/** A running timer while the AI looks, counted from when the server started the search (UTC). */
export function Elapsed({ startedAt }: { startedAt: string | null }) {
  const [start] = useState(() => (startedAt ? Date.parse(startedAt.replace(" ", "T") + "Z") : Date.now()));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono tabular-nums" data-testid="elapsed">
      {((now - start) / 1000).toFixed(1)} s
    </span>
  );
}
