import { ScanScreen } from "@/features/scan";

export default async function ScanPage({ searchParams }: PageProps<"/scan">) {
  const params = await searchParams;
  return <ScanScreen doseTarget={params.dosis} />;
}
