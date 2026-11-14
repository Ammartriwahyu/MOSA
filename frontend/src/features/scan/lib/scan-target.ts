export type ScanTarget = { mode: "generic" } | { mode: "selected"; slotId: string; date: string; time: string } | { mode: "invalid" };

export function parseScanTarget(value?: string | string[]): ScanTarget {
  if (value === undefined) return { mode: "generic" };
  if (typeof value !== "string") return { mode: "invalid" };
  const match = /^([A-Za-z0-9_-]{1,200}):(\d{4})(\d{2})(\d{2}):([01]\d|2[0-3])([0-5]\d)$/.exec(value);
  if (!match) return { mode: "invalid" };
  const date = `${match[2]}-${match[3]}-${match[4]}`;
  const epoch = Date.parse(`${date}T00:00:00Z`);
  if (Number(match[2]) < 1 || !Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0, 10) !== date) return { mode: "invalid" };
  return { mode: "selected", slotId: value, date, time: `${match[5]}:${match[6]}` };
}
