import type { AiUsageLimiter } from "../../../shared/application/ai-usage-limiter";
import type { Clock } from "../../../shared/domain/clock";
import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import { decideOutcome } from "../domain/decide-outcome";
import { matchPackage } from "../domain/match-package";
import { createPackageImage, type PackageImage } from "../domain/package-image";
import { SCAN_TOKEN_POLICY } from "../domain/scan-token-policy";
import type { VerificationOutcome } from "../domain/verification-outcome";
import type { PackageReader } from "./ports/package-reader";
import type { ScanConsentReader, ScanContextReader, ScanSnapshot } from "./ports/scan-context-reader";
import type { ScanTokenSigner } from "./ports/scan-token-signer";

export type VerifyPackageResult = {
  readonly decision: VerificationOutcome; readonly snapshot: ScanSnapshot; readonly serverTime: number;
  readonly tokens: readonly { slotId: string; scanToken: string; expiresAt: number }[];
};

export class VerifyPackage {
  constructor(private readonly consent: ScanConsentReader, private readonly quota: AiUsageLimiter,
    private readonly reader: PackageReader, private readonly context: ScanContextReader,
    private readonly signer: ScanTokenSigner, private readonly clock: Clock) {}

  async execute(input: { householdId: string; image: PackageImage; slotId?: string }): Promise<Result<VerifyPackageResult, DomainError>> {
    const consent = await this.consent.hasConsent(input.householdId);
    if (!consent.ok) return consent;
    if (!consent.value) return err(domainError("CONSENT_REQUIRED", "Persetujuan scan belum dicatat."));
    const image = createPackageImage(input.image);
    if (!image.ok) return image;
    const quota = await this.quota.consume(input.householdId);
    if (!quota.ok) return quota;
    const reading = await this.reader.read(image.value);
    if (!reading.ok) return reading;
    // Waktu keputusan diambil setelah latensi AI, bukan saat request dimulai.
    const now = this.clock.now();
    const unreadable = matchPackage(reading.value, []);
    if (unreadable.ok && unreadable.value.outcome === "tidak_terbaca") {
      return ok({ decision: unreadable.value, snapshot: { medicines: [], doses: [], nextDoses: [] }, serverTime: now, tokens: [] });
    }
    const snapshot = await this.context.read({ householdId: input.householdId, now, ...(input.slotId !== undefined ? { slotId: input.slotId } : {}) });
    if (!snapshot.ok) return snapshot;
    const match = matchPackage(reading.value, snapshot.value.medicines);
    if (!match.ok) return match;
    const matched = match.value;
    const next = matched.outcome === "cocok" ? snapshot.value.nextDoses.find((entry) => entry.medicineId === matched.medicine.medicineId)?.nextDose : null;
    const decision = decideOutcome(matched, { target: input.slotId === undefined ? { mode: "generic" } : { mode: "selected", slotId: input.slotId },
      doses: snapshot.value.doses, nextDose: next?.slot ?? null });
    if (!decision.ok) return decision;
    const tokens: { slotId: string; scanToken: string; expiresAt: number }[] = [];
    if (decision.value.outcome === "bisa_konfirmasi") {
      const expiresAt = now + SCAN_TOKEN_POLICY.ttlMs;
      for (const slot of decision.value.slots) {
        const signed = await this.signer.sign({ householdId: input.householdId, medicine: decision.value.medicine, slotId: slot.slotId, expiresAt });
        if (!signed.ok) return signed;
        tokens.push({ slotId: slot.slotId, scanToken: signed.value, expiresAt });
      }
    }
    return ok({ decision: decision.value, snapshot: snapshot.value, serverTime: now, tokens });
  }
}
