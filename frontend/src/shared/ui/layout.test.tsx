import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DRAFT, TOMBOL } from "../copy";
import { AppShell, FlowShell, PageHeader, SideNav } from "./index";

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

describe("navigasi desktop dan layar alur P17", () => {
  test.each([
    ["/", DRAFT.navJadwal],
    ["/medicines/obat-uji/edit", DRAFT.navObat],
    ["/scan", TOMBOL.scanObat],
    ["/settings", DRAFT.pengaturan],
  ])("%s mempunyai satu menu samping aktif dan label terlihat", (path, label) => {
    pathname.current = path;
    render(<SideNav />);
    const side = screen.getByRole("navigation", { name: DRAFT.navigasiSamping });
    expect(within(side).getAllByRole("link")).toHaveLength(4);
    expect(side.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(side).getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  });

  test.each(["/scan", "/output-preference"])("%s mempertahankan satu tugas tanpa menu samping", (path) => {
    pathname.current = path;
    render(<FlowShell><h1>Alur uji</h1></FlowShell>);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  test.each(["/settings", "/medicines/new", "/medicines/obat-uji/edit"])("%s menyediakan menu dan isi utama yang dapat dituju keyboard", (path) => {
    pathname.current = path;
    render(<FlowShell><h1>Alur uji</h1></FlowShell>);
    expect(screen.getByRole("navigation", { name: DRAFT.navigasiSamping })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: DRAFT.lewatiKeIsi })).toHaveAttribute("href", `#${screen.getByRole("main").id}`);
  });
});
