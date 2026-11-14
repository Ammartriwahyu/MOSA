import { NAMA_APLIKASI } from "@/shared/copy";
import { Logo } from "@/shared/ui";

export function BrandHeader() {
  return (
    <div className="flex">
      <Logo variant="utama" height={72} alt={NAMA_APLIKASI} priority />
    </div>
  );
}
