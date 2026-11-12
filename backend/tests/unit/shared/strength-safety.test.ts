import { expect, test } from "vitest";
import { parseStrength } from "../../../src/shared/domain/strength";

test.each(["5 constructor", "5 toString", "5 __proto__"])("satuan properti bawaan objek ditolak: %s", (strength) => {
  expect(parseStrength(strength)).toBeNull();
});
