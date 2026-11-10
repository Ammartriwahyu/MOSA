import { describe, expect, test } from "vitest";
import { EnsureHousehold } from "../../../src/modules/household/application/ensure-household.use-case";
import type { HouseholdRepository } from "../../../src/modules/household/domain/household-repository";
import { domainError } from "../../../src/shared/domain/domain-error";
import { err } from "../../../src/shared/domain/result";
import {
  InMemoryHouseholdRepository,
  householdFixture,
} from "../../support/in-memory-household-repository";

describe("EnsureHousehold", () => {
  test("mengembalikan rumah tangga yang sudah ada tanpa membuat baru", async () => {
    const repo = new InMemoryHouseholdRepository([
      householdFixture({ id: "rumah-1", ownerUserId: "user-1", dataConsentAt: 10 }),
    ]);
    const result = await new EnsureHousehold(repo).execute({ userId: "user-1" });
    expect(result).toEqual({ ok: true, value: expect.objectContaining({ id: "rumah-1" }) });
    expect(repo.rows.size).toBe(1);
  });

  test("membuat rumah tangga kosong (tanpa persetujuan) untuk pengguna baru", async () => {
    const repo = new InMemoryHouseholdRepository();
    const result = await new EnsureHousehold(repo).execute({ userId: "user-baru" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ ownerUserId: "user-baru", dataConsentAt: null, isDemo: false });
    }
  });

  test("idempoten: dipanggil berulang dan bersamaan tetap satu rumah tangga", async () => {
    const repo = new InMemoryHouseholdRepository();
    const useCase = new EnsureHousehold(repo);
    const results = await Promise.all([
      useCase.execute({ userId: "user-2" }),
      useCase.execute({ userId: "user-2" }),
      useCase.execute({ userId: "user-2" }),
    ]);
    const ids = results.map((r) => (r.ok ? r.value.id : null));
    expect(new Set(ids).size).toBe(1);
    expect(repo.rows.size).toBe(1);
  });

  test("galat database diteruskan sebagai Result, bukan dilempar", async () => {
    const down = async () => err(domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi."));
    const failing: HouseholdRepository = {
      findByOwner: down,
      findById: down,
      createIfAbsent: down,
      saveSettings: down,
    };
    const result = await new EnsureHousehold(failing).execute({ userId: "user-3" });
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "DATABASE_UNAVAILABLE" }),
    });
  });
});
