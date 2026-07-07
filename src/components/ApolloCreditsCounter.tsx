"use client";

import { useApolloUsage } from "./ApolloUsageContext";

export default function ApolloCreditsCounter() {
  const { creditsUsed } = useApolloUsage();
  return (
    <span className="border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400">
      APOLLO CREDITS USED: <span className="text-emerald-400">{creditsUsed}</span> / 160
    </span>
  );
}
