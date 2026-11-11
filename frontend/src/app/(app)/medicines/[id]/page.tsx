import { MedicineDetailScreen } from "@/features/medicines";

// Detail Obat (Figma 21). Data dimuat di klien (sesi Supabase ada di browser).
export default async function MedicineDetailPage({ params, searchParams }: PageProps<"/medicines/[id]">) {
  const { id } = await params;
  const { updated } = await searchParams;
  return <MedicineDetailScreen id={id} updated={updated === "1"} />;
}
