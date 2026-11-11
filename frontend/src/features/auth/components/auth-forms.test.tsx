import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AUTH, DRAFT } from "@/shared/copy";
import { LoginScreen } from "./login-screen";
import { RegisterScreen } from "./register-screen";

const service = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }));
vi.mock("../api/auth-service", () => service);

const consentCall = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib", () => ({
  api: () => ({
    json: async (path: string, _schema: unknown, options: { body?: unknown }) => {
      consentCall(path, options.body);
      return { dataConsentAt: "2026-11-10T00:00:00Z", scanConsentAt: null, outputMode: null, isDemo: false };
    },
  }),
}));

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// Data fiktif untuk uji.
const EMAIL = "uji@contoh.test";
const PASSWORD = "katasandi-uji-123";

describe("LoginScreen", () => {
  test("email salah format: tidak memanggil Supabase dan galat dibacakan", async () => {
    renderWithClient(<LoginScreen />);
    await userEvent.type(screen.getByLabelText(AUTH.labelEmail), "bukan-email");
    await userEvent.click(screen.getByRole("button", { name: AUTH.masuk }));
    expect(screen.getAllByRole("alert").map((el) => el.textContent)).toEqual([AUTH.galatEmail, AUTH.galatKataSandiKosong]);
    expect(screen.getByLabelText(AUTH.labelEmail)).toHaveAttribute("aria-invalid", "true");
    expect(service.signIn).not.toHaveBeenCalled();
  });

  test("berhasil masuk → ke jadwal", async () => {
    service.signIn.mockResolvedValue({ ok: true });
    renderWithClient(<LoginScreen />);
    await userEvent.type(screen.getByLabelText(AUTH.labelEmail), EMAIL);
    await userEvent.type(screen.getByLabelText(AUTH.labelKataSandi), PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: AUTH.masuk }));
    expect(service.signIn).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  test("kata sandi salah → pesan jelas, tetap di halaman", async () => {
    service.signIn.mockResolvedValue({ ok: false, reason: "invalid_credentials" });
    renderWithClient(<LoginScreen />);
    await userEvent.type(screen.getByLabelText(AUTH.labelEmail), EMAIL);
    await userEvent.type(screen.getByLabelText(AUTH.labelKataSandi), "salah");
    await userEvent.click(screen.getByRole("button", { name: AUTH.masuk }));
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatMasuk);
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("tanpa pelanggaran aksesibilitas (di dalam <main> seperti PlainShell)", async () => {
    renderWithClient(
      <main>
        <LoginScreen />
      </main>,
    );
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("Quick Login Demo Juri", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("tanpa kredensial demo di env, tombol demo tidak tampil", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_DEMO_PASSWORD", "");
    renderWithClient(<LoginScreen />);
    expect(screen.queryByRole("button", { name: AUTH.masukDemo })).not.toBeInTheDocument();
  });

  test("dengan kredensial demo, satu ketukan masuk ke akun demo lalu ke jadwal", async () => {
    // Nilai fiktif untuk uji.
    vi.stubEnv("NEXT_PUBLIC_DEMO_EMAIL", "demo-juri@contoh.test");
    vi.stubEnv("NEXT_PUBLIC_DEMO_PASSWORD", "sandi-demo-uji");
    service.signIn.mockResolvedValue({ ok: true });
    renderWithClient(<LoginScreen />);
    await userEvent.click(screen.getByRole("button", { name: AUTH.masukDemo }));
    expect(service.signIn).toHaveBeenCalledWith("demo-juri@contoh.test", "sandi-demo-uji");
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  test("demo gagal masuk (mis. seed belum dijalankan) → pesan, tetap di halaman", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_EMAIL", "demo-juri@contoh.test");
    vi.stubEnv("NEXT_PUBLIC_DEMO_PASSWORD", "sandi-demo-uji");
    service.signIn.mockResolvedValue({ ok: false, reason: "invalid_credentials" });
    renderWithClient(<LoginScreen />);
    await userEvent.click(screen.getByRole("button", { name: AUTH.masukDemo }));
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatMasuk);
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("RegisterScreen", () => {
  async function fill(options: { consent?: boolean; confirm?: string } = {}) {
    await userEvent.type(screen.getByLabelText(AUTH.labelNamaPasien), "Ibu Uji");
    await userEvent.type(screen.getByLabelText(AUTH.labelEmail), EMAIL);
    await userEvent.type(screen.getByLabelText(AUTH.labelKataSandi), PASSWORD);
    await userEvent.type(screen.getByLabelText(AUTH.labelUlangiKataSandi), options.confirm ?? PASSWORD);
    if (options.consent ?? true) await userEvent.click(screen.getByRole("checkbox", { name: DRAFT.persetujuanData }));
  }

  test("persetujuan wajib: tanpa centang akun tidak dibuat", async () => {
    renderWithClient(<RegisterScreen />);
    await fill({ consent: false });
    await userEvent.click(screen.getByRole("button", { name: AUTH.buatAkun }));
    expect(screen.getByRole("alert")).toHaveTextContent(AUTH.galatPersetujuan);
    expect(screen.getByRole("checkbox", { name: DRAFT.persetujuanData })).toHaveAttribute("aria-invalid", "true");
    expect(service.signUp).not.toHaveBeenCalled();
  });

  test("validasi: semua kolom kosong menampilkan galat per kolom", async () => {
    renderWithClient(<RegisterScreen />);
    await userEvent.click(screen.getByRole("button", { name: AUTH.buatAkun }));
    const messages = screen.getAllByRole("alert").map((el) => el.textContent);
    expect(messages).toEqual([AUTH.galatNama, AUTH.galatEmail, AUTH.galatKataSandiPendek, AUTH.galatPersetujuan]);
  });

  test("kata sandi berbeda ditolak", async () => {
    renderWithClient(<RegisterScreen />);
    await fill({ confirm: "lain-sekali-123" });
    await userEvent.click(screen.getByRole("button", { name: AUTH.buatAkun }));
    expect(screen.getByRole("alert")).toHaveTextContent(AUTH.galatKataSandiBeda);
    expect(service.signUp).not.toHaveBeenCalled();
  });

  test("berhasil dengan sesi → persetujuan data dicatat di akun, lalu ke jadwal", async () => {
    service.signUp.mockResolvedValue({ ok: true, hasSession: true });
    renderWithClient(<RegisterScreen />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: AUTH.buatAkun }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(service.signUp).toHaveBeenCalledWith({ name: "Ibu Uji", email: EMAIL, password: PASSWORD });
    expect(consentCall).toHaveBeenCalledWith("/v1/household/consents", { kind: "data" });
  });

  test("konfirmasi email aktif (tanpa sesi) → minta cek email, persetujuan dicatat nanti", async () => {
    service.signUp.mockResolvedValue({ ok: true, hasSession: false });
    renderWithClient(<RegisterScreen />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: AUTH.buatAkun }));
    expect(await screen.findByRole("status")).toHaveTextContent(AUTH.cekEmail);
    expect(consentCall).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("email sudah terdaftar → pesan, tidak berpindah", async () => {
    service.signUp.mockResolvedValue({ ok: false, reason: "user_already_exists" });
    renderWithClient(<RegisterScreen />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: AUTH.buatAkun }));
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH.galatSudahTerdaftar);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
