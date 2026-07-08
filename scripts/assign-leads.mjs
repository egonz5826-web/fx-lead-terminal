// One-time: distributes all current leads round-robin by FX score across the
// team, so everyone gets a fair mix of high- and low-scoring leads and nobody
// overlaps. Usage: node scripts/assign-leads.mjs

import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const OWNERS = ["emilio", "marcel", "jesus", "beto"];

// Fetch weights
const wRes = await fetch(`${URL_}/rest/v1/settings?id=eq.1&select=weight_volume,weight_corridor,weight_growth`, { headers });
const [w] = await wRes.json();
const W = w ?? { weight_volume: 0.4, weight_corridor: 0.35, weight_growth: 0.25 };

// Fetch all leads
const lRes = await fetch(`${URL_}/rest/v1/leads?select=id,volume_score,corridor_score,growth_score`, { headers });
const leads = await lRes.json();

const totalW = W.weight_volume + W.weight_corridor + W.weight_growth;
for (const l of leads) {
  l.score = (l.volume_score * W.weight_volume + l.corridor_score * W.weight_corridor + l.growth_score * W.weight_growth) / totalW;
}
leads.sort((a, b) => b.score - a.score);

const counts = {};
for (let i = 0; i < leads.length; i++) {
  const owner = OWNERS[i % OWNERS.length];
  counts[owner] = (counts[owner] ?? 0) + 1;
  const res = await fetch(`${URL_}/rest/v1/leads?id=eq.${leads[i].id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ owner }),
  });
  if (!res.ok) {
    console.error("Failed to assign", leads[i].id, res.status, await res.text());
    process.exit(1);
  }
}

console.log(`Assigned ${leads.length} leads round-robin by score:`);
for (const o of OWNERS) console.log(`  ${o}: ${counts[o]}`);
