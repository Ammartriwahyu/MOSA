import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { describe, expect, test } from "vitest";
import { createApp } from "../../src/create-app";
import type { DatabasePing } from "../../src/shared/application/check-health.use-case";
import {
  DOMAIN_ERROR_CODES,
  domainError,
  type DomainErrorCode,
} from "../../src/shared/domain/domain-error";
import { err } from "../../src/shared/domain/result";
import {
  DOMAIN_ERROR_STATUS,
  createErrorHandler,
  domainErrorResponse,
} from "../../src/shared/interface/error-handler";
import { FRONTEND, healthyDb, memoryLogger, testContainer } from "../support/test-container";

const downDb: DatabasePing = {
  ping: async () => err(domainError("DATABASE_UNAVAILABLE", "Database tidak dapat dihubungi.")),
};

function buildApp(database: DatabasePing = healthyDb) {
  const container = testContainer({ database });
  return { app: createApp(container), logger: container.logger };
}

describe("GET /v1/health", () => {
  test("membalas status ok bila database terjangkau", async () => {
    const { app } = buildApp();
    const res = await app.request("/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("membalas 503 DATABASE_UNAVAILABLE bila database gagal", async () => {
    const { app } = buildApp(downDb);
    const res = await app.request("/v1/health");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database tidak dapat dihubungi.",
        details: null,
      },
    });
  });
});

describe("log permintaan", () => {
  test("mencatat metode, pola rute, status, durasi, dan requestId saja", async () => {
    const { app, logger } = buildApp();
    await app.request("/v1/health?nama=Amlodipin", { headers: { "X-Request-Id": "req-1" } });

    expect(logger.events).toHaveLength(1);
    const [event] = logger.events;
    expect(event).toMatchObject({
      event: "http_request",
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      method: "GET",
      route: "/v1/health",
      status: 200,
    });
    expect(typeof event?.durationMs).toBe("number");
    expect(JSON.stringify(logger.events)).not.toContain("Amlodipin");
  });
});

describe("rute tidak dikenal", () => {
  test("membalas 404 dengan format galat seragam", async () => {
    const { app } = buildApp();
    const res = await app.request("/tidak-ada");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Alamat tidak ditemukan.", details: null },
    });
  });
});

describe("CORS", () => {
  test("mengizinkan origin frontend", async () => {
    const { app } = buildApp();
    const res = await app.request("/v1/health", {
      method: "OPTIONS",
      headers: { Origin: FRONTEND, "Access-Control-Request-Method": "GET" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(FRONTEND);
  });

  test("tidak mengizinkan origin lain", async () => {
    const { app } = buildApp();
    const res = await app.request("/v1/health", {
      method: "OPTIONS",
      headers: { Origin: "https://situs-lain.example", "Access-Control-Request-Method": "GET" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("https://situs-lain.example");
  });
});

describe("pemetaan galat domain ke HTTP (docs/03 §9)", () => {
  const expected: Record<DomainErrorCode, number> = {
    VALIDATION_FAILED: 400,
    UNAUTHENTICATED: 401,
    CONSENT_REQUIRED: 403,
    DEMO_PROTECTED: 403,
    NOT_FOUND: 404,
    DOSE_NOT_DUE: 409,
    DOSE_MISSED: 409,
    DOSE_ALREADY_CONFIRMED: 409,
    SCAN_TOKEN_INVALID: 403,
    PHOTO_UNREADABLE: 422,
    AI_QUOTA_EXCEEDED: 429,
    AI_UNAVAILABLE: 503,
    DATABASE_UNAVAILABLE: 503,
    AUTH_UNAVAILABLE: 503,
    PUSH_UNAVAILABLE: 503,
  };

  test.each(DOMAIN_ERROR_CODES)("%s → status sesuai tabel dan format seragam", async (code) => {
    expect(DOMAIN_ERROR_STATUS[code]).toBe(expected[code]);
    const app = new Hono().get("/x", (c) =>
      domainErrorResponse(c, domainError(code, "pesan", { field: "f" })),
    );
    const res = await app.request("/x");
    expect(res.status).toBe(expected[code]);
    expect(await res.json()).toEqual({ error: { code, message: "pesan", details: { field: "f" } } });
  });
});

describe("galat tak terduga", () => {
  test("membalas 500 seragam tanpa membocorkan pesan galat ke respons maupun log", async () => {
    const logger = memoryLogger();
    const broken = new Hono()
      .use("*", requestId())
      .get("/rusak/:id", () => {
        throw new Error("data-obat-pengguna");
      })
      .onError(createErrorHandler(logger));

    const res = await broken.request("/rusak/123");
    const body = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(body)).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan di server.", details: null },
    });
    expect(body).not.toContain("data-obat-pengguna");
    expect(logger.events).toEqual([
      expect.objectContaining({ event: "unexpected_error", code: "INTERNAL_ERROR", route: "/rusak/:id" }),
    ]);
    expect(JSON.stringify(logger.events)).not.toContain("data-obat-pengguna");
  });
});
