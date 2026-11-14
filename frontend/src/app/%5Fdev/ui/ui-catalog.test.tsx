import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { expect, test } from "vitest";
import { UiCatalog } from "./ui-catalog";

test("katalog UI tanpa pelanggaran aksesibilitas", async () => {
  render(<UiCatalog />);
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});
