import Link from "next/link";
import { getExistingClientsCount, getWeights } from "@/lib/data";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";
import { updateWeights } from "./actions";
import WeightField from "@/components/WeightField";
import ClientImportForm from "@/components/ClientImportForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let weights = DEFAULT_WEIGHTS;
  let connected = true;
  try {
    weights = await getWeights();
  } catch {
    connected = false;
  }

  const existingClientsCount = await getExistingClientsCount().catch(() => 0);

  const pct = (n: number) => Math.round(n * 100);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-emerald-900 bg-neutral-950 px-4 py-3">
        <h1 className="text-sm font-bold tracking-widest text-emerald-500">
          SCORING ENGINE SETTINGS
        </h1>
        <Link href="/" className="text-xs text-neutral-400 hover:text-emerald-400">
          ← BACK TO TERMINAL
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 p-6">
        {!connected && (
          <div className="mb-4 border border-amber-900 bg-amber-950/20 p-3 text-xs text-amber-400">
            Supabase not connected yet — showing default weights. Changes won&apos;t
            save until the database is set up.
          </div>
        )}

        <p className="mb-6 text-xs text-neutral-400">
          The FX Opportunity Score is a weighted average of three components,
          each scored 0–100 per lead. Adjust the weights below (as
          percentages) to change how much each factor influences the final
          score.
        </p>

        <form action={updateWeights} className="space-y-6">
          <WeightField
            name="weight_volume"
            label="Shipment Volume"
            description="Estimated annual container volume (TEU)"
            defaultValue={pct(weights.weight_volume)}
          />
          <WeightField
            name="weight_corridor"
            label="Corridor Currency"
            description="FX volatility / opportunity of the import corridor's currency"
            defaultValue={pct(weights.weight_corridor)}
          />
          <WeightField
            name="weight_growth"
            label="Growth Trend"
            description="Recent growth momentum in shipments and signals"
            defaultValue={pct(weights.weight_growth)}
          />

          <button
            type="submit"
            className="border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-900/40"
          >
            SAVE WEIGHTS
          </button>
        </form>

        <div className="mt-10">
          <ClientImportForm currentCount={existingClientsCount} />
        </div>
      </main>
    </div>
  );
}
