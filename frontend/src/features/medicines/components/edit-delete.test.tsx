import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AUTH, DRAFT, FORM_OBAT, KONFIRMASI_SIMPAN_OBAT, LABEL, OBAT, SIMPAN_OBAT, TOMBOL, UBAH_OBAT } from "@/shared/copy";
import { ApiError } from "@/shared/lib";
import type { CreateMedicineInput, Medicine } from "../api/medicines";
import { medicinesQueryKey } from "../hooks/use-medicines";
import { DeleteMedicineAction } from "./delete-medicine-action";
import { EditMedicineScreen } from "./edit-medicine-screen";
import { MedicineDetailScreen } from "./medicine-detail-screen";

type Request = { method: string; body?: unknown };
const backend = vi.hoisted(() => ({ call: vi.fn<(path: string, request: Request) => Promise<unknown>>() }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => router }));
vi.mock("@/shared/lib", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/shared/lib")>(),
  api: () => ({
    json: async (path: string, schema: { parse: (value: unknown) => unknown }, options?: Request) =>
      schema.parse(await backend.call(path, options ?? { method: "GET" })),
    noContent: async (path: string, options: Request) => { await backend.call(path, options); },
  }),
}));

const MEDICINE: Medicine = {
  id: "11111111-1111-4111-8111-111111111111", name: "Obat Uji", strength: "5 mg", purpose: "Kegunaan uji",
  doseAmount: "1 tablet", usageRule: "Sesudah makan", intakeTimes: ["06:30", "18:30"], intakeDays: [1, 2, 3, 4, 5, 6, 7],
  warnings: "Peringatan uji", notes: "Kotak biru", labelSource: "keluarga", explanation: "Penjelasan lama yang sudah diperiksa.",
  explanationOrigin: "ai_dikonfirmasi", createdAt: "2026-11-01T00:00:00Z",
};
const OTHER = { ...MEDICINE, id: "22222222-2222-4222-8222-222222222222", name: "Obat lain" };
const EXPLANATION = "Gunakan sesudah makan. Peringatan uji. Kotak biru.";
const path = `/v1/medicines/${MEDICINE.id}`;
let server: Medicine;

function setup(kind: "edit" | "delete" | "detail" = "edit") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(medicinesQueryKey, [MEDICINE, OTHER]);
  client.setQueryData([...medicinesQueryKey, OTHER.id], OTHER);
  if (kind === "delete") client.setQueryData([...medicinesQueryKey, MEDICINE.id], MEDICINE);
  const view = render(<QueryClientProvider client={client}><main>
    {kind === "edit" ? <EditMedicineScreen id={MEDICINE.id} /> : kind === "detail" ? <MedicineDetailScreen id={MEDICINE.id} /> : <DeleteMedicineAction medicine={MEDICINE} />}
  </main></QueryClientProvider>);
  return { ...view, client, user: userEvent.setup() };
}

const requests = (method: string) => backend.call.mock.calls.filter(([, options]) => options.method === method);
const next = () => screen.getByRole("button", { name: FORM_OBAT.lanjut });
const confirmSave = () => screen.getByRole("button", { name: TOMBOL.yaSudahBenar });
const confirmDelete = () => screen.getByRole("button", { name: UBAH_OBAT.yaHapus });

beforeEach(() => {
  backend.call.mockReset();
  router.replace.mockReset();
  server = { ...MEDICINE };
  backend.call.mockImplementation(async (_path, options) => {
    if (options.method === "PATCH") { server = { ...server, ...options.body as CreateMedicineInput }; return server; }
    if (options.method === "POST") return { explanation: EXPLANATION };
    return options.method === "GET" ? server : undefined;
  });
});

describe("Ubah Obat", () => {
  test("memuat data asli; pilih sumber lagi, explain ulang walau teks tidak berubah, lalu PATCH setelah konfirmasi", async () => {
    const { user, client } = setup();
    expect(await screen.findByLabelText(FORM_OBAT.namaObat)).toHaveValue(MEDICINE.name);
    expect(screen.getByLabelText(FORM_OBAT.catatanOpsional)).toHaveValue(MEDICINE.notes);
    expect(screen.getByRole("checkbox", { name: "Pagi · 06.30" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Malam · 18.30" })).toBeChecked();
    expect(screen.getByRole("radio", { name: LABEL.diisiKeluarga })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: LABEL.diisiApoteker })).not.toBeChecked();
    await user.click(next());
    expect(screen.getByText(FORM_OBAT.galatSumber)).toBeVisible();
    expect(requests("POST")).toHaveLength(0);
    await user.click(screen.getByRole("radio", { name: LABEL.diisiApoteker }));
    await user.click(next());
    const dialog = await screen.findByRole("dialog", { name: UBAH_OBAT.periksaJudul });
    expect(dialog).toHaveAccessibleDescription(KONFIRMASI_SIMPAN_OBAT);
    expect(within(dialog).getByText(EXPLANATION)).toBeVisible();
    expect(screen.queryByText(MEDICINE.explanation!)).not.toBeInTheDocument();
    expect(requests("POST")[0][1].body).toEqual({ usageRule: MEDICINE.usageRule, warnings: MEDICINE.warnings, notes: MEDICINE.notes });
    expect(requests("PATCH")).toHaveLength(0);
    await user.click(confirmSave());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/medicines/${MEDICINE.id}?updated=1`));
    expect(requests("PATCH")).toEqual([[path, { method: "PATCH", body: {
      name: MEDICINE.name, strength: MEDICINE.strength, purpose: MEDICINE.purpose, doseAmount: MEDICINE.doseAmount,
      usageRule: MEDICINE.usageRule, warnings: MEDICINE.warnings, notes: MEDICINE.notes, intakeTimes: MEDICINE.intakeTimes, intakeDays: MEDICINE.intakeDays,
      labelSource: "apoteker", explanation: EXPLANATION, explanationOrigin: "ai_dikonfirmasi",
    } }]]);
    expect(client.getQueryData([...medicinesQueryKey, MEDICINE.id])).toEqual(server);
    expect(client.getQueryData(medicinesQueryKey)).toEqual([server, OTHER]);
    expect(server.createdAt).toBe(MEDICINE.createdAt);
  });

  test("koreksi tetap ada setelah refetch dan Perbaiki lagi; lanjut berikutnya membuat explain baru", async () => {
    const { user, client } = setup();
    await screen.findByLabelText(FORM_OBAT.namaObat);
    fireEvent.change(screen.getByLabelText(OBAT.aturanPakai), { target: { value: "Bersama makan" } });
    act(() => client.setQueryData([...medicinesQueryKey, MEDICINE.id], { ...MEDICINE, name: "Nama dari HP lain" }));
    expect(screen.getByLabelText(FORM_OBAT.namaObat)).toHaveValue(MEDICINE.name);
    expect(screen.getByLabelText(OBAT.aturanPakai)).toHaveValue("Bersama makan");
    await user.click(screen.getByRole("radio", { name: LABEL.diisiKeluarga }));
    await user.click(next());
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: TOMBOL.perbaikiLagi }));
    expect(screen.getByLabelText(OBAT.aturanPakai)).toHaveValue("Bersama makan");
    expect(screen.getByRole("radio", { name: LABEL.diisiKeluarga })).toBeChecked();
    await user.click(next());
    await screen.findByRole("dialog");
    expect(requests("POST")).toHaveLength(2);
    expect(requests("PATCH")).toHaveLength(0);
  });

  test("AI gagal saat edit: teks asli tetap bisa disimpan, penjelasan lama dibuang", async () => {
    const original = backend.call.getMockImplementation()!;
    backend.call.mockImplementation((url, options) => options.method === "POST"
      ? Promise.reject(new ApiError("AI_QUOTA_EXCEEDED", 429, "uji")) : original(url, options));
    const { user } = setup();
    await screen.findByLabelText(FORM_OBAT.namaObat);
    await user.click(screen.getByRole("radio", { name: LABEL.diisiKeluarga }));
    await user.click(next());
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(DRAFT.penjelasanBelumTersedia)).toBeVisible();
    expect(screen.queryByText(MEDICINE.explanation!)).not.toBeInTheDocument();
    await user.click(confirmSave());
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(requests("PATCH")[0][1].body).toMatchObject({ explanation: null, explanationOrigin: "teks_pengisi" });
  });

  test("GET 404 tidak membuka formulir kosong dan menyediakan kembali ke daftar", async () => {
    backend.call.mockRejectedValue(new ApiError("NOT_FOUND", 404, "uji"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(OBAT.tidakDitemukan);
    expect(screen.queryByLabelText(FORM_OBAT.namaObat)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: OBAT.kembaliKeDaftar })).toHaveAttribute("href", "/medicines");
  });

  test("GET gagal: keadaan memuat, galat dan coba lagi", async () => {
    backend.call.mockRejectedValueOnce(new ApiError("NETWORK_ERROR", null, "uji"));
    const { user } = setup();
    expect(screen.getByRole("status")).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatUmum);
    await user.click(screen.getByRole("button", { name: AUTH.cobaLagi }));
    expect(await screen.findByLabelText(FORM_OBAT.namaObat)).toHaveValue(MEDICINE.name);
  });

  test.each(["DATABASE_UNAVAILABLE", "NOT_FOUND"])("PATCH %s: terlihat, tanpa perubahan cache atau pengalihan sukses", async (code) => {
    const original = backend.call.getMockImplementation()!;
    backend.call.mockImplementation((url, options) => options.method === "PATCH"
      ? Promise.reject(new ApiError(code, code === "NOT_FOUND" ? 404 : 503, "uji")) : original(url, options));
    const { user, client } = setup();
    await screen.findByLabelText(FORM_OBAT.namaObat);
    await user.click(screen.getByRole("radio", { name: LABEL.diisiKeluarga }));
    await user.click(next());
    await screen.findByRole("dialog");
    await user.click(confirmSave());
    expect(await screen.findByRole("alert")).toHaveTextContent(code === "NOT_FOUND" ? OBAT.tidakDitemukan : SIMPAN_OBAT.galatSimpan);
    expect(requests("PATCH")).toHaveLength(1);
    expect(router.replace).not.toHaveBeenCalled();
    expect(client.getQueryData(medicinesQueryKey)).toEqual([MEDICINE, OTHER]);
  });

  test("formulir ubah tanpa pelanggaran axe", async () => {
    setup();
    await screen.findByLabelText(FORM_OBAT.namaObat);
    const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map(({ id }) => id)).toEqual([]);
  });
});

describe("Hapus lunak obat", () => {
  test("detail menyediakan tautan ubah; menghapus dari detail aktif tetap mengarahkan ke daftar", async () => {
    const { user } = setup("detail");
    await screen.findByRole("heading", { name: "Obat Uji 5 mg" });
    expect(screen.getByRole("link", { name: UBAH_OBAT.tombol })).toHaveAttribute("href", `/medicines/${MEDICINE.id}/edit`);
    await user.click(screen.getByRole("button", { name: UBAH_OBAT.hapus }));
    await user.click(confirmDelete());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/medicines?removed=1"));
    expect(requests("DELETE")).toHaveLength(1);
  });

  test.each(["batal", "escape", "close"])("membuka lalu %s tidak mengirim DELETE; fokus awal bukan tombol bahaya", async (method) => {
    const { user } = setup("delete");
    await user.click(screen.getByRole("button", { name: UBAH_OBAT.hapus }));
    const dialog = screen.getByRole("dialog", { name: UBAH_OBAT.hapusJudul });
    expect(dialog).toHaveFocus();
    expect(confirmDelete()).not.toHaveFocus();
    expect(within(dialog).getByText("Obat Uji 5 mg")).toBeVisible();
    expect(dialog).toHaveAccessibleDescription(UBAH_OBAT.hapusPenjelasan);
    expect(requests("DELETE")).toHaveLength(0);
    if (method === "batal") await user.click(screen.getByRole("button", { name: TOMBOL.batal }));
    else if (method === "escape") await user.keyboard("{Escape}");
    else await user.click(screen.getByRole("button", { name: DRAFT.tutup }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests("DELETE")).toHaveLength(0);
    expect(screen.getByRole("group", { name: UBAH_OBAT.hapus })).toHaveFocus();
  });

  test("konfirmasi eksplisit → DELETE sekali; cache dibersihkan setelah berhasil dan kembali ke daftar", async () => {
    let finish!: () => void;
    backend.call.mockImplementation(() => new Promise((resolve) => { finish = () => resolve(undefined); }));
    const { user, client } = setup("delete");
    await user.click(screen.getByRole("button", { name: UBAH_OBAT.hapus }));
    await user.dblClick(confirmDelete());
    expect(confirmDelete()).toBeDisabled();
    expect(client.getQueryData(medicinesQueryKey)).toEqual([MEDICINE, OTHER]);
    expect(router.replace).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: DRAFT.tutup }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(requests("DELETE")).toEqual([[path, { method: "DELETE" }]]);
    await act(async () => finish());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/medicines?removed=1"));
    expect(client.getQueryData(medicinesQueryKey)).toEqual([OTHER]);
    expect(client.getQueryData([...medicinesQueryKey, MEDICINE.id])).toBeUndefined();
    expect(client.getQueryData([...medicinesQueryKey, OTHER.id])).toEqual(OTHER);
  });

  test("gagal menghapus: pesan terlihat, tanpa penghapusan cache atau retry otomatis", async () => {
    backend.call.mockRejectedValueOnce(new ApiError("DATABASE_UNAVAILABLE", 503, "uji"));
    const { user, client } = setup("delete");
    await user.click(screen.getByRole("button", { name: UBAH_OBAT.hapus }));
    await user.click(confirmDelete());
    expect(await screen.findByRole("alert")).toHaveTextContent(UBAH_OBAT.galatHapus);
    expect(confirmDelete()).toBeEnabled();
    expect(client.getQueryData(medicinesQueryKey)).toEqual([MEDICINE, OTHER]);
    expect(requests("DELETE")).toHaveLength(1);
    expect(router.replace).not.toHaveBeenCalled();
    await user.click(confirmDelete());
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(requests("DELETE")).toHaveLength(2);
  });

  test("obat sudah dihapus perangkat lain: pesan dan tautan daftar, tanpa sukses palsu", async () => {
    backend.call.mockRejectedValue(new ApiError("NOT_FOUND", 404, "uji"));
    const { user } = setup("delete");
    await user.click(screen.getByRole("button", { name: UBAH_OBAT.hapus }));
    await user.click(confirmDelete());
    expect(await screen.findByRole("alert")).toHaveTextContent(OBAT.tidakDitemukanPesan);
    expect(screen.getByRole("link", { name: OBAT.kembaliKeDaftar })).toHaveAttribute("href", "/medicines");
    expect(confirmDelete()).toBeDisabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("dialog hapus tanpa pelanggaran axe", async () => {
    const { user } = setup("delete");
    await user.click(screen.getByRole("button", { name: UBAH_OBAT.hapus }));
    const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map(({ id }) => id)).toEqual([]);
  });
});
