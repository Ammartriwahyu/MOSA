// Waktu selalu lewat port ini; domain tidak memanggil Date.now() (docs/03 §4).
// Nilainya epoch milidetik (UTC), konversi WIB lewat wib-time.ts.
export interface Clock {
  now(): number;
}

/** Jam tetap untuk tes. */
export function fixedClock(epochMs: number): Clock {
  return { now: () => epochMs };
}
