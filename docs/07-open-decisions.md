# 07 · Keputusan Terbuka dan Nilai Bawaan Kit

Kit ini memilih nilai bawaan agar pekerjaan tidak berhenti. Setiap nilai bawaan ditempatkan di **satu konstanta/konfigurasi** supaya perubahannya murah. PM/tim menyetujui atau mengganti; setelah itu perbarui berkas ini dan `docs/01`.

| ID | Keputusan | Nilai bawaan kit | Sumber | Dampak bila diganti |
|---|---|---|---|---|
| D1 | Jendela dosis | J−30 sampai J+120 mnt inklusif; slot bertumpuk tetap terbuka dan pengguna memilih slot, tanpa pemotongan otomatis | PM 11 Nov 2026: Q1 = J−30; jawaban terakhir Q2 = opsi 2. Akhir inklusif sesuai docs/05 dan flow alt #19 | Konstanta `dose-window.ts`; pemilihan slot di P05 API/P11 |
| D2 | Dosis `terlewat` boleh dikonfirmasi belakangan? | Tidak (cukup tercatat terlewat) | USULAN | Menambah status/level baru |
| D3 | AI gagal saat Tambah Obat | Simpan tetap boleh, teks pengisi ditampilkan ke lansia | USULAN | Alternatif: blokir simpan sampai AI berhasil |
| D4 | Kolom *kegunaan* dikirim ke AI? | Tidak | Dokumen final vs PRD §9.2 langkah 4 | Ubah `AI_INPUT_FIELDS` |
| D5 | Kalimat DRAFT di `docs/02` | Dipakai sementara | USULAN | Ganti di `copy.ts` |
| D6 | Tombol batal konfirmasi tanpa scan | `Batal` (sesuai PRD §19 #12) | PRD vs analisis (usul `Nanti dulu` agar seragam) | Ganti satu string |
| D7 | Nama aplikasi di UI | `TepatMinum` (sub-label MOSA) | PRD §19 #5 | Ganti satu konstanta |
| D8 | Model Gemini dan batas harian per rumah tangga | Dari `GEMINI_MODEL`; batas harian dari hasil uji kuota | PRD §19.1 #2 (nama model di PRD perlu dicek ulang di halaman deprecations resmi) | Env var |
| D9 | Label sumber bila dokter yang mengisi | Dua opsi saja; "Diisi apoteker" mewakili apoteker/dokter | PRD §19 #7 | Menambah opsi ke enum + CHECK constraint |
| D10 | Batas Pagi/Siang/Malam | 04.00–10.59 / 11.00–17.59 / 18.00–03.59 | USULAN | Konstanta |
| D11 | Obat disimpan setelah jam J hari itu | Slot J tidak dibuat untuk hari itu | USULAN | Logika pembuatan slot |
| D12 | Hasil scan "hanya info", "dosis sudah tercatat", "kekuatan tidak terbaca" | Seperti `docs/01` §5 | USULAN (PRD tidak mendefinisikan) | Union hasil + copy |
| D13 | Layanan hosting backend | Vercel (Hono) | Saran PM | Satu target deploy |
| D14 | Login | Email + password Supabase; sesi persisten | PRD §19.1 #1 | — |
| D15 | Validasi pengguna (SM-05) | Di luar kode; jadwalkan wawancara | PRD §19.1 #4 | — |
| D16 | Kapan perubahan jam minum berlaku? | Langsung saat disimpan; jam baru tidak menciptakan dosis masa lalu, jam tetap mempertahankan waktu aktif, konfirmasi lama dipertahankan | PM 11 Nov 2026 (Q5) | Metadata internal `intake_times_started_at`, trigger jadwal, pembangkit slot dan RPC konfirmasi |

## Klaim dokumen yang tidak dapat diverifikasi dari kode
Bobot "Problem-Solution Fit 25%", "Ethics 10%", dan "waktu persiapan 1 menit" di PRD berasal dari guidebook lomba yang tidak ada di repo. Jangan menulis klaim itu di UI atau README tanpa memeriksa guidebook.
