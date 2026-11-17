"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  activityLabel,
  type DashboardStats,
  type DateRangeKey,
} from "@/lib/activity";
import type { SheetHubSummary } from "@/lib/dashboard";
import { WORKBOOK_URL } from "@/lib/dashboard";
import { CreateAuditButton } from "@/components/create-audit-button";
import { DashboardProposals } from "@/components/dashboard-proposals";

const RANGES: { id: DateRangeKey; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
];

function formatDay(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function latestHref(hub: SheetHubSummary, step: "audit" | "design" | "quote") {
  const first = hub.recent[0];
  if (!first) return "/audits";
  return `/audits/${first.id}?step=${step}`;
}

export function DashboardView({
  stats,
  hub,
}: {
  stats: DashboardStats;
  hub: SheetHubSummary;
}) {
  const router = useRouter();
  const maxFlow = Math.max(1, ...stats.flow.map((d) => d.activities));

  return (
    <div className="tt-dash">
      <div className="tt-toolbar">
        <div className="min-w-0">
          <h1>Dashboard</h1>
          <p>
            {new Date(stats.start).toLocaleDateString()} –{" "}
            {new Date(stats.end).toLocaleDateString()}
            {" · "}
            {hub.proposals} proposal{hub.proposals === 1 ? "" : "s"}
            {" · "}
            {hub.synced} synced
          </p>
        </div>
        <div className="tt-btn-row tt-toolbar-actions">
          <div className="tt-range" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                className="tt-range-btn"
                data-active={stats.range === r.id}
                onClick={() => router.push(`/dashboard?range=${r.id}`)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <a
            className="tt-btn tt-btn-ghost"
            href={WORKBOOK_URL}
            target="_blank"
            rel="noreferrer"
          >
            Workbook
          </a>
          <span className="tt-desktop-only-inline">
            <CreateAuditButton />
          </span>
        </div>
      </div>

      <div className="tt-metric-strip" role="list">
        <Metric label="Logins" value={stats.logins.toLocaleString()} />
        <Metric label="Users" value={stats.uniqueUsers.toLocaleString()} />
        <Metric label="Events" value={stats.activities.toLocaleString()} />
        <Metric label="Syncs" value={stats.sheetSyncs.toLocaleString()} />
        <Metric label="PDFs" value={stats.pdfExports.toLocaleString()} />
        <Metric label="Pipeline" value={hub.quote.quoteLabel} />
      </div>

      <section className="tt-surface overflow-hidden">
        <div className="tt-panel-head">
          <h2>Google Sheet modules</h2>
          <p>Live totals across your proposals</p>
        </div>
        <div className="tt-only-desktop">
          <table className="tt-list-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Primary</th>
                <th>Secondary</th>
                <th>Sync target</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="font-semibold text-[var(--navy)]">Energy Audit</div>
                  <div className="text-[0.72rem] text-[var(--muted)]">gid 0 · B–D write</div>
                </td>
                <td className="tt-num">{hub.audit.loadLabel}</td>
                <td className="tt-num">{hub.audit.energyLabel}</td>
                <td className="text-[0.78rem] text-[var(--muted)]">Energy Audit!B2:D25</td>
                <td>
                  <Link href={latestHref(hub, "audit")} className="tt-link">
                    Open
                  </Link>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="font-semibold text-[var(--navy)]">System Design</div>
                  <div className="text-[0.72rem] text-[var(--muted)]">gid 101 · KPI sync</div>
                </td>
                <td className="tt-num">{hub.design.arrayLabel}</td>
                <td className="tt-num">{hub.design.batteryLabel}</td>
                <td className="text-[0.78rem] text-[var(--muted)]">B17:B26 · G4:I9</td>
                <td>
                  <Link href={latestHref(hub, "design")} className="tt-link">
                    Open
                  </Link>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="font-semibold text-[var(--navy)]">Quotation</div>
                  <div className="text-[0.72rem] text-[var(--muted)]">gid 102 · NGN BOM</div>
                </td>
                <td className="tt-num">{hub.quote.quoteLabel}</td>
                <td className="tt-num">{hub.proposals} deals</td>
                <td className="text-[0.78rem] text-[var(--muted)]">App BOM · PDF export</td>
                <td>
                  <Link href={latestHref(hub, "quote")} className="tt-link">
                    Open
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="tt-only-mobile tt-module-list">
          <li>
            <Link href={latestHref(hub, "audit")}>
              <strong>Energy Audit</strong>
              <span>
                {hub.audit.loadLabel} · {hub.audit.energyLabel}
              </span>
            </Link>
          </li>
          <li>
            <Link href={latestHref(hub, "design")}>
              <strong>System Design</strong>
              <span>
                {hub.design.arrayLabel} · {hub.design.batteryLabel}
              </span>
            </Link>
          </li>
          <li>
            <Link href={latestHref(hub, "quote")}>
              <strong>Quotation</strong>
              <span>
                {hub.quote.quoteLabel} · {hub.proposals} deals
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="tt-surface overflow-hidden">
        <div className="tt-panel-head">
          <h2>Logins by email</h2>
          <p>
            {stats.loginsByEmail.length} account
            {stats.loginsByEmail.length === 1 ? "" : "s"} in range
          </p>
        </div>
        {stats.loginsByEmail.length === 0 ? (
          <p className="tt-empty-inline">No logins in this range.</p>
        ) : (
          <>
            <div className="tt-only-desktop">
              <table className="tt-list-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Logins</th>
                    <th>Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.loginsByEmail.map((row) => (
                    <tr key={row.email}>
                      <td className="font-semibold text-[var(--navy)] break-all">
                        {row.email}
                      </td>
                      <td className="tt-num">{row.loginCount}</td>
                      <td className="text-[0.78rem] text-[var(--muted)]">
                        {row.lastLoginAt ? formatWhen(row.lastLoginAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="tt-only-mobile tt-activity-list">
              {stats.loginsByEmail.map((row) => (
                <li key={row.email}>
                  <div>
                    <p className="title break-all">{row.email}</p>
                    <p className="meta">
                      {row.loginCount} login{row.loginCount === 1 ? "" : "s"}
                      {row.lastLoginAt ? ` · ${formatWhen(row.lastLoginAt)}` : ""}
                    </p>
                  </div>
                  <strong className="tt-num">{row.loginCount}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="tt-dash-split">
        <section className="tt-surface overflow-hidden">
          <div className="tt-panel-head">
            <h2>Activity by date</h2>
            <p>
              <span className="tt-legend">
                <i className="tt-dot activity" /> events
              </span>{" "}
              <span className="tt-legend">
                <i className="tt-dot login" /> logins
              </span>
            </p>
          </div>
          <div className="tt-flow-pad">
            <div className="tt-flow" role="img" aria-label="Activity by date">
              {stats.flow.map((d) => {
                const h = Math.max(4, Math.round((d.activities / maxFlow) * 100));
                const loginShare =
                  d.activities > 0 ? Math.round((d.logins / d.activities) * 100) : 0;
                return (
                  <div
                    key={d.date}
                    className="tt-flow-col"
                    title={`${d.date}: ${d.activities} events, ${d.logins} logins`}
                  >
                    <div className="tt-flow-bar-wrap">
                      <div className="tt-flow-bar" style={{ height: `${h}%` }}>
                        <span
                          className="tt-flow-login"
                          style={{ height: `${loginShare}%` }}
                        />
                      </div>
                    </div>
                    <span className="tt-flow-label">{formatDay(d.date)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="tt-surface overflow-hidden">
          <div className="tt-panel-head">
            <h2>Recent events</h2>
            <p>{stats.recent.length}</p>
          </div>
          {stats.recent.length === 0 ? (
            <p className="tt-empty-inline">No events in this range.</p>
          ) : (
            <ul className="tt-activity-list">
              {stats.recent.slice(0, 10).map((e) => (
                <li key={e.id}>
                  <div>
                    <p className="title">{activityLabel(e.type)}</p>
                    <p className="meta">
                      {e.email ?? "Unknown"}
                      {e.label ? ` · ${e.label}` : ""}
                    </p>
                  </div>
                  <time dateTime={e.createdAt}>{formatWhen(e.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DashboardProposals proposals={hub.recent} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="tt-metric" role="listitem">
      <span>{label}</span>
      <strong className="tt-num">{value}</strong>
    </div>
  );
}
