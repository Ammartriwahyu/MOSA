# Audit kalimat tampilan dan sumber copy

Row44, 12 November 2026. Acuan: [kalimat baku](02-copywriting-baku.md) dan [copy.ts](../frontend/src/shared/copy/copy.ts). Pemeriksaan ini menelusuri sumber kalimat statis; bukan pengujian seluruh tampilan pada perangkat atau persetujuan DRAFT.

## Ruang dan hasil

| Pemeriksaan | Hasil | Batas kesimpulan |
|---|---|---|
| Pencarian `rg` literal Indonesia pada features/shared UI/app | Kandidat berupa komentar dan nilai enum pilihan; tidak ada kalimat statis yang ditemukan sedang dirender di luar copy.ts | Pencarian kata adalah heuristik; setiap hasil ditinjau pada konteksnya |
| AST pada features/shared/app | 126 berkas TS/TSX produk, termasuk 73 TSX; tes, testing, katalog `%5Fdev`, dan sumber copy sendiri dikecualikan | Data obat dan nilai API merupakan isi dinamis, bukan kalimat baku statis |
| JsxText dan atribut teks literal | 0 kandidat mengandung huruf; mencakup title/label/placeholder/alt/aria-label/aria-description/aria-valuetext/description/message | Tidak menelusuri seluruh aliran data JavaScript, string template dinamis, CSS pseudo-content, atau hasil render browser |
| Literal dengan kata Indonesia pada AST | 30 kemunculan: 18 enum/status, 12 pesan teknis internal | Jumlah ini hanya hasil pola kata di bawah, bukan jumlah seluruh string atau semua diagnostic |
| Pesan teknis keluar ke UI | Tidak ditemukan pembacaan error.message atau issues mentah pada jalur tampilan yang ditinjau; alasan galat dipetakan ke copy bersama | Pemeriksaan statis saat ini; ulangi jika ada komponen/penanganan galat baru |
| Tes nilai kalimat | 69 tes copy terarah lulus; copy.test.ts membandingkan nilai baku/templat/DRAFT dengan docs/02; suite frontend penuh 534 lulus | DRAFT yang sama persis tetap belum menjadi kalimat yang disetujui PM |

Kesimpulan lingkup ini: **tidak ada pelanggaran copy UI yang ditemukan**. Tidak mengubah string produk, tidak memindahkan pesan teknis menjadi teks pengguna, dan tidak menambah DRAFT. Ini tidak menyatakan semua kemungkinan pesan browser/AI/server telah diuji.

## Tinjauan kandidat di luar copy.ts

| Kelompok / sumber | Mengapa bukan kalimat UI statis | Bukti jalur penanganan |
|---|---|---|
| `teks` / `suara` pada auth/preferences/settings; `sudah` pada doses/scan | Nilai enum API/status atau kondisi, sedangkan label tampilan dari PREFERENSI/PENGATURAN/LABEL_STATUS | [pilihan keluaran](../frontend/src/features/preferences/components/output-preference-choice.tsx), [status dosis](../frontend/src/features/doses/components/dose-status.tsx) |
| Target scan tidak valid/tidak sesuai | ApiError memakai kode VALIDATION_FAILED/INVALID_RESPONSE; pesannya diagnostic internal | [scan API](../frontend/src/features/scan/api/scan.ts) → [useScanRequest](../frontend/src/features/scan/hooks/use-scan-request.ts) → alasan enum untuk [tampilan permintaan](../frontend/src/features/scan/components/scan-request-view.tsx) |
| Foto belum dapat dibaca/tidak valid | Kegagalan FileReader/base64 tidak ditampilkan langsung | [photo-base64](../frontend/src/features/scan/lib/photo-base64.ts) → useScanRequest; [tes API scan](../frontend/src/features/scan/api/scan.test.ts) dan [scan-screen](../frontend/src/features/scan/components/scan-screen.test.tsx) |
| Slot/jadwal/token/obat tidak konsisten pada zod | Pesan refinement internal; keluaran safeParse tidak dirender mentah | [skema scan](../frontend/src/features/scan/schemas/scan-response.ts) → [api-client](../frontend/src/shared/lib/api-client.ts) mengganti kegagalan bentuk dengan INVALID_RESPONSE |
| Tidak dapat terhubung / bentuk respons tidak sesuai pada api-client | ApiError membawa kode; komponen menampilkan AUTH/SIMPAN_OBAT/CATAT_DOSIS/SCAN_REQUEST/SCAN_CONFIRM yang sesuai | [api-client](../frontend/src/shared/lib/api-client.ts), [tes API](../frontend/src/shared/lib/api-client.test.ts), scan-screen/scan-result serta konfirmasi dosis |

Komentar yang menyebut contoh kalimat tidak dirender. Nama obat familiar, input pengisi, nama akun dan penjelasan yang diperiksa merupakan data; memindahkannya ke copy.ts akan mengubah sumber informasi. Kalimat statis yang membungkus data tetap memakai helper copy bersama.

## Kalimat yang masih menunggu persetujuan

Penanda yang sudah ada dipertahankan: D-a…D-g pada docs/02; status/keterangan autentikasi, preferensi/pengaturan, formulir/ubah/hapus, dashboard/konfirmasi, SCAN_CAPTURE/SCAN_REQUEST/SCAN_OUTCOME/SCAN_CONFIRM dan SUARA pada copy.ts. Audit ini tidak menandai seluruh objek tersebut sebagai baku; periksa komentar `DRAFT` pada entri masing-masing. Label baku seperti Terlewat/Bacakan tidak berubah menjadi DRAFT hanya karena berada di kelompok fitur yang sama.

## Mengulang audit

Dari akar repo, cari kandidat teks UI. Hasil komentar/tipe/enum perlu diperiksa, bukan otomatis dianggap pelanggaran:

```powershell
rg -n -g '*.{ts,tsx}' -g '!*.test.*' -g '!**/testing/**' -g '!**/%5Fdev/**' '"[^"\r\n]*(obat|minum|Kembali|Lanjut|Periksa|Masuk|Daftar|Hapus|Batal|Tutup|Sudah|Belum|Tidak|Silakan|Gagal|Memuat|Coba|Suara|Teks)[^"\r\n]*"' frontend/src/features frontend/src/shared/ui frontend/src/app
pnpm --filter frontend test src/shared/copy/copy.test.ts --reporter=dot
```

Pemeriksaan AST berikut memakai TypeScript yang sudah terpasang. Jalankan dari akar pada PowerShell; tidak membaca env atau direktori dependensi:

```powershell
@'
import ts from 'typescript';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const hits=[],words=[]; let files=0,tsx=0;
const attrs=new Set(['title','label','placeholder','alt','aria-label','aria-description','aria-valuetext','description','message']);
const bahasa=/\b(obat|minum|masuk|daftar|kembali|lanjut|periksa|batal|tutup|sudah|belum|tidak|silakan|gagal|memuat|coba|suara|teks|pengaturan|persetujuan|sandi|hapus)\b/i;
function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true})){
  if(['%5Fdev','testing','copy'].includes(e.name))continue;
  const p=join(dir,e.name);
  if(e.isDirectory()){scan(p);continue;}
  if(!/\.tsx?$/.test(p)||p.includes('.test.'))continue;
  files++;if(p.endsWith('.tsx'))tsx++;
  const s=ts.createSourceFile(p,readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function visit(n){
    let text;
    if(ts.isJsxText(n))text=n.text.trim();
    if(ts.isJsxAttribute(n)&&attrs.has(n.name.getText(s))&&n.initializer){
      if(ts.isStringLiteral(n.initializer))text=n.initializer.text;
      else if(ts.isJsxExpression(n.initializer)&&n.initializer.expression&&ts.isStringLiteral(n.initializer.expression))text=n.initializer.expression.text;
    }
    const line=s.getLineAndCharacterOfPosition(n.getStart(s)).line+1;
    if(text&&/[A-Za-z]/.test(text))hits.push({path:p,line,text});
    if(ts.isStringLiteralLike(n)&&bahasa.test(n.text))words.push({path:p,line,text:n.text});
    ts.forEachChild(n,visit);
  }
  visit(s);
}}
for(const p of ['src/features','src/shared','src/app'])scan(p);
console.log(JSON.stringify({files,tsx,visibleLiterals:hits,indonesianLiterals:words},null,2));
'@ | pnpm --filter frontend exec node --input-type=module
```

Jika kandidat baru benar-benar tampil, pindahkan kalimat statis ke copy.ts, gunakan kalimat baku bila tersedia, atau tandai DRAFT dan catat persetujuannya. Jika hanya diagnostic internal, pastikan error/issue mentah tetap tidak masuk DOM. Gunakan [matriks AC](ac-traceability.md) dan [checklist manual](manual-test-checklist.md) untuk memeriksa pesan dalam konteks alur.
