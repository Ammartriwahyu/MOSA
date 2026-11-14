const METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

export function requestMethod(method: string): string {
  const normalized = method.toUpperCase();
  return METHODS.has(normalized) ? normalized : "OTHER";
}
