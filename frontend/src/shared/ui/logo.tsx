import Image from "next/image";

// Logo resmi dari Figma page "logo" (223:12, 224:14). Hanya tersedia raster PNG
// bertransparansi; ukuran asli dipakai sebagai rasio agar tidak terjadi layout shift.
const LOGO = {
  /** Logo lengkap (tanda + "MOSA" + subjudul): header desktop, pembuka, layar masuk. */
  utama: { src: "/brand/logo-utama-mosa.png", width: 1165, height: 425 },
  /** Ikon ringkas: header mobile, favicon, ikon aplikasi. */
  aplikasi: { src: "/brand/logo-aplikasi-mosa.png", width: 445, height: 460 },
} as const;

export type LogoVariant = keyof typeof LOGO;

export type LogoProps = {
  variant: LogoVariant;
  /** Tinggi tampil dalam piksel CSS; lebar mengikuti rasio asli logo. */
  height: number;
  /** Teks alternatif. Kosongkan ("") bila nama aplikasi sudah tertulis di dekatnya. */
  alt: string;
  /** Untuk logo di atas lipatan (mis. layar masuk) agar tidak menunda LCP. */
  priority?: boolean;
  className?: string;
};

/** Logo MOSA. Bentuk dan warna tidak diubah; hanya diperkecil oleh next/image. */
export function Logo({ variant, height, alt, priority = false, className }: LogoProps) {
  const logo = LOGO[variant];
  const width = Math.round((height * logo.width) / logo.height);
  return (
    <Image
      src={logo.src}
      width={width}
      height={height}
      alt={alt}
      priority={priority}
      className={className}
      style={{ width, height }}
    />
  );
}
