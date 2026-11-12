import type { Strength } from "../../../shared/domain/strength";
import type { PackageMismatch } from "./match-package";
import type { RegisteredMedicine } from "./package-reading";

/** Kontrak snapshot dari dosing melalui port; domain verification tidak mengimpor modul dosing. */
export type VerificationSlot = {
  readonly slotId: string;
  readonly medicineId: string;
  readonly scheduledAt: number;
};

export type VerificationDose = VerificationSlot & (
  | { readonly status: "jatuh_tempo"; readonly windowOpen: true }
  | { readonly status: "sudah"; readonly windowOpen: boolean }
  | { readonly status: "belum_tiba" | "terlewat"; readonly windowOpen: false }
);

export type DoseContext = {
  readonly target: { readonly mode: "generic" } | { readonly mode: "selected"; readonly slotId: string };
  readonly doses: readonly VerificationDose[];
  /** Jadwal berikutnya untuk obat yang cocok, dihitung dosing, atau null. */
  readonly nextDose: VerificationSlot | null;
};

type MatchedInfo = {
  readonly medicine: RegisteredMedicine;
  readonly readStrength: Strength;
  readonly nextDose: VerificationSlot | null;
};

export type NonEmptySlots = readonly [VerificationSlot, ...VerificationSlot[]];

/** Keputusan murni: belum ada token, penulisan konfirmasi, atau kalimat UI. */
export type VerificationOutcome = PackageMismatch | (MatchedInfo & (
  | { readonly outcome: "dosis_sudah_tercatat"; readonly slots: NonEmptySlots }
  | { readonly outcome: "bisa_konfirmasi"; readonly slots: NonEmptySlots }
  | { readonly outcome: "tunggu_dulu"; readonly otherDueSlots: NonEmptySlots }
  | { readonly outcome: "hanya_info" }
));
