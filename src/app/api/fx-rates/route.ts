import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function GET() {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,MXN,CNY,CAD",
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Frankfurter API responded with ${res.status}`);
    }

    const data: FrankfurterResponse = await res.json();
    const r = data.rates;

    const pairs = [
      { pair: "EUR/USD", value: 1 / r.EUR },
      { pair: "GBP/USD", value: 1 / r.GBP },
      { pair: "USD/JPY", value: r.JPY },
      { pair: "USD/MXN", value: r.MXN },
      { pair: "USD/CNY", value: r.CNY },
      { pair: "USD/CAD", value: r.CAD },
    ].map((p) => ({ ...p, value: Number(p.value.toFixed(4)) }));

    return NextResponse.json({ date: data.date, pairs });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch FX rates right now." },
      { status: 502 }
    );
  }
}
