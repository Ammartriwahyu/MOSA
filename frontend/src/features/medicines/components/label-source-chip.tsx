import { LABEL } from "@/shared/copy";
import { Chip } from "@/shared/ui";
import type { Medicine } from "../api/medicines";

/** Label sumber (B2 baku; Figma menulis "Diisi oleh apoteker", kalimat baku menang). */
export function LabelSourceChip({ source }: { source: Medicine["labelSource"] }) {
  return <Chip tone="brand">{source === "apoteker" ? LABEL.diisiApoteker : LABEL.diisiKeluarga}</Chip>;
}
