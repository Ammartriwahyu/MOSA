import { AuthGuard } from "@/features/auth";
import { PlainShell } from "@/shared/ui";

// Wajib masuk, tetapi persetujuan data belum diperlukan (layar ini yang mencatatnya).
export default function ConsentLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard requireConsent={false}>
      <PlainShell>{children}</PlainShell>
    </AuthGuard>
  );
}
