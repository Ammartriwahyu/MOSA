import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";

// Vercel menerjemahkan tiap berkas .ts menjadi .js tanpa menggabungkan, lalu Node ESM
// menjalankannya: impor relatif wajib berakhiran .js (galat ERR_MODULE_NOT_FOUND bila tidak).
const SRC = join(import.meta.dirname, "../../src");
const RELATIVE = /(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)["'](\.\.?\/[^"']+)["']/gm;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith(".ts") ? [path] : [];
  });
}

describe("impor relatif backend untuk Node ESM (Vercel)", () => {
  test("semua impor relatif di src memakai akhiran .js", () => {
    const missing = sourceFiles(SRC).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(RELATIVE)]
        .map((match) => match[1] ?? "")
        .filter((specifier) => !specifier.endsWith(".js"))
        .map((specifier) => `${relative(SRC, file)}: ${specifier}`),
    );
    expect(missing).toEqual([]);
  });
});
