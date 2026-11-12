import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Bacakan } from "@/shared/ui";
import userEvent from "@testing-library/user-event";
import { installSpeechEngine } from "@/shared/testing/speech-engine";
import { afterEach } from "vitest";
import { DRAFT, TOMBOL } from "@/shared/copy";
import { AuthGuard } from "./auth-guard";

// Supabase Auth palsu: menyimpan listener dan bisa memancarkan event sesi.
const auth = vi.hoisted(() => {
  const listeners = new Set<(event: string, session: object | null) => void>();
  return {
    unsubscribe: vi.fn(),
    emit(event: string, session: object | null) {
      listeners.forEach((listener) => listener(event, session));
    },
    onAuthStateChange(callback: (event: string, session: object | null) => void) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => { listeners.delete(callback); this.unsubscribe(); } } } };
    },
  };
});
const backend = vi.hoisted(() => ({ household: { dataConsentAt: "2026-11-10T00:00:00Z" as string | null } }));
vi.mock("@/shared/lib", () => ({
  getSupabaseBrowserClient: () => ({ auth }),
  api: () => ({
    json: async () => ({ scanConsentAt: null, outputMode: null, isDemo: false, ...backend.household }),
  }),
}));

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => router }));

function renderGuard(requireConsent?: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["data-lain"], { isi: 1 });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthGuard requireConsent={requireConsent}>
        <p>Isi terlindungi</p>
      </AuthGuard>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

beforeEach(() => {
  router.replace.mockClear();
  auth.unsubscribe.mockClear();
  backend.household.dataConsentAt = "2026-11-10T00:00:00Z";
});

describe("AuthGuard", () => {
  test("selama sesi diperiksa: indikator memuat, isi belum tampil", () => {
    renderGuard();
    expect(screen.getByRole("status")).toHaveTextContent(DRAFT.memuat);
    expect(screen.queryByText("Isi terlindungi")).not.toBeInTheDocument();
  });

  test("sesi ada dan sudah setuju → isi tampil", async () => {
    renderGuard();
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t", user: { id: "akun-a" } }));
    expect(await screen.findByText("Isi terlindungi")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("sesi ada tetapi belum setuju → dialihkan ke /consent tanpa menampilkan isi", async () => {
    backend.household.dataConsentAt = null;
    renderGuard();
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t", user: { id: "akun-a" } }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/consent"));
    expect(screen.queryByText("Isi terlindungi")).not.toBeInTheDocument();
  });

  test("requireConsent=false tidak memeriksa persetujuan (layar persetujuan itu sendiri)", () => {
    backend.household.dataConsentAt = null;
    renderGuard(false);
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t", user: { id: "akun-a" } }));
    expect(screen.getByText("Isi terlindungi")).toBeInTheDocument();
  });

  test("belum masuk → dialihkan ke onboarding", () => {
    renderGuard();
    act(() => auth.emit("INITIAL_SESSION", null));
    expect(router.replace).toHaveBeenCalledWith("/welcome");
    expect(screen.queryByText("Isi terlindungi")).not.toBeInTheDocument();
  });

  test("keluar di tengah sesi → cache data dihapus lalu dialihkan", async () => {
    const { queryClient } = renderGuard();
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t", user: { id: "akun-a" } }));
    await screen.findByText("Isi terlindungi");
    act(() => auth.emit("SIGNED_OUT", null));
    expect(queryClient.getQueryData(["data-lain"])).toBeUndefined();
    expect(router.replace).toHaveBeenCalledWith("/welcome");
  });

  test("berhenti berlangganan saat dilepas", () => {
    const { unmount } = renderGuard();
    unmount();
    expect(auth.unsubscribe).toHaveBeenCalled();
  });
});


afterEach(() => { vi.unstubAllGlobals(); });
test("pergantian akun signed-in melepas pembacaan lama; refresh token akun yang sama tidak memulai ulang", async () => {
  const engine = installSpeechEngine();
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><AuthGuard requireConsent={false}><Bacakan text="Teks uji terlihat" /><p>Teks uji terlihat</p></AuthGuard></QueryClientProvider>);
  act(() => auth.emit("INITIAL_SESSION", { user: { id: "akun-a" } }));
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); const calls = engine.cancel.mock.calls.length;
  act(() => auth.emit("TOKEN_REFRESHED", { user: { id: "akun-a" } })); expect(engine.cancel).toHaveBeenCalledTimes(calls);
  act(() => auth.emit("SIGNED_IN", { user: { id: "akun-b" } })); expect(engine.cancel.mock.calls.length).toBeGreaterThan(calls); expect(engine.speak).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: TOMBOL.bacakan })).toBeEnabled(); client.clear();
});
