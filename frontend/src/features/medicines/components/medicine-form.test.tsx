import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { DRAFT, FORM_OBAT, LABEL, OBAT } from "@/shared/copy";
import { emptyMedicineForm, type MedicineFormOutput } from "../schemas/medicine-form";
import { MedicineForm } from "./medicine-form";

function Harness({ onValid }: { onValid: (output: MedicineFormOutput) => void }) {
  const [values, setValues] = useState(emptyMedicineForm);
  return (
    <main>
      <MedicineForm values={values} onValuesChange={setValues} onValid={onValid} />
    </main>
  );
}

function setup() {
  const onValid = vi.fn<(output: MedicineFormOutput) => void>();
  const user = userEvent.setup();
  render(<Harness onValid={onValid} />);
  return { onValid, user };
}

const submit = () => screen.getByRole("button", { name: FORM_OBAT.lanjut });

describe("MedicineForm", () => {
  test("kirim kosong: galat per kolom, ringkasan, fokus ke isian salah pertama; tidak lanjut", async () => {
    const { onValid, user } = setup();
    await user.click(submit());

    expect(onValid).not.toHaveBeenCalled();
    expect(screen.getByText(FORM_OBAT.galatSumber)).toBeInTheDocument();
    expect(screen.getByText(FORM_OBAT.galatJamMinimal)).toBeInTheDocument();
    expect(screen.getAllByText(FORM_OBAT.galatWajib)).toHaveLength(6);
    expect(screen.getByText(FORM_OBAT.galatRingkas)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: LABEL.diisiApoteker })).toHaveFocus();
  });

  test("isi lengkap: daftar obat familiar, jam diubah dan ditambah, tanpa larangan → hasil rapi", async () => {
    const { onValid, user } = setup();
    await user.click(screen.getByRole("radio", { name: LABEL.diisiKeluarga }));
    await user.type(screen.getByRole("combobox", { name: FORM_OBAT.namaObat }), "Metformin");
    await user.type(screen.getByRole("textbox", { name: FORM_OBAT.kekuatan }), "500 mg");
    await user.type(screen.getByRole("textbox", { name: LABEL.kegunaanObat }), "Mengontrol gula darah");
    await user.type(screen.getByRole("textbox", { name: OBAT.aturanPakai }), "Bersama makan");
    await user.type(screen.getByRole("textbox", { name: OBAT.jumlahPerMinum }), "1 tablet");

    await user.click(screen.getByRole("checkbox", { name: "Siang · 12.00" }));
    await user.click(screen.getByRole("checkbox", { name: "Malam · 19.00" }));
    const malam = screen.getByLabelText(`${FORM_OBAT.ubahJam}: Malam · 19.00`);
    await user.clear(malam);
    await user.type(malam, "18:00");
    await user.click(screen.getByRole("checkbox", { name: DRAFT.tidakAdaLarangan }));
    expect(screen.getByRole("textbox", { name: OBAT.larangan })).toHaveValue(DRAFT.tidakAdaLarangan);

    await user.click(submit());
    expect(onValid).toHaveBeenCalledWith({
      labelSource: "keluarga",
      name: "Metformin",
      strength: "500 mg",
      purpose: "Mengontrol gula darah",
      usageRule: "Bersama makan",
      doseAmount: "1 tablet",
      intakeTimes: ["12:00", "18:00"],
      intakeDays: [1, 2, 3, 4, 5, 6, 7],
      warnings: DRAFT.tidakAdaLarangan,
      notes: null,
    });
  });

  test("nama obat: 15 pilihan familiar, tetap boleh ketik sendiri", () => {
    setup();
    const input = screen.getByRole("combobox", { name: FORM_OBAT.namaObat });
    const list = document.getElementById(input.getAttribute("list") ?? "");
    expect(list?.querySelectorAll("option")).toHaveLength(15);
    expect(within(list as HTMLElement).queryByText(/mg/)).toBeNull();
  });

  test("tambah jam sampai 6 baris, lalu tombol tambah hilang", async () => {
    const { user } = setup();
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole("button", { name: FORM_OBAT.tambahJam }));
    expect(screen.getAllByRole("checkbox", { name: FORM_OBAT.jamLain })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: FORM_OBAT.tambahJam })).not.toBeInTheDocument();
  });

  test("galat kolom hilang setelah kolom diubah", async () => {
    const { user } = setup();
    await user.click(submit());
    const name = screen.getByRole("combobox", { name: FORM_OBAT.namaObat });
    expect(name).toHaveAttribute("aria-invalid", "true");
    await user.type(name, "A");
    expect(name).not.toHaveAttribute("aria-invalid");
  });

  test("lolos axe, juga saat galat tampil", async () => {
    const { user } = setup();
    const rules = { rules: { "color-contrast": { enabled: false } } };
    expect((await axe.run(document.body, rules)).violations).toEqual([]);
    await user.click(submit());
    expect((await axe.run(document.body, rules)).violations).toEqual([]);
  });
});
