import Link from "next/link";
import { redirect } from "next/navigation";
import TerminalFooter from "@/components/TerminalFooter";
import { getTeamStats } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

export const dynamic = "force-dynamic";

const FUNNEL: { key: string; label: string; tone: string }[] = [
  { key: "New", label: "New", tone: "text-neutral-300" },
  { key: "Contacted", label: "Contacted", tone: "text-amber-400" },
  { key: "No Answer", label: "No Answer", tone: "text-neutral-400" },
  { key: "Prospect", label: "Prospect", tone: "text-cyan-400" },
  { key: "Client", label: "Client", tone: "text-emerald-400" },
];

export default async function TeamPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const stats = await getTeamStats();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-emerald-900 bg-neutral-950 px-4 py-3">
        <div>
          <h1 className="text-sm font-bold tracking-widest text-emerald-500">
            DESK PERFORMANCE
          </h1>
          <p className="text-[10px] text-neutral-500">
            Team accountability · signed in as {user.display_name}
          </p>
        </div>
        <Link href="/" className="text-xs text-neutral-400 hover:text-amber-400">
          ← BACK TO TERMINAL
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-6">
        {/* Pool health */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total leads" value={stats.pool.total} />
          <Stat label="Unclaimed in pool" value={stats.pool.unclaimed} tone="text-amber-400" />
          <Stat label="Already Monex clients" value={stats.pool.monexClients} tone="text-emerald-400" />
        </div>

        {/* Per-rep table */}
        <div className="overflow-x-auto border border-emerald-900 bg-neutral-950">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="px-3 py-2">Rep</th>
                <th className="px-3 py-2">Working</th>
                {FUNNEL.map((f) => (
                  <th key={f.key} className="px-3 py-2 text-center">
                    {f.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Discovered</th>
                <th className="px-3 py-2 text-center">Due</th>
              </tr>
            </thead>
            <tbody>
              {stats.reps.map((r) => (
                <tr key={r.username} className="border-b border-neutral-900 hover:bg-neutral-900/50">
                  <td className="px-3 py-2 font-medium text-neutral-100">
                    {r.display_name}
                    {r.role === "admin" && (
                      <span className="ml-1 text-[9px] text-amber-400">ADMIN</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular text-neutral-200">{r.owned}</td>
                  {FUNNEL.map((f) => (
                    <td key={f.key} className={`px-3 py-2 text-center tabular ${f.tone}`}>
                      {r.byStatus[f.key] ?? 0}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center tabular text-neutral-300">{r.discovered}</td>
                  <td
                    className={`px-3 py-2 text-center tabular ${
                      r.dueFollowUps > 0 ? "text-amber-400" : "text-neutral-600"
                    }`}
                  >
                    {r.dueFollowUps}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-neutral-600">
          &quot;Working&quot; = leads a rep has claimed. The funnel columns count those claimed leads
          by status. Won deals show under Client. Discovered = leads that rep found via Discover
          (shared to the pool for everyone).
        </p>
      </main>

      <TerminalFooter />
    </div>
  );
}

function Stat({ label, value, tone = "text-neutral-100" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`tabular mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
