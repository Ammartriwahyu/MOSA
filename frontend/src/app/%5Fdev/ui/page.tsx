import { notFound } from "next/navigation";
import { UiCatalog } from "./ui-catalog";

// Katalog komponen dasar, hanya untuk pengembangan (P07 tugas 8).
// URL: /_dev/ui. Folder "%5Fdev" karena folder berawalan "_" bersifat privat di App Router.
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiCatalog />;
}
