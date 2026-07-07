"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TerminalFooter() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        router.push("/");
      } else if (e.key === "F2") {
        e.preventDefault();
        router.push("/discover");
      } else if (e.key === "F3") {
        e.preventDefault();
        router.push("/settings");
      } else if (e.key === "F9") {
        e.preventDefault();
        router.refresh();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-emerald-900 bg-neutral-950 px-4 py-1.5 text-[10px] text-neutral-600">
      <Link href="/" className="hover:text-emerald-400">
        <kbd className="text-emerald-600">F1</kbd> TERMINAL
      </Link>
      <Link href="/discover" className="hover:text-emerald-400">
        <kbd className="text-emerald-600">F2</kbd> DISCOVER
      </Link>
      <Link href="/settings" className="hover:text-emerald-400">
        <kbd className="text-emerald-600">F3</kbd> SETTINGS
      </Link>
      <button onClick={() => router.refresh()} className="hover:text-emerald-400">
        <kbd className="text-emerald-600">F9</kbd> REFRESH
      </button>
      <span className="ml-auto">MONEX USA · FX LEAD TERMINAL</span>
    </footer>
  );
}
