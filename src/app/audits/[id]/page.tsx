import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOwnedAudit } from "@/lib/audits";
import { prisma } from "@/lib/prisma";
import { DEFAULT_DESIGN } from "@/lib/design";
import { isMasterEmail } from "@/lib/access";
import { ProposalWorkspace } from "@/components/proposal-workspace";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
};

function nextProposalNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `ET-${y}${m}${day}-${seq}`;
}

export default async function AuditDetailPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/audits");

  const { id } = await params;
  const query = await searchParams;
  let audit = await getOwnedAudit(id, session.user.id);
  if (!audit) notFound();

  if (!audit.proposalNo || !audit.designJson) {
    audit = await prisma.audit.update({
      where: { id: audit.id },
      data: {
        proposalNo: audit.proposalNo ?? nextProposalNo(),
        designJson: audit.designJson ?? JSON.stringify(DEFAULT_DESIGN),
      },
      include: { rows: { orderBy: { sortOrder: "asc" } } },
    });
  }

  const master = isMasterEmail(session.user.email);

  return (
    <div className="tt-shell tt-shell-nav">
      <AppHeader email={session.user.email} active="audits" />
      <main className="tt-page tt-page-wide">
        <div className="tt-crumb">
          <Link href="/dashboard">Dashboard</Link>
          <span aria-hidden>/</span>
          <Link href="/audits">Proposals</Link>
        </div>
        <ProposalWorkspace
          initialStep={query.step}
          initial={{
            id: audit.id,
            proposalNo: audit.proposalNo,
            clientName: audit.clientName,
            siteAddress: audit.siteAddress,
            phone: audit.phone,
            notes: audit.notes,
            status: audit.status,
            sheetSyncedAt: audit.sheetSyncedAt?.toISOString() ?? null,
            sheetSyncError: audit.sheetSyncError,
            designJson: audit.designJson,
            rows: audit.rows.map((r) => ({
              id: r.id,
              name: r.name,
              sheetRow: r.sheetRow,
              quantity: r.quantity,
              unitWatts: r.unitWatts,
              dailyHours: r.dailyHours,
              sortOrder: r.sortOrder,
              isCustom: r.isCustom,
            })),
          }}
        />
      </main>
      <MobileNav active="audits" showAccess={master} />
    </div>
  );
}
