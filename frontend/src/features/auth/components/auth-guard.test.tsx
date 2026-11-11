import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DRAFT } from "@/shared/copy";
import { AuthGuard } from "./auth-guard";

// Supabase Auth palsu: menyimpan listener dan bisa memancarkan event sesi.
const auth = vi.hoisted(() => {
  let listener: ((event: string, session: object | null) => void) | undefined;
  return {
    unsubscribe: vi.fn(),
    emit(event: string, session: object | null) {
      listener?.(event, session);
    },
    onAuthStateChange(callback: (event: string, session: object | null) => void) {
      listener = callback;
      return { data: { subscription: { unsubscribe: this.unsubscribe } } };
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
vi.mock("next/navigation", () => ({ useRouter: () => router }));

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
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t" }));
    expect(await screen.findByText("Isi terlindungi")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("sesi ada tetapi belum setuju → dialihkan ke /consent tanpa menampilkan isi", async () => {
    backend.household.dataConsentAt = null;
    renderGuard();
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/consent"));
    expect(screen.queryByText("Isi terlindungi")).not.toBeInTheDocument();
  });

  test("requireConsent=false tidak memeriksa persetujuan (layar persetujuan itu sendiri)", () => {
    backend.household.dataConsentAt = null;
    renderGuard(false);
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t" }));
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
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t" }));
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
