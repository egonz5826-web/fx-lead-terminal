import "server-only";
import Parser from "rss-parser";
import { getSupabaseServerClient } from "./supabase";
import type { LeadEvent, SignalItem } from "./types";

// Multiple sources for redundancy: FXStreet and ForexLive are the richest
// but sit behind Cloudflare, which sometimes blocks data-center IPs (they
// work locally, fail from Vercel). Google News RSS is reliably reachable
// from anywhere, so the feed never comes up empty.
const RSS_FEEDS = [
  "https://www.fxstreet.com/rss/news",
  "https://www.forexlive.com/feed/news",
  "https://news.google.com/rss/search?q=forex%20OR%20%22exchange%20rate%22%20OR%20%22currency%20market%22&hl=en-US&gl=US&ceid=US:en",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

const parser = new Parser();

async function fetchFeedHeadlines(url: string): Promise<SignalItem[]> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const feed = await parser.parseString(xml);
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

  // De-dupe near-identical headlines across sources, keep newest first.
  const news = feedResults.flat();
  const seenTitles = new Set<string>();
  const dedupedNews = news.filter((n) => {
    const key = n.title.toLowerCase().slice(0, 60);
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  const events = leadEvents.map(leadEventToSignal);

  return [...dedupedNews, ...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);
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
