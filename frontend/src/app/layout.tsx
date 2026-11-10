import type { Metadata } from "next";
import "./globals.css";

// Nama aplikasi sementara sesuai keputusan D7 (docs/07).
export const metadata: Metadata = {
  title: "TepatMinum",
  description: "MOSA: Medication Organizer, Scanner & Assistant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
