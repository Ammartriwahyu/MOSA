import type { Clock } from "../domain/clock";

export const systemClock: Clock = { now: () => Date.now() };
