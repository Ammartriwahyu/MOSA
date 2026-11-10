import { describe, expect, test } from "vitest";
import type { LogEvent } from "../../src/shared/application/logger";
import { createJsonLogger } from "../../src/shared/infrastructure/json-logger";

describe("createJsonLogger", () => {
  test("menulis satu baris JSON berisi kolom yang diizinkan", () => {
    const lines: string[] = [];
    const logger = createJsonLogger({ info: (l) => lines.push(l), error: (l) => lines.push(l) });

    logger.info({ event: "http_request", method: "GET", route: "/v1/health", status: 200, durationMs: 3 });

    expect(lines).toHaveLength(1);
    const parsed: Record<string, unknown> = JSON.parse(lines[0] ?? "");
    expect(parsed).toMatchObject({
      level: "info",
      event: "http_request",
      method: "GET",
      route: "/v1/health",
      status: 200,
      durationMs: 3,
    });
    expect(typeof parsed.time).toBe("string");
  });

  test("properti tambahan (mis. isi body atau data obat) tidak pernah tercetak", () => {
    const lines: string[] = [];
    const logger = createJsonLogger({ info: (l) => lines.push(l), error: (l) => lines.push(l) });
    // Objek berlebih lolos pemeriksaan tipe struktural bila lewat variabel.
    const leaky = { event: "http_request", body: "Amlodipin 5 mg", photo: "data:image/png" } as const;
    const event: LogEvent = leaky;

    logger.error(event);

    expect(lines[0]).not.toContain("Amlodipin");
    expect(lines[0]).not.toContain("data:image");
    expect(Object.keys(JSON.parse(lines[0] ?? "{}"))).toEqual(["level", "time", "event"]);
  });
});
