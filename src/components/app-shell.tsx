import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { CreateAuditButton } from "@/components/create-audit-button";
import { MobileNav } from "@/components/mobile-nav";

export type ShellActive =
  | "dashboard"
  | "audits"
  | "access"
  | "audit"
  | "design"
  | "quote"
  | "activity";

type Props = {
  email?: string | null;
  name?: string | null;
  active: ShellActive;
  showAccess?: boolean;
  children: React.ReactNode;
  wide?: boolean;
  narrow?: boolean;
};

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({
  email,
  name,
  active,
  showAccess = false,
  children,
  wide,
  narrow,
}: Props) {
  const mainActive =
    active === "dashboard" || active === "activity"
      ? "dashboard"
      : active === "access"
        ? "access"
        : "audits";

  return (
    <div className="tt-app" data-shell="rockart">
      <aside className="tt-sidebar" aria-label="Main menu">
        <Link href="/dashboard" className="tt-sidebar-brand">
          <span className="tt-sidebar-mark" aria-hidden />
          <strong>E-tech</strong>
        </Link>

        <div className="tt-sidebar-section">
          <p className="tt-sidebar-label">Main menu</p>
          <nav className="tt-sidebar-nav">
            <Link
              href="/dashboard"
              className="tt-sidebar-link"
              data-active={active === "dashboard" || active === "activity"}
            >
              <NavIcon d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
              Overview
            </Link>
            <Link
              href="/audits"
              className="tt-sidebar-link"
              data-active={active === "audits"}
            >
              <NavIcon d="M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1ZM9 9h6M9 13h6" />
              Proposals
            </Link>
            <Link
              href="/audits?focus=audit"
              className="tt-sidebar-link"
              data-active={active === "audit"}
            >
              <NavIcon d="M4 7h16M4 12h16M4 17h10" />
              Energy Audit
            </Link>
            <Link
              href="/audits?focus=design"
              className="tt-sidebar-link"
              data-active={active === "design"}
            >
              <NavIcon d="M4 19V9l8-5 8 5v10H4ZM9 19v-6h6v6" />
              System Design
            </Link>
            <Link
              href="/audits?focus=quote"
              className="tt-sidebar-link"
              data-active={active === "quote"}
            >
              <NavIcon d="M4 7h16v12H4V7Zm3 4h10M7 15h6" />
              Quotation
            </Link>
            <Link
              href="/dashboard?range=7d#activity"
              className="tt-sidebar-link"
              data-active={active === "activity"}
            >
              <NavIcon d="M5 19V9M10 19V5M15 19v-7M20 19V8" />
              Log Activity
            </Link>
          </nav>
        </div>

        <div className="tt-sidebar-section tt-sidebar-bottom">
          <p className="tt-sidebar-label">Preference</p>
          <nav className="tt-sidebar-nav">
            {showAccess ? (
              <Link
                href="/access"
                className="tt-sidebar-link"
                data-active={active === "access"}
              >
                <NavIcon d="M12 8a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 8ZM5.5 19c1.5-3.2 3.9-4.8 6.5-4.8S17 15.8 18.5 19" />
                Access
              </Link>
            ) : null}
            <a
              className="tt-sidebar-link"
              href="https://docs.google.com/spreadsheets"
              target="_blank"
              rel="noreferrer"
            >
              <NavIcon d="M12 4v16M8 8h8M8 12h8M8 16h5" />
              Help Center
            </a>
            <div className="tt-sidebar-user">
              <span className="tt-sidebar-user-name">
                {name || email?.split("@")[0] || "User"}
              </span>
              <span className="tt-sidebar-user-email">{email}</span>
              <SignOutButton />
            </div>
          </nav>
        </div>
      </aside>

      <div className="tt-app-main">
        <header className="tt-topbar">
          <div className="tt-topbar-brand-mobile">
            <span className="tt-sidebar-mark" aria-hidden />
            <strong>E-tech</strong>
          </div>
          <div className="tt-topbar-actions">
            <span className="tt-desktop-only-inline">
              <CreateAuditButton />
            </span>
            <SignOutButton />
          </div>
        </header>
        <main
          className={`tt-page tt-page-app ${wide ? "tt-page-wide" : ""} ${narrow ? "tt-page-narrow" : ""}`}
        >
          {children}
        </main>
        <MobileNav active={mainActive} showAccess={showAccess} />
      </div>
    </div>
  );
}
