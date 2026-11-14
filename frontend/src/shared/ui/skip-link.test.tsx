import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { DRAFT } from "../copy";
import { AppShell } from "./app-shell";
import { FlowShell } from "./flow-shell";
import { MAIN_CONTENT_ID } from "./skip-link";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("tautan lewati ke isi (WCAG 2.4.1)", () => {
  test("AppShell: elemen pertama yang difokus Tab, menuju <main>", async () => {
    pathname.current = "/";
    render(<AppShell><h1>Jadwal</h1></AppShell>);
    await userEvent.tab();
    const link = screen.getByRole("link", { name: DRAFT.lewatiKeIsi });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
  });

  test("FlowShell dengan navigasi samping punya tautan; scan (layar penuh) tidak", () => {
    pathname.current = "/settings";
    const { unmount } = render(<FlowShell><h1>Pengaturan</h1></FlowShell>);
    expect(screen.getByRole("link", { name: DRAFT.lewatiKeIsi })).toBeInTheDocument();
    unmount();

    pathname.current = "/scan";
    render(<FlowShell><h1>Scan</h1></FlowShell>);
    expect(screen.queryByRole("link", { name: DRAFT.lewatiKeIsi })).toBeNull();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
  });
});
