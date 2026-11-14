
export type LogEvent = {
  readonly event: "http_request" | "unexpected_error";
  readonly requestId?: string;
  readonly method?: string;

  readonly route?: string;
  readonly status?: number;
  readonly durationMs?: number;
  readonly code?: string;
};

export interface Logger {
  info(event: LogEvent): void;
  error(event: LogEvent): void;
}
