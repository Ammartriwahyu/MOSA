/** Teks yang dibaca AI, bukan keputusan pencocokan (docs/03–04). */
export type PackageReading = {
  readonly names: readonly string[];
  readonly strength: string | null;
  readonly legible: boolean;
};

/** Snapshot obat aktif, sudah disaring menurut household oleh pemanggil. */
export type RegisteredMedicine = {
  readonly medicineId: string;
  readonly name: string;
  readonly strength: string;
};
