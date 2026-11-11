import { describe, expect, test, vi } from "vitest";
import { ApiError } from "@/shared/lib";
import { makeQueryClient } from "./providers";

const auth = vi.hoisted(() => ({ signOut: vi.fn(async () => undefined) }));
vi.mock("@/features/auth", () => ({ householdQueryKey: ["household"], signOut: auth.signOut }));

async function failQuery(error: Error) {
  const client = makeQueryClient();
  client.setQueryData(["household"], { dataConsentAt: "x" });
  await client
    .fetchQuery({ queryKey: ["lain"], queryFn: () => Promise.reject(error), retry: false })
    .catch(() => undefined);
  return client;
}

describe("penanganan galat global", () => {
  test("CONSENT_REQUIRED → status rumah tangga dimuat ulang (penjaga membuka /consent)", async () => {
    const client = await failQuery(new ApiError("CONSENT_REQUIRED", 403, "x"));
    expect(client.getQueryState(["household"])?.isInvalidated).toBe(true);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  test("UNAUTHENTICATED → keluar dari sesi", async () => {
    await failQuery(new ApiError("UNAUTHENTICATED", 401, "x"));
    expect(auth.signOut).toHaveBeenCalled();
  });

  test("galat lain tidak memicu apa pun", async () => {
    auth.signOut.mockClear();
    const client = await failQuery(new ApiError("NOT_FOUND", 404, "x"));
    expect(client.getQueryState(["household"])?.isInvalidated).toBe(false);
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
