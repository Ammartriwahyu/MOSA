import { readPublicEnv } from "@/shared/config";
import { createApiClient, getSupabaseBrowserClient } from "@/shared/lib";

export async function capturePushSession() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session) throw new Error("push-session");
  const token = data.session.access_token;
  const client = createApiClient({ baseUrl: readPublicEnv().apiUrl, getAccessToken: async () => token, timeoutMs: 5000 });
  return {
    userId: data.session.user.id,
    register: (subscription: PushSubscription) => client.noContent("/v1/push/subscriptions", {
      method: "POST", body: { endpoint: subscription.endpoint, keys: subscription.toJSON().keys },
    }),
    remove: (endpoint: string) => client.noContent("/v1/push/subscriptions", { method: "DELETE", body: { endpoint } }),
  };
}
