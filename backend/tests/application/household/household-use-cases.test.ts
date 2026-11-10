import { describe, expect, test } from "vitest";
import { DeleteHouseholdData } from "../../../src/modules/household/application/delete-household-data.use-case";
import { GetHousehold } from "../../../src/modules/household/application/get-household.use-case";
import { RecordConsent } from "../../../src/modules/household/application/record-consent.use-case";
import { UpdatePreferences } from "../../../src/modules/household/application/update-preferences.use-case";
import { fixedClock } from "../../../src/shared/domain/clock";
import {
  InMemoryAccountEraser,
  InMemoryHouseholdRepository,
  householdFixture,
} from "../../support/in-memory-household-repository";

const NOW = Date.parse("2026-11-10T03:00:00Z");

function setup() {
  const repo = new InMemoryHouseholdRepository([
    householdFixture({ id: "rumah-baru", ownerUserId: "user-baru" }),
    householdFixture({ id: "rumah-lansia", ownerUserId: "user-lansia", dataConsentAt: 1 }),
    householdFixture({ id: "rumah-demo", ownerUserId: "user-demo", dataConsentAt: 1, isDemo: true }),
  ]);
  const eraser = new InMemoryAccountEraser(repo);
  return {
    repo,
    eraser,
    get: new GetHousehold(repo),
    consent: new RecordConsent(repo, fixedClock(NOW)),
    preferences: new UpdatePreferences(repo),
    remove: new DeleteHouseholdData(repo, eraser),
  };
}

describe("GetHousehold", () => {
  test("mengembalikan rumah tangga sesi", async () => {
    const result = await setup().get.execute({ householdId: "rumah-lansia" });
    expect(result.ok && result.value.ownerUserId).toBe("user-lansia");
  });

  test("tidak ada → NOT_FOUND", async () => {
    const result = await setup().get.execute({ householdId: "tidak-ada" });
    expect(result.ok ? null : result.error.code).toBe("NOT_FOUND");
  });
});

describe("RecordConsent", () => {
  test("mencatat persetujuan data dengan waktu dari Clock dan menyimpannya", async () => {
    const { consent, repo } = setup();
    const result = await consent.execute({ householdId: "rumah-baru", kind: "data" });
    expect(result.ok && result.value.dataConsentAt).toBe(NOW);
    expect(repo.rows.get("user-baru")?.dataConsentAt).toBe(NOW);
  });

  test("persetujuan scan sebelum data ditolak dan tidak tersimpan", async () => {
    const { consent, repo } = setup();
    const result = await consent.execute({ householdId: "rumah-baru", kind: "scan" });
    expect(result.ok ? null : result.error.code).toBe("CONSENT_REQUIRED");
    expect(repo.rows.get("user-baru")?.scanConsentAt).toBeNull();
  });
});

describe("UpdatePreferences", () => {
  test("menyimpan mode Suara", async () => {
    const { preferences, repo } = setup();
    const result = await preferences.execute({ householdId: "rumah-lansia", outputMode: "suara" });
    expect(result.ok).toBe(true);
    expect(repo.rows.get("user-lansia")?.outputMode).toBe("suara");
  });
});

describe("DeleteHouseholdData", () => {
  test("menghapus akun pemilik rumah tangga sesi", async () => {
    const { remove, eraser, repo } = setup();
    const result = await remove.execute({ householdId: "rumah-lansia" });
    expect(result.ok).toBe(true);
    expect(eraser.erased).toEqual(["user-lansia"]);
    expect(repo.rows.has("user-lansia")).toBe(false);
  });

  test("akun Demo Juri tidak dihapus (DEMO_PROTECTED)", async () => {
    const { remove, eraser, repo } = setup();
    const result = await remove.execute({ householdId: "rumah-demo" });
    expect(result.ok ? null : result.error.code).toBe("DEMO_PROTECTED");
    expect(eraser.erased).toEqual([]);
    expect(repo.rows.has("user-demo")).toBe(true);
  });
});
