import Link from "next/link";
import { CreateAuditButton } from "@/components/create-audit-button";

type Props = {
  active?: "dashboard" | "audits" | "access";
  showAccess?: boolean;
};

export function MobileNav({ active, showAccess = false }: Props) {
  return (
    <nav className="tt-mobile-nav" aria-label="Mobile">
      <Link
        href="/dashboard"
        className="tt-mobile-nav-item"
        data-active={active === "dashboard"}
      >
        <span className="tt-mobile-nav-ico" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Dashboard
      </Link>
      <Link
        href="/audits"
        className="tt-mobile-nav-item"
        data-active={active === "audits"}
      >
        <span className="tt-mobile-nav-ico" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        Proposals
      </Link>
      <div className="tt-mobile-nav-create">
        <CreateAuditButton />
      </div>
      {showAccess ? (
        <Link
          href="/access"
          className="tt-mobile-nav-item"
          data-active={active === "access"}
        >
          <span className="tt-mobile-nav-ico" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M5.5 19c1.5-3.2 3.9-4.8 6.5-4.8S17 15.8 18.5 19"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          Access
        </Link>
      ) : null}
    </nav>
  );
}
