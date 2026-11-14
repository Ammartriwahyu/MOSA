import { AuthGuard } from "@/features/auth";
import { AppShell } from "@/shared/ui";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
