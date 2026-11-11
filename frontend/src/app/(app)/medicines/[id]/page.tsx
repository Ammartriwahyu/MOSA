import { MedicineDetailScreen } from "@/features/medicines";

// Detail Obat (Figma 21). Data dimuat di klien (sesi Supabase ada di browser).
export default async function MedicineDetailPage({ params }: PageProps<"/medicines/[id]">) {
  const { id } = await params;
  return <MedicineDetailScreen id={id} />;
}
