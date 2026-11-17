import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMasterEmail } from "@/lib/access";
import { computeTotals, formatKWh, formatWatts } from "@/lib/calc";
import { AppShell, type ShellActive } from "@/components/app-shell";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  client: "Client",
  audit: "Audit",
  design: "Design",
  quote: "Quote",
  synced: "Synced",
};

type Props = {
  searchParams: Promise<{ focus?: string }>;
};

function parseFocus(raw?: string): ShellActive {
  if (raw === "audit" || raw === "design" || raw === "quote") return raw;
  return "audits";
}

export default async function AuditsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/audits");

  const params = await searchParams;
  const focus = parseFocus(params.focus);
  const master = isMasterEmail(session.user.email);
  const audits = await prisma.audit.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: { rows: true },
    orderBy: { updatedAt: "desc" },
  });

  const latest = audits[0];
  if (latest && (focus === "audit" || focus === "design" || focus === "quote")) {
    redirect(`/audits/${latest.id}?step=${focus}`);
  }

  return (
    <AppShell
      email={session.user.email}
      name={session.user.name}
      active="audits"
      showAccess={master}
      wide
    >
      <div className="tt-toolbar">
        <div>
          <h1>Proposals</h1>
          <p>
            {audits.length} record{audits.length === 1 ? "" : "s"} · IEEE live sheet pipeline
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
                  const t = computeTotals(a.rows, a.demandFactor);
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
              const t = computeTotals(a.rows, a.demandFactor);
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
    </AppShell>
  );
}
