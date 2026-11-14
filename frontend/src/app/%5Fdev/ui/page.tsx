import { notFound } from "next/navigation";
import { UiCatalog } from "./ui-catalog";

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiCatalog />;
}
