import { LABEL } from "@/shared/copy";
import { Chip } from "@/shared/ui";
import type { Medicine } from "../api/medicines";

export function LabelSourceChip({ source }: { source: Medicine["labelSource"] }) {
  return <Chip tone="brand">{source === "apoteker" ? LABEL.diisiApoteker : LABEL.diisiKeluarga}</Chip>;
}
