/** Nearest-rank percentile; sampel tidak diinterpolasi menjadi angka yang tidak diukur. */
export function summarizeDurations(samples: readonly number[]) {
  if (!samples.length || samples.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Sampel benchmark harus berisi durasi terbatas dan nonnegatif.");
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted[Math.ceil(fraction * sorted.length) - 1]!;
  const rounded = (value: number) => Math.round(value * 100) / 100;
  return {
    samples: sorted.length, minMs: rounded(sorted[0]!), medianMs: rounded(percentile(0.5)),
    p95Ms: rounded(percentile(0.95)), maxMs: rounded(sorted.at(-1)!),
    meanMs: rounded(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
  };
}
