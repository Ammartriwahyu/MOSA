import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
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
vi.mock("@/shared/lib", () => ({ getSupabaseBrowserClient: () => ({ auth }) }));

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function renderGuard() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["household"], { isDemo: false });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <p>Isi terlindungi</p>
      </AuthGuard>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

beforeEach(() => {
  router.replace.mockClear();
  auth.unsubscribe.mockClear();
});

describe("AuthGuard", () => {
  test("selama sesi diperiksa: indikator memuat, isi belum tampil", () => {
    renderGuard();
    expect(screen.getByRole("status")).toHaveTextContent(DRAFT.memuat);
    expect(screen.queryByText("Isi terlindungi")).not.toBeInTheDocument();
  });

  test("sesi ada → isi tampil, tidak dialihkan", () => {
    renderGuard();
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t" }));
    expect(screen.getByText("Isi terlindungi")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("belum masuk → dialihkan ke /login tanpa menampilkan isi", () => {
    renderGuard();
    act(() => auth.emit("INITIAL_SESSION", null));
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Isi terlindungi")).not.toBeInTheDocument();
  });

  test("keluar di tengah sesi → cache data dihapus lalu dialihkan", () => {
    const { queryClient } = renderGuard();
    act(() => auth.emit("INITIAL_SESSION", { access_token: "t" }));
    act(() => auth.emit("SIGNED_OUT", null));
    expect(queryClient.getQueryData(["household"])).toBeUndefined();
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  test("berhenti berlangganan saat dilepas", () => {
    const { unmount } = renderGuard();
    unmount();
    expect(auth.unsubscribe).toHaveBeenCalled();
  });
});
