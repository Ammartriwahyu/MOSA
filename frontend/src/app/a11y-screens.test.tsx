import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { ConsentScreen, LoginScreen, RegisterScreen, WelcomeScreen } from "@/features/auth";
import { DashboardScreen } from "@/features/doses";
import { AddMedicineScreen, EditMedicineScreen, MedicineDetailScreen, MedicineListScreen } from "@/features/medicines";
import { OutputPreferenceScreen } from "@/features/preferences";
import { ScanScreen } from "@/features/scan";
import { SettingsScreen } from "@/features/settings";
import { AppShell, PlainShell } from "@/shared/ui";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/auth", async (original) => ({ ...await original<typeof import("@/features/auth")>(), useSessionIdentity: () => "akun-fiktif" }));
const medicine = { id: "obat-uji", name: "Obat Uji", strength: "5 mg", purpose: "Kegunaan fiktif", doseAmount: "1 tablet", usageRule: "Sesudah makan", warnings: "Jangan diminum bersama susu", notes: null,
  intakeTimes: ["07:00"], intakeDays: [1, 2, 3, 4, 5, 6, 7], labelSource: "keluarga", explanationOrigin: "teks_pengisi", explanation: null, createdAt: "2026-11-11T00:00:00Z" };
let client: QueryClient;
afterEach(() => { cleanup(); client.clear(); });

const screens: Array<[string, () => ReactNode, boolean]> = [
  ["/welcome", () => <WelcomeScreen />, false], ["/login", () => <LoginScreen />, false], ["/register", () => <RegisterScreen />, false],
  ["/consent", () => <ConsentScreen />, false], ["/", () => <DashboardScreen />, true],
  ["/medicines", () => <MedicineListScreen />, true], ["/medicines/[id]", () => <MedicineDetailScreen id="obat-uji" />, true],
  ["/medicines/new", () => <AddMedicineScreen />, false], ["/medicines/[id]/edit", () => <EditMedicineScreen id="obat-uji" />, false],
  ["/output-preference", () => <OutputPreferenceScreen />, false], ["/settings", () => <SettingsScreen />, false],
  ["/scan — persetujuan", () => <ScanScreen />, false],
];

test.each(screens)("%s: satu h1, landmark utama, dan axe seluruh layar", async (_route, ui, app) => {
  client = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  const household = { dataConsentAt: null, scanConsentAt: null, outputMode: "teks", isDemo: false };
  client.setQueryData(["household"], household); client.setQueryData(["scan-consent", "akun-fiktif"], household);
  client.setQueryData(["account"], { email: "fiktif@contoh.test", name: "Akun Uji" });
  client.setQueryData(["medicines"], [medicine]); client.setQueryData(["medicines", medicine.id], medicine);
  client.setQueryData(["doses", "today"], { date: "2026-11-13", serverTime: "2026-11-13T00:30:00Z", summary: { confirmed: 0, total: 0 }, doses: [], carryoverDoses: [], earlyDoses: [], medicines: [] });
  render(<QueryClientProvider client={client}>{app ? <AppShell>{ui()}</AppShell> : <PlainShell>{ui()}</PlainShell>}</QueryClientProvider>);

  if (screen.queryByRole("dialog")) expect(screen.getAllByRole("heading", { level: 1, hidden: true })).toHaveLength(1);
  else { expect(screen.getAllByRole("main")).toHaveLength(1); expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1); }
  const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
});
