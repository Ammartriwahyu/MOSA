import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AUTH, DRAFT, PENGATURAN, PREFERENSI } from "@/shared/copy";
import { SettingsScreen } from "./settings-screen";

const backend = vi.hoisted(() => ({
  household: { dataConsentAt: "x", scanConsentAt: null, outputMode: "teks" as "teks" | "suara" | null, isDemo: false },
  patch: vi.fn(),
  del: vi.fn(),
  deleteError: null as Error | null,
  deletePending: null as Promise<void> | null,
  deleteSignal: null as AbortSignal | null,
}));
const auth = vi.hoisted(() => ({
  signIn: vi.fn(async () => ({ ok: true }) as { ok: true } | { ok: false; reason: string }),
  signOut: vi.fn(async () => undefined),
}));

vi.mock("@/features/auth", () => ({
  householdQueryKey: ["household"],
  useHousehold: () => useQuery({ queryKey: ["household"], queryFn: async () => backend.household }),
  useAccount: () => ({ data: { email: "uji@contoh.test", name: "Ibu Uji" } }),
  signIn: auth.signIn,
  signOut: auth.signOut,
}));

vi.mock("@/shared/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib")>();
  return {
    ...actual,
    api: () => ({
      json: async (path: string, _schema: unknown, options: { body?: { outputMode: "teks" | "suara" } }) => {
        backend.patch(path, options.body);
        return { ...backend.household, outputMode: options.body?.outputMode ?? null };
      },
      noContent: async (path: string, options: { method?: string; signal?: AbortSignal }) => {
        backend.del(path, options.method);
        backend.deleteSignal = options.signal ?? null;
        await backend.deletePending;
        if (backend.deleteError) throw backend.deleteError;
      },
    }),
  };
});

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <main>
        <SettingsScreen />
      </main>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  backend.household = { dataConsentAt: "x", scanConsentAt: null, outputMode: "teks", isDemo: false };
  backend.deleteError = null;
  backend.deletePending = null;
  backend.deleteSignal = null;
  auth.signIn.mockResolvedValue({ ok: true });
});

describe("SettingsScreen", () => {
  test("menampilkan pilihan tersimpan, akun, dan ringkasan privasi (tanpa baris perangkat karangan)", async () => {
    renderScreen();
    expect(await screen.findByRole("radio", { name: PREFERENSI.teksSaja })).toBeChecked();
    expect(screen.getByText("Ibu Uji")).toBeInTheDocument();
    expect(screen.getByText("uji@contoh.test")).toBeInTheDocument();
    expect(screen.getByText(PENGATURAN.privasiFoto)).toBeInTheDocument();
    expect(screen.getByText(PENGATURAN.privasiAi)).toBeInTheDocument();
    expect(screen.queryByText(/Dipakai di/)).not.toBeInTheDocument();
  });

  test("mengganti ke Suara langsung tersimpan ke akun", async () => {
    renderScreen();
    await userEvent.click(await screen.findByText(PREFERENSI.teksSuara));
    await waitFor(() => expect(backend.patch).toHaveBeenCalledWith("/v1/household/preferences", { outputMode: "suara" }));
    expect(await screen.findByText(PENGATURAN.tersimpan)).toBeInTheDocument();
  });

  test("keluar hanya dari HP ini", async () => {
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: AUTH.keluar }));
    expect(auth.signOut).toHaveBeenCalledWith();
  });

  test("akun demo: tombol hapus nonaktif dan diberi keterangan", async () => {
    backend.household = { ...backend.household, isDemo: true };
    renderScreen();
    expect(await screen.findByRole("button", { name: PENGATURAN.hapusAkun })).toBeDisabled();
    expect(screen.getByText(PENGATURAN.demoDilindungi)).toBeInTheDocument();
  });

  test("tanpa pelanggaran aksesibilitas", async () => {
    renderScreen();
    await screen.findByRole("radio", { name: PREFERENSI.teksSaja });
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("Hapus seluruh data & akun", () => {
  test("layar dilepas ketika verifikasi tertunda: jangan meneruskan DELETE atau logout", async () => {
    let finish!: (value: { ok: true }) => void;
    auth.signIn.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: PENGATURAN.hapusAkun }));
    await userEvent.type(screen.getByLabelText(PENGATURAN.labelKataSandiUlang), "sandi-fiktif");
    await userEvent.click(screen.getByRole("button", { name: PENGATURAN.yaHapusSemua }));
    expect(auth.signIn).toHaveBeenCalled(); view.unmount();
    await act(async () => { finish({ ok: true }); });
    expect(backend.del).not.toHaveBeenCalled(); expect(auth.signOut).not.toHaveBeenCalled();
  });

  test("DELETE akun lama selesai setelah layar dilepas: jangan keluarkan sesi akun baru", async () => {
    let finish!: () => void;
    backend.deletePending = new Promise((resolve) => { finish = resolve; });
    const view = renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: PENGATURAN.hapusAkun }));
    await userEvent.type(screen.getByLabelText(PENGATURAN.labelKataSandiUlang), "sandi-fiktif");
    await userEvent.click(screen.getByRole("button", { name: PENGATURAN.yaHapusSemua }));
    expect(backend.del).toHaveBeenCalled(); view.unmount();
    expect(backend.deleteSignal?.aborted).toBe(true);
    await act(async () => { finish(); });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  async function openDialog() {
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: PENGATURAN.hapusAkun }));
    return screen.findByRole("dialog", { name: DRAFT.hapusAkunJudul });
  }

  test("dua langkah: pop-up meminta kata sandi; tanpa kata sandi tidak ada penghapusan", async () => {
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: PENGATURAN.yaHapusSemua }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(AUTH.galatKataSandiKosong);
    expect(backend.del).not.toHaveBeenCalled();
  });

  test("kata sandi salah → data tidak dihapus", async () => {
    auth.signIn.mockResolvedValue({ ok: false, reason: "invalid_credentials" });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText(PENGATURAN.labelKataSandiUlang), "salah");
    await userEvent.click(within(dialog).getByRole("button", { name: PENGATURAN.yaHapusSemua }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(PENGATURAN.galatKataSandiHapus);
    expect(backend.del).not.toHaveBeenCalled();
  });

  test("kata sandi benar → DELETE /v1/household lalu keluar dari sesi lokal", async () => {
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText(PENGATURAN.labelKataSandiUlang), "sandi-uji-benar");
    await userEvent.click(within(dialog).getByRole("button", { name: PENGATURAN.yaHapusSemua }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledWith("local"));
    expect(auth.signIn).toHaveBeenCalledWith("uji@contoh.test", "sandi-uji-benar");
    expect(backend.del).toHaveBeenCalledWith("/v1/household", "DELETE");
  });

  test("server membalas DEMO_PROTECTED → pesan perlindungan, tetap masuk", async () => {
    const { ApiError } = await vi.importActual<typeof import("@/shared/lib")>("@/shared/lib");
    backend.deleteError = new ApiError("DEMO_PROTECTED", 403, "x");
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText(PENGATURAN.labelKataSandiUlang), "sandi-uji-benar");
    await userEvent.click(within(dialog).getByRole("button", { name: PENGATURAN.yaHapusSemua }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(PENGATURAN.demoDilindungi);
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
