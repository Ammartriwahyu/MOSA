const METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

/** Metode nonstandar juga input klien; jangan menjadikannya kolom teks bebas pada log. */
export function requestMethod(method: string): string {
  const normalized = method.toUpperCase();
  return METHODS.has(normalized) ? normalized : "OTHER";
}
