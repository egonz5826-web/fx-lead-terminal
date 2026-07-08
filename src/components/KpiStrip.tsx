interface Kpi {
  label: string;
  value: string;
  tone?: "amber" | "emerald" | "cyan" | "warn" | "muted";
  hint?: string;
}

const TONE_CLASS: Record<NonNullable<Kpi["tone"]>, string> = {
  amber: "text-amber-300",
  emerald: "text-emerald-400",
  cyan: "text-cyan-400",
  warn: "text-red-400",
  muted: "text-neutral-400",
};

export default function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 divide-neutral-800 border border-emerald-900 bg-neutral-950 sm:grid-cols-4 lg:grid-cols-7 lg:divide-x">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="px-3 py-2" title={kpi.hint}>
          <div className="text-[9px] uppercase tracking-widest text-neutral-500">
            {kpi.label}
          </div>
          <div
            className={`mt-0.5 text-lg font-semibold leading-none ${TONE_CLASS[kpi.tone ?? "amber"]}`}
          >
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  );
}
