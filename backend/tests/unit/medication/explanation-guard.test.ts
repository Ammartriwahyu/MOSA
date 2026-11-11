import { describe, expect, test } from "vitest";
import { isFaithfulExplanation } from "../../../src/modules/medication/domain/services/explanation-guard";

// Data fiktif.
const SOURCE = "Diminum 2 x 1 tablet sesudah makan, jam 07.00 dan 19.00\nJangan diminum bersama susu";

describe("isFaithfulExplanation", () => {
  test("penyederhanaan yang setia lolos, termasuk jam yang ditulis ulang", () => {
    expect(isFaithfulExplanation(SOURCE, "Minum 1 tablet, 2 kali sehari sesudah makan: jam 7 pagi dan jam 19.00. Jangan minum bersama susu.")).toBe(true);
  });

  test("angka baru ditolak (takaran tidak boleh berubah)", () => {
    expect(isFaithfulExplanation(SOURCE, "Minum 3 tablet sesudah makan.")).toBe(false);
    expect(isFaithfulExplanation(SOURCE, "Minum 1 tablet selama 5 hari.")).toBe(false);
  });

  test("angka dalam kata di sumber boleh ditulis sebagai angka", () => {
    expect(isFaithfulExplanation("Minum tiga kali sehari", "Minum 3 kali sehari.")).toBe(true);
    expect(isFaithfulExplanation("Minum tiga kali sehari", "Minum 4 kali sehari.")).toBe(false);
  });

  test("anjuran, diagnosis, atau kegunaan baru ditolak", () => {
    expect(isFaithfulExplanation(SOURCE, "Obat ini untuk darah tinggi.")).toBe(false);
    expect(isFaithfulExplanation(SOURCE, "Tanyakan ke dokter bila ragu.")).toBe(false);
    expect(isFaithfulExplanation(SOURCE, "Obat ini menyembuhkan sakit kepala.")).toBe(false);
  });

  test("istilah yang sudah ada di sumber boleh dipakai", () => {
    expect(isFaithfulExplanation("Sesuai petunjuk dokter", "Ikuti petunjuk dokter.")).toBe(true);
  });

  test("tautan atau markup ditolak", () => {
    expect(isFaithfulExplanation(SOURCE, "Baca www.contoh.test")).toBe(false);
    expect(isFaithfulExplanation(SOURCE, "<b>Minum</b> sesudah makan")).toBe(false);
  });
});
