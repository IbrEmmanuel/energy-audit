import Image from "next/image";

type Props = {
  variant?: "login" | "sidebar" | "topbar";
  priority?: boolean;
};

const sizes = {
  login: { width: 280, height: 187, className: "tt-brand-logo tt-brand-logo-login" },
  sidebar: { width: 148, height: 99, className: "tt-brand-logo tt-brand-logo-sidebar" },
  topbar: { width: 120, height: 80, className: "tt-brand-logo tt-brand-logo-topbar" },
} as const;

export function BrandLogo({ variant = "sidebar", priority = false }: Props) {
  const s = sizes[variant];
  return (
    <Image
      src="/brand/e-tec-mark.png"
      alt="E-TEC"
      width={s.width}
      height={s.height}
      priority={priority}
      className={s.className}
    />
  );
}
