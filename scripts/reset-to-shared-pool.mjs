// One-time migration to the shared-pool model. Releases every lead back into
// the shared pool (owner = Unassigned) EXCEPT ones already claimed via a
// Prospect/Client status, which stay with whoever is working them.
// Usage: node scripts/reset-to-shared-pool.mjs

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
  Prefer: "return=representation",
};

// Everything that isn't actively being worked (Prospect/Client) goes back to
// the shared pool so all reps can see it.
const res = await fetch(
  `${URL_}/rest/v1/leads?status=not.in.(Prospect,Client)&select=id`,
  {
    method: "PATCH",
    headers,
    body: JSON.stringify({ owner: "Unassigned" }),
  }
);

if (!res.ok) {
  console.error("Failed:", res.status, await res.text());
  process.exit(1);
}

const updated = await res.json();
console.log(`Released ${updated.length} leads into the shared pool.`);
console.log("Prospect/Client leads kept their current owner (still claimed).");
