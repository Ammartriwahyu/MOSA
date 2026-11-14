import { MedicineDetailScreen } from "@/features/medicines";

export default async function MedicineDetailPage({ params, searchParams }: PageProps<"/medicines/[id]">) {
  const { id } = await params;
  const { updated } = await searchParams;
  return <MedicineDetailScreen id={id} updated={updated === "1"} />;
}
