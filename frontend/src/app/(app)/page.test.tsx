import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("halaman awal menampilkan nama aplikasi", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: "TepatMinum" })).toBeInTheDocument();
});
