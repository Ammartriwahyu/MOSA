import { z } from "zod";

// Hanya nilai publik (NEXT_PUBLIC_*): ikut terkirim ke browser. Kunci rahasia
// tidak pernah ada di frontend (CLAUDE.md aturan #7).
// process.env dibaca dengan nama literal agar Next.js bisa menyisipkannya saat build.
const RAW = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

const schema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = {
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
};

/**
 * Nilai env publik yang tervalidasi. Melempar bila kurang: konfigurasi salah
 * adalah bug penyebaran. Pesan hanya menyebut nama variabel.
 */
export function readPublicEnv(source: Record<string, string | undefined> = RAW): PublicEnv {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Isi frontend/.env.local: ${names.join(", ")}`);
  }
  return {
    apiUrl: parsed.data.NEXT_PUBLIC_API_URL.replace(/\/+$/, ""),
    supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
