import { strict as assert } from "node:assert";
import { buildDailySlots } from "../src/modules/dosing/domain/daily-slots";
import { classifyDose } from "../src/modules/dosing/domain/dose-window";
import { parseWibDate } from "../src/shared/domain/wib-time";

process.env.TZ = "UTC";
assert.equal(new Date("2026-11-11T00:00:00Z").getTimezoneOffset(), 0);
const date = parseWibDate("2026-11-11");
if (!date.ok) throw new Error("Tanggal uji tidak valid.");
const slots = buildDailySlots([{
  medicineId: "obat-uji", active: true, createdAt: Date.parse("2026-11-10T00:00:00Z"), intakeTimes: ["23:00"],
}], date.value);
if (!slots.ok) throw new Error("Jadwal uji tidak valid.");
const slot = slots.value[0];
assert.ok(slot);
assert.equal(new Date(slot.scheduledAt).toISOString(), "2026-11-11T16:00:00.000Z");
assert.equal(classifyDose({ scheduledAt: slot.scheduledAt, now: Date.parse("2026-11-11T18:00:00Z"), confirmed: false }), "jatuh_tempo");
assert.equal(classifyDose({ scheduledAt: slot.scheduledAt, now: Date.parse("2026-11-11T18:00:00Z") + 1, confirmed: false }), "terlewat");
assert.equal(slot.scheduledDate, "2026-11-11");
console.info("UTC: slot WIB dan batas tengah malam lulus.");
