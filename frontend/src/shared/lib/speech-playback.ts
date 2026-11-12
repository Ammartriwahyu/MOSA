export type SpeechPlaybackState = "idle" | "starting" | "speaking" | "blocked" | "failed" | "unavailable";
export const SPEECH_START_TIMEOUT_MS = 5_000;

/** Tidak mengirim teks obat ke suara jarak jauh atau mengganti bahasa secara diam-diam. */
export function indonesianLocalVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const local = voices.filter((voice) => voice.localService && ["id-id", "id"].includes(voice.lang.toLowerCase().replaceAll("_", "-")));
  return local.find((voice) => voice.lang.toLowerCase().replaceAll("_", "-") === "id-id") ?? local[0];
}

type Playback = {
  owner: object; synth: SpeechSynthesis; utterance: SpeechSynthesisUtterance;
  change: (state: SpeechPlaybackState) => void; timer: ReturnType<typeof setTimeout> | undefined;
};

/** speechSynthesis punya satu antrean per window; pemilik lama tidak boleh membatalkan pemilik baru. */
export function createSpeechPlayback() {
  let current: Playback | null = null;
  function finish(job: Playback, state: SpeechPlaybackState, cancel: boolean) {
    if (current !== job) return;
    current = null;
    clearTimeout(job.timer);
    job.utterance.onstart = null; job.utterance.onend = null; job.utterance.onerror = null;
    if (cancel) { try { job.synth.cancel(); } catch { /* Tidak mencatat teks atau galat mesin suara. */ } }
    job.change(state);
  }
  function stop(owner?: object) {
    if (current && (owner === undefined || current.owner === owner)) finish(current, "idle", true);
  }
  function start(owner: object, synth: SpeechSynthesis, utterance: SpeechSynthesisUtterance, change: Playback["change"]) {
    stop();
    const job: Playback = { owner, synth, utterance, change, timer: undefined }; current = job;
    utterance.onstart = () => { if (current === job) { clearTimeout(job.timer); change("speaking"); } };
    utterance.onend = () => finish(job, "idle", false);
    utterance.onerror = (event) => finish(job,
      event.error === "not-allowed" ? "blocked" : ["language-unavailable", "voice-unavailable", "synthesis-unavailable"].includes(event.error) ? "unavailable"
        : ["canceled", "interrupted"].includes(event.error) ? "idle" : "failed", true);
    change("starting");
    job.timer = setTimeout(() => finish(job, "failed", true), SPEECH_START_TIMEOUT_MS);
    try {
      synth.cancel();
      if (synth.paused) synth.resume();
      synth.speak(utterance);
    } catch { finish(job, "failed", true); }
  }
  return { start, stop };
}
