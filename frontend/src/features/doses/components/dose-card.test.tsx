import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, test } from "vitest";
import { DOSIS, LABEL, LABEL_STATUS, waktuPencatatanDosis } from "@/shared/copy";
import { doseSchema } from "../schemas/todays-doses";
import { confirmedDoseFixture } from "../testing/dose-cards-fixture";
import { doseFixture } from "../testing/dosing-fixture";
import { DoseCard } from "./dose-card";

describe("kartu dosis", () => {
  test.each([
    [doseFixture({ status: "belum_tiba" }), LABEL_STATUS.belum, "lucide-clock"],
    [doseFixture(), DOSIS.belumJatuhTempo, "lucide-clock"],
    [doseFixture({ status: "terlewat" }), LABEL_STATUS.terlewat, "lucide-circle-alert"],
    [confirmedDoseFixture("dasar"), LABEL_STATUS.sudahTanpaScan, "lucide-check"],
    [confirmedDoseFixture("scan_terverifikasi"), LABEL_STATUS.sudahScan, "lucide-check-check"],
  ])("status %s memiliki label %s dan ikon dekoratif", (dose, label, icon) => {
    render(<DoseCard dose={doseSchema.parse(dose)} summary={{ confirmed: 3, total: 8 }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole("article").querySelector(`svg.${icon}`)).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Sudah 3 dari 8 dosis")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Obat Uji 5 mg" })).toBeInTheDocument();
    expect(screen.getByText("1 tablet · Sesudah makan · 07.00")).toBeInTheDocument();
  });
  test("sumber hanya pernyataan pengisi, tidak menjadi klaim verifikasi apoteker", () => {
    const dose = doseFixture();
    const { rerender } = render(<DoseCard dose={dose} />);
    expect(screen.getByText(LABEL.diisiKeluarga)).toBeInTheDocument();
    rerender(<DoseCard dose={{ ...dose, medicine: { ...dose.medicine, labelSource: "apoteker" } }} />);
    expect(screen.getByText(LABEL.diisiApoteker)).toBeInTheDocument();
    expect(screen.queryByText(LABEL_STATUS.sudahScan)).not.toBeInTheDocument();
  });
  test("status backend dipertahankan walaupun jam perangkat atau tanggal slot berbeda", () => {
    const dose = doseFixture({ status: "belum_tiba", scheduledAt: "2000-01-01T00:00:00.000Z", scheduledDate: "2000-01-01" });
    render(<DoseCard dose={dose} />);
    expect(screen.getByText(LABEL_STATUS.belum)).toBeInTheDocument();
    expect(screen.getByText(DOSIS.belumWaktunya)).toBeInTheDocument();
    expect(screen.queryByText(LABEL_STATUS.terlewat)).not.toBeInTheDocument();
  });
  test("terlewat dan sudah tidak memiliki tombol atau tautan konfirmasi", () => {
    render(<><DoseCard dose={doseFixture({ status: "terlewat" })} /><DoseCard dose={confirmedDoseFixture("dasar")} /></>);
    expect(screen.getByText(DOSIS.terlewatKeterangan)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
  test("jam konfirmasi pada tanggal berikutnya memakai WIB dan tanggal eksplisit", () => {
    const confirmedAt = "2026-11-11T17:30:00.000Z";
    const dose = confirmedDoseFixture("scan_terverifikasi", { scheduledTime: "23:00", scheduledAt: "2026-11-11T16:00:00.000Z" }, confirmedAt);
    const { container } = render(<DoseCard dose={dose} showDate />);
    expect(screen.getByText("Dicatat pada 12 November 2026 pukul 00.30 WIB.")).toBeInTheDocument();
    expect(screen.getByText("11 November 2026")).toBeInTheDocument();
    expect(container.querySelector(`time[datetime="${confirmedAt}"]`)).toBeInTheDocument();
    expect(waktuPencatatanDosis(confirmedAt)).toBe("Dicatat pada 12 November 2026 pukul 00.30 WIB.");
  });
  test("ringkasan yang tidak tersedia tidak diganti dengan angka tebakan", () => {
    render(<DoseCard dose={doseFixture()} />);
    expect(screen.queryByText(/dari.*dosis/)).not.toBeInTheDocument();
  });
  test("axe mencakup kelima variasi status", async () => {
    const { container } = render(<main><h1>Jadwal</h1><h2>Pagi</h2>{[
      doseFixture({ status: "belum_tiba" }), doseFixture(), doseFixture({ status: "terlewat" }),
      confirmedDoseFixture("dasar"), confirmedDoseFixture("scan_terverifikasi"),
    ].map((dose, index) => <DoseCard key={index} dose={dose} summary={{ confirmed: 1, total: 2 }} />)}</main>);
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
});
