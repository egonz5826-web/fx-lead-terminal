const BANDS = [
  { min: 70, fill: "bg-emerald-400", track: "bg-emerald-950", text: "text-emerald-400" },
  { min: 40, fill: "bg-amber-400", track: "bg-amber-950", text: "text-amber-400" },
  { min: 0, fill: "bg-red-400", track: "bg-red-950", text: "text-red-400" },
];

export default function ScoreBar({ score }: { score: number }) {
  const band = BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
  return (
    <div className="flex items-center gap-2">
      <span className={`tabular w-6 text-right font-semibold ${band.text}`}>{score}</span>
      <span className={`relative block h-1.5 w-14 overflow-hidden rounded-sm ${band.track}`}>
        <span
          className={`absolute inset-y-0 left-0 rounded-sm ${band.fill}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </span>
    </div>
  );
}
