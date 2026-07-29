import type { LeadWithContacts } from "./LeadBoard";
import { UNASSIGNED } from "@/lib/team";
import { CLAIM_TTL_DAYS, HIDDEN_STATUS } from "@/lib/types";

// Per-rep "start my day" brief: what to act on right now — follow-ups due,
// claims about to expire, and the hottest leads in the pool to grab.
export default function MorningBrief({
  leads,
  currentUser,
  displayName,
}: {
  leads: LeadWithContacts[];
  currentUser: string;
  displayName: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const mine = leads.filter((l) => l.owner === currentUser);

  const dueToday = mine
    .filter((l) => l.follow_up_date && l.follow_up_date <= today)
    .sort((a, b) => (a.follow_up_date ?? "").localeCompare(b.follow_up_date ?? ""));

  const now = Date.now();
  const expiring = mine
    .filter((l) => l.claimed_at && l.status !== "Client" && l.status !== HIDDEN_STATUS)
    .map((l) => {
      const days = Math.ceil(
        CLAIM_TTL_DAYS - (now - new Date(l.claimed_at as string).getTime()) / 86_400_000
      );
      return { lead: l, days };
    })
    .filter((x) => x.days >= 0 && x.days <= 3)
    .sort((a, b) => a.days - b.days);

  const hotPicks = leads
    .filter((l) => l.owner === UNASSIGNED && l.status !== HIDDEN_STATUS && l.ai_score != null)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="border border-emerald-900 bg-neutral-950">
      <div className="border-b border-emerald-900 px-3 py-2 text-[11px] font-semibold tracking-widest text-emerald-500">
        {greeting.toUpperCase()}, {displayName.toUpperCase()} — YOUR DESK
      </div>
      <div className="grid grid-cols-1 gap-px bg-neutral-800 sm:grid-cols-3">
        <Card title="⏰ Follow-ups due" count={dueToday.length} tone="text-amber-400">
          {dueToday.slice(0, 3).map((l) => (
            <Row key={l.id} left={l.company_name} right={l.status} />
          ))}
          {dueToday.length === 0 && <Empty>Nothing due — nice.</Empty>}
        </Card>

        <Card title="⏳ Claims expiring" count={expiring.length} tone="text-red-400">
          {expiring.slice(0, 3).map((x) => (
            <Row
              key={x.lead.id}
              left={x.lead.company_name}
              right={x.days === 0 ? "today" : `${x.days}d`}
            />
          ))}
          {expiring.length === 0 && <Empty>None slipping away.</Empty>}
        </Card>

        <Card title="🎯 Hottest in the pool" count={hotPicks.length} tone="text-cyan-400">
          {hotPicks.map((l) => (
            <Row key={l.id} left={l.company_name} right={`AI ${l.ai_score}`} />
          ))}
          {hotPicks.length === 0 && <Empty>Pool is empty — run Discover.</Empty>}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-950 p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-neutral-400">{title}</span>
        <span className={`tabular text-lg font-bold ${tone}`}>{count}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="truncate text-neutral-200">{left}</span>
      <span className="shrink-0 text-neutral-500">{right}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-neutral-600">{children}</div>;
}
