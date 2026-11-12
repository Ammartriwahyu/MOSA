import { describe, expect, test } from "vitest";
import { decideOutcome } from "../../../src/modules/verification/domain/decide-outcome";
import { matchPackage, type PackageMatch } from "../../../src/modules/verification/domain/match-package";
import type { DoseContext, VerificationDose } from "../../../src/modules/verification/domain/verification-outcome";
import { confirmed, context, due, matching, medicine, morning, nextSlot, otherSlot, reading } from "./fixtures";

function scanned(input: Parameters<typeof matchPackage>[0]): PackageMatch {
  const result = matchPackage(input, [medicine]);
  if (!result.ok) throw new Error("Fixture pencocokan tidak valid");
  return result.value;
}

describe("decideOutcome delapan hasil dan prioritas docs/01 §5", () => {
  const selected = { mode: "selected", slotId: morning.slotId } as const;
  const recordedAndOtherDue = context({ target: selected, doses: [confirmed(), due(otherSlot)] });
  const cases: readonly { label: string; match: PackageMatch; input: DoseContext; outcome: string }[] = [
    { label: "tidak terbaca mendahului konfirmasi lama/obat lain", match: scanned({ ...reading, legible: false }), input: recordedAndOtherDue, outcome: "tidak_terbaca" },
    { label: "nama asing mendahului kekuatan hilang dan konfirmasi lama", match: scanned({ ...reading, names: ["Obat Uji Asing"], strength: null }), input: recordedAndOtherDue, outcome: "tidak_terdaftar" },
    { label: "kekuatan hilang mendahului dosis sudah tercatat", match: scanned({ ...reading, strength: null }), input: recordedAndOtherDue, outcome: "kekuatan_tidak_terbaca" },
    { label: "kekuatan beda mendahului dosis sudah tercatat", match: scanned({ ...reading, strength: "10 mg" }), input: recordedAndOtherDue, outcome: "kekuatan_beda" },
    { label: "slot pilihan sudah tercatat mendahului obat lain jatuh tempo", match: matching(), input: recordedAndOtherDue, outcome: "dosis_sudah_tercatat" },
    { label: "dosis obat cocok mendahului obat lain jatuh tempo", match: matching(), input: context({ doses: [due(), due(otherSlot)] }), outcome: "bisa_konfirmasi" },
    { label: "hanya obat lain jatuh tempo", match: matching(), input: context({ doses: [due(otherSlot)] }), outcome: "tunggu_dulu" },
    { label: "di luar jendela tanpa obat lain jatuh tempo", match: matching(), input: context(), outcome: "hanya_info" },
  ];
  test.each(cases)("$label → $outcome", ({ match, input, outcome }) => {
    const result = decideOutcome(match, input);
    expect(result).toMatchObject({ ok: true, value: { outcome } });
  });

  test.each(["belum_tiba", "terlewat"] as const)("slot %s hanya info dan tanpa slot yang bisa dikonfirmasi", (status) => {
    const result = decideOutcome(matching(), context({ doses: [{ ...morning, status, windowOpen: false }] }));
    expect(result).toMatchObject({ ok: true, value: { outcome: "hanya_info", medicine, nextDose: nextSlot } });
    if (result.ok) expect(result.value).not.toHaveProperty("slots");
  });

  test("dua obat pada jam sama hanya menawarkan slot obat yang terbaca", () => {
    expect(decideOutcome(matching(), context({ doses: [due(otherSlot), due()] })))
      .toMatchObject({ ok: true, value: { outcome: "bisa_konfirmasi", slots: [morning] } });
  });

  test("overlap Q2 mengembalikan semua slot secara kronologis, tanpa memilih salah satu", () => {
    const overlap = { ...morning, slotId: "medicine-a:20261112:0800", scheduledAt: morning.scheduledAt + 3_600_000 };
    expect(decideOutcome(matching(), context({ doses: [due(overlap), due()] })))
      .toMatchObject({ ok: true, value: { outcome: "bisa_konfirmasi", slots: [morning, overlap] } });
  });

  test("pilihan eksplisit pada overlap hanya menawarkan slot pilihan", () => {
    const overlap = { ...morning, slotId: "medicine-a:20261112:0800", scheduledAt: morning.scheduledAt + 3_600_000 };
    expect(decideOutcome(matching(), context({ target: { mode: "selected", slotId: overlap.slotId }, doses: [due(), due(overlap)] })))
      .toMatchObject({ ok: true, value: { outcome: "bisa_konfirmasi", slots: [overlap] } });
  });

  test("slot pilihan sudah tercatat tidak dipindah ke slot lain yang terbuka", () => {
    expect(decideOutcome(matching(), context({ target: selected, doses: [confirmed(), due(nextSlot)] })))
      .toMatchObject({ ok: true, value: { outcome: "dosis_sudah_tercatat", slots: [morning] } });
  });

  test.each(["belum_tiba", "terlewat"] as const)("target %s tidak dipindah ke slot obat sama yang sedang jatuh tempo", (status) => {
    const targetSlot = status === "belum_tiba" ? nextSlot : morning;
    const dueSlot = status === "belum_tiba" ? morning : nextSlot;
    expect(decideOutcome(matching(), context({ target: { mode: "selected", slotId: targetSlot.slotId }, doses: [{ ...targetSlot, status, windowOpen: false }, due(dueSlot)] })))
      .toMatchObject({ ok: true, value: { outcome: "hanya_info" } });
  });

  test("target obat lain tidak diganti meski obat hasil scan juga sedang jatuh tempo", () => {
    expect(decideOutcome(matching(), context({ target: { mode: "selected", slotId: otherSlot.slotId }, doses: [due(), due(otherSlot)] })))
      .toMatchObject({ ok: true, value: { outcome: "tunggu_dulu", otherDueSlots: [otherSlot] } });
  });

  test("target hilang/dihapus menolak, tanpa berpindah ke slot lain", () => {
    expect(decideOutcome(matching(), context({ target: selected, doses: [due(nextSlot)] })))
      .toMatchObject({ ok: false, error: { code: "NOT_FOUND", details: { field: "slotId" } } });
  });

  test("bacaan gagal tetap prioritas pertama ketika target sudah hilang", () => {
    expect(decideOutcome(scanned({ ...reading, legible: false }), context({ target: selected })))
      .toEqual({ ok: true, value: { outcome: "tidak_terbaca" } });
  });

  test("scan generik mengenali dosis tercatat di jendela yang masih terbuka", () => {
    expect(decideOutcome(matching(), context({ doses: [confirmed(), due(otherSlot)] })))
      .toMatchObject({ ok: true, value: { outcome: "dosis_sudah_tercatat", slots: [morning] } });
  });

  test("konfirmasi lama tidak menutupi dosis berikutnya yang jatuh tempo", () => {
    expect(decideOutcome(matching(), context({ doses: [confirmed(morning, false), due(nextSlot)] })))
      .toMatchObject({ ok: true, value: { outcome: "bisa_konfirmasi", slots: [nextSlot] } });
  });

  test("pada overlap, scan generik tetap menawarkan slot yang belum dicatat", () => {
    const overlap = { ...morning, slotId: "medicine-a:20261112:0800", scheduledAt: morning.scheduledAt + 3_600_000 };
    expect(decideOutcome(matching(), context({ doses: [confirmed(), due(overlap)] })))
      .toMatchObject({ ok: true, value: { outcome: "bisa_konfirmasi", slots: [overlap] } });
  });

  test("konfirmasi lama tanpa dosis terbuka menjadi informasi, bukan dosis sekarang sudah tercatat", () => {
    expect(decideOutcome(matching(), context({ doses: [confirmed(morning, false)] })))
      .toMatchObject({ ok: true, value: { outcome: "hanya_info" } });
  });

  test("target yang sudah tercatat tetap dikenali sesudah jendelanya tutup", () => {
    expect(decideOutcome(matching(), context({ target: selected, doses: [confirmed(morning, false)] })))
      .toMatchObject({ ok: true, value: { outcome: "dosis_sudah_tercatat" } });
  });

  test("semua slot obat lain jatuh tempo dikembalikan, selain yang sudah dicatat atau belum tiba", () => {
    const third = { ...otherSlot, medicineId: "medicine-c", slotId: "medicine-c:20261112:0730", scheduledAt: otherSlot.scheduledAt + 1_800_000 };
    expect(decideOutcome(matching(), context({ doses: [due(third), confirmed(), due(otherSlot), { ...nextSlot, status: "belum_tiba", windowOpen: false }], target: { mode: "selected", slotId: nextSlot.slotId } })))
      .toMatchObject({ ok: true, value: { outcome: "tunggu_dulu", otherDueSlots: [otherSlot, third] } });
  });

  test("slot lintas tengah malam mempertahankan ID dan tanggal jadwal asal", () => {
    const carryover = { ...morning, slotId: "medicine-a:20261111:2350", scheduledAt: Date.UTC(2026, 10, 11, 16, 50) };
    expect(decideOutcome(matching(), context({ doses: [due(carryover)] })))
      .toMatchObject({ ok: true, value: { outcome: "bisa_konfirmasi", slots: [carryover] } });
  });

  test("tidak ada jadwal berikutnya tetap null", () => {
    expect(decideOutcome(matching(), context({ nextDose: null })))
      .toMatchObject({ ok: true, value: { outcome: "hanya_info", nextDose: null } });
  });

  test("jadwal berikutnya milik obat lain menolak konteks yang salah", () => {
    expect(decideOutcome(matching(), context({ nextDose: otherSlot })))
      .toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED", details: { field: "nextDose" } } });
  });

  test("input beku tidak diubah atau diurutkan langsung", () => {
    const overlap = { ...morning, slotId: "medicine-a:20261112:0800", scheduledAt: morning.scheduledAt + 3_600_000 };
    const doses: readonly VerificationDose[] = Object.freeze([Object.freeze(due(overlap)), Object.freeze(due())]);
    expect(decideOutcome(matching(), Object.freeze(context({ doses }))).ok).toBe(true);
    expect(doses.map((dose) => dose.slotId)).toEqual([overlap.slotId, morning.slotId]);
  });
});
