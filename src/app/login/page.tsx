type LoginPageProps = {
  searchParams: Promise<{ error?: string; from?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "1";
  const from = params.from ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm border border-emerald-900 bg-neutral-950 shadow-[0_0_40px_rgba(16,185,129,0.07)]">
        <div className="flex items-center justify-between border-b border-emerald-900 px-4 py-2">
          <span className="text-[9px] tracking-[0.25em] text-neutral-600">
            MONEX USA
          </span>
          <span className="flex items-center gap-1.5 text-[9px] text-neutral-600">
            <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-emerald-500" />
            SECURE SESSION
          </span>
        </div>

        <div className="p-6 font-mono">
          <div className="mb-6 text-center">
            <div className="terminal-glow text-sm font-bold tracking-[0.3em] text-emerald-500">
              FX LEAD TERMINAL
            </div>
            <div className="mt-1.5 text-[10px] tracking-wider text-neutral-500">
              AUTHORIZED ACCESS ONLY
            </div>
          </div>

          <form action="/api/login" method="POST" className="space-y-4">
            <input type="hidden" name="from" value={from} />
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">
                Username
              </label>
              <div className="mb-3 flex items-center border border-neutral-700 bg-black focus-within:border-amber-500">
                <span className="pl-3 text-xs text-amber-500">&gt;</span>
                <input
                  type="text"
                  name="username"
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="username"
                  required
                  className="w-full bg-transparent px-2 py-2 text-sm text-amber-300 outline-none"
                  placeholder="username"
                />
              </div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">
                Password
              </label>
              <div className="flex items-center border border-neutral-700 bg-black focus-within:border-amber-500">
                <span className="pl-3 text-xs text-amber-500">&gt;</span>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-transparent px-2 py-2 text-sm text-amber-300 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {hasError && (
              <div className="border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">
                ⚠ ACCESS DENIED — incorrect username or password
              </div>
            )}

            <button
              type="submit"
              className="w-full border border-emerald-700 bg-emerald-950/40 py-2 text-sm font-semibold tracking-widest text-emerald-400 transition hover:bg-emerald-900/40"
            >
              CONNECT →
            </button>
          </form>
        </div>

        <div className="border-t border-neutral-900 px-4 py-1.5 text-center text-[9px] text-neutral-700">
          FX LEAD TERMINAL v2.0 · ENCRYPTED
        </div>
      </div>
    </div>
  );
}
