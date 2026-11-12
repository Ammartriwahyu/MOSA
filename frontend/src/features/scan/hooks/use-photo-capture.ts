"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compressPhoto } from "../lib/compress-photo";
import { PHOTO_POLICY, PhotoError, type PhotoFailure, type PreparedPhoto } from "../lib/photo-policy";

export function usePhotoCapture() {
  const [photo, setPhoto] = useState<(PreparedPhoto & { url: string }) | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<PhotoFailure | null>(null);
  const controller = useRef<AbortController | null>(null);
  const preview = useRef<string | null>(null);
  const dispose = useCallback(() => {
    controller.current?.abort(); controller.current = null;
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
  }, []);
  useEffect(() => dispose, [dispose]);

  const clear = useCallback(() => { dispose(); setPhoto(null); setError(null); setProcessing(false); }, [dispose]);
  async function select(file: File) {
    clear();
    const job = new AbortController();
    controller.current = job;
    setProcessing(true);
    const timeout = window.setTimeout(() => job.abort(), PHOTO_POLICY.timeoutMs);
    try {
      const prepared = await compressPhoto(file, job.signal);
      if (job.signal.aborted || controller.current !== job) return;
      const url = URL.createObjectURL(prepared.blob);
      preview.current = url;
      setPhoto({ ...prepared, url });
    } catch (failure) {
      if (controller.current !== job) return;
      setError(failure instanceof PhotoError ? failure.reason : "compression");
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === job) { controller.current = null; setProcessing(false); }
    }
  }
  return { photo, processing, error, select, clear };
}
