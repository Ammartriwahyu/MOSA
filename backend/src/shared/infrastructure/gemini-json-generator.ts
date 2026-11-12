import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { domainError, type DomainError } from "../domain/domain-error";
import { err, ok, type Result } from "../domain/result";

/** Bentuk minimal `ai.models.generateContent`; tes menggantinya dengan fungsi palsu. */
export type GenerateContent = (
  params: GenerateContentParameters,
) => Promise<{ readonly text?: string | undefined }>;

export type GeminiJsonRequest = {
  readonly systemInstruction: string;
  readonly contents: GenerateContentParameters["contents"];
  readonly responseJsonSchema: Readonly<Record<string, unknown>>;
  /** Konsumen scan memvalidasi null sebagai bacaan gagal; default penjelasan tetap galat. */
  readonly invalidJson?: "null";
};

export type GeminiJsonOptions = {
  readonly model: string;
  /** Batas waktu total, termasuk percobaan ulang (docs/04: 15–20 detik). */
  readonly timeoutMs?: number;
  readonly retryDelayMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;
// docs/04 pengaman #7: ulang maksimal sekali, hanya untuk 429/503.
const RETRYABLE_STATUS = new Set([429, 503]);
const TEMPERATURE = 0.2;

const unavailable = (): DomainError => domainError("AI_UNAVAILABLE", "Layanan AI tidak tersedia.");
const quotaExceeded = (): DomainError =>
  domainError("AI_QUOTA_EXCEEDED", "Kuota layanan AI habis.");

function statusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

/** Deadline tetap berlaku bila implementasi SDK mengabaikan sinyal batal. */
async function generateBeforeDeadline(
  generate: GenerateContent,
  params: GenerateContentParameters,
  signal: AbortSignal,
): ReturnType<GenerateContent> {
  let onAbort = () => {};
  try {
    return await new Promise<Awaited<ReturnType<GenerateContent>>>((resolve, reject) => {
      onAbort = () => reject(unavailable());
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
      else void generate(params).then(resolve, reject);
    });
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function parseJson(text: string | undefined, invalidJson?: "null"): Result<unknown, DomainError> {
  const invalid = () => invalidJson === "null" ? ok(null) : err(unavailable());
  if (!text) return invalid();
  try {
    return ok(JSON.parse(text));
  } catch {
    return invalid();
  }
}

/** Klien Gemini sungguhan. Hanya dibuat di composition root dari env server. */
export function createGeminiGenerateContent(apiKey: string): GenerateContent {
  const ai = new GoogleGenAI({ apiKey });
  return (params) => ai.models.generateContent(params);
}

/**
 * Pemanggil Gemini bersama untuk penjelasan obat dan baca kemasan: keluaran
 * JSON, suhu rendah, batas waktu, satu percobaan ulang. Mengembalikan JSON
 * mentah; adaptor pemanggil yang memvalidasinya dengan zod. Galat SDK tidak
 * diteruskan ke klien maupun log (bisa memuat potongan permintaan).
 */
export class GeminiJsonGenerator {
  private readonly timeoutMs: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly generate: GenerateContent,
    private readonly options: GeminiJsonOptions,
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  }

  async generateJson(request: GeminiJsonRequest): Promise<Result<unknown, DomainError>> {
    const signal = AbortSignal.timeout(this.timeoutMs);
    const params: GenerateContentParameters = {
      model: this.options.model,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        temperature: TEMPERATURE,
        responseMimeType: "application/json",
        responseJsonSchema: request.responseJsonSchema,
        abortSignal: signal,
      },
    };

    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await generateBeforeDeadline(this.generate, params, signal);
        if (signal.aborted) return err(unavailable());
        return parseJson(response.text, request.invalidJson);
      } catch (error) {
        if (signal.aborted) return err(unavailable());
        const status = statusOf(error);
        if (attempt === 1 && status !== null && RETRYABLE_STATUS.has(status) && !signal.aborted) {
          await wait(this.retryDelayMs, signal);
          if (signal.aborted) return err(unavailable());
          continue;
        }
        return err(status === 429 ? quotaExceeded() : unavailable());
      }
    }
  }
}
