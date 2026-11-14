import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AI_GAGAL, AUTH, DRAFT, FORM_OBAT, KONFIRMASI_SIMPAN_OBAT, LABEL, OBAT, SIMPAN_OBAT, TOMBOL } from "@/shared/copy";
import { ApiError } from "@/shared/lib";
import type { CreateMedicineInput } from "../api/medicines";
import { medicinesQueryKey } from "../hooks/use-medicines";
import { AddMedicineScreen } from "./add-medicine-screen";

const backend = vi.hoisted(() => ({ post: vi.fn<(path: string, body: unknown, signal?: AbortSignal) => Promise<unknown>>() }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => router }));
vi.mock("@/shared/lib", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/shared/lib")>(),
  api: () => ({
    json: async (path: string, schema: { parse: (value: unknown) => unknown }, options: { method: string; body: unknown; signal?: AbortSignal }) => {
      expect(options.method).toBe("POST");
      return schema.parse(await backend.post(path, options.body, options.signal));
    },
  }),
}));

const INPUT = {
  labelSource: "keluarga" as const, name: "Obat Uji", strength: "5 mg", purpose: "Kegunaan uji",
  doseAmount: "1 tablet", usageRule: "Sesudah makan", intakeTimes: ["19:00"],
  warnings: DRAFT.tidakAdaLarangan, notes: "Kotak biru",
};
const EXPLANATION = "Gunakan sesudah makan. Tidak ada larangan khusus. Kotak biru.";
const ID = "11111111-1111-4111-8111-111111111111";
const savedMedicine = (body: unknown) => ({ ...body as CreateMedicineInput, id: ID, createdAt: "2026-11-11T00:00:00.000Z" });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(medicinesQueryKey, []);
  const view = render(<QueryClientProvider client={client}><main><AddMedicineScreen /></main></QueryClientProvider>);
  return { ...view, client, user: userEvent.setup() };
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: LABEL.diisiKeluarga }));
  const fields = [
    [FORM_OBAT.namaObat, INPUT.name], [FORM_OBAT.kekuatan, INPUT.strength], [LABEL.kegunaanObat, INPUT.purpose],
    [OBAT.aturanPakai, INPUT.usageRule], [OBAT.jumlahPerMinum, INPUT.doseAmount], [FORM_OBAT.catatanOpsional, INPUT.notes],
  ];
  for (const [label, value] of fields) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  await user.click(screen.getByRole("checkbox", { name: "Malam · 19.00" }));
  await user.click(screen.getByRole("checkbox", { name: DRAFT.tidakAdaLarangan }));
}

const next = () => screen.getByRole("button", { name: FORM_OBAT.lanjut });
const confirm = () => screen.getByRole("button", { name: TOMBOL.yaSudahBenar });
beforeEach(() => { backend.post.mockReset(); router.replace.mockReset(); });

describe("Tambah Obat → AI → periksa → simpan", () => {
  test("hanya tiga kolom ke AI; semua data asli diperiksa; simpan hanya setelah konfirmasi dan perbarui cache", async () => {
    let resolveExplanation!: (value: unknown) => void;
    backend.post.mockImplementation(async (path, body) => path.endsWith("/explain")
      ? new Promise((resolve) => { resolveExplanation = resolve; }) : savedMedicine(body));
    const { user, client } = setup();
    await fill(user);
    await user.click(next());
    expect(screen.getByRole("status")).toHaveTextContent(SIMPAN_OBAT.menyiapkan);
    expect(backend.post).toHaveBeenCalledTimes(1);
    expect(backend.post).toHaveBeenCalledWith("/v1/medicines/explain", {
      usageRule: INPUT.usageRule, warnings: INPUT.warnings, notes: INPUT.notes,
    }, expect.any(AbortSignal));
    resolveExplanation({ explanation: EXPLANATION });
    const dialog = await screen.findByRole("dialog", { name: SIMPAN_OBAT.periksaJudul });
    expect(dialog).toHaveAccessibleDescription(KONFIRMASI_SIMPAN_OBAT);
    expect(dialog).toHaveFocus();
    for (const text of ["Obat Uji 5 mg", INPUT.purpose, INPUT.doseAmount, INPUT.usageRule, INPUT.warnings, INPUT.notes, LABEL.diisiKeluarga, EXPLANATION]) {
      expect(within(dialog).getByText(text)).toBeVisible();
    }
    expect(within(dialog).getByText("Malam 19.00")).toBeVisible();
    expect(backend.post).toHaveBeenCalledTimes(1);
    await user.click(confirm());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/medicines?saved=${ID}`));
    const body = { ...INPUT, explanation: EXPLANATION, explanationOrigin: "ai_dikonfirmasi" };
    expect(backend.post).toHaveBeenLastCalledWith("/v1/medicines", body, undefined);
    expect(client.getQueryData(medicinesQueryKey)).toEqual([savedMedicine(body)]);
    expect(client.getQueryData([...medicinesQueryKey, ID])).toEqual(savedMedicine(body));
  });

  test("Perbaiki lagi mempertahankan isian; perubahan wajib menghasilkan penjelasan baru", async () => {
    backend.post.mockResolvedValue({ explanation: EXPLANATION });
    const { user } = setup();
    await fill(user);
    await user.click(next());
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: TOMBOL.perbaikiLagi }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("group", { name: FORM_OBAT.dataObat })).toHaveFocus();
    expect(screen.getByLabelText(FORM_OBAT.namaObat)).toHaveValue(INPUT.name);
    expect(screen.getByLabelText(FORM_OBAT.catatanOpsional)).toHaveValue(INPUT.notes);
    expect(screen.getByRole("checkbox", { name: "Malam · 19.00" })).toBeChecked();
    fireEvent.change(screen.getByLabelText(OBAT.aturanPakai), { target: { value: "Bersama makan" } });
    backend.post.mockResolvedValue({ explanation: "Gunakan bersama makan." });
    await user.click(next());
    expect(await screen.findByText("Gunakan bersama makan.")).toBeVisible();
    expect(screen.queryByText(EXPLANATION)).not.toBeInTheDocument();
    expect(backend.post.mock.calls.map(([path]) => path)).toEqual(["/v1/medicines/explain", "/v1/medicines/explain"]);
    expect(backend.post.mock.calls[1][1]).toEqual({ usageRule: "Bersama makan", warnings: INPUT.warnings, notes: INPUT.notes });
  });

  test.each(["AI_UNAVAILABLE", "AI_QUOTA_EXCEEDED", "TIMEOUT", "NETWORK_ERROR", "INVALID_RESPONSE"])("%s: tawarkan simpan teks asli setelah konfirmasi, tanpa penjelasan karangan", async (code) => {
    backend.post.mockRejectedValueOnce(new ApiError(code, 503, "uji"));
    backend.post.mockImplementation(async (_path, body) => savedMedicine(body));
    const { user } = setup();
    await fill(user);
    await user.click(next());
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(AI_GAGAL)).toBeVisible();
    expect(within(dialog).getByText(DRAFT.penjelasanBelumTersedia)).toBeVisible();
    expect(backend.post).toHaveBeenCalledTimes(1);
    await user.click(confirm());
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(backend.post).toHaveBeenLastCalledWith("/v1/medicines", {
      ...INPUT, explanation: null, explanationOrigin: "teks_pengisi",
    }, undefined);
  });

  test("galat validasi explain tidak disamarkan sebagai AI gagal; formulir tetap bisa diperbaiki", async () => {
    backend.post.mockRejectedValue(new ApiError("VALIDATION_FAILED", 400, "uji"));
    const { user } = setup();
    await fill(user);
    await user.click(next());
    expect(await screen.findByRole("alert")).toHaveTextContent(SIMPAN_OBAT.galatValidasi);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(FORM_OBAT.namaObat)).toHaveValue(INPUT.name);
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("galat server explain terlihat dan bisa dicoba ulang", async () => {
    backend.post.mockRejectedValue(new ApiError("AUTH_UNAVAILABLE", 503, "uji"));
    const { user } = setup();
    await fill(user);
    await user.click(next());
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatUmum);
    expect(next()).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("simpan gagal tetap di dialog; tidak diulang otomatis; cegah klik ganda dan tutup saat menyimpan", async () => {
    backend.post.mockResolvedValueOnce({ explanation: EXPLANATION }).mockRejectedValueOnce(new ApiError("DATABASE_UNAVAILABLE", 503, "uji"));
    let finish!: (value: unknown) => void;
    backend.post.mockImplementation(async (_path, body) => new Promise((resolve) => { finish = () => resolve(savedMedicine(body)); }));
    const { user } = setup();
    await fill(user);
    await user.click(next());
    await screen.findByRole("dialog");
    await user.click(confirm());
    expect(await screen.findByRole("alert")).toHaveTextContent(SIMPAN_OBAT.galatSimpan);
    expect(backend.post).toHaveBeenCalledTimes(2);
    expect(router.replace).not.toHaveBeenCalled();
    await user.dblClick(confirm());
    expect(confirm()).toBeDisabled();
    expect(screen.getByRole("button", { name: TOMBOL.perbaikiLagi })).toBeDisabled();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: DRAFT.tutup }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(backend.post).toHaveBeenCalledTimes(3);
    finish(null);
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });

  test.each(["escape", "close"])("%s membatalkan pemeriksaan tanpa menyimpan", async (method) => {
    backend.post.mockResolvedValue({ explanation: EXPLANATION });
    const { user } = setup();
    await fill(user);
    await user.click(next());
    await screen.findByRole("dialog");
    if (method === "escape") await user.keyboard("{Escape}");
    else await user.click(screen.getByRole("button", { name: DRAFT.tutup }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(backend.post).toHaveBeenCalledTimes(1);
  });

  test.each([true, false])("dialog aksesibel saat penjelasan tersedia=%s", async (available) => {
    if (available) backend.post.mockResolvedValue({ explanation: EXPLANATION });
    else backend.post.mockRejectedValue(new ApiError("AI_UNAVAILABLE", 503, "uji"));
    const { user } = setup();
    await fill(user);
    await user.click(next());
    await screen.findByRole("dialog");
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map(({ id }) => id)).toEqual([]);
  });

  test("keluar saat menunggu AI membatalkan permintaan", async () => {
    backend.post.mockImplementation(() => new Promise(() => undefined));
    const { user, unmount } = setup();
    await fill(user);
    await user.click(next());
    const signal = backend.post.mock.calls[0][2];
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
