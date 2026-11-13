import "@fontsource-variable/plus-jakarta-sans";
import type { Metadata, Viewport } from "next";
import { DRAFT, NAMA_APLIKASI } from "@/shared/copy";
import { OPENING_SPLASH_SCRIPT, OpeningSplash } from "@/shared/ui";
import "./globals.css";
import { Providers } from "./providers";

// Font Figma (Plus Jakarta Sans) dari paket lokal, bukan next/font/google:
// berkas font ikut di node_modules sehingga demo localhost tetap jalan tanpa internet (NFR-07).

export const metadata: Metadata = {
  title: NAMA_APLIKASI,
  description: DRAFT.deskripsiAplikasi,
  appleWebApp: { capable: true, statusBarStyle: "default", title: NAMA_APLIKASI },
  // Favicon dan ikon dari logo-aplikasi-mosa (Figma 224:14).
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
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
    // suppressHydrationWarning: skrip pembuka menambah data-pembuka di <html> sebelum hidrasi.
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: OPENING_SPLASH_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>
          <OpeningSplash />
          {children}
        </Providers>
      </body>
    </html>
  );
}
