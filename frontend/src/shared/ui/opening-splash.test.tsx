import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { Logo } from "./logo";
import { markOpeningSplash, OPENING_SPLASH_ATTRIBUTE, OPENING_SPLASH_SCRIPT, OpeningSplash } from "./opening-splash";

function fakeWindow(pathname: string, storage: Partial<Storage> | "blocked" = {}) {
  const values = new Map<string, string>();
  const root = document.createElement("html");
  const sessionStorage =
    storage === "blocked"
      ? {
          getItem: () => {
            throw new Error("SecurityError");
          },
          setItem: () => undefined,
        }
      : {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => void values.set(key, value),
          ...storage,
        };
  const win = { location: { pathname }, sessionStorage, document: { documentElement: root } } as unknown as Window;
  return { win, root };
}

afterEach(() => {
  document.documentElement.removeAttribute(OPENING_SPLASH_ATTRIBUTE);
});

describe("markOpeningSplash (skrip sebelum halaman tampil)", () => {
  test.each(["/", "/welcome", "/login"])("halaman masuk %s: tampil sekali per sesi", (path) => {
    const { win, root } = fakeWindow(path);
    markOpeningSplash(win);
    expect(root.hasAttribute(OPENING_SPLASH_ATTRIBUTE)).toBe(true);

    const second = fakeWindow(path, { getItem: () => "1" });
    markOpeningSplash(second.win);
    expect(second.root.hasAttribute(OPENING_SPLASH_ATTRIBUTE)).toBe(false);
  });

  test.each(["/scan", "/medicines", "/settings"])("tautan dalam %s: tidak tampil", (path) => {
    const { win, root } = fakeWindow(path);
    markOpeningSplash(win);
    expect(root.hasAttribute(OPENING_SPLASH_ATTRIBUTE)).toBe(false);
  });

  test("storage diblokir (mode privat): tidak tampil dan tidak galat", () => {
    const { win, root } = fakeWindow("/", "blocked");
    expect(() => markOpeningSplash(win)).not.toThrow();
    expect(root.hasAttribute(OPENING_SPLASH_ATTRIBUTE)).toBe(false);
  });

  test("teks skrip berdiri sendiri (tidak merujuk variabel modul)", () => {
    expect(OPENING_SPLASH_SCRIPT).toMatch(/^\(function markOpeningSplash\(win\)/);
    expect(OPENING_SPLASH_SCRIPT).toContain('"mosa:pembuka"');
    expect(OPENING_SPLASH_SCRIPT.endsWith(")(window);")).toBe(true);
  });
});

describe("OpeningSplash", () => {
  test("dekoratif: tersembunyi dari pembaca layar dan tanpa elemen yang bisa difokus", () => {
    document.documentElement.setAttribute(OPENING_SPLASH_ATTRIBUTE, "");
    const { container } = render(<OpeningSplash />);
    const overlay = container.querySelector(".pembuka");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay?.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0);
    expect(overlay?.querySelector("img")).toHaveAttribute("alt", "");
  });
});

describe("Logo", () => {
  test("lebar mengikuti rasio asli, alt dari pemanggil", () => {
    render(<Logo variant="utama" height={72} alt="MOSA" />);
    const image = screen.getByRole("img", { name: "MOSA" });
    expect(image).toHaveAttribute("width", "197");
    expect(image).toHaveAttribute("height", "72");
  });

  test("logo dekoratif (alt kosong) tidak dibacakan", () => {
    const { container } = render(<Logo variant="aplikasi" height={48} alt="" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
