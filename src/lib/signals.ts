import "server-only";
import Parser from "rss-parser";
import { getSupabaseServerClient } from "./supabase";
import type { LeadEvent, SignalItem } from "./types";

const RSS_FEEDS = [
  "https://www.fxstreet.com/rss/news",
  "https://www.forexlive.com/feed/news",
];

const parser = new Parser({
  timeout: 6000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; FXLeadTerminal/1.0)" },
});

async function fetchFeedHeadlines(url: string): Promise<SignalItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 6).map((item, i) => ({
      id: `${url}-${i}`,
      source: "news" as const,
      title: item.title ?? "Untitled",
      timestamp: item.pubDate ?? new Date().toISOString(),
      link: item.link,
    }));
  } catch {
    return [];
  }
}

function leadEventToSignal(event: LeadEvent): SignalItem {
  return {
    id: event.id,
    source: "lead_event",
    title: event.event_text,
    detail: event.event_type,
    timestamp: event.created_at,
  };
}

export async function getSignalsFeed(): Promise<SignalItem[]> {
  const [feedResults, leadEvents] = await Promise.all([
    Promise.all(RSS_FEEDS.map(fetchFeedHeadlines)),
    fetchLeadEvents(),
  ]);

  const news = feedResults.flat();
  const events = leadEvents.map(leadEventToSignal);

  return [...news, ...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

async function fetchLeadEvents(): Promise<LeadEvent[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("lead_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
