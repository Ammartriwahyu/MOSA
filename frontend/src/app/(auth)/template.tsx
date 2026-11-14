import type { ReactNode } from "react";
import { PageTransition } from "@/shared/motion";

// template.tsx dipasang ulang setiap navigasi: hanya isi halaman yang bergerak,
// kerangka (PlainShell) di layout tetap. Jarak antar-blok sama dengan kerangka.
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition className="flex min-w-0 flex-1 flex-col gap-4">{children}</PageTransition>;
}
