import { domainError, type DomainError } from "../../../shared/domain/domain-error";
import { err, ok, type Result } from "../../../shared/domain/result";
import { fromWib, parseTimeOfDay, parseWibDate, type WibDate } from "../../../shared/domain/wib-time";

export type DoseSlot = {
  readonly slotId: string;
  readonly medicineId: string;
  readonly scheduledDate: WibDate;
  readonly scheduledTime: string;
  readonly scheduledAt: number;
};

export function createDoseSlot(input: {
  medicineId: string;
  scheduledDate: WibDate;
  scheduledTime: string;
}): Result<DoseSlot, DomainError> {
  if (!/^[^:\s]+$/u.test(input.medicineId)) {
    return err(domainError("VALIDATION_FAILED", "Identitas obat tidak valid.", { field: "medicineId" }));
  }
  const date = parseWibDate(input.scheduledDate);
  if (!date.ok) return date;
  const time = parseTimeOfDay(input.scheduledTime);
  if (!time.ok) return time;
  return ok({
    ...input,
    slotId: `${input.medicineId}:${input.scheduledDate.replaceAll("-", "")}:${input.scheduledTime.replace(":", "")}`,
    scheduledAt: fromWib(date.value, time.value),
  });
}

export function parseDoseSlotId(slotId: string): Result<DoseSlot, DomainError> {
  const invalid = () => err(domainError("VALIDATION_FAILED", "Identitas slot dosis tidak valid.", { field: "slotId" }));
  const parts = slotId.split(":");
  const [medicineId, day, time] = parts;
  if (parts.length !== 3 || !medicineId || !day || !time || !/^\d{8}$/.test(day) || !/^\d{4}$/.test(time)) return invalid();
  const date = parseWibDate(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`);
  if (!date.ok) return invalid();
  const slot = createDoseSlot({ medicineId, scheduledDate: date.value, scheduledTime: `${time.slice(0, 2)}:${time.slice(2)}` });
  return slot.ok ? slot : invalid();
}
