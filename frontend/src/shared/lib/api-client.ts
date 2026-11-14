import { z } from "zod";
import { ApiError } from "./api-error";

export type ApiClientConfig = {

  baseUrl: string;

  getAccessToken: () => Promise<string | null>;
  fetch?: typeof fetch;

  timeoutMs?: number;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";

  body?: unknown;
  signal?: AbortSignal;
};

const errorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown() }),
});

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export function createApiClient(config: ApiClientConfig) {
  const doFetch = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs ?? 25_000;

  async function send(path: string, options: RequestOptions): Promise<Response> {
    const headers = new Headers({ Accept: "application/json" });
    const token = await config.getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let body: BodyInit | undefined;
    if (isFormData(options.body)) {
      body = options.body;
    } else if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    options.signal?.throwIfAborted();

    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await doFetch(`${config.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body,
        signal,
      });
    } catch (error) {

      if (options.signal?.aborted) throw error;
      if (timeout.aborted) throw new ApiError("TIMEOUT", null, "Permintaan melewati batas waktu.");
      throw new ApiError("NETWORK_ERROR", null, "Tidak dapat terhubung ke server.");
    }

    if (!response.ok) throw await toApiError(response);
    return response;
  }

  return {

    async json<Schema extends z.ZodType>(
      path: string,
      schema: Schema,
      options: RequestOptions = {},
    ): Promise<z.output<Schema>> {
      const response = await send(path, options);
      const parsed = schema.safeParse(await response.json().catch(() => undefined));
      if (!parsed.success) {
        throw new ApiError("INVALID_RESPONSE", response.status, "Bentuk respons server tidak sesuai.");
      }
      return parsed.data;
    },

    async noContent(path: string, options: RequestOptions = {}): Promise<void> {
      await send(path, options);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = errorBodySchema.safeParse(await response.json().catch(() => undefined));
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(code, response.status, message, details ?? null);
  }
  return new ApiError("UNKNOWN_ERROR", response.status, `HTTP ${response.status}`);
}
