/** Menggabungkan kelas; nilai kosong/false dibuang. Varian ditulis tanpa bentrok, jadi tidak perlu tailwind-merge. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
