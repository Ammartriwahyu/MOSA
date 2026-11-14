"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { grabVideoFrame } from "../lib/grab-video-frame";

export type LiveCameraStatus = "off" | "starting" | "live" | "denied" | "unavailable";

// Kamera belakang bila ada; resolusi cukup agar nama + kekuatan terbaca, lalu tetap dikompres compressPhoto.
const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
};

function supported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
}

const noSubscribe = () => () => undefined;

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Pratinjau kamera langsung di halaman. Hanya menyala saat `active` (persetujuan scan sudah ada
 * dan belum ada foto), dan dimatikan saat foto diambil, halaman ditinggal, atau tab disembunyikan,
 * agar lampu kamera tidak menyala tanpa alasan. Gagal/ditolak → jalur cadangan input file.
 */
export function useLiveCamera(active: boolean) {
  // Server menganggap didukung agar tidak ada selisih hidrasi; browser memeriksa sungguhan.
  const canUse = useSyncExternalStore(noSubscribe, supported, () => true);
  const [outcome, setOutcome] = useState<"live" | "denied" | "unavailable" | null>(null);
  const [hidden, setHidden] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!active || hidden || !canUse) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia(CONSTRAINTS).then((opened) => {
      if (cancelled) { stopStream(opened); return; }
      stream.current = opened;
      if (video.current) video.current.srcObject = opened;
      setOutcome("live");
    }, (failure: unknown) => {
      if (cancelled) return;
      const denied = failure instanceof DOMException && (failure.name === "NotAllowedError" || failure.name === "SecurityError");
      setOutcome(denied ? "denied" : "unavailable");
    });
    return () => {
      cancelled = true;
      stopStream(stream.current); stream.current = null;
      if (video.current) video.current.srcObject = null;
      // Penolakan tetap diingat agar tidak meminta izin berulang; "live" diulang dari awal.
      setOutcome((current) => (current === "live" ? null : current));
    };
  }, [active, hidden, canUse]);

  // Ref callback: elemen <video> bisa dipasang setelah aliran siap (atau sebaliknya).
  const attach = useCallback((element: HTMLVideoElement | null) => {
    video.current = element;
    if (element && stream.current) element.srcObject = stream.current;
  }, []);

  const grab = useCallback(() => (video.current ? grabVideoFrame(video.current) : Promise.resolve(null)), []);

  const status: LiveCameraStatus = !canUse ? "unavailable"
    : outcome === "denied" || outcome === "unavailable" ? outcome
      : !active || hidden ? "off"
        : outcome === "live" ? "live" : "starting";
  return { status, attach, grab };
}
