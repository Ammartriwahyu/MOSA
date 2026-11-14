import type { Clock } from "../domain/clock.js";

export const systemClock: Clock = { now: () => Date.now() };
