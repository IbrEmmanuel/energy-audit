import { z } from "zod";
import { prisma } from "./prisma";
import { APPLIANCE_DEFAULTS } from "./appliances";
import {
  DEFAULT_DESIGN,
  buildLiveKpiBundle,
  parseDesignParams,
  type LiveKpiBundle,
} from "./design";
import { computeTotals } from "./calc";
import { DEMAND_FACTOR } from "./appliances";
import { buildQuotation } from "./quotation";
import {
  syncEnergyAuditToSheet,
  syncQuotationToSheet,
  syncSystemDesignKpiToSheet,
} from "./google-sheets";

export const auditHeaderSchema = z.object({
  clientName: z.string().min(1).max(200),
  siteAddress: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const auditRowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  sheetRow: z.number().int().min(2).max(200),
  quantity: z.number().int().min(0).max(10000),
  unitWatts: z.number().min(0).max(100000),
  dailyHours: z.number().min(0).max(24),
  sortOrder: z.number().int().optional(),
  isCustom: z.boolean().optional(),
});

export const auditUpdateSchema = auditHeaderSchema.extend({
  rows: z.array(auditRowSchema).min(1),
  syncSheet: z.boolean().optional(),
  designJson: z.string().max(20000).optional().nullable(),
  quoteJson: z.string().max(50000).optional().nullable(),
  status: z.enum(["draft", "client", "audit", "design", "quote", "synced"]).optional(),
});

function nextProposalNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `ET-${y}${m}${day}-${seq}`;
}

export function computeAuditLiveKpi(
  rows: { quantity: number; unitWatts: number; dailyHours: number }[],
  designJson?: string | null,
  demandFactor = DEMAND_FACTOR,
): LiveKpiBundle {
  const totals = computeTotals(rows, demandFactor);
  const params = parseDesignParams(designJson);
  return buildLiveKpiBundle(totals.dailyWh, totals.diversifiedWatts, params);
}

export async function createAuditForUser(userId: string, clientName = "New Client") {
  const designJson = JSON.stringify(DEFAULT_DESIGN);
  const rows = APPLIANCE_DEFAULTS.map((a, i) => ({
    name: a.name,
    sheetRow: a.sheetRow,
    quantity: 0,
    unitWatts: a.unitWatts,
    dailyHours: a.defaultHours,
    sortOrder: i,
    isCustom: false,
  }));
  const kpi = computeAuditLiveKpi(rows, designJson);

  return prisma.audit.create({
    data: {
      userId,
      clientName,
      proposalNo: nextProposalNo(),
      status: "audit",
      designJson,
      kpiJson: JSON.stringify(kpi),
      rows: { create: rows },
    },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getOwnedAudit(id: string, userId: string) {
  return prisma.audit.findFirst({
    where: { id, userId, deletedAt: null },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function syncAuditToSheets(opts: {
  accessToken: string | undefined;
  auditId: string;
  rows: {
    sheetRow: number;
    name?: string;
    quantity: number;
    unitWatts: number;
    dailyHours: number;
  }[];
  designJson?: string | null;
}) {
  const { accessToken, auditId, rows, designJson } = opts;

  if (!accessToken) {
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        sheetSyncError:
          "Missing Google access token. Sign out and sign in again to grant Sheets access.",
      },
    });
    return { ok: false as const, error: "Missing Google access token" };
  }

  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  const demandFactor = audit?.demandFactor ?? DEMAND_FACTOR;
  const kpi = computeAuditLiveKpi(rows, designJson, demandFactor);
  const quote = buildQuotation(kpi.results, kpi.params);

  try {
    await syncEnergyAuditToSheet(
      accessToken,
      rows.filter((r) => r.sheetRow >= 2 && r.sheetRow <= 25),
      demandFactor,
    );
    await syncSystemDesignKpiToSheet(accessToken, {
      params: kpi.params,
      results: kpi.results,
      kpi: kpi.kpi,
    });
    await syncQuotationToSheet(accessToken, quote, {
      panelWatts: kpi.params.panelWatts,
      systemVoltage: kpi.params.systemVoltage,
      batteryAh: kpi.params.batteryAh,
    });

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        kpiJson: JSON.stringify(kpi),
        quoteJson: JSON.stringify(quote),
        sheetSyncedAt: new Date(),
        sheetSyncError: null,
        status: "synced",
      },
    });
    return { ok: true as const, kpi, quote };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sheet sync failed";
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        kpiJson: JSON.stringify(kpi),
        sheetSyncError: message,
      },
    });
    return { ok: false as const, error: message, kpi };
  }
}

/** @deprecated use syncAuditToSheets */
export async function syncAuditRowsToSheet(
  accessToken: string | undefined,
  auditId: string,
  rows: { sheetRow: number; quantity: number; unitWatts: number; dailyHours: number }[],
) {
  return syncAuditToSheets({ accessToken, auditId, rows });
}
