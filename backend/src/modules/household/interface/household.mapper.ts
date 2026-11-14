import type { Household, OutputMode } from "../domain/household";

export type HouseholdResponse = {
  dataConsentAt: string | null;
  scanConsentAt: string | null;

  outputMode: OutputMode | null;

  isDemo: boolean;
};

const toIso = (epochMs: number | null): string | null =>
  epochMs === null ? null : new Date(epochMs).toISOString();

export function toHouseholdResponse(household: Household): HouseholdResponse {
  return {
    dataConsentAt: toIso(household.dataConsentAt),
    scanConsentAt: toIso(household.scanConsentAt),
    outputMode: household.outputMode,
    isDemo: household.isDemo,
  };
}
