// Membuktikan klien publik (publishable/anon key) tidak bisa membaca atau menulis
// tabel apa pun. Memakai nilai publik dari frontend/.env.local (lihat README).
// Hanya mencetak nama tabel dan status HTTP, tidak pernah isi data atau kunci.
import { probePublicTable } from "./lib/rls-probe";

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

const results = await Promise.all(
  TABLES.flatMap((t) => [probePublicTable(url, key, t, "baca"), probePublicTable(url, key, t, "tulis")]),
);

for (const r of results) {
  console.info(`${r.blocked ? "DITOLAK" : "BELUM TERBUKTI"} ${r.action.padEnd(5)} ${r.table} (${r.status === null ? "jaringan tidak tersedia" : `HTTP ${r.status}`})`);
}

const unproven = results.filter((r) => !r.blocked);
if (unproven.length > 0) {
  console.error(`RLS BELUM TERBUKTI: ${unproven.length} pemeriksaan belum membuktikan penolakan akses publik.`);
  // Biarkan koneksi HTTP dan keluaran selesai dibersihkan sebelum proses tutup.
  process.exitCode = 1;
} else {
  console.info("RLS OK: semua akses publik ditolak.");
}
