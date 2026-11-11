import { AuthGuard } from "@/features/auth";
import { AppShell } from "@/shared/ui";

// Halaman setelah masuk: wajib sesi (AuthGuard), lalu kolom mobile + navigasi bawah.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
