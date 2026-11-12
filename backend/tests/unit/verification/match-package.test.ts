import { describe, expect, test } from "vitest";
import { matchPackage } from "../../../src/modules/verification/domain/match-package";
import { medicine, other, reading } from "./fixtures";

describe("matchPackage", () => {
  test.each([
    ["legible=false mengalahkan nama dan kekuatan yang cocok", { ...reading, legible: false }, "tidak_terbaca"],
    ["tidak ada nama terbaca", { ...reading, names: [] }, "tidak_terbaca"],
    ["nama kosong atau hanya sediaan", { ...reading, names: ["  ", "Tablet 5 mg"] }, "tidak_terbaca"],
    ["nama lain tetap tidak terdaftar walau kekuatan sama", { ...reading, names: ["Obat Uji Asing"] }, "tidak_terdaftar"],
    ["nama asing mengalahkan kekuatan hilang", { ...reading, names: ["Obat Uji Asing"], strength: null }, "tidak_terdaftar"],
    ["nama cocok dengan kekuatan null", { ...reading, strength: null }, "kekuatan_tidak_terbaca"],
    ["kekuatan kosong", { ...reading, strength: " " }, "kekuatan_tidak_terbaca"],
    ["angka kekuatan tanpa satuan", { ...reading, strength: "5" }, "kekuatan_tidak_terbaca"],
    ["kekuatan tidak dipahami", { ...reading, strength: "lima mg" }, "kekuatan_tidak_terbaca"],
    ["satuan properti bawaan objek bukan satuan kekuatan", { ...reading, strength: "5 constructor" }, "kekuatan_tidak_terbaca"],
    ["angka kekuatan berbeda", { ...reading, strength: "10 mg" }, "kekuatan_beda"],
    ["satuan berbeda tidak dikonversi", { ...reading, strength: "0,005 g" }, "kekuatan_beda"],
    ["normalisasi garam, sediaan, akhiran dan kekuatan", { ...reading, names: ["AMLODIPINE BESYLATE tablet 5mg"] }, "cocok"],
    ["nama generik kedua terbaca, bukan terjemahan merek", { ...reading, names: ["Merek Uji Biru", "Amlodipin"] }, "cocok"],
    ["nama merek saja tidak diterjemahkan", { ...reading, names: ["Merek Uji Biru"] }, "tidak_terdaftar"],
  ])("%s", (_label, input, outcome) => {
    expect(matchPackage(input, [medicine])).toMatchObject({ ok: true, value: { outcome } });
  });

  test("daftar terdaftar kosong tidak menebak obat dari AI", () => {
    expect(matchPackage(reading, [])).toEqual({ ok: true, value: { outcome: "tidak_terdaftar" } });
  });

  test("hasil tidak terdaftar tidak membocorkan tebakan nama/kekuatan AI", () => {
    expect(matchPackage({ ...reading, names: ["Teks Uji Asing"] }, [medicine])).toEqual({ ok: true, value: { outcome: "tidak_terdaftar" } });
  });

  test("ejaan Parasetamol dan Paracetamol tidak dianggap sinonim tanpa keputusan PM", () => {
    expect(matchPackage({ names: ["Paracetamol"], strength: "500 mg", legible: true }, [
      { medicineId: "spelling-test", name: "Parasetamol", strength: "500 mg" },
    ])).toEqual({ ok: true, value: { outcome: "tidak_terdaftar" } });
  });

  test.each(["5mg", "5 miligram", "5.00 MG", "05,0 mg"])("format kekuatan %s setara", (strength) => {
    expect(matchPackage({ ...reading, strength }, [medicine])).toMatchObject({ ok: true, value: { outcome: "cocok", medicine } });
  });

  test.each(["125 mg/5 ml", "125mg / 5ML"])("rasio %s memakai parser yang sama dengan penyimpanan", (strength) => {
    const syrup = { ...medicine, strength: "125 mg/5 ml" };
    expect(matchPackage({ ...reading, strength }, [syrup])).toMatchObject({ ok: true, value: { outcome: "cocok", medicine: syrup } });
  });

  test("rasio dengan penyebut berbeda tidak dianggap cocok", () => {
    expect(matchPackage({ ...reading, strength: "125 mg/10 ml" }, [{ ...medicine, strength: "125 mg/5 ml" }]))
      .toMatchObject({ ok: true, value: { outcome: "kekuatan_beda" } });
  });

  test.each([false, true])("memilih kekuatan yang benar di antara dua obat senama, urutan dibalik=%s", (reverse) => {
    const stronger = { ...medicine, medicineId: "stronger", strength: "10 mg" };
    const registered = reverse ? [medicine, stronger] : [stronger, medicine];
    expect(matchPackage(reading, registered)).toMatchObject({ ok: true, value: { outcome: "cocok", medicine } });
  });

  test("kekuatan beda membawa seluruh kekuatan terdaftar, tidak memilih obat pertama", () => {
    const stronger = { ...medicine, medicineId: "stronger", strength: "10 mg" };
    expect(matchPackage({ ...reading, strength: "20 mg" }, [medicine, stronger])).toMatchObject({
      ok: true, value: { outcome: "kekuatan_beda", medicines: [medicine, stronger], readStrength: { normalized: "20mg" } },
    });
  });

  test("nama terbaca berulang tetap menunjuk satu obat", () => {
    expect(matchPackage({ ...reading, names: ["Amlodipin", "Amlodipine", "Amlodipin"] }, [medicine]))
      .toMatchObject({ ok: true, value: { outcome: "cocok", medicine } });
  });

  test.each([
    ["dua obat senama/sekekuatan", [medicine, { ...medicine, medicineId: "duplicate" }], reading],
    ["dua nama terdaftar berbeda dalam bacaan", [medicine, { ...other, strength: "5 mg" }], { ...reading, names: [medicine.name, other.name] }],
  ])("ambigu: %s tidak memilih berdasarkan urutan atau jadwal", (_label, registered, input) => {
    expect(matchPackage(input, registered)).toEqual({ ok: false, error: {
      code: "VALIDATION_FAILED", message: "Identitas obat perlu diperjelas.", details: { field: "medicineId", reason: "ambiguous_match" },
    } });
  });

  test("input beku tidak diubah", () => {
    const registered = Object.freeze([medicine]);
    expect(matchPackage(reading, registered).ok).toBe(true);
    expect(reading.names).toEqual(["Amlodipine besylate"]);
    expect(registered).toEqual([medicine]);
  });
});
