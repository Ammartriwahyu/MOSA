import { AuthGuard } from "@/features/auth";
import { PlainShell } from "@/shared/ui";

// Layar di tengah alur (pilihan tampilan, nanti scan): wajib masuk, tanpa navigasi bawah
// seperti di Figma MOSA DRAFT 09.
export default function FlowLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <PlainShell>{children}</PlainShell>
    </AuthGuard>
  );
}
