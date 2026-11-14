import { DRAFT, NAMA_BELUM_TERLIHAT, OBAT_BELUM_TERDAFTAR, SCAN_OUTCOME, dosisSudahTercatat, jadwalBerikutnya, kekuatanBeda, tungguDulu, tungguDuluTanpaJadwal, verifikasiBenar } from "@/shared/copy";
import type { ScanResponse } from "../schemas/scan-response";

export function scanOutcomeMessages(result: ScanResponse, selectedSlotId: string | null): string[] {
  switch (result.outcome) {
    case "tidak_terbaca": return [NAMA_BELUM_TERLIHAT];
    case "tidak_terdaftar": return [OBAT_BELUM_TERDAFTAR];
    case "kekuatan_tidak_terbaca": return [DRAFT.kekuatanBelumTerlihat];
    case "kekuatan_beda": return result.medicines.map((medicine) => kekuatanBeda({ nama: medicine.name, kekuatanTerbaca: result.readStrength, kekuatanTerdaftar: medicine.strength }));
    case "hanya_info": return [jadwalBerikutnya(result.nextDose)];
    case "dosis_sudah_tercatat": return [
      ...result.slots.map((slot) => dosisSudahTercatat({ nama: result.medicine.name, jam: slot.scheduledTime,
        jamBerikutnya: result.nextDose?.tanggal === "hari_ini" ? result.nextDose.jam : null })),
      jadwalBerikutnya(result.nextDose),
    ];
    case "bisa_konfirmasi": {
      const slot = result.slots.find((row) => row.slotId === selectedSlotId);
      return slot ? [verifikasiBenar({ nama: result.medicine.name, kekuatan: result.medicine.strength, jam: slot.scheduledTime,
        jumlah: result.medicine.doseAmount, aturan: result.medicine.usageRule })] : [SCAN_OUTCOME.chooseSlotHint];
    }
    case "tunggu_dulu": {
      const medicines = [...new Map(result.otherDueSlots.map((row) => [row.medicineId, row.medicine])).values()];
      const fields = { nama: result.medicine.name, kekuatan: result.medicine.strength,
        jatuhTempo: medicines.map((row) => ({ nama: row.name, kekuatan: row.strength })) };
      return [result.nextDose ? tungguDulu({ ...fields, jam: result.nextDose.jam }) : tungguDuluTanpaJadwal(fields)];
    }
  }
}
