import type { LogEvent, Logger } from "../application/logger";

type LogSink = (line: string) => void;

// Kolom disalin satu per satu: properti tambahan yang lolos dari pemeriksaan
// tipe (objek berlebih) tetap tidak akan tercetak.
function toLine(level: "info" | "error", event: LogEvent, now: Date): string {
  return JSON.stringify({
    level,
    time: now.toISOString(),
    event: event.event,
    requestId: event.requestId,
    method: event.method,
    route: event.route,
    status: event.status,
    durationMs: event.durationMs,
    code: event.code,
  });
}

export function createJsonLogger(
  sinks: { info: LogSink; error: LogSink } = {
    info: (line) => console.info(line),
    error: (line) => console.error(line),
  },
): Logger {
  return {
    info: (event) => sinks.info(toLine("info", event, new Date())),
    error: (event) => sinks.error(toLine("error", event, new Date())),
  };
}
