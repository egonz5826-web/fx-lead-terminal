import Link from "next/link";
import DiscoverForm from "@/components/DiscoverForm";
import ApolloCreditsCounter from "@/components/ApolloCreditsCounter";
import { ApolloUsageProvider } from "@/components/ApolloUsageContext";
import { getApolloCreditsUsed } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const creditsUsed = await getApolloCreditsUsed().catch(() => 0);

  return (
    <ApolloUsageProvider initialCredits={creditsUsed}>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-emerald-900 bg-neutral-950 px-4 py-3">
          <div>
            <h1 className="text-sm font-bold tracking-widest text-emerald-500">
              DISCOVER LEADS
            </h1>
            <p className="text-[10px] text-neutral-500">
              Search Apollo for real companies matching your target profile
            </p>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <ApolloCreditsCounter />
            <Link href="/" className="text-neutral-400 hover:text-emerald-400">
              ← BACK TO TERMINAL
            </Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 p-6">
          <DiscoverForm />
        </main>
      </div>
    </ApolloUsageProvider>
  );
}
