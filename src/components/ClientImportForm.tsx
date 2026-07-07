"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { processClientRows, type ParsedClientRow } from "@/lib/clientCsv";

const BATCH_SIZE = 2000;

type Status =
  | { phase: "idle" }
  | { phase: "parsing" }
  | { phase: "uploading"; done: number; total: number }
  | { phase: "done"; imported: number; skipped: number }
  | { phase: "error"; message: string };

export default function ClientImportForm({ currentCount }: { currentCount: number }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus({ phase: "error", message: "Please choose a CSV file to upload." });
      return;
    }

    setStatus({ phase: "parsing" });

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: async (results) => {
        const headers = results.meta.fields ?? [];
        const { rows, skippedNoConsultant, error } = processClientRows(results.data, headers);

        if (error) {
          setStatus({ phase: "error", message: error });
          return;
        }
        if (rows.length === 0) {
          setStatus({
            phase: "error",
            message: "No rows with an assigned consultant found in that file.",
          });
          return;
        }

        await uploadInBatches(rows, skippedNoConsultant);
      },
      error: (err: Error) => {
        setStatus({ phase: "error", message: `Couldn't read that file: ${err.message}` });
      },
    });
  }

  async function uploadInBatches(rows: ParsedClientRow[], skipped: number) {
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    let imported = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batch = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      setStatus({ phase: "uploading", done: i, total: totalBatches });

      try {
        const res = await fetch("/api/clients/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch, reset: i === 0 }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus({
            phase: "error",
            message: `${data.error ?? "Upload failed"} (after ${imported} accounts imported)`,
          });
          return;
        }
        imported += data.inserted;
      } catch {
        setStatus({
          phase: "error",
          message: `Connection lost during upload (after ${imported} accounts imported)`,
        });
        return;
      }
    }

    setStatus({ phase: "done", imported, skipped });
    router.refresh();
  }

  const isBusy = status.phase === "parsing" || status.phase === "uploading";

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-200">
          Existing Clients (Salesforce CSV)
        </span>
        <span className="text-[10px] text-neutral-500">
          {currentCount} account{currentCount === 1 ? "" : "s"} loaded
        </span>
      </div>
      <p className="mb-3 text-[10px] text-neutral-500">
        Upload a CSV export of your Salesforce Accounts report — any size, even
        hundreds of thousands of rows. Leads matching an account by name or
        website will be flagged as existing clients on the lead board.
        Re-uploading replaces the previous list.
      </p>

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          name="clients_csv"
          accept=".csv,text/csv"
          required
          disabled={isBusy}
          className="flex-1 text-xs text-neutral-400 file:mr-3 file:border file:border-neutral-700 file:bg-neutral-900 file:px-2 file:py-1 file:text-[10px] file:text-neutral-300"
        />
        <button
          type="submit"
          disabled={isBusy}
          className="whitespace-nowrap border border-emerald-700 bg-emerald-950/40 px-3 py-1.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          {isBusy ? "WORKING…" : "UPLOAD"}
        </button>
      </form>

      {status.phase === "parsing" && (
        <div className="mt-2 text-[10px] text-neutral-400">Reading file…</div>
      )}
      {status.phase === "uploading" && (
        <div className="mt-2 text-[10px] text-neutral-400">
          Uploading batch {status.done + 1} of {status.total}…
        </div>
      )}
      {status.phase === "error" && (
        <div className="mt-2 border border-amber-900 bg-amber-950/20 p-2 text-[10px] text-amber-400">
          ⚠ {status.message}
        </div>
      )}
      {status.phase === "done" && (
        <div className="mt-2 border border-emerald-900 bg-emerald-950/20 p-2 text-[10px] text-emerald-400">
          ✓ Imported {status.imported} accounts.
          {status.skipped > 0 && (
            <span className="text-neutral-400">
              {" "}
              Skipped {status.skipped} row{status.skipped === 1 ? "" : "s"} with no
              consultant assigned (not treated as real clients).
            </span>
          )}
        </div>
      )}
    </div>
  );
}
