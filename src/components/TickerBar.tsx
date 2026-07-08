"use client";

import { useEffect, useState } from "react";

interface RatePair {
  pair: string;
  value: number;
  change: number | null;
  changePct: number | null;
}

export default function TickerBar() {
  const [pairs, setPairs] = useState<RatePair[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRates() {
      try {
        const res = await fetch("/api/fx-rates", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (data.error) {
          setError(data.error);
          return;
        }

        setError(null);
        setPairs(data.pairs);
        setUpdatedAt(new Date().toLocaleTimeString());
      } catch {
        if (!cancelled) setError("Connection lost");
      }
    }

    fetchRates();
    const interval = setInterval(fetchRates, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const items = pairs.length > 0 ? [...pairs, ...pairs] : [];

  return (
    <div className="w-full overflow-hidden border-b border-amber-900/60 bg-neutral-950">
      <div className="flex items-center">
        <div className="z-10 flex shrink-0 items-center gap-2 border-r border-amber-900/60 bg-neutral-950 px-3 py-2 text-[11px] font-semibold tracking-widest text-amber-400">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          FX LIVE
          {updatedAt && (
            <span className="tabular hidden text-[10px] font-normal text-neutral-500 sm:inline">
              {updatedAt}
            </span>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden">
          {error ? (
            <div className="px-4 py-2 text-xs text-amber-500">
              ⚠ {error} — retrying every 60s
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-2 text-xs text-neutral-500">
              Connecting to FX feed…
            </div>
          ) : (
            <div className="animate-ticker flex w-max gap-7 whitespace-nowrap py-2">
              {items.map((p, i) => {
                const dir =
                  p.change === null || p.change === 0
                    ? "flat"
                    : p.change > 0
                      ? "up"
                      : "down";
                const dirClass =
                  dir === "up"
                    ? "text-emerald-400"
                    : dir === "down"
                      ? "text-red-400"
                      : "text-neutral-500";
                return (
                  <div
                    key={`${p.pair}-${i}`}
                    className="flex items-baseline gap-2 px-2 text-xs"
                  >
                    <span className="text-[10px] font-semibold tracking-wider text-neutral-400">
                      {p.pair}
                    </span>
                    <span className="tabular font-semibold text-amber-300">
                      {p.value.toFixed(4)}
                    </span>
                    {p.changePct !== null && (
                      <span className={`tabular text-[10px] ${dirClass}`}>
                        {dir === "up" ? "▲" : dir === "down" ? "▼" : "•"}
                        {Math.abs(p.changePct).toFixed(2)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
