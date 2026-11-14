import { ApiError } from "@/shared/lib";
import { PHOTO_POLICY } from "./photo-policy";

export function photoBase64(blob: Blob, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  if (blob.type !== "image/jpeg" || blob.size === 0 || blob.size > PHOTO_POLICY.maxBytes)
    return Promise.reject(new ApiError("VALIDATION_FAILED", 400, "Foto siap kirim tidak valid."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => { reader.onload = null; reader.onerror = null; signal.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); reader.abort(); reject(new DOMException("Aborted", "AbortError")); };
    reader.onerror = () => { cleanup(); reject(new ApiError("VALIDATION_FAILED", 400, "Foto belum bisa dibaca.")); };
    reader.onload = () => {
      cleanup();
      const prefix = "data:image/jpeg;base64,";
      if (typeof reader.result !== "string" || !reader.result.startsWith(prefix))
        reject(new ApiError("VALIDATION_FAILED", 400, "Foto belum bisa dibaca."));
      else resolve(reader.result.slice(prefix.length));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    try { reader.readAsDataURL(blob); }
    catch { cleanup(); reject(new ApiError("VALIDATION_FAILED", 400, "Foto belum bisa dibaca.")); }
  });
}
