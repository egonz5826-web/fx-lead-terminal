import Link from "next/link";
import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import TerminalFooter from "@/components/TerminalFooter";
import { getSessionUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-emerald-900 bg-neutral-950 px-4 py-3">
        <div>
          <h1 className="text-sm font-bold tracking-widest text-emerald-500">ACCOUNT</h1>
          <p className="text-[10px] text-neutral-500">
            Signed in as {user.display_name}
            {user.role === "admin" ? " · admin" : ""} ({user.username})
          </p>
        </div>
        <Link href="/" className="text-xs text-neutral-400 hover:text-amber-400">
          ← BACK TO TERMINAL
        </Link>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 p-6">
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-amber-400">
          CHANGE PASSWORD
        </h2>
        <ChangePasswordForm />
      </main>

      <TerminalFooter />
    </div>
  );
}
