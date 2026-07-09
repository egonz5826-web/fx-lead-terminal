import Link from "next/link";
import { redirect } from "next/navigation";
import DiscoverForm from "@/components/DiscoverForm";
import DiscoverLookups from "@/components/DiscoverLookups";
import ApolloCreditsCounter from "@/components/ApolloCreditsCounter";
import { ApolloUsageProvider } from "@/components/ApolloUsageContext";
import TerminalFooter from "@/components/TerminalFooter";
import { getApolloCreditsUsed } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
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

        <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
          <DiscoverForm isAdmin={user.role === "admin"} />
          <DiscoverLookups />
        </main>

        <TerminalFooter />
      </div>
    </ApolloUsageProvider>
  );
}
