import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, test, vi } from "vitest";
import Home from "./page";

vi.mock("@/features/doses/api/doses", () => ({ getTodaysDoses: () => new Promise(() => {}), confirmBasicDose: vi.fn() }));

test("halaman awal menampilkan nama aplikasi", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Home /></QueryClientProvider>);
  expect(screen.getByRole("heading", { level: 1, name: "MOSA" })).toBeInTheDocument();
  client.clear();
});
