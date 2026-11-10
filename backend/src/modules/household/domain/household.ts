// Rumah tangga (aggregate root, docs/03 §6.1). Satu pengguna Supabase punya
// tepat satu rumah tangga, dibuat otomatis saat permintaan terautentikasi pertama.
export type OutputMode = "teks" | "suara";

export type Household = {
  readonly id: string;
  readonly ownerUserId: string;
  /** Epoch ms; null = belum menyetujui penyimpanan data. */
  readonly dataConsentAt: number | null;
  /** Epoch ms; null = belum menyetujui scan pertama. */
  readonly scanConsentAt: number | null;
  /** null = belum memilih Teks atau Suara. */
  readonly outputMode: OutputMode | null;
  /** Akun Demo Juri: tidak boleh dihapus. */
  readonly isDemo: boolean;
  readonly createdAt: number;
};

export function hasDataConsent(household: Household): boolean {
  return household.dataConsentAt !== null;
}
