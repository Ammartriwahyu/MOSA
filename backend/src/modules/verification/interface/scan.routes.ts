import { Hono } from "hono";
import { domainErrorResponse } from "../../../shared/interface/error-handler.js";
import { sessionOf } from "../../../shared/interface/session.js";
import type { VerifyPackage } from "../application/verify-package.use-case.js";
import { parseScanBody } from "./scan-body.js";
import { scanResponse } from "./scan.mapper.js";

export type ScanUseCases = { verifyPackage: VerifyPackage };
export function scanRoutes(useCases: ScanUseCases): Hono {
  return new Hono().post("/scan", async (c) => {
    c.header("Cache-Control", "no-store");
    const body = await parseScanBody(c);
    if (!body.ok) return domainErrorResponse(c, body.error);
    const result = await useCases.verifyPackage.execute({ ...body.value, householdId: sessionOf(c).householdId });

    return result.ok ? c.json(scanResponse(result.value)) : domainErrorResponse(c, result.error);
  });
}
