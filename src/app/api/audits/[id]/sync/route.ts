import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnedAudit, syncAuditToSheets } from "@/lib/audits";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const audit = await getOwnedAudit(id, session.user.id);
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await syncAuditToSheets({
    accessToken: session.accessToken,
    auditId: id,
    rows: audit.rows.filter((r) => r.sheetRow >= 2 && r.sheetRow <= 25),
    designJson: audit.designJson,
  });

  const fresh = await getOwnedAudit(id, session.user.id);
  return NextResponse.json(
    { sync: result, audit: fresh, liveKpi: "kpi" in result ? result.kpi : undefined },
    { status: result.ok ? 200 : 502 },
  );
}
