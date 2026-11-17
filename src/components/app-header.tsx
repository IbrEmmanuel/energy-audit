import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

type Props = {
  email?: string | null;
  actions?: React.ReactNode;
  active?: "dashboard" | "audits" | "access";
};

export function AppHeader({ email, actions, active }: Props) {
  return (
    <header className="tt-appbar">
      <div className="tt-appbar-left">
        <Link href="/dashboard" className="tt-brand">
          <strong>E-TEC</strong>
          <span className="tt-brand-sub">Proposal System</span>
        </Link>
        <nav className="tt-appbar-nav" aria-label="Primary">
          <Link href="/dashboard" className="tt-nav-link" data-active={active === "dashboard"}>
            Dashboard
          </Link>
          <Link href="/audits" className="tt-nav-link" data-active={active === "audits"}>
            Proposals
          </Link>
        </nav>
      </div>
      <div className="tt-appbar-meta">
        {email ? <span className="tt-appbar-email">{email}</span> : null}
        <div className="tt-appbar-actions">{actions}</div>
        <SignOutButton />
      </div>
    </header>
  );
}
