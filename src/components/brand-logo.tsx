type Props = {
  variant?: "login" | "sidebar" | "topbar";
  priority?: boolean;
  showTagline?: boolean;
};

const sizes = {
  login: { className: "tt-brand-logo tt-brand-logo-login" },
  sidebar: { className: "tt-brand-logo tt-brand-logo-sidebar" },
  topbar: { className: "tt-brand-logo tt-brand-logo-topbar" },
} as const;

export function BrandLogo({
  variant = "sidebar",
  showTagline = variant === "login",
}: Props) {
  const s = sizes[variant];
  return (
    <span className={`tt-brand-lockup tt-brand-lockup-${variant}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/e-tec-wordmark.svg"
        alt="E-TEC"
        className={s.className}
        decoding="async"
      />
      {showTagline ? (
        <span className="tt-brand-tagline">
          Electrical · Solar · Automation · Energy
        </span>
      ) : null}
    </span>
  );
}
