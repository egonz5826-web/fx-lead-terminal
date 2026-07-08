import Link from "next/link";
import { Suspense } from "react";
import TickerBar from "@/components/TickerBar";
import LeadBoard from "@/components/LeadBoard";
import SignalsFeed from "@/components/SignalsFeed";
import ApolloCreditsCounter from "@/components/ApolloCreditsCounter";
import { ApolloUsageProvider } from "@/components/ApolloUsageContext";
import TerminalFooter from "@/components/TerminalFooter";
import KpiStrip from "@/components/KpiStrip";
import LiveClock from "@/components/LiveClock";
import {
  getApolloCreditsUsed,
  getContactsByLeadIds,
  getExistingClients,
  getLeads,
  getWeights,
} from "@/lib/data";
import { withScores } from "@/lib/scoring";
import { findMatchingClient } from "@/lib/matching";
import { getSessionUser } from "@/lib/users";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function LeadBoardSection({ isAdmin, owner }: { isAdmin: boolean; owner: string }) {
  try {
    const [leads, weights, existingClients] = await Promise.all([
      getLeads(isAdmin ? undefined : owner),
      getWeights(),
      getExistingClients(),
    ]);
    const contactsByLead = await getContactsByLeadIds(leads.map((l) => l.id));
    const scored = withScores(leads, weights).map((lead) => ({
      ...lead,
      contacts: contactsByLead[lead.id] ?? [],
      isExistingClient: findMatchingClient(lead, existingClients) !== null,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const countBy = (status: string) =>
      scored.filter((l) => l.status === status).length;
    const dueCount = scored.filter(
      (l) => l.follow_up_date && l.follow_up_date <= today
    ).length;
    const avgScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, l) => sum + l.fx_opportunity_score, 0) / scored.length
          )
        : 0;
    const enrichedContacts = scored.reduce((sum, l) => sum + l.contacts.length, 0);

    const kpis = [
      { label: "Leads", value: String(scored.length) },
      { label: "Prospects", value: String(countBy("Prospect")), tone: "cyan" as const },
      { label: "Clients", value: String(countBy("Client")), tone: "emerald" as const },
      { label: "Contacted", value: String(countBy("Contacted")) },
      {
        label: "Follow-ups due",
        value: String(dueCount),
        tone: dueCount > 0 ? ("warn" as const) : ("muted" as const),
        hint: "Leads with a follow-up date of today or earlier",
      },
      { label: "Avg FX score", value: String(avgScore) },
      { label: "Contacts found", value: String(enrichedContacts), tone: "muted" as const },
    ];

    return (
      <div className="flex flex-col gap-3">
        <KpiStrip kpis={kpis} />
        <LeadBoard leads={scored} isAdmin={isAdmin} />
      </div>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-400">
        <p className="font-semibold">Supabase not connected yet.</p>
        <p className="mt-1 text-xs text-amber-500/80">{message}</p>
      </div>
    );
  }
}

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";
  const creditsUsed = await getApolloCreditsUsed().catch(() => 0);

  return (
    <ApolloUsageProvider initialCredits={creditsUsed}>
      <div className="flex min-h-screen flex-col">
        <TickerBar />

        <header className="flex items-center justify-between border-b border-emerald-900 bg-neutral-950 px-4 py-2.5">
          <div className="flex items-baseline gap-4">
            <h1 className="terminal-glow text-sm font-bold tracking-widest text-emerald-500">
              FX LEAD TERMINAL
            </h1>
            <span className="hidden text-[10px] text-neutral-600 lg:inline">
              MONEX USA · SALES INTELLIGENCE
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <LiveClock />
            <ApolloCreditsCounter />
            <span className="border border-neutral-800 bg-black px-2 py-1 text-[10px] text-neutral-400">
              {user.display_name}
              {isAdmin && <span className="ml-1 text-amber-400">ADMIN</span>}
            </span>
            <Link href="/discover" className="text-neutral-400 hover:text-amber-400">
              DISCOVER
            </Link>
            <Link href="/account" className="text-neutral-400 hover:text-amber-400">
              ACCOUNT
            </Link>
            {isAdmin && (
              <Link href="/settings" className="text-neutral-400 hover:text-amber-400">
                SETTINGS
              </Link>
            )}
            <form action="/api/logout" method="POST">
              <button className="text-neutral-400 hover:text-red-400">LOGOUT</button>
            </form>
          </nav>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
          <div className="flex-1 lg:w-2/3">
            <Suspense
              fallback={
                <div className="border border-emerald-900 bg-neutral-950 p-4 text-xs text-neutral-500">
                  Loading lead board…
                </div>
              }
            >
              <LeadBoardSection isAdmin={isAdmin} owner={user.username} />
            </Suspense>
          </div>
          <div className="lg:w-1/3">
            <div className="h-[600px] lg:h-full">
              <SignalsFeed />
            </div>
          </div>
        </main>

        <TerminalFooter />
      </div>
    </ApolloUsageProvider>
  );
}
