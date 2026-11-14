import { MedicineListScreen } from "@/features/medicines";

export default async function MedicinesPage({ searchParams }: PageProps<"/medicines">) {
  const { saved, removed } = await searchParams;
  return <MedicineListScreen savedId={typeof saved === "string" ? saved : undefined} removed={removed === "1"} />;
}
