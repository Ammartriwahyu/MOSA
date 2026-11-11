import { Settings } from "lucide-react";
import { ROUTES } from "@/shared/config";
import { DRAFT, NAMA_APLIKASI } from "@/shared/copy";
import { IconLink } from "@/shared/ui";

// Halaman sementara; diganti dasbor di feat/dashboard (header dasbor memuat tombol Pengaturan).
export default function Home() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-page">{NAMA_APLIKASI}</h1>
      <IconLink href={ROUTES.settings} label={DRAFT.pengaturan} icon={<Settings />} />
    </header>
  );
}
