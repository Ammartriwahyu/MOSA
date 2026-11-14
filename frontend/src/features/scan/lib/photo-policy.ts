
export const PHOTO_POLICY = Object.freeze({
  maxBytes: 1_500_000, maxInputBytes: 20_000_000, maxPixels: 48_000_000,
  maxDimension: 1600, resizePasses: 4, resizeFactor: 0.8, timeoutMs: 15_000,
  qualities: [0.9, 0.82, 0.74] as const,
});
export type PhotoFailure = "unsupported" | "too_large" | "unreadable" | "compression";
export class PhotoError extends Error {
  constructor(readonly reason: PhotoFailure) { super(reason); this.name = "PhotoError"; }
}
export type PreparedPhoto = { readonly blob: Blob; readonly width: number; readonly height: number };

export function fittedDimensions(width: number, height: number, maxDimension: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > PHOTO_POLICY.maxPixels) throw new PhotoError("too_large");
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
