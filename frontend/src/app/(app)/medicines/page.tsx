import { MedicineListScreen } from "@/features/medicines";

// Daftar Obat (Figma 16): tab "Obat" di navigasi bawah.
export default async function MedicinesPage({ searchParams }: PageProps<"/medicines">) {
  const { saved } = await searchParams;
  return <MedicineListScreen savedId={typeof saved === "string" ? saved : undefined} />;
}
