import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  auditUpdateSchema,
  computeAuditLiveKpi,
  getOwnedAudit,
  syncAuditToSheets,
} from "@/lib/audits";
import { trackActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const audit = await getOwnedAudit(id, session.user.id);
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const liveKpi = computeAuditLiveKpi(audit.rows, audit.designJson);
  return NextResponse.json({ ...audit, liveKpi });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getOwnedAudit(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = auditUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rows, syncSheet = true, designJson, quoteJson, status, ...header } =
    parsed.data;

  const liveKpi = computeAuditLiveKpi(rows, designJson ?? existing.designJson);

  await prisma.$transaction(async (tx) => {
    await tx.audit.update({
      where: { id },
      data: {
        clientName: header.clientName,
        siteAddress: header.siteAddress ?? null,
        phone: header.phone ?? null,
        notes: header.notes ?? null,
        ...(designJson !== undefined ? { designJson } : {}),
        ...(quoteJson !== undefined ? { quoteJson } : {}),
        kpiJson: JSON.stringify(liveKpi),
        ...(status ? { status } : {}),
      },
    });

    for (const row of rows) {
      if (row.id) {
        await tx.auditRow.updateMany({
          where: { id: row.id, auditId: id },
          data: {
            name: row.name,
            sheetRow: row.sheetRow,
            quantity: row.quantity,
            unitWatts: row.unitWatts,
            dailyHours: row.dailyHours,
            sortOrder: row.sortOrder ?? 0,
            isCustom: row.isCustom ?? false,
          },
        });
      } else {
        await tx.auditRow.create({
          data: {
            auditId: id,
            name: row.name,
            sheetRow: row.sheetRow,
            quantity: row.quantity,
            unitWatts: row.unitWatts,
            dailyHours: row.dailyHours,
            sortOrder: row.sortOrder ?? 0,
            isCustom: row.isCustom ?? true,
          },
        });
      }
    }
  });

  let syncResult: { ok: boolean; error?: string } | undefined;
  if (syncSheet) {
    syncResult = await syncAuditToSheets({
      accessToken: session.accessToken,
      auditId: id,
      rows: rows.filter((r) => r.sheetRow >= 2 && r.sheetRow <= 25),
      designJson: designJson ?? existing.designJson,
    });
  }

  await trackActivity({
    type: syncSheet && syncResult?.ok ? "sheet_sync" : "proposal_save",
    userId: session.user.id,
    email: session.user.email,
    label: header.clientName,
    meta: { auditId: id, syncOk: syncResult?.ok ?? false },
  });

  const audit = await getOwnedAudit(id, session.user.id);
  return NextResponse.json({
    audit,
    sync: syncResult,
    liveKpi: syncResult && "kpi" in syncResult && syncResult.kpi ? syncResult.kpi : liveKpi,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getOwnedAudit(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.audit.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await trackActivity({
    type: "proposal_delete",
    userId: session.user.id,
    email: session.user.email,
    label: existing.clientName,
    meta: {
      auditId: id,
      proposalNo: existing.proposalNo,
      updatedAt: existing.updatedAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, id, clientName: existing.clientName });
}
