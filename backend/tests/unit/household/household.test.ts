import { describe, expect, test } from "vitest";
import {
  changeOutputMode,
  ensureDeletable,
  hasDataConsent,
  recordConsent,
} from "../../../src/modules/household/domain/household";
import { householdFixture } from "../../support/in-memory-household-repository";

const fresh = householdFixture({ id: "rumah-1", ownerUserId: "user-1" });
const consented = householdFixture({ id: "rumah-1", ownerUserId: "user-1", dataConsentAt: 100 });

describe("recordConsent", () => {
  test("persetujuan data mengisi waktu sekarang", () => {
    const result = recordConsent(fresh, "data", 500);
    expect(result.ok && result.value.dataConsentAt).toBe(500);
    expect(result.ok && hasDataConsent(result.value)).toBe(true);
  });

  test("idempoten: waktu persetujuan pertama dipertahankan", () => {
    const result = recordConsent(consented, "data", 999);
    expect(result.ok && result.value.dataConsentAt).toBe(100);
  });

  test("persetujuan scan setelah persetujuan data", () => {
    const first = recordConsent(consented, "scan", 200);
    expect(first.ok && first.value.scanConsentAt).toBe(200);
    if (!first.ok) return;
    const again = recordConsent(first.value, "scan", 300);
    expect(again.ok && again.value.scanConsentAt).toBe(200);
  });

  test("persetujuan scan sebelum persetujuan data ditolak (CONSENT_REQUIRED)", () => {
    const result = recordConsent(fresh, "scan", 200);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONSENT_REQUIRED");
  });
});

describe("changeOutputMode", () => {
  test("mengganti mode setelah persetujuan data", () => {
    const toVoice = changeOutputMode(consented, "suara");
    expect(toVoice.ok && toVoice.value.outputMode).toBe("suara");
  });

  test("ditolak sebelum persetujuan data", () => {
    const result = changeOutputMode(fresh, "teks");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONSENT_REQUIRED");
  });
});

describe("ensureDeletable", () => {
  test("akun biasa boleh dihapus", () => {
    expect(ensureDeletable(consented).ok).toBe(true);
  });

  test("akun Demo Juri ditolak (DEMO_PROTECTED)", () => {
    const demo = householdFixture({ id: "rumah-demo", ownerUserId: "user-demo", isDemo: true });
    const result = ensureDeletable(demo);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DEMO_PROTECTED");
  });
});
