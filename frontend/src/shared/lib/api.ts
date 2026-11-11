import { readPublicEnv } from "../config";
import { createApiClient, type ApiClient } from "./api-client";
import { getAccessToken } from "./supabase";

let client: ApiClient | undefined;

/** Klien API aplikasi (backend nyata). Fitur memanggil ini dari folder `api/` masing-masing. */
export function api(): ApiClient {
  client ??= createApiClient({ baseUrl: readPublicEnv().apiUrl, getAccessToken });
  return client;
}
