import { DRAFT } from "../copy";

export const MAIN_CONTENT_ID = "isi-utama";

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
