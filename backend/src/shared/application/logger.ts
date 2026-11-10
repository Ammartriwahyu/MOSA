// Port logger. Bentuk catatan sengaja tertutup: hanya kode, status, durasi, dan
// penanda permintaan. Tidak ada kolom teks bebas, sehingga isi body, teks pengguna,
// foto, atau data obat tidak bisa ikut tercatat (CLAUDE.md aturan #6).
export type LogEvent = {
  readonly event: "http_request" | "unexpected_error";
  readonly requestId?: string;
  readonly method?: string;
  /** Pola rute terdaftar (mis. "/v1/medicines/:id"), bukan path berisi nilai. */
  readonly route?: string;
  readonly status?: number;
  readonly durationMs?: number;
  readonly code?: string;
};

export interface Logger {
  info(event: LogEvent): void;
  error(event: LogEvent): void;
}
