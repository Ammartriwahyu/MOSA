import { EditMedicineScreen } from "@/features/medicines";

export default async function EditMedicinePage({ params }: PageProps<"/medicines/[id]/edit">) {
  const { id } = await params;
  return <EditMedicineScreen id={id} />;
}
