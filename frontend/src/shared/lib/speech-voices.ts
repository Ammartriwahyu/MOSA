import { indonesianLocalVoice } from "./speech-playback";

export type VoiceAvailability = "checking" | "available" | "unavailable";
export function speechEngine(): SpeechSynthesis | null {
  try { return typeof window !== "undefined" && typeof window.SpeechSynthesisUtterance === "function" ? window.speechSynthesis ?? null : null; }
  catch { return null; }
}
export const VOICE_DISCOVERY_TIMEOUT_MS = 2_000;

export function createVoiceAvailabilityStore() {
  let snapshot: VoiceAvailability = "checking";
  const listeners = new Set<() => void>();
  let cleanup: (() => void) | undefined;
  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      const synth = speechEngine(); let settled = false; let timer: ReturnType<typeof setTimeout> | undefined;
      const update = () => {
        let next: VoiceAvailability = "unavailable";
        try {
          if (synth) {
            const voices = synth.getVoices(); if (voices.length) settled = true;
            next = indonesianLocalVoice(voices) ? "available" : settled ? "unavailable" : "checking";
          }
        } catch { /* Hanya status; tidak mencatat mesin atau teks. */ }
        if (next !== "checking") clearTimeout(timer);
        if (snapshot !== next) { snapshot = next; listeners.forEach((notify) => notify()); }
      };
      if (synth) { synth.addEventListener("voiceschanged", update); timer = setTimeout(() => { settled = true; update(); }, VOICE_DISCOVERY_TIMEOUT_MS); }
      cleanup = () => { clearTimeout(timer); synth?.removeEventListener("voiceschanged", update); };
      update();
    }
    return () => { listeners.delete(listener); if (!listeners.size) { cleanup?.(); cleanup = undefined; snapshot = "checking"; } };
  }
  return { subscribe, getSnapshot: () => snapshot, getServerSnapshot: (): VoiceAvailability => "checking" };
}
