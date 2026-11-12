import { scanResponseSchema, type ScanResponse } from "../schemas/scan-response";

export const scanMedicineFixture = {
  id: "obat-a", name: "Obat Uji", strength: "5 mg", purpose: "Kegunaan uji", doseAmount: "1 tablet", usageRule: "Sesudah makan",
  warnings: "Tidak ada larangan khusus", notes: null, labelSource: "keluarga", explanationOrigin: "teks_pengisi", explanation: null,
} as const;
export const scanSlotFixture = {
  slotId: "obat-a:20261112:0700", medicineId: "obat-a", scheduledAt: "2026-11-12T00:00:00.000Z", scheduledDate: "2026-11-12", scheduledTime: "07:00",
};
export function scanResponseFixture(outcome: ScanResponse["outcome"] = "bisa_konfirmasi"): ScanResponse {
  const base = { outcome, serverTime: "2026-11-12T00:30:00.000Z" };
  const matched = { ...base, medicine: scanMedicineFixture, readStrength: "5mg", nextDose: null };
  switch (outcome) {
    case "tidak_terbaca": case "tidak_terdaftar": return scanResponseSchema.parse(base);
    case "kekuatan_tidak_terbaca": return scanResponseSchema.parse({ ...base, medicines: [scanMedicineFixture] });
    case "kekuatan_beda": return scanResponseSchema.parse({ ...base, medicines: [scanMedicineFixture], readStrength: "10mg" });
    case "hanya_info": return scanResponseSchema.parse(matched);
    case "dosis_sudah_tercatat": return scanResponseSchema.parse({ ...matched, slots: [scanSlotFixture] });
    case "tunggu_dulu": return scanResponseSchema.parse({ ...matched, otherDueSlots: [{ ...scanSlotFixture, slotId: "obat-b:20261112:0700", medicineId: "obat-b", medicine: { ...scanMedicineFixture, id: "obat-b", name: "Obat Uji Hijau" } }] });
    case "bisa_konfirmasi": return scanResponseSchema.parse({ ...matched, slots: [{ ...scanSlotFixture, scanToken: "token-scan-uji-tidak-untuk-produksi", expiresAt: "2026-11-12T00:35:00.000Z" }] });
  }
}
