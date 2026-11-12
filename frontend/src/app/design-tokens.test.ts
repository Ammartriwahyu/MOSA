import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

// Menegakkan docs/06 pada token tema (Figma page MOSA DRAFT): kontras dan ukuran minimum.
const css = readFileSync(join(import.meta.dirname, "globals.css"), "utf8");

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!match?.[1]) throw new Error(`token --${name} tidak ada`);
  return match[1].replace(/\/\*.*\*\//, "").trim();
}

function hex(name: string): string {
  const value = token(name);
  const ref = /^var\(--([\w-]+)\)$/.exec(value);
  return ref?.[1] ? hex(ref[1]) : value;
}

function luminance(color: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(hex(foreground)), luminance(hex(background))].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const px = (name: string) => Number.parseFloat(token(name));

// Pasangan teks/latar yang dipakai di layar Figma DRAFT.
const TEXT_PAIRS: Array<[string, string]> = [
  ["color-ink", "color-surface"],
  ["color-ink", "color-canvas"],
  ["color-ink", "color-secondary"],
  ["color-ink-secondary", "color-surface"],
  ["color-ink-secondary", "color-canvas"],
  ["color-muted", "color-surface"],
  ["color-on-action", "color-action"],
  ["color-on-action", "color-camera"],
  ["color-on-action", "color-camera-surface"],
  ["color-success-border", "color-camera-surface"],
  ["color-on-brand", "color-brand-strong"],
  ["color-on-brand", "color-brand"],
  ["color-brand", "color-surface"],
  ["color-brand-ink", "color-brand-soft"],
  ["color-success", "color-success-soft"],
  ["color-warning", "color-warning-soft"],
  ["color-warning", "color-pending-soft"],
  ["color-danger", "color-surface"],
  ["color-danger-strong", "color-danger-soft"],
  ["color-on-brand", "color-danger"],
  ["color-info", "color-info-soft"],
  ["color-status-missed", "color-surface"],
  ["color-brand-ink", "color-hero-to"],
  ["color-ink", "color-hero-from"],
];

describe("kontras teks ≥ 4,5:1 (docs/06)", () => {
  test.each(TEXT_PAIRS)("%s di atas %s", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  test("teks isi dan tombol aksi utama mencapai target 7:1", () => {
    expect(contrast("color-ink", "color-surface")).toBeGreaterThanOrEqual(7);
    expect(contrast("color-on-action", "color-action")).toBeGreaterThanOrEqual(7);
  });
});

describe("ukuran minimum (docs/06)", () => {
  test("tombol utama ≥ 56 px dan target sentuh ≥ 48 px", () => {
    expect(px("spacing-action")).toBeGreaterThanOrEqual(56);
    expect(px("spacing-action-lg")).toBeGreaterThanOrEqual(56);
    expect(px("spacing-touch")).toBeGreaterThanOrEqual(48);
  });

  test("teks isi dan tombol ≥ 18 px", () => {
    expect(px("text-body")).toBeGreaterThanOrEqual(18);
    expect(px("text-button")).toBeGreaterThanOrEqual(18);
  });
});

test("palet bawaan Tailwind dimatikan: hanya warna token yang tersedia", () => {
  expect(css).toContain("--color-*: initial;");
});

test("nama ukuran teks tidak bentrok dengan nama warna (kelas text-* jadi ambigu)", () => {
  const names = (prefix: string) =>
    new Set([...css.matchAll(new RegExp(`--${prefix}-([\w-]+?)(?:--[\w-]+)?:`, "g"))].map((m) => m[1]));
  const colors = names("color");
  const clashes = [...names("text")].filter((name) => colors.has(name));
  expect(clashes).toEqual([]);
});
