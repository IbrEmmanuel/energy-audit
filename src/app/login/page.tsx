import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/sign-in-button";
import { BrandLogo } from "@/components/brand-logo";
import { InstallApp } from "@/components/install-app";
import { LoginSessionSync } from "@/components/login-session-sync";
import {
  LoginHotkey,
  LoginParallax,
  LoginPremiumHud,
} from "@/components/login-premium";
import { MASTER_EMAIL } from "@/lib/access";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/dashboard";

  if (!params.error) {
    try {
      const session = await auth();
      if (session?.user?.id) redirect(callbackUrl);
    } catch {
      // Corrupt/partial session cookies — stay on login
    }
  }

  const errorMessage =
    params.error === "AccessDenied"
      ? `Access denied. On your phone, choose the master Google account (${MASTER_EMAIL}) — other Gmail accounts cannot sign in until granted.`
      : params.error === "Configuration"
        ? "Auth is misconfigured on the server. Set AUTH_SECRET, AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and DATABASE_URL in Vercel, then redeploy."
        : params.error === "OAuthAccountNotLinked"
          ? "This Google account could not be linked. Sign in with the same Google email used before."
          : params.error
            ? `Sign-in failed (${params.error}). Try again.`
            : null;

  return (
    <main className="tt-login">
      <LoginSessionSync callbackUrl={callbackUrl} />
      <LoginParallax />

      <div className="tt-login-stage" aria-hidden>
        <Image
          src="/images/hero-solar-v2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="tt-login-photo"
        />
        <div className="tt-login-shade" />
        <div className="tt-login-grid" />
      </div>

      <section className="tt-login-center">
        <BrandLogo variant="login" priority />
        <p className="tt-login-kicker">Secure staff gate</p>
        <h1 className="tt-login-title">Sign in to continue</h1>
        <p className="tt-login-line">
          Live proposal workspace — IEEE sizing, sheet sync, and PDF export for E-TEC field staff.
        </p>

        {errorMessage ? (
          <div className="tt-alert tt-alert-on-dark" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="tt-login-actions">
          <SignInButton variant="premium" callbackUrl={callbackUrl} />
          <LoginHotkey />
          <p className="tt-login-foot">
            Authorized Google only · master {MASTER_EMAIL}
          </p>
        </div>

        <LoginPremiumHud />
        <InstallApp variant="login" />
      </section>
    </main>
  );
}
