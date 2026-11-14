
export const ROUTES = {
  home: "/",
  welcome: "/welcome",
  login: "/login",
  register: "/register",
  consent: "/consent",
  scan: "/scan",
  medicines: "/medicines",
  newMedicine: "/medicines/new",
  settings: "/settings",
  outputPreference: "/output-preference",
} as const;

export function scanForDose(slotId: string): string {
  return `${ROUTES.scan}?dosis=${encodeURIComponent(slotId)}`;
}

export function medicineDetail(id: string): string {
  return `${ROUTES.medicines}/${encodeURIComponent(id)}`;
}

export function medicineEdit(id: string): string {
  return `${medicineDetail(id)}/edit`;
}

export function outputPreferenceThen(next?: string): string {
  return next ? `${ROUTES.outputPreference}?next=${encodeURIComponent(next)}` : ROUTES.outputPreference;
}

export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !/[\\\r\n\t]/.test(value) ? value : fallback;
}
