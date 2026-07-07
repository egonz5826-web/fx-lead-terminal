"use client";

import { useEffect, useState } from "react";

interface RatePair {
  pair: string;
  value: number;
}

export default function TickerBar() {
  const [pairs, setPairs] = useState<RatePair[]>([]);
  const [prevPairs, setPrevPairs] = useState<Record<string, number>>({});
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
        setPairs((current) => {
          const prevMap: Record<string, number> = {};
          current.forEach((p) => (prevMap[p.pair] = p.value));
          setPrevPairs(prevMap);
          return data.pairs;
        });
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
    <div className="w-full overflow-hidden border-b border-emerald-900 bg-neutral-950">
      <div className="flex items-center">
        <div className="z-10 flex shrink-0 items-center gap-2 border-r border-emerald-900 bg-neutral-950 px-3 py-2 text-[11px] font-semibold tracking-widest text-emerald-500">
          FX LIVE
          {updatedAt && (
            <span className="hidden text-[10px] font-normal text-neutral-500 sm:inline">
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
            <div className="animate-ticker flex w-max gap-8 whitespace-nowrap py-2">
              {items.map((p, i) => {
                const prev = prevPairs[p.pair];
                const dir =
                  prev === undefined ? "flat" : p.value > prev ? "up" : p.value < prev ? "down" : "flat";
                return (
                  <div key={`${p.pair}-${i}`} className="flex items-center gap-2 px-2 text-xs">
                    <span className="font-semibold text-neutral-300">{p.pair}</span>
                    <span
                      className={
                        dir === "up"
                          ? "text-emerald-400"
                          : dir === "down"
                            ? "text-red-400"
                            : "text-neutral-400"
                      }
                    >
                      {p.value.toFixed(4)}
                    </span>
                    <span className="text-[10px]">
                      {dir === "up" ? "▲" : dir === "down" ? "▼" : "•"}
                    </span>
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
