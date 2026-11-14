import type { ListTodaysDoses } from "../../dosing/application/list-todays-doses.use-case";
import type { GetHousehold } from "../../household/application/get-household.use-case";
import { ok } from "../../../shared/domain/result";
import type { DueDoseReader } from "../application/ports";

export class DosingDueDoseReader implements DueDoseReader {
  constructor(private readonly doses: ListTodaysDoses, private readonly households: GetHousehold) {}
  async read(householdId: string) {
    const household = await this.households.execute({ householdId });
    if (!household.ok) return household;
    if (household.value.dataConsentAt === null) return ok([]);
    const doses = await this.doses.execute({ householdId });
    if (!doses.ok) return doses;
    return ok([...doses.value.carryoverDoses, ...doses.value.doses, ...doses.value.earlyDoses]
      .filter((dose) => dose.status === "jatuh_tempo").map(({ slot }) => ({ slotId: slot.slotId,
        medicineId: slot.medicineId, scheduledDate: slot.scheduledDate, scheduledTime: slot.scheduledTime })));
  }
}
