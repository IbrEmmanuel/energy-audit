import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { getOwnedAudit } from "@/lib/audits";
import { computeRow, computeTotals } from "@/lib/calc";
import { computeDesign, DEFAULT_DESIGN, type DesignParams } from "@/lib/design";
import { buildQuotation, type QuotationResult } from "@/lib/quotation";
import { AuditPdfDocument } from "@/lib/pdf-document";
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

  const rows = audit.rows.map((r) => ({
    name: r.name,
    ...computeRow(r),
  }));
  const totals = computeTotals(audit.rows, audit.demandFactor);

  let designParams: DesignParams = DEFAULT_DESIGN;
  if (audit.designJson) {
    try {
      designParams = { ...DEFAULT_DESIGN, ...JSON.parse(audit.designJson) };
    } catch {
      /* keep defaults */
    }
  }
  const design = computeDesign(totals.dailyWh, totals.diversifiedWatts, designParams);

  let quote: QuotationResult | null = null;
  if (audit.quoteJson) {
    try {
      quote = JSON.parse(audit.quoteJson) as QuotationResult;
    } catch {
      quote = buildQuotation(design);
    }
  } else {
    quote = buildQuotation(design);
  }

  const buffer = await renderToBuffer(
    <AuditPdfDocument
      audit={{
        proposalNo: audit.proposalNo,
        clientName: audit.clientName,
        siteAddress: audit.siteAddress,
        phone: audit.phone,
        auditor: session.user.email,
        date: new Date(audit.updatedAt).toLocaleDateString(),
        rows,
        totals,
        design,
        designParams,
        quote,
      }}
    />,
  );

  await trackActivity({
    type: "pdf_export",
    userId: session.user.id,
    email: session.user.email,
    label: audit.clientName,
    meta: { auditId: audit.id, proposalNo: audit.proposalNo },
  });

  const safeName = audit.clientName.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="etech-proposal-${safeName}.pdf"`,
    },
  });
}
