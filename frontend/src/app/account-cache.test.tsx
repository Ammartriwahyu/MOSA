import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ApiError } from "@/shared/lib";
import { Providers } from "./providers";

const auth = vi.hoisted(() => ({ identity: "akun-a" as string | null, signOut: vi.fn() }));
vi.mock("@/features/auth", () => ({ householdQueryKey: ["household"], signOut: auth.signOut, useSessionIdentity: () => auth.identity }));
let current: QueryClient;
function Probe() {
  const client = useQueryClient();
  useEffect(() => { current = client; }, [client]);
  return <p>{client.getQueryData<string>(["medicines"]) ?? "Kosong"}</p>;
}
const ui = () => <Providers><Probe /></Providers>;
beforeEach(() => { auth.identity = "akun-a"; auth.signOut.mockReset(); });
afterEach(cleanup);

test("pergantian akun signed-in mendapat cache baru sebelum data lama dapat ditampilkan", () => {
  const view = render(ui()); const first = current;
  first.setQueryData(["medicines"], "Obat privat akun A"); view.rerender(ui()); expect(screen.getByText("Obat privat akun A")).toBeInTheDocument();
  auth.identity = "akun-b"; view.rerender(ui());
  expect(current).not.toBe(first); expect(screen.queryByText("Obat privat akun A")).not.toBeInTheDocument();
});
test("callback mutasi akun lama tidak mengisi cache akun baru atau mengeluarkan sesi baru", async () => {
  const view = render(ui()); const first = current;
  let reject!: (error: Error) => void;
  const mutation = first.getMutationCache().build(first, { mutationFn: () => new Promise<void>((_done, fail) => { reject = fail; }) });
  const result = mutation.execute(undefined).catch(() => undefined); await act(async () => { await Promise.resolve(); });
  auth.identity = "akun-b"; view.rerender(ui());
  await act(async () => { first.setQueryData(["medicines"], "Hasil lama"); reject(new ApiError("UNAUTHENTICATED", 401, "Galat uji")); await result; });
  expect(current.getQueryData(["medicines"])).toBeUndefined(); expect(auth.signOut).not.toHaveBeenCalled();
});
test("refresh akun yang sama mempertahankan cache; keluar membuat cache anonim kosong", () => {
  const view = render(ui()); const first = current; first.setQueryData(["medicines"], "Data akun A");
  view.rerender(ui()); expect(current).toBe(first);
  auth.identity = null; view.rerender(ui()); expect(current).not.toBe(first); expect(current.getQueryData(["medicines"])).toBeUndefined();
});
test("transisi anonim ke sesi pertama mempertahankan klien agar proses daftar/consent tidak dilepas", () => {
  auth.identity = null; const view = render(ui()); const anonymous = current;
  auth.identity = "akun-c"; view.rerender(ui()); expect(current).toBe(anonymous);
});
