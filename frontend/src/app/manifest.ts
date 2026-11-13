import type { MetadataRoute } from "next";
import { DRAFT, NAMA_APLIKASI } from "@/shared/copy";

export default function manifest(): MetadataRoute.Manifest {
  return { id: "/", name: NAMA_APLIKASI, short_name: NAMA_APLIKASI,
    description: DRAFT.deskripsiAplikasi, start_url: "/", scope: "/", display: "standalone",
    background_color: "#f2f4f3", theme_color: "#121614", lang: "id",
    icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
  };
}
