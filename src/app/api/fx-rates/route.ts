import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

const SYMBOLS = "EUR,GBP,JPY,MXN,CNY,CAD";

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

export async function GET() {
  try {
    const latestRes = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${SYMBOLS}`,
      { cache: "no-store" }
    );
    if (!latestRes.ok) {
      throw new Error(`Frankfurter API responded with ${latestRes.status}`);
    }
    const latest: FrankfurterResponse = await latestRes.json();

    // Previous business day's close, for real day-over-day deltas. Frankfurter
    // snaps range queries to business days, so a one-week window always
    // contains at least one prior close.
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
        const hist: { rates: Record<string, Record<string, number>> } =
          await histRes.json();
        const days = Object.keys(hist.rates).sort();
        const lastDay = days[days.length - 1];
        if (lastDay) prevRates = hist.rates[lastDay];
      }
    } catch {
      prevRates = null;
    }

    const current = toPairs(latest.rates);
    const previous = prevRates ? toPairs(prevRates) : null;

    const pairs = current.map((p, i) => {
      const value = Number(p.value.toFixed(4));
      const prev = previous ? Number(previous[i].value.toFixed(4)) : null;
      const change = prev !== null ? Number((value - prev).toFixed(4)) : null;
      const changePct =
        prev !== null && prev !== 0
          ? Number((((value - prev) / prev) * 100).toFixed(2))
          : null;
      return { pair: p.pair, value, change, changePct };
    });

    return NextResponse.json({ date: latest.date, pairs });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch FX rates right now." },
      { status: 502 }
    );
  }
}
