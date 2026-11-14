import "@fontsource-variable/plus-jakarta-sans";
import type { Metadata, Viewport } from "next";
import { DRAFT, NAMA_APLIKASI } from "@/shared/copy";
import { OPENING_SPLASH_SCRIPT, OpeningSplash } from "@/shared/ui";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: NAMA_APLIKASI,
  description: DRAFT.deskripsiAplikasi,
  appleWebApp: { capable: true, statusBarStyle: "default", title: NAMA_APLIKASI },

  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,

  themeColor: "#f2f4f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (

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
