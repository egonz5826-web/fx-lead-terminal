import Link from "next/link";
import { redirect } from "next/navigation";
import TerminalFooter from "@/components/TerminalFooter";
import ClientBookView from "@/components/ClientBook";
import { getClientBook } from "@/lib/client-book";
import { getSessionUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const clients = await getClientBook("jesus");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-emerald-900 bg-neutral-950 px-4 py-3">
        <div>
          <h1 className="text-sm font-bold tracking-widest text-emerald-500">
            CLIENT BOOK — JESUS HEIRAS
          </h1>
          <p className="text-[10px] text-neutral-500">
            {clients.length} clients · color-coded by status · every Wednesday brings the follow-up list
          </p>
        </div>
        <Link href="/" className="text-xs text-neutral-400 hover:text-amber-400">
          ← BACK TO TERMINAL
        </Link>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4">
        <ClientBookView clients={clients} />
      </main>

      <TerminalFooter />
    </div>
  );
}
