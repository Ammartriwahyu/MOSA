import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AUTH, DRAFT, LABEL, OBAT } from "@/shared/copy";
import { ApiError } from "@/shared/lib";
import type { Medicine } from "../api/medicines";
import { MedicineDetailScreen } from "./medicine-detail-screen";
import { MedicineListScreen } from "./medicine-list-screen";

// Data fiktif untuk uji.
const AMLODIPIN: Medicine = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Amlodipin",
  strength: "5mg",
  purpose: "Menurunkan tekanan darah tinggi",
  doseAmount: "1 tablet",
  usageRule: "Sesudah makan",
  warnings: "Jangan dihentikan mendadak",
  notes: "Simpan di kotak biru",
  intakeTimes: ["07:00", "19:00"],
  labelSource: "apoteker",
  explanation: "Minum obat ini sesudah makan.",
  explanationOrigin: "ai_dikonfirmasi",
  createdAt: "2026-11-01T00:00:00.000Z",
};
const METFORMIN: Medicine = {
  ...AMLODIPIN,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Metformin",
  strength: "500 mg",
  intakeTimes: ["12:00", "18:00"],
  labelSource: "keluarga",
  explanation: null,
  explanationOrigin: "teks_pengisi",
  notes: null,
};

const backend = vi.hoisted(() => ({
  get: vi.fn<(path: string) => Promise<unknown>>(),
}));

vi.mock("@/shared/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib")>();
  return {
    ...actual,
    api: () => ({
      json: async (path: string, schema: { parse: (v: unknown) => unknown }) => schema.parse(await backend.get(path)),
    }),
  };
});

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <main>{ui}</main>
    </QueryClientProvider>,
  );
}

async function expectNoAxeViolations() {
  const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  expect(results.violations).toEqual([]);
}

beforeEach(() => {
  backend.get.mockReset();
});

describe("MedicineListScreen", () => {
  test("menampilkan obat dengan kekuatan, jumlah, jam berkelompok, dan label sumber baku", async () => {
    backend.get.mockResolvedValue({ medicines: [AMLODIPIN, METFORMIN] });
    renderWithQuery(<MedicineListScreen />);

    const link = await screen.findByRole("link", { name: /Amlodipin 5 mg/ });
    expect(link).toHaveAttribute("href", `/medicines/${AMLODIPIN.id}`);
    expect(within(link).getByText("1 tablet · Pagi 07.00 · Malam 19.00")).toBeInTheDocument();
    expect(within(link).getByText(LABEL.diisiApoteker)).toBeInTheDocument();
    expect(screen.getByText(LABEL.diisiKeluarga)).toBeInTheDocument();
    expect(screen.getByText("2 obat terdaftar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: OBAT.tambahObat })).toHaveAttribute("href", "/medicines/new");
    expect(backend.get).toHaveBeenCalledWith("/v1/medicines");
    await expectNoAxeViolations();
  });

  test("kosong: ajakan Tambah Obat", async () => {
    backend.get.mockResolvedValue({ medicines: [] });
    renderWithQuery(<MedicineListScreen />);
    expect(await screen.findByRole("heading", { name: OBAT.kosongJudul })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: OBAT.tambahObat })).toHaveAttribute("href", "/medicines/new");
  });

  test("galat: pesan dan tombol coba lagi yang memuat ulang", async () => {
    backend.get.mockRejectedValueOnce(new ApiError("DATABASE_UNAVAILABLE", 503, "x"));
    backend.get.mockResolvedValueOnce({ medicines: [AMLODIPIN] });
    renderWithQuery(<MedicineListScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatUmum);
    await userEvent.click(screen.getByRole("button", { name: AUTH.cobaLagi }));
    expect(await screen.findByRole("link", { name: /Amlodipin 5 mg/ })).toBeInTheDocument();
  });

  test("memuat: indikator untuk pembaca layar", () => {
    backend.get.mockReturnValue(new Promise(() => undefined));
    renderWithQuery(<MedicineListScreen />);
    expect(screen.getByRole("status")).toHaveTextContent(DRAFT.memuat);
  });
});

describe("MedicineDetailScreen", () => {
  test("penjelasan AI yang dikonfirmasi beserta informasi asli pengisi", async () => {
    backend.get.mockResolvedValue(AMLODIPIN);
    renderWithQuery(<MedicineDetailScreen id={AMLODIPIN.id} />);

    expect(await screen.findByRole("heading", { name: "Amlodipin 5 mg" })).toBeInTheDocument();
    expect(screen.getByText(AMLODIPIN.explanation ?? "")).toBeInTheDocument();
    expect(screen.getByText(OBAT.penjelasanDiperiksa)).toBeInTheDocument();
    expect(screen.getByText(LABEL.kegunaanObat)).toBeInTheDocument();
    expect(screen.getByText("Pagi 07.00 · Malam 19.00")).toBeInTheDocument();
    expect(screen.getByText("Simpan di kotak biru")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: OBAT.ubahPilihanKeluaran })).toHaveAttribute(
      "href",
      `/output-preference?next=${encodeURIComponent(`/medicines/${AMLODIPIN.id}`)}`,
    );
    expect(backend.get).toHaveBeenCalledWith(`/v1/medicines/${AMLODIPIN.id}`);
    await expectNoAxeViolations();
  });

  test("tanpa penjelasan AI (D3): kalimat D-c, tanpa tanda AI; catatan kosong tidak ditampilkan", async () => {
    backend.get.mockResolvedValue(METFORMIN);
    renderWithQuery(<MedicineDetailScreen id={METFORMIN.id} />);

    expect(await screen.findByText(DRAFT.penjelasanBelumTersedia)).toBeInTheDocument();
    expect(screen.queryByText(OBAT.penjelasanDiperiksa)).not.toBeInTheDocument();
    expect(screen.queryByText(OBAT.catatanPribadi)).not.toBeInTheDocument();
    expect(screen.getByText(LABEL.diisiKeluarga)).toBeInTheDocument();
  });

  test("obat tidak ada (404): pesan dan jalan kembali ke daftar", async () => {
    backend.get.mockRejectedValue(new ApiError("NOT_FOUND", 404, "x"));
    renderWithQuery(<MedicineDetailScreen id="tidak-ada" />);

    expect(await screen.findByRole("heading", { name: OBAT.tidakDitemukan })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: OBAT.kembaliKeDaftar })).toHaveAttribute("href", "/medicines");
  });

  test("galat lain: pesan umum dan coba lagi", async () => {
    backend.get.mockRejectedValue(new ApiError("NETWORK_ERROR", null, "x"));
    renderWithQuery(<MedicineDetailScreen id={AMLODIPIN.id} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatUmum);
    expect(screen.getByRole("button", { name: AUTH.cobaLagi })).toBeInTheDocument();
  });
});
