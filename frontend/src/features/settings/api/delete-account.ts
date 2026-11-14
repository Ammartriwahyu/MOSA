import { api } from "@/shared/lib";

export function deleteHouseholdData(signal: AbortSignal): Promise<void> {
  return api().noContent("/v1/household", { method: "DELETE", signal });
}
