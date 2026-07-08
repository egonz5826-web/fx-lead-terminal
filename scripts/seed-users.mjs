// Seeds the 4 team accounts with hashed default passwords.
// Usage: node scripts/seed-users.mjs
// Reads Supabase creds from .env.local. Safe to re-run: upserts by username,
// but it will RESET passwords to defaults — only run on first setup or when
// you deliberately want to reset everyone.

import { readFileSync } from "node:fs";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// Load .env.local
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

const USERS = [
  { username: "emilio", display_name: "Emilio", role: "admin", password: "Emilio2026" },
  { username: "marcel", display_name: "Marcel Remy", role: "rep", password: "Marcel2026" },
  { username: "jesus", display_name: "Jesus Heiras", role: "rep", password: "Jesus2026" },
  { username: "beto", display_name: "Beto Flores", role: "rep", password: "Beto2026" },
];

const rows = [];
for (const u of USERS) {
  rows.push({
    username: u.username,
    display_name: u.display_name,
    role: u.role,
    password_hash: await hashPassword(u.password),
    updated_at: new Date().toISOString(),
  });
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=username`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("Failed:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
console.log("Seeded users:");
for (const u of data) console.log(`  ${u.username} (${u.role}) — ${u.display_name}`);
console.log("\nDefault passwords:");
for (const u of USERS) console.log(`  ${u.username} / ${u.password}`);
