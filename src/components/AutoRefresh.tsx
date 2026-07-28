"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps the terminal live: pulls fresh server data when the rep returns to the
// tab and on a gentle interval, so claims/statuses/new leads from teammates
// show up without a manual refresh.
export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, intervalMs);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, [router, intervalMs]);

  return null;
}
