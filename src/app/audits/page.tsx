import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMasterEmail } from "@/lib/access";
import { computeTotals, formatKWh, formatWatts } from "@/lib/calc";
import { AppHeader } from "@/components/app-header";
import { CreateAuditButton } from "@/components/create-audit-button";
import { MobileNav } from "@/components/mobile-nav";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  client: "Client",
  audit: "Audit",
  design: "Design",
  quote: "Quote",
  synced: "Synced",
};

export default async function AuditsPage() {
  const session = await auth();
  const master = isMasterEmail(session?.user?.email);
  const audits = await prisma.audit.findMany({
    where: { userId: session!.user!.id, deletedAt: null },
    include: { rows: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="tt-shell tt-shell-nav">
      <AppHeader
        email={session?.user?.email}
        active="audits"
        actions={
          <>
            {master ? (
              <Link href="/access" className="tt-btn tt-btn-ghost on-dark tt-desktop-only-inline">
                Access
              </Link>
            ) : null}
            <span className="tt-desktop-only-inline">
              <CreateAuditButton />
            </span>
          </>
        }
      />

      <main className="tt-page">
        <div className="tt-toolbar">
          <div>
            <h1>Proposals</h1>
            <p>
              {audits.length} record{audits.length === 1 ? "" : "s"} · linked to live Google Sheet
            </p>
          </div>
        </div>

        {audits.length === 0 ? (
          <div className="tt-empty">
            <h2>No proposals yet</h2>
            <p>Create a proposal to start Energy Audit → System Design → Quotation.</p>
          </div>
        ) : (
          <>
            <div className="tt-only-desktop tt-surface overflow-hidden">
              <table className="tt-list-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Proposal</th>
                    <th>Stage</th>
                    <th>Load</th>
                    <th>Daily energy</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => {
                    const t = computeTotals(a.rows);
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link
                            href={`/audits/${a.id}`}
                            className="font-semibold text-[var(--navy)] hover:underline"
                          >
                            {a.clientName}
                          </Link>
                        </td>
                        <td className="tt-num text-[var(--muted)]">{a.proposalNo ?? "—"}</td>
                        <td>
                          <span className="tt-status">{STATUS_LABEL[a.status] ?? a.status}</span>
                        </td>
                        <td className="tt-num">{formatWatts(t.totalWatts)}</td>
                        <td className="tt-num">{formatKWh(t.dailyKWh)}</td>
                        <td className="text-[var(--muted)]">
                          {new Date(a.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="tt-only-mobile tt-mobile-cards">
              {audits.map((a) => {
                const t = computeTotals(a.rows);
                return (
                  <li key={a.id}>
                    <Link href={`/audits/${a.id}`} className="tt-mobile-card block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="tt-mobile-card-title mb-0 truncate">{a.clientName}</p>
                          <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                            {a.proposalNo ?? "Draft"} · {STATUS_LABEL[a.status] ?? a.status}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tt-num font-semibold text-[var(--navy)]">
                            {formatWatts(t.totalWatts)}
                          </p>
                          <p className="tt-num text-[var(--muted)]">{formatKWh(t.dailyKWh)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <MobileNav active="audits" showAccess={master} />
    </div>
  );
}
