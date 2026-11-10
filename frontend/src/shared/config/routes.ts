// Satu sumber alamat halaman (docs/design/screen-map.md). Halaman dibuat di branch fiturnya.
export const ROUTES = {
  home: "/",
  welcome: "/welcome",
  login: "/login",
  register: "/register",
  scan: "/scan",
  medicines: "/medicines",
  newMedicine: "/medicines/new",
  settings: "/settings",
} as const;

/** Mode verifikasi dari kartu dosis/banner: `/scan?dosis=<slotId>` (docs/01 §5, PRD §19 #10). */
export function scanForDose(slotId: string): string {
  return `${ROUTES.scan}?dosis=${encodeURIComponent(slotId)}`;
}

export function medicineDetail(id: string): string {
  return `${ROUTES.medicines}/${encodeURIComponent(id)}`;
}
