import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DRAFT, SUARA, TOMBOL } from "../copy";
import { useSpeech } from "../hooks";
import { Bacakan } from "./bacakan";
vi.mock("../hooks", () => ({ useSpeech: vi.fn() }));
const speak = vi.fn(); const stop = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.mocked(useSpeech).mockReturnValue({ state: "idle", availability: "available", busy: false, canSpeak: true, speak, stop }); });
afterEach(cleanup);
test("Bacakan diteruskan hanya setelah klik; active/context dan teks persis diteruskan ke hook", async () => {
  render(<Bacakan text="Teks uji persis." contextKey="akun-a" />); expect(speak).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: TOMBOL.bacakan })); expect(speak).toHaveBeenCalledTimes(1); expect(useSpeech).toHaveBeenCalledWith("Teks uji persis.", { active: true, contextKey: "akun-a" });
});
test("saat memulai atau berbicara tersedia tombol Berhenti dan status teks", async () => {
  vi.mocked(useSpeech).mockReturnValue({ state: "speaking", availability: "available", busy: true, canSpeak: true, speak, stop });
  render(<Bacakan text="Teks" />); expect(screen.getByRole("status")).toHaveTextContent(SUARA.speaking); await userEvent.click(screen.getByRole("button", { name: SUARA.stop })); expect(stop).toHaveBeenCalledTimes(1);
});
test("D-d tetap persis, terhubung dengan tombol dan teks pengguna tetap ada", async () => {
  vi.mocked(useSpeech).mockReturnValue({ state: "idle", availability: "unavailable", busy: false, canSpeak: false, speak, stop });
  const { container } = render(<main><p>Teks uji tetap terlihat.</p><Bacakan text="Teks uji tetap terlihat." /></main>);
  expect(screen.getByText(DRAFT.suaraTidakTersedia)).toBeInTheDocument(); expect(screen.getByRole("button", { name: TOMBOL.bacakan })).toBeDisabled(); expect(screen.getByRole("button")).toHaveAccessibleDescription(expect.stringContaining(DRAFT.suaraTidakTersedia));
  expect(screen.getByText("Teks uji tetap terlihat.")).toBeInTheDocument(); expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
});
test.each([["blocked", SUARA.blocked], ["failed", SUARA.failed]] as const)("status %s jelas tanpa menampilkan galat mesin", (state, message) => {
  vi.mocked(useSpeech).mockReturnValue({ state, availability: "available", busy: false, canSpeak: true, speak, stop }); render(<Bacakan text="Teks" />);
  expect(screen.getByRole("status")).toHaveTextContent(message); expect(screen.getByRole("button", { name: TOMBOL.bacakan })).toBeEnabled();
});
