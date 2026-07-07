"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ApolloUsageContextValue {
  creditsUsed: number;
  setCreditsUsed: (n: number) => void;
}

const ApolloUsageContext = createContext<ApolloUsageContextValue | null>(null);

export function ApolloUsageProvider({
  initialCredits,
  children,
}: {
  initialCredits: number;
  children: ReactNode;
}) {
  const [creditsUsed, setCreditsUsed] = useState(initialCredits);
  return (
    <ApolloUsageContext.Provider value={{ creditsUsed, setCreditsUsed }}>
      {children}
    </ApolloUsageContext.Provider>
  );
}

export function useApolloUsage(): ApolloUsageContextValue {
  const ctx = useContext(ApolloUsageContext);
  if (!ctx) {
    throw new Error("useApolloUsage must be used within an ApolloUsageProvider");
  }
  return ctx;
}
