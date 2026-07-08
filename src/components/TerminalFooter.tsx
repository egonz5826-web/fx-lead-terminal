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

  const keyChip =
    "mr-1 inline-block rounded-[2px] bg-amber-400 px-1 py-px text-[9px] font-bold leading-none text-black";

  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-emerald-900 bg-neutral-950 px-4 py-1.5 text-[10px] text-neutral-500">
      <Link href="/" className="hover:text-amber-300">
        <kbd className={keyChip}>F1</kbd> TERMINAL
      </Link>
      <Link href="/discover" className="hover:text-amber-300">
        <kbd className={keyChip}>F2</kbd> DISCOVER
      </Link>
      <Link href="/settings" className="hover:text-amber-300">
        <kbd className={keyChip}>F3</kbd> SETTINGS
      </Link>
      <button onClick={() => router.refresh()} className="hover:text-amber-300">
        <kbd className={keyChip}>F9</kbd> REFRESH
      </button>
      <span className="ml-auto text-neutral-700">MONEX USA · FX LEAD TERMINAL v2.0</span>
    </footer>
  );
}
