import { vi } from "vitest";

/** Mesin lokal fiktif; tidak menghasilkan audio atau menghubungi layanan suara. */
export class TestUtterance {
  lang = ""; voice: SpeechSynthesisVoice | null = null; rate = 1; pitch = 1; volume = 1;
  onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
export class TestSpeechEngine extends EventTarget {
  voices: SpeechSynthesisVoice[] = [{ lang: "id-ID", localService: true, name: "Suara uji", voiceURI: "uji-lokal", default: true }];
  paused = false;
  getVoices = () => this.voices;
  cancel = vi.fn(); resume = vi.fn();
  speak = vi.fn<(utterance: TestUtterance) => void>((utterance) => { utterance.onstart?.(); });
}
export function installSpeechEngine() {
  const engine = new TestSpeechEngine();
  vi.stubGlobal("speechSynthesis", engine); vi.stubGlobal("SpeechSynthesisUtterance", TestUtterance);
  return engine;
}
