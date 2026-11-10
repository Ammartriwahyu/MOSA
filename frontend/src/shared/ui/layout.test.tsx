import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DRAFT, TOMBOL } from "../copy";
import { AppShell, PageHeader } from "./index";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = "/";
});

function nav() {
  return screen.getByRole("navigation", { name: DRAFT.navigasiUtama });
}

describe("navigasi bawah", () => {
  test("tiga tujuan berlabel teks: Jadwal, Scan Obat, Obat", () => {
    render(<AppShell>isi</AppShell>);
    const links = within(nav()).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      [DRAFT.navJadwal, "/"],
      [TOMBOL.scanObat, "/scan"],
      [DRAFT.navObat, "/medicines"],
    ]);
  });

  test.each([
    ["/", DRAFT.navJadwal],
    ["/medicines", DRAFT.navObat],
    ["/medicines/abc", DRAFT.navObat],
    ["/scan", TOMBOL.scanObat],
  ])("di %s yang aktif hanya %s (aria-current)", (path, label) => {
    pathname.current = path;
    render(<AppShell>isi</AppShell>);
    const current = within(nav())
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.textContent)).toEqual([label]);
  });

  test("/medicines-x tidak dianggap halaman Obat", () => {
    pathname.current = "/medicines-x";
    render(<AppShell>isi</AppShell>);
    expect(within(nav()).getByRole("link", { name: DRAFT.navObat })).not.toHaveAttribute("aria-current");
  });

  test("kerangka tanpa pelanggaran aksesibilitas", async () => {
    render(
      <AppShell>
        <PageHeader title="Pengaturan" backHref="/" />
      </AppShell>,
    );
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("PageHeader", () => {
  test("judul sebagai h1 dan tombol kembali berlabel", () => {
    render(<PageHeader title="Hasil Scan" backHref="/" />);
    expect(screen.getByRole("heading", { level: 1, name: "Hasil Scan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: DRAFT.kembali })).toHaveAttribute("href", "/");
  });

  test("tanpa backHref tidak ada tombol kembali", () => {
    render(<PageHeader title="Jadwal" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
