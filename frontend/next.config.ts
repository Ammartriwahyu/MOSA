import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Pangkas impor barrel Motion (motion/react = export * from framer-motion) agar
    // hanya bagian yang dipakai ikut muat awal (P17: animasi tidak boleh membebani LCP).
    optimizePackageImports: ["motion", "framer-motion"],
  },
  async headers() {
    return [{ source: "/sw.js", headers: [
      { key: "Cache-Control", value: "no-store, max-age=0" },
      { key: "Service-Worker-Allowed", value: "/" },
    ] }];
  },
  // cacheComponents dan partialPrefetching (bawaan create-next-app) dimatikan:
  // sesi Supabase hanya ada di browser, jadi halaman terlindungi tidak bisa
  // dirender lengkap di server. Validasi "instant navigation" gagal dan halaman
  // tidak terhidrasi (penjaga rute macet di "Memuat…").
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
