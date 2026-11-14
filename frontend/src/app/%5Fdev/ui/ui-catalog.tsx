"use client";

import { Camera, CheckCheck, Clock, Lock, Pill, Settings, Trash2, Type, Volume2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  AI_GAGAL,
  DRAFT,
  KONFIRMASI_MINUM,
  LABEL,
  LABEL_STATUS,
  NAMA_BELUM_TERLIHAT,
  TOMBOL,
  bannerJatuhTempo,
  kekuatanBeda,
} from "@/shared/copy";
import {
  Badge,
  Bacakan,
  Banner,
  Button,
  Card,
  Chip,
  ChoiceCards,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  Notice,
  SelectField,
  Skeleton,
  Spinner,
  TextField,
} from "@/shared/ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section">{title}</h2>
      {children}
    </section>
  );
}

export function UiCatalog() {
  const [mode, setMode] = useState<"teks" | "suara" | null>("suara");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <main className="mx-auto flex max-w-app flex-col gap-8 px-gutter py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-page">Katalog UI (dev)</h1>
        <IconButton label="Pengaturan" icon={<Settings />} />
      </header>

      <section aria-label="Suara (Web Speech API)" className="flex flex-col gap-3">
        <h2 className="text-section">Suara (Web Speech API)</h2>
        <p className="text-body">{NAMA_BELUM_TERLIHAT}</p>
        <Bacakan text={NAMA_BELUM_TERLIHAT} contextKey="catalog-voice" />
      </section>

      <Section title="Tombol">
        <Button icon={<Camera />}>{TOMBOL.scanObat}</Button>
        <Button variant="secondary">{TOMBOL.nantiDulu}</Button>
        <Button variant="info" icon={<Volume2 />}>
          {TOMBOL.bacakan}
        </Button>
        <Button variant="outline" size="lg">
          Keluar dari Akun
        </Button>
        <Button variant="danger-outline" size="lg" icon={<Trash2 />}>
          Hapus Seluruh Data & Akun
        </Button>
        <Button variant="danger" size="lg" icon={<Trash2 />}>
          Ya, hapus semua
        </Button>
        <Button disabled>{TOMBOL.sudahSayaMinum}</Button>
      </Section>

      <Section title="Banner pengingat">
        <Banner
          title={bannerJatuhTempo("Amlodipin")}
          eyebrow={
            <>
              <Clock aria-hidden="true" className="size-5" /> 07.00–09.00 WIB
            </>
          }
          actions={<Button icon={<Camera />}>{TOMBOL.scanObat}</Button>}
        >
          Amlodipin 5 mg · 1 tablet · Sesudah makan
        </Banner>
      </Section>

      <Section title="Kartu, lencana, chip">
        <Card>
          <div className="flex items-start gap-3.5">
            <span aria-hidden="true" className="flex size-13 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-brand">
              <Pill className="size-6.5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-title">Omeprazol 20 mg</h3>
              <p className="text-body text-ink-secondary">1 kapsul · Sebelum makan · 06.30</p>
              <div className="flex flex-wrap gap-2">
                <Chip>Sudah 1 dari 1 dosis</Chip>
                <Chip tone="brand">{LABEL.diisiApoteker}</Chip>
              </div>
            </div>
          </div>
          <Badge tone="success" icon={<CheckCheck />}>
            {LABEL_STATUS.sudahScan}
          </Badge>
        </Card>
        <Card tone="due">
          <h3 className="text-title">Amlodipin 5 mg</h3>
          <Badge tone="due" icon={<Clock />}>
            {LABEL_STATUS.belum}
          </Badge>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Badge tone="pending" icon={<Clock />}>
            {LABEL_STATUS.belum}
          </Badge>
          <Badge tone="danger" icon={<Clock />}>
            {LABEL_STATUS.terlewat}
          </Badge>
          <Badge tone="neutral" icon={<Clock />}>
            {LABEL_STATUS.sudahTanpaScan}
          </Badge>
        </div>
      </Section>

      <Section title="Pesan">
        <Card tone="danger">
          <p className="text-title font-semibold">
            {kekuatanBeda({ nama: "Amlodipin", kekuatanTerbaca: "10 mg", kekuatanTerdaftar: "5 mg" })}
          </p>
        </Card>
        <Notice tone="danger">Catatan peringatan (contoh).</Notice>
        <Notice>Akun demo juri dilindungi dan tidak bisa dihapus.</Notice>
        <Notice tone="info">{NAMA_BELUM_TERLIHAT}</Notice>
      </Section>

      <Section title="Isian">
        <TextField label="Nama Obat" placeholder="Contoh: Amlodipin" />
        <TextField label="Aturan Pakai" hint={DRAFT.petunjukAturanPakai} defaultValue="sesudah makan" />
        <TextField label="Kekuatan" error="Isi angka dan satuan, misalnya 5 mg." defaultValue="lima" />
        <TextField label="Kata sandi" type="password" icon={<Lock />} />
        <SelectField
          label="Label Sumber"
          options={[
            { value: "apoteker", label: LABEL.diisiApoteker },
            { value: "keluarga", label: LABEL.diisiKeluarga },
          ]}
        />
        <ChoiceCards
          legend="Cara menampilkan informasi"
          name="mode-keluaran"
          value={mode}
          onChange={setMode}
          options={[
            { value: "teks", title: "Teks saja", description: "Huruf besar di layar", icon: <Type className="size-7" /> },
            {
              value: "suara",
              title: "Teks + Suara Otomatis",
              description: "Dibacakan setelah Anda menyentuh layar",
              icon: <Volume2 className="size-7" />,
            },
          ]}
        />
      </Section>

      <Section title="Memuat, kosong, gagal">
        <Spinner label={DRAFT.sedangMembacaFoto} visibleLabel />
        <Skeleton className="h-24 w-full" />
        <EmptyState
          title="Belum ada obat"
          message="Tambahkan obat pertama dari resep."
          icon={<Pill className="size-10" />}
          action={<Button>Tambah Obat</Button>}
        />
        <ErrorState title="Scan gagal" message={AI_GAGAL} action={<Button variant="secondary">Coba lagi</Button>} />
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setConfirmOpen(true)}>Buka konfirmasi minum</Button>
        <Button variant="danger-outline" onClick={() => setDeleteOpen(true)}>
          Buka hapus akun
        </Button>
      </Section>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={KONFIRMASI_MINUM}
        icon={<Pill className="size-9" />}
        iconTone="brand"
        actions={
          <>
            <Button size="lg" onClick={() => setConfirmOpen(false)}>
              {TOMBOL.sudahSayaMinum}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setConfirmOpen(false)}>
              {TOMBOL.nantiDulu}
            </Button>
          </>
        }
      />
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={DRAFT.hapusAkunJudul}
        description={DRAFT.hapusAkunPenjelasan}
        icon={<Trash2 className="size-9" />}
        iconTone="danger"
        dismissOnOutsideClick={false}
        actions={
          <>
            <Button size="lg" variant="danger" icon={<Trash2 />}>
              Ya, hapus semua
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setDeleteOpen(false)}>
              {TOMBOL.batal}
            </Button>
          </>
        }
      >
        <Notice>Akun demo juri dilindungi dan tidak bisa dihapus.</Notice>
        <TextField label="Masukkan ulang kata sandi" type="password" icon={<Lock />} />
      </Dialog>
    </main>
  );
}
