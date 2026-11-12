import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useSessionIdentity } from "./use-session-identity";

const mock = vi.hoisted(() => ({ subscribe: vi.fn(), unsubscribe: vi.fn() }));
vi.mock("@/shared/lib", () => ({ getSupabaseBrowserClient: () => ({ auth: { onAuthStateChange: mock.subscribe } }) }));
test("identitas mengikuti sesi baru/keluar tanpa bergantung pada status signed-in yang sama", () => {
  let changed!: (event: AuthChangeEvent, session: Session | null) => void;
  mock.subscribe.mockImplementation((listener) => { changed = listener; return { data: { subscription: { unsubscribe: mock.unsubscribe } } }; });
  const { result, unmount } = renderHook(() => useSessionIdentity());
  expect(result.current).toBeNull();
  // Hanya identitas yang digunakan hook; data Auth lain tidak diperlukan fixture.
  act(() => changed("INITIAL_SESSION", { user: { id: "akun-a" } } as Session)); expect(result.current).toBe("akun-a");
  act(() => changed("SIGNED_IN", { user: { id: "akun-b" } } as Session)); expect(result.current).toBe("akun-b");
  act(() => changed("SIGNED_OUT", null)); expect(result.current).toBeNull();
  unmount(); expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
});
