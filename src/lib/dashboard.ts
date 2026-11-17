import { prisma } from "./prisma";
import { computeTotals, formatKWh, formatWatts } from "./calc";
import { buildLiveKpiBundle, parseDesignParams } from "./design";
import { buildQuotation, formatNaira } from "./quotation";
import { SHEET_ID } from "./appliances";

export const WORKBOOK_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

export type DashboardProposal = {
  id: string;
  clientName: string;
  proposalNo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  sheetSyncedAt: string | null;
  loadW: number;
  dailyKWh: number;
  arrayKwp: number;
  batteryKWh: number;
  quoteTotal: number;
  loadLabel: string;
  energyLabel: string;
  arrayLabel: string;
  batteryLabel: string;
  quoteLabel: string;
};

export type SheetHubSummary = {
  proposals: number;
  synced: number;
  audit: {
    totalLoadW: number;
    totalDailyKWh: number;
    loadLabel: string;
    energyLabel: string;
  };
  design: {
    totalArrayKwp: number;
    totalBatteryKWh: number;
    arrayLabel: string;
    batteryLabel: string;
  };
  quote: {
    pipelineValue: number;
    quoteLabel: string;
  };
  recent: DashboardProposal[];
};

export async function getSheetHubSummary(userId: string): Promise<SheetHubSummary> {
  const audits = await prisma.audit.findMany({
    where: { userId, deletedAt: null },
    include: { rows: true },
    orderBy: { updatedAt: "desc" },
  });

  const recent: DashboardProposal[] = audits.map((a) => {
    const totals = computeTotals(a.rows);
    const live = buildLiveKpiBundle(
      totals.dailyWh,
      totals.diversifiedWatts,
      parseDesignParams(a.designJson),
    );
    const quote = buildQuotation(live.results);
    return {
      id: a.id,
      clientName: a.clientName,
      proposalNo: a.proposalNo,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      sheetSyncedAt: a.sheetSyncedAt?.toISOString() ?? null,
      loadW: totals.totalWatts,
      dailyKWh: totals.dailyKWh,
      arrayKwp: live.kpi.arrayCapacityKwp,
      batteryKWh: live.kpi.batteryStorageKWh,
      quoteTotal: quote.total,
      loadLabel: formatWatts(totals.totalWatts),
      energyLabel: formatKWh(totals.dailyKWh),
      arrayLabel: `${live.kpi.arrayCapacityKwp.toFixed(1)} kWp`,
      batteryLabel: `${live.kpi.batteryStorageKWh % 1 === 0 ? live.kpi.batteryStorageKWh.toFixed(0) : live.kpi.batteryStorageKWh.toFixed(1)} kWh`,
      quoteLabel: formatNaira(quote.total),
    };
  });

  let totalLoadW = 0;
  let totalDailyKWh = 0;
  let totalArrayKwp = 0;
  let totalBatteryKWh = 0;
  let pipelineValue = 0;
  let synced = 0;

  for (const a of audits) {
    if (a.sheetSyncedAt) synced += 1;
    const totals = computeTotals(a.rows);
    const live = buildLiveKpiBundle(
      totals.dailyWh,
      totals.diversifiedWatts,
      parseDesignParams(a.designJson),
    );
    const quote = buildQuotation(live.results);
    totalLoadW += totals.totalWatts;
    totalDailyKWh += totals.dailyKWh;
    totalArrayKwp += live.kpi.arrayCapacityKwp;
    totalBatteryKWh += live.kpi.batteryStorageKWh;
    pipelineValue += quote.total;
  }

  return {
    proposals: audits.length,
    synced,
    audit: {
      totalLoadW,
      totalDailyKWh,
      loadLabel: formatWatts(totalLoadW),
      energyLabel: formatKWh(totalDailyKWh),
    },
    design: {
      totalArrayKwp,
      totalBatteryKWh,
      arrayLabel: `${totalArrayKwp.toFixed(1)} kWp`,
      batteryLabel: `${totalBatteryKWh % 1 === 0 ? totalBatteryKWh.toFixed(0) : totalBatteryKWh.toFixed(1)} kWh`,
    },
    quote: {
      pipelineValue,
      quoteLabel: formatNaira(pipelineValue),
    },
    recent,
  };
}
