// Mengambil satu bingkai dari pratinjau kamera sebagai berkas JPEG di memori.
// Berkas ini masuk jalur yang sama dengan foto dari input file (compressPhoto), tidak disimpan.
export function grabVideoFrame(video: HTMLVideoElement): Promise<File | null> {
  const { videoWidth: width, videoHeight: height } = video;
  if (width === 0 || height === 0) return Promise.resolve(null);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  context.drawImage(video, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      canvas.width = 0; canvas.height = 0;
      resolve(blob ? new File([blob], "kamera.jpg", { type: "image/jpeg" }) : null);
    }, "image/jpeg", 0.92);
  });
}
