import { AppShell } from "@/shared/ui";

// Halaman setelah masuk: kolom mobile + navigasi bawah. Penjaga rute (wajib login)
// dipasang di sini pada feat/fe-api-layer, bersama klien Supabase Auth.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
