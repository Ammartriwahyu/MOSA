"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createSpeechPlayback, indonesianLocalVoice, type SpeechPlaybackState } from "../lib/speech-playback";
import { createVoiceAvailabilityStore, speechEngine } from "../lib/speech-voices";

const playback = createSpeechPlayback();
const voices = createVoiceAvailabilityStore();

export function useSpeech(text: string, { active = true, contextKey }: { active?: boolean; contextKey?: string } = {}) {
  const pathname = usePathname();
  const availability = useSyncExternalStore(voices.subscribe, voices.getSnapshot, voices.getServerSnapshot);
  const [snapshot, setSnapshot] = useState({ text, active, pathname, contextKey, state: "idle" as SpeechPlaybackState });

  const state = snapshot.text === text && snapshot.active === active && snapshot.pathname === pathname && snapshot.contextKey === contextKey ? snapshot.state : "idle";
  const owner = useRef({}); const mounted = useRef(false);
  const notify = useCallback((value: SpeechPlaybackState) => {
    if (mounted.current) setSnapshot({ text, active, pathname, contextKey, state: value });
  }, [text, active, pathname, contextKey]);

  useEffect(() => {
    mounted.current = true;
    const token = owner.current;
    const stopHidden = () => { if (document.hidden) playback.stop(token); };
    const stopPage = () => playback.stop(token);
    document.addEventListener("visibilitychange", stopHidden); window.addEventListener("pagehide", stopPage);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", stopHidden); window.removeEventListener("pagehide", stopPage);
      playback.stop(token);
    };
  }, []);
  useEffect(() => {
    const token = owner.current;
    return () => playback.stop(token);
  }, [text, active, pathname, contextKey]);
  useEffect(() => { if (availability !== "available") playback.stop(owner.current); }, [availability]);

  function speak() {
    if (!active || !mounted.current || !text.trim()) return;
    const synth = speechEngine();
    try {
      const voice = synth ? indonesianLocalVoice(synth.getVoices()) : undefined;
      if (!synth || !voice) { playback.stop(owner.current); notify("unavailable"); return; }
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID"; utterance.voice = voice; utterance.rate = 1; utterance.pitch = 1; utterance.volume = 1;

      playback.start(owner.current, synth, utterance, notify);
    } catch { playback.stop(owner.current); notify("failed"); }
  }
  const stop = () => { playback.stop(owner.current); notify("idle"); };
  return { availability, state, speak, stop, busy: state === "starting" || state === "speaking", canSpeak: active && availability === "available" && Boolean(text.trim()) };
}
