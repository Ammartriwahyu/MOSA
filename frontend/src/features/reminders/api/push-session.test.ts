import { beforeEach, expect, test, vi } from "vitest";
import { capturePushSession } from "./push-session";

const sdk = vi.hoisted(() => ({ session: { user: { id: "a" }, access_token: "token-a" }, request: vi.fn<typeof fetch>() }));
vi.mock("@/shared/config", () => ({ readPublicEnv: () => ({ apiUrl: "https://api.fixture.test" }) }));
vi.mock("@/shared/lib", async (original) => {
  const actual = await original<typeof import("@/shared/lib")>();
  return { ...actual, getSupabaseBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: sdk.session }, error: null }) } }),
    createApiClient: (options: Parameters<typeof actual.createApiClient>[0]) => actual.createApiClient({ ...options, fetch: sdk.request }) };
});
beforeEach(() => { sdk.request.mockReset(); sdk.session = { user: { id: "a" }, access_token: "token-a" }; });
test("token ditangkap per operasi: pergantian akun tidak mengganti pemilik request tertunda", async () => {
  sdk.request.mockImplementation(async () => new Response(null, { status: 204 }));
  const session = await capturePushSession(); sdk.session = { user: { id: "b" }, access_token: "token-b" };
  const subscription: PushSubscription = { endpoint: "https://fcm.googleapis.com/fcm/send/test", expirationTime: null,
    options: { userVisibleOnly: true, applicationServerKey: null }, getKey: () => null, unsubscribe: async () => true,
    toJSON: () => ({ keys: { p256dh: "public", auth: "auth" } }) };
  await session.register(subscription); await session.remove(subscription.endpoint);
  expect(session.userId).toBe("a");
  for (const [url, options] of sdk.request.mock.calls) {
    expect(String(url)).toBe("https://api.fixture.test/v1/push/subscriptions");
    expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer token-a");
    expect(String(options?.body)).not.toContain("userId");
  }
});
