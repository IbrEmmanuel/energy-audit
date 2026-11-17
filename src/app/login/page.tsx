import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/sign-in-button";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/dashboard";

  const denied =
    params.error === "AccessDenied" ||
    params.error === "Configuration" ||
    params.error === "OAuthAccountNotLinked";

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

      <div className="tt-login-frame">
        <div className="tt-login-panel">
          <p className="tt-login-kicker">Staff access</p>
          <h1 className="tt-login-brand">E-tech</h1>
          <p className="tt-login-line">Solar engineering proposals</p>

          {denied ? (
            <div className="tt-alert tt-alert-on-dark" role="alert">
              Access denied. Ask the master account to grant your Google email first.
            </div>
          ) : null}

          <div className="tt-login-actions">
            <SignInButton callbackUrl={callbackUrl} />
            <p className="tt-login-foot">Authorized Google accounts only</p>
          </div>
        </div>
      </div>
    </main>
  );
}
