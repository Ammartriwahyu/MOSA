import { AuthGuard } from "@/features/auth";
import { FlowShell } from "@/shared/ui";

export default function FlowLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <FlowShell>{children}</FlowShell>
    </AuthGuard>
  );
}
