type LoginPageProps = {
  searchParams: Promise<{ error?: string; from?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "1";
  const from = params.from ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm border border-emerald-900 bg-neutral-950 p-6 font-mono shadow-[0_0_30px_rgba(16,185,129,0.08)]">
        <div className="mb-6 text-center">
          <div className="text-xs tracking-[0.3em] text-emerald-500">
            FX LEAD TERMINAL
          </div>
          <div className="mt-1 text-[10px] text-neutral-500">
            AUTHORIZED ACCESS ONLY
          </div>
        </div>

        <form action="/api/login" method="POST" className="space-y-4">
          <input type="hidden" name="from" value={from} />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-400">
              Terminal Password
            </label>
            <input
              type="password"
              name="password"
              autoFocus
              required
              className="w-full border border-neutral-700 bg-black px-3 py-2 text-sm text-emerald-400 outline-none focus:border-emerald-600"
              placeholder="••••••••"
            />
          </div>

          {hasError && (
            <div className="border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">
              Incorrect password. Try again.
            </div>
          )}

          <button
            type="submit"
            className="w-full border border-emerald-700 bg-emerald-950/40 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-900/40"
          >
            CONNECT →
          </button>
        </form>
      </div>
    </div>
  );
}
