import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SPEECH_START_TIMEOUT_MS } from "../lib/speech-playback";
import { VOICE_DISCOVERY_TIMEOUT_MS } from "../lib/speech-voices";
import { useSpeech } from "./use-speech";
import { renderToString } from "react-dom/server";

const route = vi.hoisted(() => ({ pathname: "/scan" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
class Utterance {
  lang = ""; voice: SpeechSynthesisVoice | null = null; rate = 1; pitch = 1; volume = 1;
  onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
const voice = (lang = "id-ID", localService = true): SpeechSynthesisVoice => ({ lang, localService, name: "Suara uji", voiceURI: "voice-uji", default: true });
class Engine extends EventTarget {
  voices: SpeechSynthesisVoice[] = [voice()]; paused = false;
  getVoices = vi.fn(() => this.voices);
  cancel = vi.fn(); resume = vi.fn(); speak = vi.fn<(utterance: Utterance) => void>();
}
let engine: Engine;
beforeEach(() => { route.pathname = "/scan"; engine = new Engine(); vi.stubGlobal("speechSynthesis", engine); vi.stubGlobal("SpeechSynthesisUtterance", Utterance); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

test("tidak autoplay; teks diteruskan persis dan suara lokal Indonesia dipilih", () => {
  const text = "  Obat Uji 5 mg.\nMinum 1 tablet sesudah makan.  "; engine.voices = [voice("en-US"), voice("id-ID", false), voice()];
  const { result } = renderHook(() => useSpeech(text)); expect(result.current.availability).toBe("available"); expect(engine.speak).not.toHaveBeenCalled();
  act(() => result.current.speak()); const utterance = engine.speak.mock.calls[0]![0];
  expect(utterance.text).toBe(text); expect(utterance.lang).toBe("id-ID"); expect(utterance.voice).toBe(engine.voices[2]); expect(result.current.state).toBe("starting");
  act(() => utterance.onstart?.()); expect(result.current.state).toBe("speaking"); act(() => utterance.onend?.()); expect(result.current.state).toBe("idle");
});
test.each(["id", "id_id", "ID-id"])("tag bahasa Indonesia %s diterima tanpa memilih bahasa lain", (lang) => {
  engine.voices = [voice(lang)]; const { result } = renderHook(() => useSpeech("Teks uji")); act(() => result.current.speak()); expect(engine.speak).toHaveBeenCalledTimes(1);
});
test.each([{ available: [voice("en-US")] }, { available: [voice("id-ID", false)] }, { available: [voice("jv-ID")] }])("tanpa suara lokal Indonesia tidak memakai fallback bahasa/remote", ({ available }) => {
  engine.voices = available; const { result } = renderHook(() => useSpeech("Teks uji")); expect(result.current.availability).toBe("unavailable");
  act(() => result.current.speak()); expect(engine.speak).not.toHaveBeenCalled();
});
test("SSR hanya menghasilkan checking tanpa menyentuh mesin atau memutar suara", () => {
  function Probe() { const speech = useSpeech("Teks uji"); return <span>{speech.availability}</span>; }
  expect(renderToString(<Probe />)).toContain("checking"); expect(engine.getVoices).not.toHaveBeenCalled(); expect(engine.speak).not.toHaveBeenCalled();
});
test("API tidak didukung dan pembacaan daftar suara gagal tetap aman", () => {
  vi.stubGlobal("speechSynthesis", undefined); const view = renderHook(() => useSpeech("Teks")); expect(view.result.current.availability).toBe("unavailable"); view.unmount();
  vi.stubGlobal("speechSynthesis", engine); engine.getVoices.mockImplementation(() => { throw new Error("rahasia-uji"); });
  const next = renderHook(() => useSpeech("Teks")); expect(next.result.current.availability).toBe("unavailable"); expect(engine.speak).not.toHaveBeenCalled();
});
test("daftar kosong ditunggu terbatas; voiceschanged memulihkan tombol tanpa autoplay", async () => {
  vi.useFakeTimers(); engine.voices = []; const { result } = renderHook(() => useSpeech("Teks uji"));
  expect(result.current.availability).toBe("checking"); await act(async () => { await vi.advanceTimersByTimeAsync(VOICE_DISCOVERY_TIMEOUT_MS); });
  expect(result.current.availability).toBe("unavailable"); engine.voices = [voice()]; act(() => { engine.dispatchEvent(new Event("voiceschanged")); });
  expect(result.current.availability).toBe("available"); expect(engine.speak).not.toHaveBeenCalled();
});
test("suara yang tiba sebelum deadline siap dipakai tanpa memutar otomatis", () => {
  engine.voices = []; const { result } = renderHook(() => useSpeech("Teks uji")); engine.voices = [voice()]; act(() => { engine.dispatchEvent(new Event("voiceschanged")); });
  expect(result.current.canSpeak).toBe(true); expect(engine.speak).not.toHaveBeenCalled();
});
test("Stop membuang antrean dan callback lama tidak mengubah pembacaan baru", () => {
  const { result } = renderHook(() => useSpeech("Teks uji")); act(() => result.current.speak()); const first = engine.speak.mock.calls[0]![0]; const late = first.onend;
  act(() => result.current.stop()); expect(result.current.state).toBe("idle"); expect(first.onend).toBeNull();
  act(() => result.current.speak()); act(() => late?.()); expect(result.current.state).toBe("starting"); expect(engine.speak).toHaveBeenCalledTimes(2);
});
test("pemilik baru menghentikan yang lama; unmount pemilik lama tidak membatalkan yang baru", () => {
  const first = renderHook(() => useSpeech("Teks pertama")); const second = renderHook(() => useSpeech("Teks kedua"));
  act(() => first.result.current.speak()); act(() => second.result.current.speak()); expect(first.result.current.state).toBe("idle");
  const calls = engine.cancel.mock.calls.length; first.unmount(); expect(engine.cancel).toHaveBeenCalledTimes(calls); expect(second.result.current.state).toBe("starting");
});
test("perubahan teks, penutupan dialog, akun/slot dan navigasi menghentikan audio tanpa memulai ulang", () => {
  const view = renderHook(({ text, active, key }) => useSpeech(text, { active, contextKey: key }), { initialProps: { text: "Teks pertama", active: true, key: "akun-a" } });
  act(() => view.result.current.speak()); view.rerender({ text: "Teks kedua", active: true, key: "akun-a" }); expect(view.result.current.state).toBe("idle");
  act(() => view.result.current.speak()); view.rerender({ text: "Teks kedua", active: false, key: "akun-a" }); expect(view.result.current.busy).toBe(false);
  view.rerender({ text: "Teks kedua", active: true, key: "akun-a" }); act(() => view.result.current.speak()); view.rerender({ text: "Teks kedua", active: true, key: "akun-b" }); expect(view.result.current.state).toBe("idle");
  act(() => view.result.current.speak()); route.pathname = "/"; view.rerender({ text: "Teks kedua", active: true, key: "akun-b" }); expect(view.result.current.state).toBe("idle"); expect(engine.speak).toHaveBeenCalledTimes(4);
});
test("pagehide atau suara hilang menghentikan pemutaran; listener dibersihkan saat unmount", () => {
  const remove = vi.spyOn(engine, "removeEventListener"); const view = renderHook(() => useSpeech("Teks")); act(() => view.result.current.speak());
  act(() => { window.dispatchEvent(new Event("pagehide")); }); expect(view.result.current.state).toBe("idle");
  act(() => view.result.current.speak()); engine.voices = [voice("en-US")]; act(() => { engine.dispatchEvent(new Event("voiceschanged")); }); expect(view.result.current.busy).toBe(false);
  view.unmount(); expect(remove).toHaveBeenCalledWith("voiceschanged", expect.any(Function));
});
test.each([["not-allowed", "blocked"], ["synthesis-failed", "failed"], ["voice-unavailable", "unavailable"], ["interrupted", "idle"]] as const)("galat %s menjadi status %s tanpa retry", (error, expected) => {
  const { result } = renderHook(() => useSpeech("Teks")); act(() => result.current.speak()); act(() => engine.speak.mock.calls[0]![0].onerror?.({ error })); expect(result.current.state).toBe(expected); expect(engine.speak).toHaveBeenCalledTimes(1);
});
test("mesin yang menolak sinkron atau tidak mengirim onstart memberi gagal terbatas", async () => {
  vi.useFakeTimers(); const { result } = renderHook(() => useSpeech("Teks")); engine.speak.mockImplementationOnce(() => { throw new Error("internal-uji"); }); act(() => result.current.speak()); expect(result.current.state).toBe("failed");
  act(() => result.current.speak()); const lateStart = engine.speak.mock.calls[1]![0].onstart;
  await act(async () => { await vi.advanceTimersByTimeAsync(SPEECH_START_TIMEOUT_MS); }); expect(result.current.state).toBe("failed"); act(() => lateStart?.()); expect(result.current.state).toBe("failed"); expect(engine.speak).toHaveBeenCalledTimes(2);
});
test("teks kosong dan konteks tidak aktif tidak dikirim; mesin pause diresume setelah antrean dibersihkan", () => {
  const empty = renderHook(() => useSpeech(" \n ")); act(() => empty.result.current.speak()); expect(engine.speak).not.toHaveBeenCalled(); empty.unmount();
  const closed = renderHook(() => useSpeech("Teks", { active: false })); act(() => closed.result.current.speak()); expect(engine.speak).not.toHaveBeenCalled(); closed.unmount();
  engine.paused = true; const opened = renderHook(() => useSpeech("Teks")); act(() => opened.result.current.speak()); expect(engine.resume).toHaveBeenCalledTimes(1);
});
