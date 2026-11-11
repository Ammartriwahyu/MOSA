import { Hono } from "hono";
import { domainErrorResponse } from "../../../shared/interface/error-handler";
import { parseJsonBody } from "../../../shared/interface/parse-json-body";
import { sessionOf } from "../../../shared/interface/session";
import type { ExplainMedicineText } from "../application/explain-medicine-text.use-case";
import type {
  CreateMedicine,
  DeactivateMedicine,
  GetMedicine,
  ListMedicines,
  UpdateMedicine,
} from "../application/medicine-use-cases";
import { toMedicineResponse } from "./medication.mapper";
import { explainBodySchema, medicineBodySchema } from "./medication.schemas";

export type MedicationUseCases = {
  explainMedicineText: ExplainMedicineText;
  createMedicine: CreateMedicine;
  updateMedicine: UpdateMedicine;
  listMedicines: ListMedicines;
  getMedicine: GetMedicine;
  deactivateMedicine: DeactivateMedicine;
};

// Rute /v1/medicines* (docs/03 §9). householdId selalu dari sesi; obat milik
// rumah tangga lain dibalas 404 oleh use case. Isi obat tidak pernah dicatat di log.
export function medicationRoutes(useCases: MedicationUseCases): Hono {
  return new Hono()
    .post("/medicines/explain", async (c) => {
      const { householdId } = sessionOf(c);
      const body = await parseJsonBody(c, explainBodySchema);
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.explainMedicineText.execute({ ...body.value, householdId });
      if (!result.ok) return domainErrorResponse(c, result.error);
      // Draf saja: tersimpan hanya bila pengisi menekan "Ya, sudah benar" lalu POST /medicines.
      return c.json({ explanation: result.value });
    })
    .post("/medicines", async (c) => {
      const { householdId } = sessionOf(c);
      const body = await parseJsonBody(c, medicineBodySchema);
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.createMedicine.execute({ householdId, medicine: body.value });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.json(toMedicineResponse(result.value), 201);
    })
    .get("/medicines", async (c) => {
      const { householdId } = sessionOf(c);
      const result = await useCases.listMedicines.execute({ householdId });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.json({ medicines: result.value.map(toMedicineResponse) });
    })
    .get("/medicines/:id", async (c) => {
      const { householdId } = sessionOf(c);
      const result = await useCases.getMedicine.execute({ householdId, medicineId: c.req.param("id") });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.json(toMedicineResponse(result.value));
    })
    .patch("/medicines/:id", async (c) => {
      const { householdId } = sessionOf(c);
      const body = await parseJsonBody(c, medicineBodySchema);
      if (!body.ok) return domainErrorResponse(c, body.error);
      const result = await useCases.updateMedicine.execute({
        householdId,
        medicineId: c.req.param("id"),
        medicine: body.value,
      });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.json(toMedicineResponse(result.value));
    })
    .delete("/medicines/:id", async (c) => {
      const { householdId } = sessionOf(c);
      const result = await useCases.deactivateMedicine.execute({ householdId, medicineId: c.req.param("id") });
      if (!result.ok) return domainErrorResponse(c, result.error);
      return c.body(null, 204);
    });
}
