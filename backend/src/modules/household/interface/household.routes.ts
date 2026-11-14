import { Hono } from "hono";
import { domainErrorResponse } from "../../../shared/interface/error-handler";
import { parseJsonBody } from "../../../shared/interface/parse-json-body";
import { sessionOf } from "../../../shared/interface/session";
import type { DeleteHouseholdData } from "../application/delete-household-data.use-case";
import type { GetHousehold } from "../application/get-household.use-case";
import type { RecordConsent } from "../application/record-consent.use-case";
import type { UpdatePreferences } from "../application/update-preferences.use-case";
import { toHouseholdResponse } from "./household.mapper";
import { consentBodySchema, preferencesBodySchema } from "./household.schemas";

export type HouseholdUseCases = {
  getHousehold: GetHousehold;
  recordConsent: RecordConsent;
  updatePreferences: UpdatePreferences;
  deleteHouseholdData: DeleteHouseholdData;
};

export function householdRoutes(useCases: HouseholdUseCases): Hono {
  return new Hono()
    .get("/household", async (c) => {
      const { householdId } = sessionOf(c);
      const result = await useCases.getHousehold.execute({ householdId });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.json(toHouseholdResponse(result.value));
    })
    .post("/household/consents", async (c) => {
      const { householdId } = sessionOf(c);
      const body = await parseJsonBody(c, consentBodySchema);
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.recordConsent.execute({ householdId, kind: body.value.kind });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.json(toHouseholdResponse(result.value));
    })
    .patch("/household/preferences", async (c) => {
      const { householdId } = sessionOf(c);
      const body = await parseJsonBody(c, preferencesBodySchema);
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.updatePreferences.execute({
        householdId,
        outputMode: body.value.outputMode,
      });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.json(toHouseholdResponse(result.value));
    })
    .delete("/household", async (c) => {
      const { householdId } = sessionOf(c);
      const result = await useCases.deleteHouseholdData.execute({ householdId });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.body(null, 204);
    });
}
