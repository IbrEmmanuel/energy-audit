import { google } from "googleapis";
import {
  ENERGY_AUDIT_TAB,
  QUOTATION_TAB,
  SHEET_ID,
  SYSTEM_DESIGN_TAB,
} from "./appliances";
import {
  DESIGN_STANDARD,
  SURGE_FACTOR,
  type DesignParams,
  type DesignResults,
  type DesignKpi,
} from "./design";
import { CATALOG_PRICES, type QuotationResult } from "./quotation";
import {
  AUDIT_DATA_END,
  AUDIT_DATA_START,
  AUDIT_TOTAL_ROW,
  energyAuditRowFormulas,
  energyAuditTotalsAndDiversity,
  quotationIeeeLayout,
  systemDesignIeeeFormulas,
  systemDesignKpiFormulas,
} from "./sheet-formulas";

export type SheetRowWrite = {
  sheetRow: number;
  name?: string;
  quantity: number;
  unitWatts: number;
  dailyHours: number;
};

function sheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

/**
 * Energy Audit — write inputs + live IEEE load formulas (E/F/G) and totals.
 * E = B×C connected W · F = E×D daily Wh · G = F/1000 kWh
 */
export async function syncEnergyAuditToSheet(
  accessToken: string,
  rows: SheetRowWrite[],
  demandFactor = 0.8,
) {
  const sheets = sheetsClient(accessToken);
  const sorted = [...rows]
    .filter((r) => r.sheetRow >= AUDIT_DATA_START && r.sheetRow <= AUDIT_DATA_END)
    .sort((a, b) => a.sheetRow - b.sheetRow);

  const meta = energyAuditTotalsAndDiversity(demandFactor);
  const data: { range: string; values: (string | number)[][] }[] = [
    {
      range: `'${ENERGY_AUDIT_TAB}'!A1:J1`,
      values: [meta.header],
    },
    {
      range: `'${ENERGY_AUDIT_TAB}'!H2`,
      values: [[demandFactor]],
    },
    {
      range: `'${ENERGY_AUDIT_TAB}'!I2`,
      values: [[meta.diversifiedW]],
    },
    {
      range: `'${ENERGY_AUDIT_TAB}'!J2`,
      values: [[meta.note]],
    },
  ];

  for (const r of sorted) {
    const f = energyAuditRowFormulas(r.sheetRow);
    data.push({
      range: `'${ENERGY_AUDIT_TAB}'!A${r.sheetRow}:G${r.sheetRow}`,
      values: [
        [
          r.name ?? "",
          r.quantity,
          r.unitWatts,
          r.dailyHours,
          f.watts,
          f.dailyWh,
          f.dailyKWh,
        ],
      ],
    });
  }

  // Ensure every template row 2–25 has formulas even if qty not in payload
  for (let row = AUDIT_DATA_START; row <= AUDIT_DATA_END; row++) {
    if (sorted.some((r) => r.sheetRow === row)) continue;
    const f = energyAuditRowFormulas(row);
    data.push({
      range: `'${ENERGY_AUDIT_TAB}'!E${row}:G${row}`,
      values: [[f.watts, f.dailyWh, f.dailyKWh]],
    });
  }

  data.push({
    range: `'${ENERGY_AUDIT_TAB}'!A${AUDIT_TOTAL_ROW}:G${AUDIT_TOTAL_ROW}`,
    values: [
      [
        meta.totalsLabel,
        "",
        "",
        "",
        meta.sumWatts,
        meta.sumWh,
        meta.sumKWh,
      ],
    ],
  });
  data.push({
    range: `'${ENERGY_AUDIT_TAB}'!H${AUDIT_TOTAL_ROW}:I${AUDIT_TOTAL_ROW}`,
    values: [["DF→", meta.diversifiedWh]],
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return { spreadsheetId: SHEET_ID, updated: data.length };
}

/**
 * System Design — numeric IEEE params + live formulas for B17:B26 and KPI cards.
 * Results from the app are not pasted; the sheet recalculates from Energy Audit.
 */
export async function syncSystemDesignKpiToSheet(
  accessToken: string,
  payload: {
    params: DesignParams;
    results: DesignResults;
    kpi: DesignKpi;
  },
) {
  const sheets = sheetsClient(accessToken);
  const { params } = payload;
  const sizing = systemDesignIeeeFormulas();
  const cards = systemDesignKpiFormulas();

  const data = [
    {
      range: `'${SYSTEM_DESIGN_TAB}'!A1`,
      values: [[`${DESIGN_STANDARD} — live formulas`]],
    },
    {
      range: `'${SYSTEM_DESIGN_TAB}'!B2`,
      values: [[`${params.systemMode} Solar System`]],
    },
    { range: `'${SYSTEM_DESIGN_TAB}'!B3`, values: [[params.siteType]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B4`, values: [[params.systemVoltage]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B5`, values: [[params.peakSunHours]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B6`, values: [[params.daysAutonomy]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B7`, values: [[params.batteryType]] },
    // Decimal efficiencies so sheet formulas can multiply (not "80%" text)
    { range: `'${SYSTEM_DESIGN_TAB}'!B8`, values: [[params.depthOfDischarge]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B9`, values: [[params.inverterEfficiency]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B10`, values: [[params.chargeEfficiency]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B11`, values: [[params.mpptEfficiency]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B12`, values: [[params.deratingFactor]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B13`, values: [[params.panelWatts]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B14`, values: [[params.batteryAh]] },
    {
      range: `'${SYSTEM_DESIGN_TAB}'!B15`,
      values: [[params.batteryTempFactor ?? 1]],
    },
    { range: `'${SYSTEM_DESIGN_TAB}'!B16`, values: [[SURGE_FACTOR]] },

    // Live IEEE sizing block
    {
      range: `'${SYSTEM_DESIGN_TAB}'!B17:B26`,
      values: [
        [sizing.dailyWh],
        [sizing.energyDc],
        [sizing.grossBatteryWh],
        [sizing.requiredAh],
        [sizing.batteryUnits],
        [sizing.storageKWh],
        [sizing.inverterKw],
        [sizing.inverterSurgeKva],
        [sizing.arrayWp],
        [sizing.panelCount],
      ],
    },

    // Labels for param / formula clarity
    {
      range: `'${SYSTEM_DESIGN_TAB}'!A15:A16`,
      values: [["Battery temp factor f_t"], ["Surge factor"]],
    },
    {
      range: `'${SYSTEM_DESIGN_TAB}'!A17:A26`,
      values: [
        ["Daily energy E_load (Wh)"],
        ["DC energy E_dc = E/η_inv"],
        ["Battery Wh (IEEE 1013/1562)"],
        ["Required Ah"],
        ["Battery modules"],
        ["Installed storage kWh"],
        ["Inverter continuous kW"],
        ["Inverter surge kVA"],
        ["Array Wp required"],
        ["Panel count"],
      ],
    },

    {
      range: `'${SYSTEM_DESIGN_TAB}'!G4:I5`,
      values: [
        [cards.dailyEnergy, cards.inverter, cards.array],
        [cards.dailyEnergyDetail, cards.inverterDetail, cards.arrayDetail],
      ],
    },
    {
      range: `'${SYSTEM_DESIGN_TAB}'!G8:I9`,
      values: [
        [cards.batteryStorage, cards.batteryBank, cards.generation],
        [
          cards.batteryStorageDetail,
          cards.batteryBankDetail,
          cards.generationDetail,
        ],
      ],
    },
    { range: `'${SYSTEM_DESIGN_TAB}'!G12`, values: [[cards.status]] },
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });

  return { spreadsheetId: SHEET_ID, updated: data.length };
}

/**
 * Quotation — unit prices as values; qty + line totals + footer as live formulas
 * tied to System Design IEEE sizing cells.
 */
export async function syncQuotationToSheet(
  accessToken: string,
  quote: QuotationResult,
  params?: { panelWatts?: number; systemVoltage?: number; batteryAh?: number },
) {
  const sheets = sheetsClient(accessToken);
  const panelWatts = params?.panelWatts ?? quote.panelWatts ?? 550;
  const systemVoltage = params?.systemVoltage ?? 48;
  const batteryAh = params?.batteryAh ?? 100;
  const inverterKw = Math.max(3, Math.ceil((quote.inverterMinWatts || 3000) / 1000));

  const layout = quotationIeeeLayout({
    panelUnitPrice: Math.round(CATALOG_PRICES.panelPerWp * panelWatts),
    inverterUnitPrice: Math.round(CATALOG_PRICES.inverterPerKw * inverterKw),
    batteryUnitPrice: CATALOG_PRICES.battery100Ah,
    batteryRack: CATALOG_PRICES.batteryRack,
    roofMount: CATALOG_PRICES.roofMount,
    dcCable: CATALOG_PRICES.dcCable100m,
    batteryCableSet: CATALOG_PRICES.batteryCable50m + CATALOG_PRICES.lugKit,
    surgeKit: CATALOG_PRICES.surgeProtector,
    earthKit: CATALOG_PRICES.groundingKit,
    installationPct: CATALOG_PRICES.installationPct,
    contingencyPct: CATALOG_PRICES.contingencyPct,
    panelWatts,
    systemVoltage,
    batteryAh,
    computedAt: quote.computedAt,
  });

  const values = [layout.header, ...layout.lines, ...layout.footer];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `'${QUOTATION_TAB}'!A1:F40`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${QUOTATION_TAB}'!A1:F${values.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return { spreadsheetId: SHEET_ID, lines: layout.lines.length };
}

export async function readEnergyAuditQuantities(accessToken: string) {
  const sheets = sheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${ENERGY_AUDIT_TAB}'!A2:D25`,
  });
  return res.data.values ?? [];
}
