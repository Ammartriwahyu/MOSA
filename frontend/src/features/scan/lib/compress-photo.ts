import { fittedDimensions, PHOTO_POLICY, PhotoError, type PreparedPhoto } from "./photo-policy";

function loadImage(image: HTMLImageElement, url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { image.onload = null; image.onerror = null; signal.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); image.src = ""; reject(new DOMException("Aborted", "AbortError")); };
    image.onload = () => { cleanup(); resolve(); };
    image.onerror = () => { cleanup(); reject(new PhotoError("unreadable")); };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort(); else image.src = url;
  });
}

function encode(canvas: HTMLCanvasElement, quality: number, signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { signal.removeEventListener("abort", abort); abort(); return; }
    try {
      canvas.toBlob((blob) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) { abort(); return; }
        if (!blob || blob.type !== "image/jpeg" || blob.size === 0) reject(new PhotoError("compression"));
        else resolve(blob);
      }, "image/jpeg", quality);
    } catch { signal.removeEventListener("abort", abort); reject(new PhotoError("compression")); }
  });
}

/** Gambar digambar ulang menjadi JPEG; nama berkas dan metadata sumber tidak diteruskan. */
export async function compressPhoto(file: File, signal: AbortSignal): Promise<PreparedPhoto> {
  signal.throwIfAborted();
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new PhotoError("unsupported");
  if (file.size === 0) throw new PhotoError("unreadable");
  if (file.size > PHOTO_POLICY.maxInputBytes) throw new PhotoError("too_large");
  const image = new Image();
  const canvas = document.createElement("canvas");
  const sourceUrl = URL.createObjectURL(file);
  try {
    await loadImage(image, sourceUrl, signal);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoError("compression");
    for (let pass = 0; pass < PHOTO_POLICY.resizePasses; pass += 1) {
      const dimensions = fittedDimensions(image.naturalWidth, image.naturalHeight, PHOTO_POLICY.maxDimension * PHOTO_POLICY.resizeFactor ** pass);
      canvas.width = dimensions.width; canvas.height = dimensions.height;
      ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of PHOTO_POLICY.qualities) {
        const blob = await encode(canvas, quality, signal);
        signal.throwIfAborted();
        if (blob.size <= PHOTO_POLICY.maxBytes) return { blob, ...dimensions };
      }
    }
    throw new PhotoError("too_large");
  } finally {
    image.src = ""; canvas.width = 0; canvas.height = 0;
    URL.revokeObjectURL(sourceUrl);
  }
}
