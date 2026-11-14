import Image from "next/image";

const LOGO = {

  utama: { src: "/brand/logo-utama-mosa.png", width: 1165, height: 425 },

  aplikasi: { src: "/brand/logo-aplikasi-mosa.png", width: 445, height: 460 },
} as const;

export type LogoVariant = keyof typeof LOGO;

export type LogoProps = {
  variant: LogoVariant;

  height: number;

  alt: string;

  priority?: boolean;
  className?: string;
};

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
