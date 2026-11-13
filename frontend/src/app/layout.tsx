import "@fontsource-variable/plus-jakarta-sans";
import type { Metadata, Viewport } from "next";
import { DRAFT, NAMA_APLIKASI } from "@/shared/copy";
import "./globals.css";
import { Providers } from "./providers";

// Font Figma (Plus Jakarta Sans) dari paket lokal, bukan next/font/google:
// berkas font ikut di node_modules sehingga demo localhost tetap jalan tanpa internet (NFR-07).

export const metadata: Metadata = {
  title: NAMA_APLIKASI,
  description: DRAFT.deskripsiAplikasi,
  appleWebApp: { capable: true, statusBarStyle: "default", title: NAMA_APLIKASI },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Tanpa maximumScale/userScalable: pengguna lansia harus tetap bisa memperbesar layar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sama dengan token --color-canvas (metadata tidak bisa membaca variabel CSS).
  themeColor: "#f2f4f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
