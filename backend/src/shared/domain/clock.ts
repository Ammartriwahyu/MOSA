
export interface Clock {
  now(): number;
}

export function fixedClock(epochMs: number): Clock {
  return { now: () => epochMs };
}
