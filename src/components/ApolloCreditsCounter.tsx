"use client";

import { useApolloUsage } from "./ApolloUsageContext";

export default function ApolloCreditsCounter() {
  const { creditsUsed } = useApolloUsage();
  return (
    <span className="tabular border border-neutral-800 bg-black px-2 py-1 text-[10px] text-neutral-500">
      APOLLO <span className="font-semibold text-amber-300">{creditsUsed}</span>
      <span className="text-neutral-600"> / 4,000 cr</span>
    </span>
  );
}
