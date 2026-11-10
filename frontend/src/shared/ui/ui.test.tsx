import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Camera, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { DRAFT, KONFIRMASI_MINUM, TOMBOL } from "../copy";
import {
  Badge,
  Button,
  ChoiceCards,
  Dialog,
  ErrorState,
  IconButton,
  SelectField,
  Spinner,
  TextField,
} from "./index";

// Kontras diuji pada token (design-tokens.test.ts); jsdom tidak merender warna.
async function expectNoA11yViolations(root: Element = document.body) {
  const results = await axe.run(root, { rules: { "color-contrast": { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

describe("Button", () => {
  test("bawaan type=button, label terlihat, ikon disembunyikan dari pembaca layar", () => {
    render(<Button icon={<Camera data-testid="ikon" />}>{TOMBOL.scanObat}</Button>);
    const button = screen.getByRole("button", { name: TOMBOL.scanObat });
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toContain("h-action");
    expect(screen.getByTestId("ikon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  test("asChild memberi gaya tombol pada tautan", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/obat">Obat</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Obat" });
    expect(link.className).toContain("rounded-pill");
    expect(link.className).toContain("bg-secondary");
  });

  test("nonaktif tidak bisa ditekan", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        {TOMBOL.sudahSayaMinum}
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

test("IconButton punya nama aksesibel dari label", () => {
  render(<IconButton label="Pengaturan" icon={<Clock />} />);
  expect(screen.getByRole("button", { name: "Pengaturan" })).toBeInTheDocument();
});

test("Badge menampilkan teks status, bukan hanya warna", () => {
  render(
    <Badge tone="danger" icon={<Clock />}>
      Terlewat
    </Badge>,
  );
  expect(screen.getByText("Terlewat")).toBeVisible();
});

describe("TextField dan SelectField", () => {
  test("label terhubung, petunjuk dan galat menjadi deskripsi, galat menandai aria-invalid", () => {
    render(<TextField label="Kekuatan" hint="Angka dan satuan" error="Isi angka dan satuan." />);
    const input = screen.getByLabelText("Kekuatan");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Angka dan satuan Isi angka dan satuan.");
  });

  test("tanpa galat tidak ada aria-invalid", () => {
    render(<TextField label="Nama Obat" />);
    expect(screen.getByLabelText("Nama Obat")).not.toHaveAttribute("aria-invalid");
  });

  test("pilihan berlabel dengan opsi", () => {
    render(
      <SelectField
        label="Label Sumber"
        options={[
          { value: "apoteker", label: "Diisi apoteker" },
          { value: "keluarga", label: "Diisi keluarga" },
        ]}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Label Sumber" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });
});

describe("ChoiceCards", () => {
  function Harness() {
    const [value, setValue] = useState<"teks" | "suara" | null>(null);
    return (
      <ChoiceCards
        legend="Cara menampilkan informasi"
        name="mode"
        value={value}
        onChange={setValue}
        options={[
          { value: "teks", title: "Teks saja", description: "Huruf besar di layar" },
          { value: "suara", title: "Teks + Suara Otomatis" },
        ]}
      />
    );
  }

  test("grup radio berlabel; memilih kartu mencentang radionya", async () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Cara menampilkan informasi" })).toBeInTheDocument();
    const voice = screen.getByRole("radio", { name: "Teks + Suara Otomatis" });
    expect(voice).not.toBeChecked();
    await userEvent.click(screen.getByText("Teks + Suara Otomatis"));
    expect(voice).toBeChecked();
    expect(screen.getByRole("radio", { name: "Teks saja" })).toHaveAccessibleDescription("Huruf besar di layar");
  });
});

describe("Dialog", () => {
  function Harness({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
    const [open, setOpen] = useState(true);
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        title="Hapus seluruh data dan akun?"
        description="Data dihapus permanen."
        iconTone="danger"
        icon={<Trash2 />}
        dismissOnOutsideClick={false}
        actions={
          <>
            <Button variant="danger">Ya, hapus semua</Button>
            <Button variant="secondary">{TOMBOL.batal}</Button>
          </>
        }
      />
    );
  }

  test("bernama sesuai judul, berdeskripsi, dan tombol bahaya tidak difokus otomatis", async () => {
    render(<Harness />);
    const dialog = await screen.findByRole("dialog", { name: "Hapus seluruh data dan akun?" });
    expect(dialog).toHaveAccessibleDescription("Data dihapus permanen.");
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(screen.getByRole("button", { name: "Ya, hapus semua" })).not.toHaveFocus();
    expect(screen.getByRole("button", { name: DRAFT.tutup })).toBeInTheDocument();
  });

  test("Esc menutup dialog", async () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} />);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("tanpa pelanggaran aksesibilitas saat terbuka", async () => {
    render(<Harness />);
    await screen.findByRole("dialog");
    await expectNoA11yViolations();
  });

  test("dialog tanpa deskripsi tetap valid", async () => {
    render(
      <Dialog open onOpenChange={() => undefined} title={KONFIRMASI_MINUM} actions={<Button>{TOMBOL.sudahSayaMinum}</Button>} />,
    );
    expect(await screen.findByRole("dialog", { name: KONFIRMASI_MINUM })).toBeInTheDocument();
  });
});

describe("umpan balik", () => {
  test("Spinner diumumkan sebagai status dengan label", () => {
    render(<Spinner label={DRAFT.sedangMembacaFoto} />);
    expect(screen.getByRole("status")).toHaveTextContent(DRAFT.sedangMembacaFoto);
  });

  test("ErrorState diumumkan sebagai alert dan punya jalan keluar", () => {
    render(<ErrorState title="Scan gagal" action={<Button>Coba lagi</Button>} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Scan gagal");
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });
});
