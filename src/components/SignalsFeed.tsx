import { getSignalsFeed } from "@/lib/signals";

function timeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function SignalsFeed() {
  const signals = await getSignalsFeed();

  return (
    <div className="flex h-full flex-col border border-emerald-900 bg-neutral-950">
      <div className="border-b border-emerald-900 px-3 py-2 text-[11px] font-semibold tracking-widest text-emerald-500">
        SIGNALS FEED
      </div>
      <div className="flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-3 text-xs text-neutral-500">No signals available.</div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {signals.map((s) => (
              <li key={s.id} className="p-3 text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={
                      s.source === "news"
                        ? "text-[10px] font-semibold uppercase tracking-wide text-cyan-500"
                        : "text-[10px] font-semibold uppercase tracking-wide text-amber-500"
                    }
                  >
                    {s.source === "news" ? "FX NEWS" : s.detail?.replace(/_/g, " ")}
                  </span>
                  <span className="shrink-0 text-[10px] text-neutral-500">
                    {timeAgo(s.timestamp)}
                  </span>
                </div>
                {s.link ? (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-200 hover:text-emerald-400 hover:underline"
                  >
                    {s.title}
                  </a>
                ) : (
                  <span className="text-neutral-200">{s.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
