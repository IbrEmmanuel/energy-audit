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

/** TOPTECH workbook theme — shared across Energy Audit / Design / Quotation. */
export const TOPTECH_THEME = {
  headerBg: { red: 0.086, green: 0.353, blue: 0.447 }, // #165A72
  headerFg: { red: 1, green: 1, blue: 1 },
  totalsBg: { red: 0.051, green: 0.22, blue: 0.282 }, // #0D3848
  formulaBg: { red: 0.93, green: 0.96, blue: 0.97 },
  bandBg: { red: 0.95, green: 0.97, blue: 0.98 },
  accentBg: { red: 0.12, green: 0.42, blue: 0.52 },
  labelBg: { red: 0.9, green: 0.94, blue: 0.96 },
};

/** @deprecated use TOPTECH_THEME */
export const ENERGY_AUDIT_THEME = TOPTECH_THEME;

function sheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

async function getSheetGid(
  sheets: ReturnType<typeof sheetsClient>,
  title: string,
) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: "sheets.properties(sheetId,title)",
  });
  const match = meta.data.sheets?.find((s) => s.properties?.title === title);
  return match?.properties?.sheetId ?? null;
}

/** Apply TOPTECH teal theme + IEEE column formats on Energy Audit tab. */
export async function applyEnergyAuditTheme(accessToken: string) {
  const sheets = sheetsClient(accessToken);
  const sheetId = await getSheetGid(sheets, ENERGY_AUDIT_TAB);
  if (sheetId == null) return { ok: false as const, reason: "tab missing" };

  const t = TOPTECH_THEME;
  const requests: object[] = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    // Header row — TOPTECH teal
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.headerBg,
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
              fontSize: 10,
            },
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
      },
    },
    // Computed IEEE columns E–G soft teal
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: AUDIT_DATA_END,
          startColumnIndex: 4,
          endColumnIndex: 7,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.formulaBg,
          },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    },
    // Totals row
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: AUDIT_TOTAL_ROW - 1,
          endRowIndex: AUDIT_TOTAL_ROW,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.totalsBg,
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
            },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // Qty
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: AUDIT_DATA_END,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "0" } } },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Unit W — numeric with W suffix (TOPTECH look)
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: AUDIT_DATA_END,
          startColumnIndex: 2,
          endColumnIndex: 3,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: '#,##0" W"' },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Hours
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: AUDIT_DATA_END,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: "0.0" },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Connected W
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: AUDIT_TOTAL_ROW,
          startColumnIndex: 4,
          endColumnIndex: 5,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: '#,##0" W"' },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Daily Wh
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: AUDIT_TOTAL_ROW,
          startColumnIndex: 5,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: '#,##0" Wh"' },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Daily kWh
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: AUDIT_TOTAL_ROW,
          startColumnIndex: 6,
          endColumnIndex: 7,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: '0.00" kWh"' },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Column widths A–J
    ...[220, 56, 88, 72, 110, 110, 90, 90, 110, 220].map((pixelSize, i) => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: i,
          endIndex: i + 1,
        },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  return { ok: true as const, sheetId };
}

/**
 * Energy Audit — write inputs + live IEEE load formulas (E/F/G) and totals,
 * then apply TOPTECH sheet theme (full stack values + formatting).
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

  await applyEnergyAuditTheme(accessToken);

  return { spreadsheetId: SHEET_ID, updated: data.length, themed: true };
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

  await applySystemDesignTheme(accessToken);

  return { spreadsheetId: SHEET_ID, updated: data.length, themed: true };
}

/** TOPTECH theme for System Design & Sizing tab. */
export async function applySystemDesignTheme(accessToken: string) {
  const sheets = sheetsClient(accessToken);
  const sheetId = await getSheetGid(sheets, SYSTEM_DESIGN_TAB);
  if (sheetId == null) return { ok: false as const, reason: "tab missing" };

  const t = TOPTECH_THEME;
  const requests: object[] = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    // Title / standard banner
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.headerBg,
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
              fontSize: 11,
            },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // Param labels A2:A16
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 16,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.labelBg,
            textFormat: { bold: true, fontSize: 9 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // Sizing labels A17:A26
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 16,
          endRowIndex: 26,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.headerBg,
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
              fontSize: 9,
            },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // Live formula values B17:B26
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 16,
          endRowIndex: 26,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.formulaBg,
            textFormat: { bold: true },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // KPI cards G4:I5 + G8:I9
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 3,
          endRowIndex: 5,
          startColumnIndex: 6,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.accentBg,
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
            },
            horizontalAlignment: "CENTER",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 7,
          endRowIndex: 9,
          startColumnIndex: 6,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.accentBg,
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
            },
            horizontalAlignment: "CENTER",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    },
    // Status line
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 11,
          endRowIndex: 12,
          startColumnIndex: 6,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.totalsBg,
            textFormat: {
              foregroundColor: t.headerFg,
              italic: true,
              fontSize: 9,
            },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    ...[200, 140, 100, 100, 100, 100, 160, 160, 160].map((pixelSize, i) => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: i,
          endIndex: i + 1,
        },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  return { ok: true as const, sheetId };
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

  await applyQuotationTheme(accessToken);

  return { spreadsheetId: SHEET_ID, lines: layout.lines.length, themed: true };
}

/** TOPTECH theme for Quotation BOM tab. */
export async function applyQuotationTheme(accessToken: string) {
  const sheets = sheetsClient(accessToken);
  const sheetId = await getSheetGid(sheets, QUOTATION_TAB);
  if (sheetId == null) return { ok: false as const, reason: "tab missing" };

  const t = TOPTECH_THEME;
  const requests: object[] = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    // Header
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.headerBg,
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: "CENTER",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
      },
    },
    // Live qty + line total columns
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 11,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        cell: {
          userEnteredFormat: { backgroundColor: t.formulaBg },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 11,
          startColumnIndex: 5,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.formulaBg,
            numberFormat: { type: "NUMBER", pattern: "₦#,##0" },
            textFormat: { bold: true },
          },
        },
        fields: "userEnteredFormat(backgroundColor,numberFormat,textFormat)",
      },
    },
    // Unit price
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 11,
          startColumnIndex: 4,
          endColumnIndex: 5,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: "₦#,##0" },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // Footer totals (rows 12–15 → 0-index 11–14)
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 11,
          endRowIndex: 15,
          startColumnIndex: 0,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.totalsBg,
            textFormat: {
              foregroundColor: t.headerFg,
              bold: true,
            },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 11,
          endRowIndex: 15,
          startColumnIndex: 5,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "NUMBER", pattern: "₦#,##0" },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    // IEEE note row
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 16,
          endRowIndex: 17,
          startColumnIndex: 0,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: t.labelBg,
            textFormat: { italic: true, fontSize: 9 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    ...[90, 320, 56, 72, 110, 120].map((pixelSize, i) => ({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: i,
          endIndex: i + 1,
        },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    })),
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  return { ok: true as const, sheetId };
}

export async function readEnergyAuditQuantities(accessToken: string) {
  const sheets = sheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${ENERGY_AUDIT_TAB}'!A2:D25`,
  });
  return res.data.values ?? [];
}
