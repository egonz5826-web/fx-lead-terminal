"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ ok?: string; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (next !== confirm) {
      setStatus({ error: "New passwords don't match." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ error: data.error ?? "Failed to change password." });
        return;
      }
      setStatus({ ok: "Password changed. Use it next time you log in." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setStatus({ error: "Couldn't reach the server. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full border border-neutral-700 bg-black px-2 py-2 text-sm text-amber-300 outline-none focus:border-amber-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">
          Current password
        </label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className={field}
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">
          New password
        </label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className={field}
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-widest text-neutral-500">
          Confirm new password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className={field}
        />
      </div>

      {status?.error && (
        <div className="border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">
          ⚠ {status.error}
        </div>
      )}
      {status?.ok && (
        <div className="border border-emerald-900 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-400">
          ✓ {status.ok}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm font-semibold tracking-widest text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
      >
        {saving ? "SAVING…" : "CHANGE PASSWORD"}
      </button>
    </form>
  );
}
