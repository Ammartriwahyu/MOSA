// Pilihan dropdown "Nama Obat" di Tambah Obat (PRD §9.2 isian #1).
// Daftar dari PRD §19.1 #3 (obat rutin lansia yang umum di Indonesia); atribusi di README.
// Hanya nama: kekuatan selalu diisi terpisah karena satu nama bisa punya beberapa
// kekuatan (PRD §19 #15). Pengisi tetap bisa mengetik nama lain.
// "Aspirin/Miniaspi" di PRD ditulis "Aspirin" (nama zat, bukan merek).
// Urut abjad agar mudah dicari.
export const FAMILIAR_MEDICINES = [
  "Allopurinol",
  "Amlodipin",
  "Aspirin",
  "Atorvastatin",
  "Bisoprolol",
  "Candesartan",
  "Captopril",
  "Glimepirid",
  "Lansoprazol",
  "Mecobalamin",
  "Metformin",
  "Omeprazol",
  "Parasetamol",
  "Simvastatin",
  "Vitamin B Kompleks",
] as const;

export type FamiliarMedicine = (typeof FAMILIAR_MEDICINES)[number];
