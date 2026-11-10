-- Kolom "Kegunaan Obat" (isian wajib #3, PRD §9.2; docs/01 §2: disimpan dan
-- ditampilkan, tidak dikirim ke AI secara default). Tidak ada di sketsa docs/03 §10.
-- Tanpa nilai bawaan: migrasi ini dijalankan sebelum ada data obat.
alter table public.medicines
  add column if not exists purpose text not null check (length(btrim(purpose)) > 0);
