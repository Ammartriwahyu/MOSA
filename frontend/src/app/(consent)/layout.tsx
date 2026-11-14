import { AuthGuard } from "@/features/auth";
import { PlainShell } from "@/shared/ui";

export default function ConsentLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard requireConsent={false}>
      <PlainShell>{children}</PlainShell>
    </AuthGuard>
  );
}
