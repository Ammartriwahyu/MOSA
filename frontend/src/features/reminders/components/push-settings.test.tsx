import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PUSH } from "@/shared/copy";
import { PushSettings } from "./push-settings";

const browser = vi.hoisted(() => ({ key: "public", status: "disabled", installed: false, ios: false,
  inspect: vi.fn(), enable: vi.fn(), disable: vi.fn() }));
vi.mock("../lib/push-browser", () => ({ pushPublicKey: () => browser.key || null, inspectPush: browser.inspect,
  enablePush: browser.enable, disablePush: browser.disable, PUSH_CHANGE: "push-test-change",
  isInstalled: () => browser.installed, isIos: () => browser.ios }));
beforeEach(() => {
  vi.clearAllMocks(); browser.key = "public"; browser.status = "disabled"; browser.installed = false; browser.ios = false;
  browser.inspect.mockImplementation(async () => browser.status);
  browser.enable.mockImplementation(async () => { browser.status = "enabled"; });
  browser.disable.mockImplementation(async () => { browser.status = "disabled"; });
});
function show() { return render(<main><PushSettings /></main>); }
describe("izin dan pengaturan push", () => {
  test("tidak meminta izin atau subscribe saat mount; hanya klik pengguna", async () => {
    show(); const enable = await screen.findByRole("button", { name: PUSH.enable });
    expect(browser.enable).not.toHaveBeenCalled(); await userEvent.click(enable);
    expect(await screen.findByText(PUSH.enabled)).toBeInTheDocument(); expect(browser.enable).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: PUSH.disable }));
    expect(await screen.findByText(PUSH.disabled)).toBeInTheDocument(); expect(browser.disable).toHaveBeenCalledTimes(1);
  });
  test("operasi tertunda mengunci klik ganda tanpa mengaku aktif", async () => {
    let resolve: () => void = () => undefined;
    browser.enable.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    show(); await userEvent.dblClick(await screen.findByRole("button", { name: PUSH.enable }));
    expect(browser.enable).toHaveBeenCalledTimes(1); expect(screen.queryByText(PUSH.enabled)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: PUSH.enable })).toBeDisabled();
    await act(async () => { browser.status = "enabled"; resolve(); });
    expect(await screen.findByText(PUSH.enabled)).toBeInTheDocument();
  });
  test("izin ditolak memberi petunjuk, periksa lagi tidak meminta izin otomatis", async () => {
    browser.status = "denied"; show(); expect(await screen.findByText(PUSH.denied)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: PUSH.enable })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: PUSH.retry })); expect(browser.enable).not.toHaveBeenCalled();
  });
  test("kegagalan server hanya memberi pesan aman dan tetap dapat dicoba pengguna", async () => {
    browser.enable.mockRejectedValue(new Error("raw-private-error")); show();
    await userEvent.click(await screen.findByRole("button", { name: PUSH.enable }));
    expect(await screen.findByRole("alert")).toHaveTextContent(PUSH.failed);
    expect(screen.queryByText("raw-private-error")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: PUSH.enable })).toBeEnabled());
  });
  test("dismis/penolakan dialog tidak dipetakan menjadi galat jaringan", async () => {
    browser.enable.mockRejectedValue(new Error("push-denied")); show();
    await userEvent.click(await screen.findByRole("button", { name: PUSH.enable }));
    expect(await screen.findByRole("alert")).toHaveTextContent(PUSH.denied);
  });
  test("iOS perlu pemasangan dan tidak menawarkan subscribe sebelum siap", async () => {
    browser.ios = true; browser.status = "ios"; show();
    expect(await screen.findByText(PUSH.iosHint)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: PUSH.enable })).not.toBeInTheDocument();
  });
  test("tanpa public key tidak mencoba platform/API push; pemasangan tetap tersedia", async () => {
    browser.key = ""; show(); expect(await screen.findByText(PUSH.unavailable)).toBeInTheDocument();
    expect(browser.inspect).not.toHaveBeenCalled(); expect(screen.getByText(PUSH.installHint)).toBeInTheDocument();
  });
  test("penawaran pemasangan tidak membuka prompt tanpa klik", async () => {
    show(); const prompt = vi.fn(async () => undefined);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt, userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    act(() => window.dispatchEvent(event)); expect(prompt).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: PUSH.install })); expect(prompt).toHaveBeenCalledTimes(1);
    act(() => window.dispatchEvent(new Event("appinstalled")));
    expect(await screen.findByText(PUSH.installed)).toBeInTheDocument();
  });
  test("aksesibilitas panel: heading, status dan nama tombol", async () => {
    const view = show(); await screen.findByRole("button", { name: PUSH.enable });
    expect((await axe.run(view.container)).violations).toEqual([]);
  });
});
