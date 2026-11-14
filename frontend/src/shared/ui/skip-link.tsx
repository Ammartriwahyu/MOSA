import { DRAFT } from "../copy";

/** id isi utama; dipakai SkipLink dan kerangka (<main>). */
export const MAIN_CONTENT_ID = "isi-utama";

/**
 * Tautan "lewati ke isi" (WCAG 2.4.1): elemen pertama yang difokus dengan Tab,
 * tersembunyi sampai difokus, agar pengguna keyboard tidak melewati menu samping
 * setiap pindah halaman. Target ≥ 56 px saat tampil.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:min-h-action focus:items-center focus:rounded-pill focus:bg-action focus:px-6 focus:text-button focus:text-on-action"
    >
      {DRAFT.lewatiKeIsi}
    </a>
  );
}
