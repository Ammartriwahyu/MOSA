import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AUTH, PREFERENSI } from "@/shared/copy";
import { OutputPreferenceScreen } from "./output-preference-screen";

const backend = vi.hoisted(() => ({
  saved: null as "teks" | "suara" | null,
  patch: vi.fn(),
  fail: false,
}));
vi.mock("@/shared/lib", () => ({
  api: () => ({
    json: async (path: string, _schema: unknown, options: { method?: string; body?: { outputMode: "teks" | "suara" } } = {}) => {
      if (options.method === "PATCH") {
        backend.patch(path, options.body);
        if (backend.fail) throw new Error("gagal");
        backend.saved = options.body?.outputMode ?? null;
      }
      return { dataConsentAt: "x", scanConsentAt: "x", outputMode: backend.saved, isDemo: false };
    },
  }),
}));

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function renderScreen(next?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <main>
        <OutputPreferenceScreen next={next} />
      </main>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  backend.saved = null;
  backend.fail = false;
  vi.clearAllMocks();
});

describe("OutputPreferenceScreen", () => {
  test("belum pernah memilih → 'Teks saja' terpilih (Figma 09), label tombol tanpa tujuan", async () => {
    renderScreen();
    expect(await screen.findByRole("radio", { name: PREFERENSI.teksSaja })).toBeChecked();
    expect(screen.getByRole("button", { name: PREFERENSI.simpanPilihan })).toBeInTheDocument();
  });

  test("pilihan tersimpan ditampilkan terpilih", async () => {
    backend.saved = "suara";
    renderScreen();
    expect(await screen.findByRole("radio", { name: PREFERENSI.teksSuara })).toBeChecked();
  });

  test("memilih Suara lalu simpan → PATCH ke akun dan kembali ke hasil scan", async () => {
    renderScreen("/scan?dosis=a%3A1");
    await userEvent.click(await screen.findByText(PREFERENSI.teksSuara));
    await userEvent.click(screen.getByRole("button", { name: PREFERENSI.simpanLihatHasil }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/scan?dosis=a%3A1"));
    expect(backend.patch).toHaveBeenCalledWith("/v1/household/preferences", { outputMode: "suara" });
  });

  test.each(["https://situs-lain.example", "//situs-lain.example"])(
    "tujuan luar %s ditolak → kembali ke jadwal",
    async (next) => {
      renderScreen(next);
      await userEvent.click(await screen.findByRole("button", { name: PREFERENSI.simpanLihatHasil }));
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    },
  );

  test("gagal menyimpan → pesan dibacakan, tetap di halaman", async () => {
    backend.fail = true;
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: PREFERENSI.simpanPilihan }));
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatUmum);
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("tanpa pelanggaran aksesibilitas", async () => {
    renderScreen();
    await screen.findByRole("radio", { name: PREFERENSI.teksSaja });
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
