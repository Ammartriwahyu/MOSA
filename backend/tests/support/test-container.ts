import type { Container } from "../../src/composition-root";
import { EnsureHousehold } from "../../src/modules/household/application/ensure-household.use-case";
import type { AccessTokenVerifier } from "../../src/shared/application/access-token-verifier";
import { CheckHealth, type DatabasePing } from "../../src/shared/application/check-health.use-case";
import type { LogEvent, Logger } from "../../src/shared/application/logger";
import { domainError } from "../../src/shared/domain/domain-error";
import { err, ok } from "../../src/shared/domain/result";
import { InMemoryHouseholdRepository } from "./in-memory-household-repository";

export const FRONTEND = "http://localhost:3000";

export type MemoryLogger = Logger & { events: LogEvent[] };

export function memoryLogger(): MemoryLogger {
  const events: LogEvent[] = [];
  return { events, info: (e) => events.push(e), error: (e) => events.push(e) };
}

export const healthyDb: DatabasePing = { ping: async () => ok(undefined) };

/**
 * Verifier palsu: token tertentu memetakan ke userId tertentu.
 * "token-gangguan" mensimulasikan layanan Auth tidak terjangkau.
 */
export function fakeTokenVerifier(tokens: Record<string, string>): AccessTokenVerifier {
  return {
    verify: async (token) => {
      if (token === "token-gangguan") {
        return err(domainError("AUTH_UNAVAILABLE", "Layanan masuk sedang tidak dapat dihubungi."));
      }
      const userId = tokens[token];
      return userId
        ? ok({ userId })
        : err(domainError("UNAUTHENTICATED", "Sesi tidak valid. Silakan masuk lagi."));
    },
  };
}

export function testContainer(
  options: {
    database?: DatabasePing;
    tokens?: Record<string, string>;
    households?: InMemoryHouseholdRepository;
  } = {},
): Container & { logger: MemoryLogger } {
  return {
    frontendOrigin: FRONTEND,
    logger: memoryLogger(),
    checkHealth: new CheckHealth(options.database ?? healthyDb),
    tokenVerifier: fakeTokenVerifier(options.tokens ?? {}),
    ensureHousehold: new EnsureHousehold(options.households ?? new InMemoryHouseholdRepository()),
  };
}
