export const SCAN_CONSENT_STORAGE_KEY = "hasSeenScanConsent";
const CHANGED_EVENT = "scan-consent-changed";

export function hasDeviceScanConsent(): boolean {
  try { return window.localStorage.getItem(SCAN_CONSENT_STORAGE_KEY) === "true"; }
  catch { return false; }
}

export function rememberDeviceScanConsent(): void {
  try { window.localStorage.setItem(SCAN_CONSENT_STORAGE_KEY, "true"); }
  catch { /* Persetujuan sesi ini tetap berlaku; kunjungan baru akan meminta lagi. */ }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function subscribeDeviceScanConsent(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGED_EVENT, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(CHANGED_EVENT, listener); };
}
