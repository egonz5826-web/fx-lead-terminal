// Live FX rates + day-over-day moves from Frankfurter. Shared by the ticker
// API route and the server-rendered board (for volatility triggers).

const SYMBOLS = "EUR,GBP,JPY,MXN,CNY,CAD";

export interface FxPair {
  pair: string;
  value: number;
  change: number | null;
  changePct: number | null;
}

function toPairs(r: Record<string, number>) {
  return [
    { pair: "EUR/USD", value: 1 / r.EUR },
    { pair: "GBP/USD", value: 1 / r.GBP },
    { pair: "USD/JPY", value: r.JPY },
    { pair: "USD/MXN", value: r.MXN },
    { pair: "USD/CNY", value: r.CNY },
    { pair: "USD/CAD", value: r.CAD },
  ];
}

export async function getFxMoves(): Promise<{ date: string | null; pairs: FxPair[] }> {
  try {
    const latestRes = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${SYMBOLS}`,
      { cache: "no-store" }
    );
    if (!latestRes.ok) throw new Error(`Frankfurter responded ${latestRes.status}`);
    const latest: { date: string; rates: Record<string, number> } = await latestRes.json();

    let prevRates: Record<string, number> | null = null;
    try {
      const latestDate = new Date(latest.date);
      const weekAgo = new Date(latestDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const dayBefore = new Date(latestDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const histRes = await fetch(
        `https://api.frankfurter.app/${fmt(weekAgo)}..${fmt(dayBefore)}?from=USD&to=${SYMBOLS}`,
        { next: { revalidate: 3600 } }
      );
      if (histRes.ok) {
        const hist: { rates: Record<string, Record<string, number>> } = await histRes.json();
        const days = Object.keys(hist.rates).sort();
        const lastDay = days[days.length - 1];
        if (lastDay) prevRates = hist.rates[lastDay];
      }
    } catch {
      prevRates = null;
    }

    const current = toPairs(latest.rates);
    const previous = prevRates ? toPairs(prevRates) : null;

    const pairs: FxPair[] = current.map((p, i) => {
      const value = Number(p.value.toFixed(4));
      const prev = previous ? Number(previous[i].value.toFixed(4)) : null;
      const change = prev !== null ? Number((value - prev).toFixed(4)) : null;
      const changePct =
        prev !== null && prev !== 0
          ? Number((((value - prev) / prev) * 100).toFixed(2))
          : null;
      return { pair: p.pair, value, change, changePct };
    });

    return { date: latest.date, pairs };
  } catch {
    return { date: null, pairs: [] };
  }
}

// Pairs whose absolute day-over-day move meets the threshold — the "hot"
// corridors worth calling today. Returns pair -> signed % move.
export function hotPairs(pairs: FxPair[], thresholdPct = 0.4): Record<string, number> {
  const hot: Record<string, number> = {};
  for (const p of pairs) {
    if (p.changePct !== null && Math.abs(p.changePct) >= thresholdPct) {
      hot[p.pair] = p.changePct;
    }
  }
  return hot;
}
