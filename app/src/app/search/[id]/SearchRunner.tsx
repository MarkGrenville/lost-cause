"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Kicks off the AI search once, then refreshes the page every 2s until it's done. */
export function SearchRunner({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (status === "waiting" && !started.current) {
      started.current = true;
      fetch(`/api/searches/${id}/run`, { method: "POST" }).then(() => router.refresh());
    }
    if (status !== "waiting" && status !== "searching") return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [id, status, router]);

  return null;
}
