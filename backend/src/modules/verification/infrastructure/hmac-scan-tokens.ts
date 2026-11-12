import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ScanTokenClaims, ScanTokenVerifier } from "../../dosing/application/ports/scan-token-verifier";
import type { DosingMedicineReader } from "../../dosing/application/ports/dosing-medicine-reader";
import type { Clock } from "../../../shared/domain/clock";
import { domainError } from "../../../shared/domain/domain-error";
import { err, ok } from "../../../shared/domain/result";
import type { ScanTokenSigner } from "../application/ports/scan-token-signer";
import { SCAN_TOKEN_POLICY } from "../domain/scan-token-policy";

const payloadSchema = z.strictObject({ householdId: z.string().min(1).max(200), medicineId: z.string().min(1).max(200),
  slotId: z.string().min(1).max(256), exp: z.number().int().positive(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/) });
const invalid = () => err(domainError("SCAN_TOKEN_INVALID", "Token scan tidak valid atau kedaluwarsa."));
const fingerprint = (medicine: { name: string; strength: string }) => createHash("sha256").update(JSON.stringify([medicine.name, medicine.strength])).digest("hex");

/** Token versi 1, exp epoch ms; digest HMAC dibandingkan dengan panjang tetap. */
export class HmacScanTokens implements ScanTokenSigner {
  constructor(private readonly secret: string, private readonly clock: Clock) {
    if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("SCAN_TOKEN_SECRET minimal 32 byte.");
  }
  async sign(input: Parameters<ScanTokenSigner["sign"]>[0]) {
    const payload = payloadSchema.safeParse({ householdId: input.householdId, medicineId: input.medicine.medicineId,
      slotId: input.slotId, exp: input.expiresAt, fingerprint: fingerprint(input.medicine) });
    if (!payload.success) return invalid();
    const message = `v1.${Buffer.from(JSON.stringify(payload.data)).toString("base64url")}`;
    return ok(`${message}.${this.digest(message).toString("base64url")}`);
  }
  async verify(token: string) {
    if (token.length > SCAN_TOKEN_POLICY.maxLength) return invalid();
    const [version, payload, signature, extra] = token.split(".");
    if (version !== "v1" || !payload || !signature || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return invalid();
    const supplied = Buffer.from(signature, "base64url");
    if (supplied.length !== 32 || supplied.toString("base64url") !== signature || !timingSafeEqual(this.digest(`${version}.${payload}`), supplied)) return invalid();
    try {
      const decoded = Buffer.from(payload, "base64url");
      if (decoded.toString("base64url") !== payload) return invalid();
      const parsed = payloadSchema.safeParse(JSON.parse(decoded.toString("utf8")));
      if (!parsed.success || parsed.data.exp <= this.clock.now()) return invalid();
      const claims: ScanTokenClaims & { fingerprint: string } = { householdId: parsed.data.householdId, medicineId: parsed.data.medicineId,
        slotId: parsed.data.slotId, expiresAt: parsed.data.exp, fingerprint: parsed.data.fingerprint };
      return ok(claims);
    } catch { return invalid(); }
  }
  private digest(message: string): Buffer { return createHmac("sha256", this.secret).update(message).digest(); }
}

/** Nama/kekuatan yang diedit sesudah scan tidak boleh memakai bukti kemasan lama. */
export class CurrentMedicineScanTokenVerifier implements ScanTokenVerifier {
  constructor(private readonly tokens: HmacScanTokens, private readonly medicines: DosingMedicineReader) {}
  async verify(token: string) {
    const claims = await this.tokens.verify(token);
    if (!claims.ok) return claims;
    const current = await this.medicines.findActive(claims.value.householdId, claims.value.medicineId);
    if (!current.ok) return current;
    if (!current.value || fingerprint(current.value) !== claims.value.fingerprint) return invalid();
    return ok({ ...claims.value, medicineIdentity: { name: current.value.name, strength: current.value.strength } });
  }
}
