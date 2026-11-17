import { google } from "googleapis";
import {
  ENERGY_AUDIT_TAB,
  QUOTATION_TAB,
  SHEET_ID,
  SYSTEM_DESIGN_TAB,
} from "./appliances";
import {
  DESIGN_STANDARD,
  formatKpiSheetValues,
  type DesignParams,
  type DesignResults,
  type DesignKpi,
} from "./design";
import { formatNaira, type QuotationResult } from "./quotation";

export type SheetRowWrite = {
  sheetRow: number;
  quantity: number;
  unitWatts: number;
  dailyHours: number;
};

function sheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

/** Writes only B/C/D — leaves E/F/G formulas intact (verified live: E = B*C). */
export async function syncEnergyAuditToSheet(
  accessToken: string,
  rows: SheetRowWrite[],
) {
  const sheets = sheetsClient(accessToken);
  const sorted = [...rows].sort((a, b) => a.sheetRow - b.sheetRow);
  const data = sorted.map((r) => ({
    range: `'${ENERGY_AUDIT_TAB}'!B${r.sheetRow}:D${r.sheetRow}`,
    values: [[r.quantity, r.unitWatts, r.dailyHours]],
  }));

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
 * Live System Design sync — params (B2:B14), calculated sizing (B17:B26),
 * and KPI cards (G4:I5, G8:I9, G12) matching the live workbook layout.
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
  const { params, results, kpi } = payload;
  const cards = formatKpiSheetValues(kpi);

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const wh = (n: number) => `${Math.round(n).toLocaleString("en-US")} Wh`;
  const ah = (n: number) => `${Math.round(n)} Ah`;
  const kw = (n: number) => `${n.toFixed(1)} kW`;
  const kva = (n: number) => `${n.toFixed(1)} kVA`;
  const kwh = (n: number) =>
    `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} kWh`;
  const wp = (n: number) => `${Math.round(n).toLocaleString("en-US")} Wp`;

  const status = `Architecture: ${params.systemMode} | Bus: ${params.systemVoltage}V DC | PSH: ${params.peakSunHours} | ${DESIGN_STANDARD} | Live verified`;

  const data = [
    // Design parameters (Engineering Value column)
    {
      range: `'${SYSTEM_DESIGN_TAB}'!B2`,
      values: [[`${params.systemMode} Solar System`]],
    },
    { range: `'${SYSTEM_DESIGN_TAB}'!B3`, values: [[params.siteType]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B4`, values: [[params.systemVoltage]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B5`, values: [[params.peakSunHours]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B6`, values: [[params.daysAutonomy]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B7`, values: [[params.batteryType]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B8`, values: [[pct(params.depthOfDischarge)]] },
    {
      range: `'${SYSTEM_DESIGN_TAB}'!B9`,
      values: [[pct(params.inverterEfficiency)]],
    },
    {
      range: `'${SYSTEM_DESIGN_TAB}'!B10`,
      values: [[pct(params.chargeEfficiency)]],
    },
    { range: `'${SYSTEM_DESIGN_TAB}'!B11`, values: [[pct(params.mpptEfficiency)]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B12`, values: [[pct(params.deratingFactor)]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B13`, values: [[params.panelWatts]] },
    { range: `'${SYSTEM_DESIGN_TAB}'!B14`, values: [[params.batteryAh]] },

    // Component sizing — live calculated values
    {
      range: `'${SYSTEM_DESIGN_TAB}'!B17:B26`,
      values: [
        [wh(results.dailyWh)],
        [wh(results.energyWithInverterLossWh)],
        [wh(results.grossBatteryWh)],
        [ah(results.requiredBatteryAh)],
        [`${results.batteryUnits} Units`],
        [kwh(kpi.batteryStorageKWh)],
        [kw(kpi.inverterContinuousKw)],
        [kva(kpi.inverterSurgeKva)],
        [wp(results.requiredArrayWatts)],
        [`${results.panelCount} Panels`],
      ],
    },

    // KPI cards — top row values + details
    {
      range: `'${SYSTEM_DESIGN_TAB}'!G4:I5`,
      values: [
        [cards.dailyEnergy, cards.inverter, cards.array],
        [cards.dailyEnergyDetail, cards.inverterDetail, cards.arrayDetail],
      ],
    },
    // KPI cards — battery / generation
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
    // Operational status line
    { range: `'${SYSTEM_DESIGN_TAB}'!G12`, values: [[status]] },
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

/** Live quotation BOM → Quotation tab (realtime IEEE design quantities). */
export async function syncQuotationToSheet(
  accessToken: string,
  quote: QuotationResult,
) {
  const sheets = sheetsClient(accessToken);
  const header = [
    ["SKU", "Description", "Unit", "Qty", "Unit Price (NGN)", "Line Total (NGN)"],
  ];
  const body = quote.lines.map((l) => [
    l.sku,
    l.description,
    l.unit,
    l.quantity,
    l.unitPrice,
    l.quantity * l.unitPrice,
  ]);
  const footer = [
    [],
    ["", "Subtotal", "", "", "", quote.subtotal],
    ["", "Installation", "", "", "", quote.installation],
    ["", "Contingency", "", "", "", quote.contingency],
    ["", "TOTAL", "", "", "", quote.total],
    [],
    [
      "",
      `Realtime IEEE quotation · ${quote.standard} · ${quote.computedAt}`,
      "",
      "",
      "",
      formatNaira(quote.total),
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${QUOTATION_TAB}'!A1:F${header.length + body.length + footer.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [...header, ...body, ...footer] },
  });

  return { spreadsheetId: SHEET_ID, lines: quote.lines.length };
}

export async function readEnergyAuditQuantities(accessToken: string) {
  const sheets = sheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${ENERGY_AUDIT_TAB}'!A2:D25`,
  });
  return res.data.values ?? [];
}
