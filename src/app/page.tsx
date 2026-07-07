import Link from "next/link";
import { Suspense } from "react";
import TickerBar from "@/components/TickerBar";
import LeadBoard from "@/components/LeadBoard";
import SignalsFeed from "@/components/SignalsFeed";
import ApolloCreditsCounter from "@/components/ApolloCreditsCounter";
import { ApolloUsageProvider } from "@/components/ApolloUsageContext";
import {
  getApolloCreditsUsed,
  getContactsByLeadIds,
  getExistingClients,
  getLeads,
  getWeights,
} from "@/lib/data";
import { withScores } from "@/lib/scoring";
import { findMatchingClient } from "@/lib/matching";

export const dynamic = "force-dynamic";

async function LeadBoardSection() {
  try {
    const [leads, weights, existingClients] = await Promise.all([
      getLeads(),
      getWeights(),
      getExistingClients(),
    ]);
    const contactsByLead = await getContactsByLeadIds(leads.map((l) => l.id));
    const scored = withScores(leads, weights).map((lead) => ({
      ...lead,
      contacts: contactsByLead[lead.id] ?? [],
      isExistingClient: findMatchingClient(lead, existingClients) !== null,
    }));
    return <LeadBoard leads={scored} />;
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
  const creditsUsed = await getApolloCreditsUsed().catch(() => 0);

  return (
    <ApolloUsageProvider initialCredits={creditsUsed}>
      <div className="flex min-h-screen flex-col">
        <TickerBar />

        <header className="flex items-center justify-between border-b border-emerald-900 bg-neutral-950 px-4 py-3">
          <div>
            <h1 className="text-sm font-bold tracking-widest text-emerald-500">
              FX LEAD TERMINAL
            </h1>
            <p className="text-[10px] text-neutral-500">
              FX sales intelligence · lead scoring · signals
            </p>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <ApolloCreditsCounter />
            <Link href="/discover" className="text-neutral-400 hover:text-emerald-400">
              DISCOVER
            </Link>
            <Link href="/settings" className="text-neutral-400 hover:text-emerald-400">
              SETTINGS
            </Link>
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
              <LeadBoardSection />
            </Suspense>
          </div>
          <div className="lg:w-1/3">
            <div className="h-[600px] lg:h-full">
              <SignalsFeed />
            </div>
          </div>
        </main>
      </div>
    </ApolloUsageProvider>
  );
}
