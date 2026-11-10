// Membuktikan klien publik (publishable/anon key) tidak bisa membaca atau menulis
// tabel apa pun. Memakai nilai publik dari frontend/.env.local (lihat README).
// Hanya mencetak nama tabel dan status HTTP, tidak pernah isi data atau kunci.

const TABLES = [
  "households",
  "medicines",
  "dose_confirmations",
  "push_subscriptions",
  "reminder_dispatches",
  "ai_usage",
] as const;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error(
    "Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di frontend/.env.local.",
  );
  process.exit(1);
}

type Check = { table: string; action: "baca" | "tulis"; status: number; blocked: boolean };

async function probe(table: string, action: Check["action"]): Promise<Check> {
  const endpoint = `${url}/rest/v1/${table}${action === "baca" ? "?select=*&limit=1" : ""}`;
  const res = await fetch(endpoint, {
    method: action === "baca" ? "GET" : "POST",
    headers: { apikey: key as string, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: action === "tulis" ? "{}" : undefined,
  });
  // Lolos hanya bila permintaan ditolak (tanpa hak / tabel tak terekspos).
  return { table, action, status: res.status, blocked: !res.ok };
}

const results = await Promise.all(
  TABLES.flatMap((t) => [probe(t, "baca"), probe(t, "tulis")]),
);

for (const r of results) {
  console.info(`${r.blocked ? "DITOLAK " : "TERBUKA!"} ${r.action.padEnd(5)} ${r.table} (HTTP ${r.status})`);
}

const open = results.filter((r) => !r.blocked);
if (open.length > 0) {
  console.error(`RLS GAGAL: ${open.length} akses publik terbuka.`);
  process.exit(1);
}
console.info("RLS OK: semua akses publik ditolak.");

// Menjadikan berkas modul ES agar top-level await sah.
export {};
