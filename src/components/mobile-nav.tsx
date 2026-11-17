import Link from "next/link";
import { CreateAuditButton } from "@/components/create-audit-button";

type Props = {
  active?: "dashboard" | "audits" | "access";
  showAccess?: boolean;
};

export function MobileNav({ active, showAccess = false }: Props) {
  return (
    <nav className="tt-dock" aria-label="Primary">
      <div className="tt-dock-rail" data-cols={showAccess ? "4" : "3"}>
        <Link
          href="/dashboard"
          className="tt-dock-item"
          data-active={active === "dashboard"}
        >
          <span className="tt-dock-ico" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="tt-dock-label">Dash</span>
        </Link>

        <Link
          href="/audits"
          className="tt-dock-item"
          data-active={active === "audits"}
        >
          <span className="tt-dock-ico" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M9 9h6M9 13h6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="tt-dock-label">Jobs</span>
        </Link>

        <div className="tt-dock-create">
          <CreateAuditButton />
        </div>

        {showAccess ? (
          <Link
            href="/access"
            className="tt-dock-item"
            data-active={active === "access"}
          >
            <span className="tt-dock-ico" aria-hidden>
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
            <span className="tt-dock-label">Access</span>
          </Link>
        ) : null}
      </div>
      <p className="tt-dock-meta">
        <span className="tt-dock-pulse" aria-hidden />
        E-TEC · live
      </p>
    </nav>
  );
}
