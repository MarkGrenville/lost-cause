"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While an order waits for PayFast's ITN, re-check every 3 s for up to 2 minutes. */
export function WaitForItn() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 3000);
    const stop = setTimeout(() => clearInterval(t), 120_000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [router]);
  return null;
}
