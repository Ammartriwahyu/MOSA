import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
