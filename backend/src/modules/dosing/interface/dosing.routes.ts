import { Hono } from "hono";
import { z } from "zod";
import { domainErrorResponse } from "../../../shared/interface/error-handler.js";
import { parseJsonBody } from "../../../shared/interface/parse-json-body.js";
import { sessionOf } from "../../../shared/interface/session.js";
import type { ConfirmDose } from "../application/confirm-dose.use-case.js";
import type { ListTodaysDoses } from "../application/list-todays-doses.use-case.js";
import { confirmationResponse, todaysDosesResponse } from "./dosing.mapper.js";

export type DosingUseCases = { listTodaysDoses: ListTodaysDoses; confirmDose: ConfirmDose };
const confirmSchema = z.object({ mode: z.enum(["basic", "verified"]), scanToken: z.string().min(1).max(4096).optional() });

export function dosingRoutes(useCases: DosingUseCases): Hono {
  return new Hono()
    .get("/doses/today", async (c) => {
      const result = await useCases.listTodaysDoses.execute({ householdId: sessionOf(c).householdId });
      return result.ok ? c.json(todaysDosesResponse(result.value)) : domainErrorResponse(c, result.error);
    })
    .post("/doses/:slotId/confirm", async (c) => {
      const body = await parseJsonBody(c, confirmSchema);
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.confirmDose.execute({ ...body.value, slotId: c.req.param("slotId"), householdId: sessionOf(c).householdId });
      return result.ok ? c.json({ status: "sudah", serverTime: new Date(result.value.serverTime).toISOString(), confirmation: confirmationResponse(result.value.confirmation) }, 201) : domainErrorResponse(c, result.error);
    });
}
