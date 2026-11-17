import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLiveActivityFeed } from "@/lib/activity";
import { SignInButton } from "@/components/sign-in-button";
import { LoginLiveActivity } from "@/components/login-live-activity";

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

  // Never auto-bounce when an auth error is present (breaks cookie mismatch loops)
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
      ? "Access denied. Ask the master account to grant your Google email first."
      : params.error === "Configuration"
        ? "Auth is misconfigured on the server. Set AUTH_SECRET, AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and DATABASE_URL in Vercel, then redeploy."
        : params.error === "OAuthAccountNotLinked"
          ? "This Google account could not be linked. Sign in with the same Google email used before."
          : params.error
            ? `Sign-in failed (${params.error}). Try again.`
            : null;

  const live = await getLiveActivityFeed(14);

  return (
    <main className="tt-login">
      <div className="tt-login-media" aria-hidden>
        <Image
          src="/images/hero-solar-v2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="tt-login-photo"
        />
        <div className="tt-login-shade" />
      </div>

      <div className="tt-login-frame tt-login-frame-split">
        <div className="tt-login-panel">
          <p className="tt-login-kicker">Staff access</p>
          <h1 className="tt-login-brand">E-tech</h1>
          <p className="tt-login-line">Solar engineering proposals</p>

          {errorMessage ? (
            <div className="tt-alert tt-alert-on-dark" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <div className="tt-login-actions">
            <SignInButton callbackUrl={callbackUrl} />
            <p className="tt-login-foot">
              Authorized Google accounts only · sign-in tracks live dashboard activity
            </p>
            <a className="tt-login-reset" href="/login/reset">
              Clear login cookies
            </a>
          </div>
        </div>

        <LoginLiveActivity initial={live} />
      </div>
    </main>
  );
}
