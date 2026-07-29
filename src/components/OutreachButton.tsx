"use client";

import { useState } from "react";

interface Draft {
  email_subject: string;
  email_body: string;
  call_opener: string;
}

export default function OutreachButton({
  leadId,
  companyName,
}: {
  leadId: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [trigger, setTrigger] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function generate() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't draft outreach.");
        return;
      }
      setDraft(data.draft);
      setTrigger(data.trigger ?? null);
    } catch {
      setError("Couldn't reach the AI. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      <button
        onClick={generate}
        title="AI-draft a cold email + call opener tailored to this lead"
        className="mt-1 block text-[9px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-amber-400"
      >
        ✍️ draft outreach
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-auto border border-emerald-900 bg-neutral-950 p-4 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-widest text-emerald-500">
                OUTREACH — {companyName.toUpperCase()}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-500 hover:text-neutral-300"
              >
                ✕
              </button>
            </div>

            {trigger && (
              <div className="mb-3 border border-amber-800 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-400">
                🔥 Why now: {trigger}
              </div>
            )}

            {loading && (
              <div className="py-6 text-center text-xs text-neutral-400">
                Drafting personalized outreach…
              </div>
            )}

            {error && (
              <div className="border border-amber-900 bg-amber-950/20 p-2 text-xs text-amber-400">
                ⚠ {error}
              </div>
            )}

            {draft && (
              <div className="space-y-3">
                <Section
                  label="Email subject"
                  value={draft.email_subject}
                  onCopy={() => copy(draft.email_subject, "subject")}
                  copied={copied === "subject"}
                />
                <Section
                  label="Email body"
                  value={draft.email_body}
                  onCopy={() => copy(draft.email_body, "body")}
                  copied={copied === "body"}
                  multiline
                />
                <Section
                  label="Phone opener"
                  value={draft.call_opener}
                  onCopy={() => copy(draft.call_opener, "opener")}
                  copied={copied === "opener"}
                  multiline
                />
                <button
                  onClick={generate}
                  className="border border-neutral-700 px-3 py-1 text-[11px] font-semibold text-neutral-300 hover:border-emerald-700 hover:text-emerald-400"
                >
                  ↻ Regenerate
                </button>
                <p className="text-[10px] text-neutral-600">
                  AI draft — review and personalize before sending. Uses a fraction of a cent.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  label,
  value,
  onCopy,
  copied,
  multiline = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
        <button
          onClick={onCopy}
          className="text-[10px] font-semibold text-emerald-400 hover:text-amber-400"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <div
        className={`border border-neutral-800 bg-black p-2 text-xs text-neutral-200 ${
          multiline ? "whitespace-pre-wrap" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
