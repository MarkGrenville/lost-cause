"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetch the mailbox every 2s so new codes just appear. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [router]);
  return <p className="mt-6 text-center font-mono text-xs text-ink/50">Refreshing every 2 seconds</p>;
}
