import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditForUser, auditHeaderSchema } from "@/lib/audits";
import { computeTotals } from "@/lib/calc";
import { trackActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const audits = await prisma.audit.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: { rows: true },
    orderBy: { updatedAt: "desc" },
  });

  const payload = audits.map((a) => {
    const totals = computeTotals(a.rows);
    return {
      id: a.id,
      clientName: a.clientName,
      siteAddress: a.siteAddress,
      updatedAt: a.updatedAt,
      sheetSyncedAt: a.sheetSyncedAt,
      totals,
    };
  });

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = auditHeaderSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const audit = await createAuditForUser(
    session.user.id,
    parsed.data.clientName || "New Client",
  );

  if (parsed.data.siteAddress || parsed.data.phone || parsed.data.notes) {
    await prisma.audit.update({
      where: { id: audit.id },
      data: {
        siteAddress: parsed.data.siteAddress,
        phone: parsed.data.phone,
        notes: parsed.data.notes,
      },
    });
  }

  const fresh = await prisma.audit.findUnique({
    where: { id: audit.id },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });

  await trackActivity({
    type: "proposal_create",
    userId: session.user.id,
    email: session.user.email,
    label: audit.clientName,
    meta: { auditId: audit.id, proposalNo: audit.proposalNo },
  });

  return NextResponse.json(fresh, { status: 201 });
}
