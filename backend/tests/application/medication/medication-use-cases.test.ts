import { describe, expect, test, vi } from "vitest";
import {
  AI_INPUT_FIELDS,
  ExplainMedicineText,
} from "../../../src/modules/medication/application/explain-medicine-text.use-case";
import {
  CreateMedicine,
  DeactivateMedicine,
  GetMedicine,
  ListMedicines,
  UpdateMedicine,
} from "../../../src/modules/medication/application/medicine-use-cases";
import type { PlainLanguageExplainer } from "../../../src/modules/medication/application/ports/plain-language-explainer";
import type { MedicineInput } from "../../../src/modules/medication/domain/medicine";
import { fixedClock } from "../../../src/shared/domain/clock";
import { domainError } from "../../../src/shared/domain/domain-error";
import { err, ok } from "../../../src/shared/domain/result";
import { InMemoryMedicineRepository } from "../../support/in-memory-medicine-repository";

const NOW = Date.parse("2026-11-11T08:00:00Z"); // 15.00 WIB

// Data fiktif.
const INPUT: MedicineInput = {
  name: "Amlodipin",
  strength: "5 mg",
  purpose: "Untuk menurunkan tekanan darah tinggi",
  doseAmount: "1 tablet",
  usageRule: "sesudah makan",
  warnings: "Jangan dihentikan mendadak",
  notes: "Simpan di kotak biru",
  intakeTimes: ["07:00", "19:00"],
  labelSource: "apoteker",
  explanationOrigin: "ai_dikonfirmasi",
  explanation: "Minum obat ini sesudah makan.",
};

function setup() {
  const repo = new InMemoryMedicineRepository();
  return {
    repo,
    create: new CreateMedicine(repo, fixedClock(NOW)),
    update: new UpdateMedicine(repo),
    list: new ListMedicines(repo),
    get: new GetMedicine(repo),
    deactivate: new DeactivateMedicine(repo),
  };
}

describe("ExplainMedicineText", () => {
  test("hanya aturan pakai, larangan, dan catatan yang dikirim ke AI (docs/01 §2, D4)", async () => {
    const explain = vi.fn<PlainLanguageExplainer["explain"]>(async () => ok("Minum obat ini sesudah makan."));
    const useCase = new ExplainMedicineText({ explain });
    // Properti tambahan (mis. nama obat, nama pasien) tidak boleh ikut terkirim.
    const leaky = { householdId: "rumah-1", aturanPakai: " sesudah makan ", larangan: "Tidak ada larangan khusus", catatan: "", nama: "Amlodipin", namaPasien: "Ibu Uji" };

    const result = await useCase.execute(leaky);

    expect(result).toEqual({ ok: true, value: "Minum obat ini sesudah makan." });
    const [householdId, text] = explain.mock.calls[0] ?? [];
    expect(householdId).toBe("rumah-1");
    expect(Object.keys(text ?? {}).sort()).toEqual([...AI_INPUT_FIELDS].sort());
    expect(text).toEqual({ aturanPakai: "sesudah makan", larangan: "Tidak ada larangan khusus", catatan: null });
    expect(JSON.stringify(explain.mock.calls)).not.toContain("Ibu Uji");
  });

  test("AI gagal diteruskan apa adanya (frontend menampilkan kalimat #12 / D-c)", async () => {
    const useCase = new ExplainMedicineText({
      explain: async () => err(domainError("AI_UNAVAILABLE", "Layanan AI tidak tersedia.")),
    });
    const result = await useCase.execute({ householdId: "rumah-1", aturanPakai: "sesudah makan", larangan: "x", catatan: null });
    expect(result).toMatchObject({ ok: false, error: { code: "AI_UNAVAILABLE" } });
  });

  test("aturan pakai kosong tidak dikirim ke AI", async () => {
    const explain = vi.fn<PlainLanguageExplainer["explain"]>(async () => ok("x"));
    const result = await new ExplainMedicineText({ explain }).execute({ householdId: "rumah-1", aturanPakai: " ", larangan: "x", catatan: null });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(explain).not.toHaveBeenCalled();
  });
});

describe("CreateMedicine", () => {
  test("menyimpan obat ternormalisasi dengan waktu dari Clock", async () => {
    const { create, repo } = setup();
    const result = await create.execute({ householdId: "rumah-1", medicine: INPUT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ householdId: "rumah-1", nameNormalized: "amlodipin", strengthNormalized: "5mg", createdAt: NOW, active: true });
    expect(repo.rows.size).toBe(1);
  });

  test("tanpa penjelasan AI (AI gagal, D3) tetap bisa disimpan sebagai teks_pengisi", async () => {
    const { create } = setup();
    const result = await create.execute({ householdId: "rumah-1", medicine: { ...INPUT, explanationOrigin: "teks_pengisi", explanation: null } });
    expect(result.ok && result.value.explanationOrigin).toBe("teks_pengisi");
  });

  test("isian tidak sah tidak disimpan", async () => {
    const { create, repo } = setup();
    const result = await create.execute({ householdId: "rumah-1", medicine: { ...INPUT, strength: "lima" } });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED", details: { fields: ["strength"] } } });
    expect(repo.rows.size).toBe(0);
  });
});

describe("kepemilikan, ubah, hapus lunak", () => {
  async function seeded() {
    const ctx = setup();
    const mine = await ctx.create.execute({ householdId: "rumah-1", medicine: INPUT });
    const theirs = await ctx.create.execute({ householdId: "rumah-2", medicine: { ...INPUT, name: "Metformin", strength: "500 mg" } });
    if (!mine.ok || !theirs.ok) throw new Error("seed gagal");
    return { ...ctx, mine: mine.value, theirs: theirs.value };
  }

  test("obat rumah tangga lain dianggap tidak ada (NOT_FOUND) untuk baca, ubah, hapus", async () => {
    const { get, update, deactivate, theirs, repo } = await seeded();
    const ids = { householdId: "rumah-1", medicineId: theirs.id };
    expect(await get.execute(ids)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await update.execute({ ...ids, medicine: INPUT })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await deactivate.execute(ids)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(repo.rows.get(theirs.id)?.active).toBe(true);
  });

  test("daftar hanya berisi obat aktif milik sendiri", async () => {
    const { list, deactivate, mine } = await seeded();
    expect(await list.execute({ householdId: "rumah-1" })).toMatchObject({ ok: true, value: [{ id: mine.id }] });
    await deactivate.execute({ householdId: "rumah-1", medicineId: mine.id });
    expect(await list.execute({ householdId: "rumah-1" })).toEqual({ ok: true, value: [] });
  });

  test("ubah mengganti seluruh isian dan penjelasan; id dan tanggal dibuat tetap", async () => {
    const { update, mine } = await seeded();
    const result = await update.execute({
      householdId: "rumah-1",
      medicineId: mine.id,
      medicine: { ...INPUT, intakeTimes: ["08:00"], labelSource: "keluarga", explanation: "Penjelasan baru yang dikonfirmasi." },
    });
    expect(result.ok && result.value).toMatchObject({ id: mine.id, createdAt: NOW, intakeTimes: ["08:00"], labelSource: "keluarga", explanation: "Penjelasan baru yang dikonfirmasi." });
  });

  test("hapus lunak: obat tidak lagi bisa dibuka, baris tetap ada (riwayat aman)", async () => {
    const { deactivate, get, mine, repo } = await seeded();
    expect(await deactivate.execute({ householdId: "rumah-1", medicineId: mine.id })).toEqual({ ok: true, value: undefined });
    expect(await get.execute({ householdId: "rumah-1", medicineId: mine.id })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(repo.rows.get(mine.id)?.active).toBe(false);
  });
});
