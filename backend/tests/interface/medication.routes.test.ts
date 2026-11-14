import { describe, expect, test, vi } from "vitest";
import type { PlainLanguageExplainer } from "../../src/modules/medication/application/ports/plain-language-explainer";
import { createApp } from "../../src/create-app";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { InMemoryHouseholdRepository, householdFixture } from "../support/in-memory-household-repository";
import { InMemoryMedicineRepository } from "../support/in-memory-medicine-repository";
import { TEST_NOW, testContainer } from "../support/test-container";

// Data fiktif: dua rumah tangga yang sudah setuju, satu yang belum.
const TOKENS = { "token-a": "user-a", "token-b": "user-b", "token-baru": "user-baru" };

const MEDICINE = {
  name: "Amlodipin",
  strength: "5 mg",
  purpose: "Untuk menurunkan tekanan darah tinggi",
  doseAmount: "1 tablet",
  usageRule: "sesudah makan",
  warnings: "Jangan dihentikan mendadak",
  notes: null,
  intakeTimes: ["19:00", "07:00"],
  labelSource: "apoteker",
  explanationOrigin: "ai_dikonfirmasi",
  explanation: "Minum obat ini sesudah makan. Jangan dihentikan mendadak.",
};

function buildApp(explainer?: PlainLanguageExplainer) {
  const households = new InMemoryHouseholdRepository([
    householdFixture({ id: "rumah-a", ownerUserId: "user-a", dataConsentAt: 1 }),
    householdFixture({ id: "rumah-b", ownerUserId: "user-b", dataConsentAt: 1 }),
  ]);
  const medicines = new InMemoryMedicineRepository();
  const container = testContainer({ tokens: TOKENS, households, medicines, ...(explainer ? { explainer } : {}) });
  return { app: createApp(container), medicines, logger: container.logger };
}

const send = (token: string, method: string, body?: unknown) => ({
  method,
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

async function created(app: ReturnType<typeof buildApp>["app"], token = "token-a", body: unknown = MEDICINE) {
  const res = await app.request("/v1/medicines", send(token, "POST", body));
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string };
}

describe("POST /v1/medicines/explain", () => {
  test.each([
    ["Minum 1 tablet satu kali sehari", "Minum 1 tablet tiga kali sehari."],
    ["Jangan minum sebelum makan", "Jangan makan sebelum minum."],
  ])("perubahan angka kata atau urutan larangan tidak diteruskan lewat HTTP: %s", async (usageRule, output) => {
    const { app, medicines } = buildApp({ explain: async () => ok(output) });
    const res = await app.request("/v1/medicines/explain", send("token-a", "POST", { usageRule, warnings: "Tidak ada larangan khusus" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: "AI_UNAVAILABLE" } });
    expect(medicines.rows.size).toBe(0);
  });

  test("membalas draf penjelasan tanpa menyimpan apa pun; householdId dari sesi", async () => {
    const explain = vi.fn<PlainLanguageExplainer["explain"]>(async () => ok("Minum obat ini sesudah makan."));
    const { app, medicines } = buildApp({ explain });
    const res = await app.request(
      "/v1/medicines/explain",
      send("token-a", "POST", { usageRule: "sesudah makan", warnings: "Tidak ada larangan khusus", householdId: "rumah-b" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ explanation: "Minum obat ini sesudah makan." });
    expect(explain.mock.calls[0]?.[0]).toBe("rumah-a");
    expect(medicines.rows.size).toBe(0);
  });

  test.each([
    ["AI_UNAVAILABLE", 503],
    ["AI_QUOTA_EXCEEDED", 429],
  ] as const)("AI gagal (%s) dibalas %i berformat seragam", async (code, status) => {
    const { app } = buildApp({ explain: async () => err(domainError(code, "x")) });
    const res = await app.request("/v1/medicines/explain", send("token-a", "POST", { usageRule: "sesudah makan", warnings: "x" }));
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ error: { code } });
  });

  test("keluaran AI yang menambah angka tidak sampai ke pengguna", async () => {
    const { app } = buildApp({ explain: async () => ok("Minum 2 tablet sesudah makan.") });
    const res = await app.request("/v1/medicines/explain", send("token-a", "POST", { usageRule: "sesudah makan", warnings: "x" }));
    expect(res.status).toBe(503);
  });

  test("aturan pakai kosong → 400 dengan nama kolom formulir", async () => {
    const res = await buildApp().app.request("/v1/medicines/explain", send("token-a", "POST", { usageRule: " ", warnings: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "VALIDATION_FAILED", details: { fields: ["usageRule", "warnings"] } } });
  });
});

describe("POST /v1/medicines", () => {
  test("201: obat tersimpan untuk rumah tangga sesi, jam terurut, tanpa kolom internal", async () => {
    const { app, medicines } = buildApp();
    const res = await app.request("/v1/medicines", send("token-a", "POST", { ...MEDICINE, householdId: "rumah-b" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ name: "Amlodipin", intakeTimes: ["07:00", "19:00"], createdAt: new Date(TEST_NOW).toISOString() });
    expect(Object.keys(body)).not.toEqual(expect.arrayContaining(["householdId"]));
    expect(Object.keys(body).some((k) => /normalized|active|household/i.test(k))).toBe(false);
    expect([...medicines.rows.values()][0]?.householdId).toBe("rumah-a");
  });

  test("tanpa penjelasan AI (D3) tersimpan sebagai teks_pengisi", async () => {
    const { app } = buildApp();
    const res = await app.request("/v1/medicines", send("token-a", "POST", { ...MEDICINE, explanationOrigin: "teks_pengisi", explanation: null }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ explanationOrigin: "teks_pengisi", explanation: null });
  });

  test("isian salah → 400, hanya nama kolom (tanpa nilai yang dikirim)", async () => {
    const res = await buildApp().app.request("/v1/medicines", send("token-a", "POST", { ...MEDICINE, strength: "lima", intakeTimes: ["07:00", "07:00"] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: { details: { fields: ["strength", "intakeTimes"] } } });
    expect(JSON.stringify(body)).not.toContain("lima");
  });

  test("bentuk body salah ditolak di tepi", async () => {
    const res = await buildApp().app.request("/v1/medicines", send("token-a", "POST", { ...MEDICINE, labelSource: "dokter" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { details: { fields: ["labelSource"] } } });
  });

  test("belum setuju data → 403 CONSENT_REQUIRED", async () => {
    const res = await buildApp().app.request("/v1/medicines", send("token-baru", "POST", MEDICINE));
    expect(res.status).toBe(403);
  });
});

describe("baca, ubah, hapus", () => {
  test("daftar dan detail hanya milik sendiri; milik orang lain dan id asing → 404", async () => {
    const { app } = buildApp();
    const mine = await created(app, "token-a");
    const theirs = await created(app, "token-b", { ...MEDICINE, name: "Metformin", strength: "500 mg" });

    const list = await app.request("/v1/medicines", send("token-a", "GET"));
    expect(await list.json()).toMatchObject({ medicines: [{ id: mine.id, name: "Amlodipin" }] });
    expect((await app.request(`/v1/medicines/${mine.id}`, send("token-a", "GET"))).status).toBe(200);
    expect((await app.request(`/v1/medicines/${theirs.id}`, send("token-a", "GET"))).status).toBe(404);
    expect((await app.request("/v1/medicines/bukan-id", send("token-a", "GET"))).status).toBe(404);
  });

  test("PATCH = alur penuh; milik orang lain tidak bisa diubah", async () => {
    const { app } = buildApp();
    const mine = await created(app);
    const update = { ...MEDICINE, intakeTimes: ["08:00"], labelSource: "keluarga", explanationOrigin: "teks_pengisi", explanation: null };

    const res = await app.request(`/v1/medicines/${mine.id}`, send("token-a", "PATCH", update));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: mine.id, intakeTimes: ["08:00"], labelSource: "keluarga", explanation: null });
    expect((await app.request(`/v1/medicines/${mine.id}`, send("token-b", "PATCH", update))).status).toBe(404);
  });

  test("DELETE = hapus lunak: 204, lalu tidak muncul lagi; baris tetap ada", async () => {
    const { app, medicines } = buildApp();
    const mine = await created(app);
    expect((await app.request(`/v1/medicines/${mine.id}`, send("token-b", "DELETE"))).status).toBe(404);

    const res = await app.request(`/v1/medicines/${mine.id}`, send("token-a", "DELETE"));
    expect(res.status).toBe(204);
    expect((await app.request(`/v1/medicines/${mine.id}`, send("token-a", "GET"))).status).toBe(404);
    expect(await (await app.request("/v1/medicines", send("token-a", "GET"))).json()).toEqual({ medicines: [] });
    expect(medicines.rows.get(mine.id)?.active).toBe(false);
  });

  test("log hanya berisi pola rute dan status, tidak ada data obat", async () => {
    const { app, logger } = buildApp();
    const mine = await created(app);
    await app.request(`/v1/medicines/${mine.id}`, send("token-a", "GET"));
    const logged = JSON.stringify(logger.events);
    expect(logged).toContain("/v1/medicines/:id");
    for (const secret of ["Amlodipin", "sesudah makan", "5 mg", mine.id]) expect(logged).not.toContain(secret);
  });
});
