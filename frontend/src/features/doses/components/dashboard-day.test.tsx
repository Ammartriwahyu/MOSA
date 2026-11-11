import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { tanggalDasbor, waktuDasbor } from "@/shared/copy";
import { DashboardDay } from "./dashboard-day";

test("tanggal dan jam WIB berganti tepat tengah malam dari waktu server UTC", () => {
  expect(tanggalDasbor("2026-11-11T16:59:00.000Z")).toBe("Rabu, 11 November");
  expect(waktuDasbor("2026-11-11T16:59:00.000Z")).toBe("23.59 WIB");
  expect(tanggalDasbor("2026-11-11T17:00:00.000Z")).toBe("Kamis, 12 November");
  expect(waktuDasbor("2026-11-11T17:00:00.000Z")).toBe("00.00 WIB");
});

test("kalender melewati pergantian tahun tanpa mengganti tanggal aktif", () => {
  const { container } = render(<DashboardDay date="2027-01-01" serverTime="2026-12-31T17:00:00.000Z" calendar />);
  expect(container.querySelector('[aria-current="date"] time')).toHaveAttribute("datetime", "2027-01-01");
  expect(container.querySelector('time[datetime="2026-12-31"]')).toHaveTextContent("31");
  expect(screen.getByText(/Jumat, 1 Januari · 00.00 WIB/)).toBeInTheDocument();
});
