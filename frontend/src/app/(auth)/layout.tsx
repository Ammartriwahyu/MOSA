import { GuestGuard } from "@/features/auth";
import { PlainShell } from "@/shared/ui";

// Halaman tamu: onboarding, masuk, daftar. Yang sudah masuk dialihkan ke jadwal.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <GuestGuard>
      <PlainShell>{children}</PlainShell>
    </GuestGuard>
  );
}
