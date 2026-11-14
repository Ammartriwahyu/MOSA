
export const DEMO_USER_ID = "d3e40000-0000-4000-8000-000000000001";
export const DEMO_HOUSEHOLD_ID = "d3e40000-0000-4000-8000-000000000002";
export const AMLODIPIN_ID = "d3e40000-0000-4000-8000-000000000011";
export const METFORMIN_ID = "d3e40000-0000-4000-8000-000000000012";

const SEEDED_AT = "2026-11-01T00:00:00+07:00";
export const DEMO_DATA_CONSENT_AT = "2026-11-01T08:00:00+07:00";

export type SeedMode = "normal" | "jatuh_tempo";

export type DemoMedicineRow = {
  id: string;
  household_id: string;
  name: string;
  name_normalized: string;
  strength: string;
  strength_normalized: string;
  purpose: string;
  dose_amount: string;
  usage_rule: string;
  warnings: string | null;
  notes: string | null;
  intake_times: string[];
  label_source: "apoteker" | "keluarga";
  explanation: string;
  explanation_origin: "ai_dikonfirmasi";
  active: true;
  created_at: string;
};

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function wibTimeOfDay(now: Date): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function demoMedicines(mode: SeedMode, now: Date): DemoMedicineRow[] {
  const amlodipin: DemoMedicineRow = {
    id: AMLODIPIN_ID,
    household_id: DEMO_HOUSEHOLD_ID,
    name: "Amlodipin",
    name_normalized: "amlodipin",
    strength: "5 mg",
    strength_normalized: "5mg",
    purpose: "Untuk menurunkan tekanan darah tinggi",
    dose_amount: "1 tablet",
    usage_rule: "sesudah makan",
    warnings: "Jangan dihentikan mendadak tanpa izin dokter",
    notes: "Simpan di kotak obat warna biru",
    intake_times: ["07:00", "19:00"],
    label_source: "apoteker",
    explanation:
      "Minum obat ini sesudah makan. Jangan berhenti minum obat ini tiba-tiba tanpa izin dokter. Simpan di kotak obat warna biru.",
    explanation_origin: "ai_dikonfirmasi",
    active: true,
    created_at: SEEDED_AT,
  };

  const metformin: DemoMedicineRow = {
    id: METFORMIN_ID,
    household_id: DEMO_HOUSEHOLD_ID,
    name: "Metformin",
    name_normalized: "metformin",
    strength: "500 mg",
    strength_normalized: "500mg",
    purpose: "Untuk mengendalikan gula darah",
    dose_amount: "1 tablet",
    usage_rule: "bersama makan",
    warnings: "Tidak ada larangan khusus",
    notes: null,

    intake_times: mode === "jatuh_tempo" ? [wibTimeOfDay(now)] : ["12:00", "18:00"],
    label_source: "keluarga",
    explanation: "Minum obat ini bersama makan. Tidak ada larangan khusus.",
    explanation_origin: "ai_dikonfirmasi",
    active: true,
    created_at: SEEDED_AT,
  };

  return [amlodipin, metformin];
}
