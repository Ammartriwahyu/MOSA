import type { DomainError } from "../../../../shared/domain/domain-error";
import type { Result } from "../../../../shared/domain/result";
import type { RegisteredMedicine } from "../../domain/package-reading";
import type { VerificationDose, VerificationSlot } from "../../domain/verification-outcome";

export type ScanMedicine = RegisteredMedicine & {
  readonly purpose: string; readonly doseAmount: string; readonly usageRule: string;
  readonly warnings: string; readonly notes: string | null; readonly labelSource: "apoteker" | "keluarga";
  readonly explanation: string | null; readonly explanationOrigin: "ai_dikonfirmasi" | "teks_pengisi";
};
export type ScanNextDose = { readonly slot: VerificationSlot; readonly tanggal: "hari_ini" | "besok"; readonly kelompok: "pagi" | "siang" | "malam"; readonly jam: string };
export type ScanSnapshot = {
  readonly medicines: readonly ScanMedicine[];
  readonly doses: readonly VerificationDose[];
  readonly nextDoses: readonly { medicineId: string; nextDose: ScanNextDose | null }[];
};
export interface ScanContextReader {
  read(input: { householdId: string; now: number; slotId?: string }): Promise<Result<ScanSnapshot, DomainError>>;
}
export interface ScanConsentReader {
  hasConsent(householdId: string): Promise<Result<boolean, DomainError>>;
}
