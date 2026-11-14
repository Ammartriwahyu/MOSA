import { GuestGuard } from "@/features/auth";
import { PlainShell } from "@/shared/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <GuestGuard>
      <PlainShell>{children}</PlainShell>
    </GuestGuard>
  );
}
