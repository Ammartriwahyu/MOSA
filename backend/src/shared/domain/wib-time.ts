import { domainError, type DomainError } from "./domain-error";
import { err, ok, type Result } from "./result";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const WIB_OFFSET_MS = 7 * 60 * MINUTE_MS;

export type WibDate = string & { readonly __brand: "WibDate" };

export type TimeOfDay = { readonly hour: number; readonly minute: number };

export type WibDateTime = { readonly date: WibDate; readonly time: TimeOfDay };

const pad2 = (n: number): string => String(n).padStart(2, "0");

export function toWib(epochMs: number): WibDateTime {
  const shifted = new Date(epochMs + WIB_OFFSET_MS);
  const date = `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
  return {
    date: date as WibDate,
    time: { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() },
  };
}

function dateParts(date: WibDate): { year: number; month: number; day: number } {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

export function fromWib(date: WibDate, time: TimeOfDay): number {
  const { year, month, day } = dateParts(date);
  return Date.UTC(year, month - 1, day, time.hour, time.minute) - WIB_OFFSET_MS;
}

export function startOfWibDay(date: WibDate): number {
  return fromWib(date, { hour: 0, minute: 0 });
}

export function endOfWibDay(date: WibDate): number {
  return startOfWibDay(date) + DAY_MS;
}

export function addWibDays(date: WibDate, days: number): WibDate {
  return toWib(startOfWibDay(date) + days * DAY_MS).date;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseWibDate(text: string): Result<WibDate, DomainError> {
  if (DATE_PATTERN.test(text)) {
    const candidate = text as WibDate;

    if (toWib(startOfWibDay(candidate)).date === text) return ok(candidate);
  }
  return err(domainError("VALIDATION_FAILED", "Tanggal harus berformat YYYY-MM-DD.", { field: "date" }));
}

export function parseTimeOfDay(text: string): Result<TimeOfDay, DomainError> {
  const match = TIME_PATTERN.exec(text);
  if (!match) {
    return err(domainError("VALIDATION_FAILED", "Jam harus berformat HH:mm.", { field: "time" }));
  }
  return ok({ hour: Number(match[1]), minute: Number(match[2]) });
}

export function formatTimeOfDay(time: TimeOfDay): string {
  return `${pad2(time.hour)}:${pad2(time.minute)}`;
}

export function minutesOfDay(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
}
