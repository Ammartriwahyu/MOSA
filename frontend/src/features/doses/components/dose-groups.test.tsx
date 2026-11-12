import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DOSIS } from "@/shared/copy";
import { todaysDosesSchema } from "../schemas/todays-doses";
import { confirmedDoseFixture, doseCardsFixture } from "../testing/dose-cards-fixture";
import { doseFixture, todaysDosesFixture } from "../testing/dosing-fixture";
import { DoseGroups } from "./dose-groups";

describe("kelompok kartu dosis", () => {
  test("Pagi, Siang, Malam dan slot terurut, dengan ringkasan per obat dari server", () => {
    const data = doseCardsFixture();
    render(<DoseGroups data={todaysDosesSchema.parse({ ...data, doses: [...data.doses].reverse() })} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((el) => el.textContent)).toEqual(["Pagi", "Siang", "Malam"]);
    expect(within(screen.getByRole("region", { name: "Pagi" })).getAllByRole("heading", { level: 3 }).map((el) => el.textContent)).toEqual(["Obat Uji D 5 mg", "Obat Uji A 5 mg", "Obat Uji B 5 mg", "Obat Uji C 5 mg"]);
    expect(screen.getAllByText("Sudah 0 dari 2 dosis")).toHaveLength(2);
    expect(screen.getAllByText("Sudah 1 dari 1 dosis")).toHaveLength(2);
  });
  test("period dari backend diikuti tanpa mengelompokkan ulang dari jam", () => {
    render(<DoseGroups data={todaysDosesFixture({ doses: [doseFixture({ period: "malam" })] })} />);
    expect(screen.getByRole("heading", { level: 2, name: "Malam" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pagi" })).not.toBeInTheDocument();
  });
  test("dua obat satu waktu tetap dua kartu, jam kelompok tidak digandakan", () => {
    const dose = doseFixture();
    render(<DoseGroups data={todaysDosesFixture({ doses: [dose, { ...dose, slotId: "slot-b", medicineId: "obat-b", medicine: { ...dose.medicine, id: "obat-b", name: "Obat Uji B" } }] })} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Obat Uji B 5 mg" })).toBeInTheDocument();
    expect(screen.getByText("07.00")).toBeInTheDocument();
  });
  test("dua slot obat sama yang bertumpuk dibedakan oleh jam dan ID", () => {
    render(<DoseGroups data={todaysDosesFixture({ doses: [doseFixture(), doseFixture({ slotId: "slot-0800", scheduledTime: "08:00", scheduledAt: "2026-11-11T01:00:00.000Z" })] })} />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAccessibleName(/pukul 07.00 WIB/);
    expect(cards[1]).toHaveAccessibleName(/pukul 08.00 WIB/);
  });
  test("kemarin dan besok dipisahkan; ringkasan hari ini tidak ditempel ke slot lintas tanggal", () => {
    render(<DoseGroups data={todaysDosesFixture({ doses: [], carryoverDoses: [doseFixture({ scheduledDate: "2026-11-10", slotId: "kemarin" })], earlyDoses: [doseFixture({ scheduledDate: "2026-11-12", slotId: "besok" })] })} />);
    const previous = screen.getByRole("region", { name: DOSIS.jadwalSebelumnya });
    const early = screen.getByRole("region", { name: DOSIS.jadwalDini });
    expect(within(previous).getByText("10 November 2026")).toBeInTheDocument();
    expect(within(early).getByText("12 November 2026")).toBeInTheDocument();
    expect(screen.queryByText("Sudah 0 dari 1 dosis")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: DOSIS.jadwalHariIni })).not.toBeInTheDocument();
  });
  test("obat baru tengah hari tidak membuat kartu untuk slot yang tidak dikirim backend", () => {
    render(<DoseGroups data={todaysDosesFixture({ doses: [doseFixture({ period: "malam", scheduledTime: "19:00", scheduledAt: "2026-11-11T12:00:00.000Z" })] })} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Pagi" })).not.toBeInTheDocument();
  });
  test("konfirmasi lama yang dikirim backend setelah edit jadwal tetap tampil", () => {
    render(<DoseGroups data={todaysDosesFixture({ doses: [confirmedDoseFixture("dasar")], medicines: [{ medicineId: doseFixture().medicineId, summary: { confirmed: 1, total: 1 }, nextDose: null }] })} />);
    expect(screen.getByText("Sudah, tanpa scan")).toBeInTheDocument();
    expect(screen.getByText("Sudah 1 dari 1 dosis")).toBeInTheDocument();
  });
  test("tidak membuat kelompok kosong", () => {
    const { container } = render(<DoseGroups data={todaysDosesFixture({ doses: [], medicines: [] })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
