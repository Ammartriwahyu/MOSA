import { readPublicEnv } from "../config";
import { createApiClient, type ApiClient } from "./api-client";
import { getAccessToken } from "./supabase";

let client: ApiClient | undefined;

export function api(): ApiClient {
  client ??= createApiClient({ baseUrl: readPublicEnv().apiUrl, getAccessToken });
  return client;
}
