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
  { id: "today", label: "Last 24 hour" },
  { id: "7d", label: "Last weeks" },
  { id: "30d", label: "Last month" },
  { id: "90d", label: "Last year" },
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

function greetingName(hub: SheetHubSummary) {
  const first = hub.recent[0]?.clientName;
  return first && first !== "New Client" ? first.split(" ")[0] : "there";
}

function latestHref(hub: SheetHubSummary, step: "audit" | "design" | "quote") {
  const first = hub.recent[0];
  if (!first) return "/audits";
  return `/audits/${first.id}?step=${step}`;
}

export function DashboardView({
  stats,
  hub,
  userName,
}: {
  stats: DashboardStats;
  hub: SheetHubSummary;
  userName?: string | null;
}) {
  const router = useRouter();
  const maxFlow = Math.max(1, ...stats.flow.map((d) => d.activities));
  const hello = userName?.split(" ")[0] || greetingName(hub);

  return (
    <div className="tt-dash tt-dash-clean">
      <div className="tt-dash-hero">
        <div className="min-w-0">
          <h1>Good to see you, {hello}!</h1>
          <p>Live IEEE solar audit, design & quotation — improve proposal flow.</p>
        </div>
        <div className="tt-dash-hero-actions">
          <a className="tt-btn tt-btn-ghost" href={WORKBOOK_URL} target="_blank" rel="noreferrer">
            Workbook
          </a>
          <span className="tt-desktop-only-inline">
            <CreateAuditButton />
          </span>
        </div>
      </div>

      <div className="tt-range tt-range-tabs" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            className="tt-range-tab"
            data-active={stats.range === r.id}
            onClick={() => router.push(`/dashboard?range=${r.id}`)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="tt-metric-cards" role="list">
        <MetricCard
          label="Total proposals"
          value={hub.proposals.toLocaleString()}
          hint={`${hub.synced} sheet synced`}
          tone="orange"
        />
        <MetricCard
          label="Pipeline quote"
          value={hub.quote.quoteLabel}
          hint="Realtime IEEE BOM"
          tone="gold"
        />
        <MetricCard
          label="Array capacity"
          value={hub.design.arrayLabel}
          hint={hub.design.batteryLabel}
          tone="blue"
        />
        <MetricCard
          label="Logins"
          value={stats.logins.toLocaleString()}
          hint={`${stats.uniqueUsers} users · ${stats.sheetSyncs} syncs`}
          tone="green"
        />
      </div>

      <div className="tt-dash-grid">
        <section className="tt-card">
          <div className="tt-card-head">
            <div>
              <h2>Activity overview</h2>
              <p>Events vs logins in range</p>
            </div>
            <Link href="/audits" className="tt-link">
              View details
            </Link>
          </div>
          <div className="tt-flow-pad">
            <div className="tt-flow tt-flow-bars" role="img" aria-label="Activity by date">
              {stats.flow.map((d) => {
                const h = Math.max(8, Math.round((d.activities / maxFlow) * 100));
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
                        <span className="tt-flow-login" style={{ height: `${loginShare}%` }} />
                      </div>
                    </div>
                    <span className="tt-flow-label">{formatDay(d.date)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="tt-card">
          <div className="tt-card-head">
            <div>
              <h2>Live modules</h2>
              <p>IEEE sheet pipeline</p>
            </div>
          </div>
          <ul className="tt-module-tiles">
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
                  {hub.quote.quoteLabel} · realtime
                </span>
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="tt-dash-grid" id="activity">
        <section className="tt-card">
          <div className="tt-card-head">
            <div>
              <h2>Logins by email</h2>
              <p>{stats.loginsByEmail.length} accounts</p>
            </div>
          </div>
          {stats.loginsByEmail.length === 0 ? (
            <p className="tt-empty-inline">No logins in this range.</p>
          ) : (
            <ul className="tt-activity-list">
              {stats.loginsByEmail.slice(0, 8).map((row) => (
                <li key={row.email}>
                  <div>
                    <p className="title break-all">{row.email}</p>
                    <p className="meta">
                      {row.lastLoginAt ? formatWhen(row.lastLoginAt) : "—"}
                    </p>
                  </div>
                  <strong className="tt-num">{row.loginCount}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tt-card">
          <div className="tt-card-head">
            <div>
              <h2>Recent events</h2>
              <p>{stats.recent.length}</p>
            </div>
          </div>
          {stats.recent.length === 0 ? (
            <p className="tt-empty-inline">No events in this range.</p>
          ) : (
            <ul className="tt-activity-list">
              {stats.recent.slice(0, 8).map((e) => (
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

      <section className="tt-card">
        <div className="tt-card-head">
          <div>
            <h2>Recent proposals</h2>
            <p>Live jobs</p>
          </div>
        </div>
        <DashboardProposals proposals={hub.recent} />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "orange" | "gold" | "blue" | "green";
}) {
  return (
    <div className="tt-metric-card" data-tone={tone} role="listitem">
      <span className="tt-metric-card-ico" aria-hidden />
      <div>
        <span>{label}</span>
        <strong className="tt-num">{value}</strong>
        <em>{hint}</em>
      </div>
    </div>
  );
}
