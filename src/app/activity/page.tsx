import Link from "next/link";
import { redirect } from "next/navigation";
import ApolloCreditsCounter from "@/components/ApolloCreditsCounter";
import { ApolloUsageProvider } from "@/components/ApolloUsageContext";
import LiveClock from "@/components/LiveClock";
import SignalsFeed from "@/components/SignalsFeed";
import TerminalFooter from "@/components/TerminalFooter";
import TickerBar from "@/components/TickerBar";
import { getApolloCreditsUsed } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
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
            <h1 className="terminal-glow text-sm font-bold tracking-widest text-emerald-500">FX LEAD TERMINAL</h1>
            <span className="hidden text-[10px] text-neutral-600 lg:inline">MONEX USA · SALES INTELLIGENCE</span>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <LiveClock />
            <ApolloCreditsCounter />
            <span className="border border-neutral-800 bg-black px-2 py-1 text-[10px] text-neutral-400">
              {user.display_name}{isAdmin && <span className="ml-1 text-amber-400">ADMIN</span>}
            </span>
            <Link href="/" className="text-neutral-400 hover:text-amber-400">LEADS</Link>
            <Link href="/discover" className="text-neutral-400 hover:text-amber-400">DISCOVER</Link>
            <Link href="/account" className="text-neutral-400 hover:text-amber-400">ACCOUNT</Link>
            {isAdmin && <Link href="/settings" className="text-neutral-400 hover:text-amber-400">SETTINGS</Link>}
            <form action="/api/logout" method="POST"><button className="text-neutral-400 hover:text-red-400">LOGOUT</button></form>
          </nav>
        </header>
        <main className="flex flex-1 p-4">
          <section className="h-[calc(100vh-155px)] w-full">
            <SignalsFeed />
          </section>
        </main>
        <TerminalFooter />
      </div>
    </ApolloUsageProvider>
  );
}
