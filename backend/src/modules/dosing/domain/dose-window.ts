/** D1: J−30 disetujui PM 11 Nov 2026; J+120 inklusif (docs/05, flow tengah malam). */
export const DOSE_WINDOW = Object.freeze({ opensBeforeMinutes: 30, closesAfterMinutes: 120 });
const MINUTE_MS = 60_000;

export type DoseStatus = "belum_tiba" | "jatuh_tempo" | "terlewat" | "sudah";
export type DoseWindow = { readonly opensAt: number; readonly closesAt: number };

/** Epoch ms dari slot yang tervalidasi; tidak dipotong oleh jadwal obat berikutnya (Q2). */
export function doseWindow(scheduledAt: number): DoseWindow {
  return {
    opensAt: scheduledAt - DOSE_WINDOW.opensBeforeMinutes * MINUTE_MS,
    closesAt: scheduledAt + DOSE_WINDOW.closesAfterMinutes * MINUTE_MS,
  };
}

/** Setiap slot dinilai sendiri; ketika beberapa jatuh tempo, pengguna memilih slot. */
export function classifyDose(input: { scheduledAt: number; now: number; confirmed: boolean }): DoseStatus {
  if (input.confirmed) return "sudah";
  const window = doseWindow(input.scheduledAt);
  if (input.now < window.opensAt) return "belum_tiba";
  if (input.now <= window.closesAt) return "jatuh_tempo";
  return "terlewat";
}
