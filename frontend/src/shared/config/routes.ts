// Satu sumber alamat halaman (docs/design/screen-map.md). Halaman dibuat di branch fiturnya.
export const ROUTES = {
  home: "/",
  welcome: "/welcome",
  login: "/login",
  register: "/register",
  consent: "/consent",
  scan: "/scan",
  medicines: "/medicines",
  newMedicine: "/medicines/new",
  settings: "/settings",
  outputPreference: "/output-preference",
} as const;

/** Mode verifikasi dari kartu dosis/banner: `/scan?dosis=<slotId>` (docs/01 §5, PRD §19 #10). */
export function scanForDose(slotId: string): string {
  return `${ROUTES.scan}?dosis=${encodeURIComponent(slotId)}`;
}

export function medicineDetail(id: string): string {
  return `${ROUTES.medicines}/${encodeURIComponent(id)}`;
}

/**
 * Layar pilihan Teks/Suara, lalu kembali ke `next` (mis. hasil scan pertama, docs/08 §1D).
 * Hanya alamat internal yang diterima agar tidak bisa dipakai mengalihkan ke situs lain.
 */
export function outputPreferenceThen(next?: string): string {
  return next ? `${ROUTES.outputPreference}?next=${encodeURIComponent(next)}` : ROUTES.outputPreference;
}

/** Tujuan kembali yang aman: hanya path internal ("/…", bukan "//…"). */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
