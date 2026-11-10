import type { Household, OutputMode } from "../domain/household";

// Bentuk respons untuk frontend. ID internal dan pemilik tidak dikirim.
export type HouseholdResponse = {
  dataConsentAt: string | null;
  scanConsentAt: string | null;
  /** null = belum memilih Teks/Suara (ditanyakan setelah scan pertama yang cocok). */
  outputMode: OutputMode | null;
  /** Frontend menyembunyikan tombol hapus akun untuk akun demo. */
  isDemo: boolean;
};

const toIso = (epochMs: number | null): string | null =>
  epochMs === null ? null : new Date(epochMs).toISOString();

export function toHouseholdResponse(household: Household): HouseholdResponse {
  return {
    dataConsentAt: toIso(household.dataConsentAt),
    scanConsentAt: toIso(household.scanConsentAt),
    outputMode: household.outputMode,
    isDemo: household.isDemo,
  };
}
