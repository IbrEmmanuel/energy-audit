/**
 * Live Google Sheet formulas — IEEE Std 1562 / IEEE Std 1013.
 * Inputs are values; sizing cells are formulas so the workbook recalculates
 * in realtime when audit loads or design params change.
 */
import {
  ENERGY_AUDIT_TAB,
  QUOTATION_TAB,
  SYSTEM_DESIGN_TAB,
} from "./appliances";
import { DESIGN_STANDARD, SURGE_FACTOR } from "./design";

export const EA = `'${ENERGY_AUDIT_TAB}'`;
export const SD = `'${SYSTEM_DESIGN_TAB}'`;
export const QT = `'${QUOTATION_TAB}'`;

export const AUDIT_DATA_START = 2;
export const AUDIT_DATA_END = 25;
export const AUDIT_TOTAL_ROW = 27;

/** Per-appliance IEEE load formulas: P = qty×W, E = P×h */
export function energyAuditRowFormulas(row: number) {
  return {
    watts: `=IF(OR(B${row}="",C${row}=""),"",B${row}*C${row})`,
    dailyWh: `=IF(OR(E${row}="",D${row}=""),"",E${row}*D${row})`,
    dailyKWh: `=IF(F${row}="","",F${row}/1000)`,
  };
}

export function energyAuditTotalsAndDiversity(demandFactor: number) {
  const r = AUDIT_TOTAL_ROW;
  return {
    header: [
      "Appliance / Load",
      "Qty",
      "Unit W",
      "Hours/day",
      "Connected W (=B×C)",
      "Daily Wh (=E×D)",
      "Daily kWh",
      "Demand factor",
      "Diversified W",
      "Standard",
    ],
    totalsLabel: "IEEE LOAD TOTALS",
    sumWatts: `=SUM(E${AUDIT_DATA_START}:E${AUDIT_DATA_END})`,
    sumWh: `=SUM(F${AUDIT_DATA_START}:F${AUDIT_DATA_END})`,
    sumKWh: `=SUM(G${AUDIT_DATA_START}:G${AUDIT_DATA_END})`,
    demandFactor,
    diversifiedW: `=E${r}*H2`,
    diversifiedWh: `=F${r}*H2`,
    note: `${DESIGN_STANDARD} · E_day=Σ(P×t) · P_div=P_conn×DF`,
  };
}

/**
 * System Design B17:B26 — live IEEE sizing from Energy Audit totals + params.
 * Param map (numeric):
 *  B4 Vsys, B5 PSH, B6 days, B8 DoD, B9 η_inv, B10 η_chg,
 *  B11 η_mppt, B12 derate, B13 panel Wp, B14 battery Ah,
 *  B15 f_temp, B16 surge
 */
export function systemDesignIeeeFormulas() {
  return {
    // B17 daily Wh from audit (IEEE load energy — not DF-reduced)
    dailyWh: `=${EA}!F${AUDIT_TOTAL_ROW}`,
    // B18 E_dc = E_load / η_inv
    energyDc: `=IF(OR(B17="",B9=""),"",B17/B9)`,
    // B19 battery Wh = E_dc × days / (DoD × η_chg × f_temp)
    grossBatteryWh: `=IF(B18="","",B18*B6/(B8*B10*IF(B15="",1,B15)))`,
    // B20 Ah = Wh / V
    requiredAh: `=IF(OR(B19="",B4=""),"",B19/B4)`,
    // B21 modules
    batteryUnits: `=IF(OR(B20="",B14=""),"",MAX(1,CEILING(B20/B14,1)))`,
    // B22 installed storage kWh
    storageKWh: `=IF(B21="","",B21*B4*B14/1000)`,
    // B23 inverter continuous kW from diversified load
    inverterKw: `=IF(${EA}!I2="","",${EA}!I2/1000)`,
    // B24 surge kVA (pf≈1)
    inverterSurgeKva: `=IF(B23="","",B23*IF(B16="",${SURGE_FACTOR},B16))`,
    // B25 array Wp = E_dc / (PSH × η_mppt × derate × η_chg)
    arrayWp: `=IF(B18="","",B18/(B5*B11*B12*B10))`,
    // B26 panel count
    panelCount: `=IF(OR(B25="",B13=""),"",MAX(1,CEILING(B25/B13,1)))`,
  };
}

export function systemDesignKpiFormulas() {
  const f = systemDesignIeeeFormulas();
  return {
    // G4:I4 values
    dailyEnergy: `=IF(B17="","",TEXT(B17/1000,"0.00")&" kWh")`,
    inverter: `=IF(B24="","",TEXT(B24,"0.0")&" kVA / "&TEXT(B23,"0.0")&" kW")`,
    array: `=IF(B26="","",TEXT(B26*B13/1000,"0.0")&" kWp")`,
    // G5:I5 details
    dailyEnergyDetail: `=IF(B23="","","Total Load: "&TEXT(${EA}!I2,"0")&" W")`,
    inverterDetail: `="Surge ×"&IF(B16="",${SURGE_FACTOR},B16)&" | IEEE continuous+overload"`,
    arrayDetail: `=IF(B26="","",B26&" × "&B13&"Wp | ${DESIGN_STANDARD}")`,
    // G8:I8
    batteryStorage: `=IF(B22="","",IF(B22=INT(B22),TEXT(B22,"0")&" kWh",TEXT(B22,"0.0")&" kWh"))`,
    batteryBank: `=IF(B21="","",B21&" Modules ("&B4&"V "&B14&"Ah)")`,
    generation: `=IF(OR(B26="",B13="",B5=""),"",TEXT(B26*B13*B5*B12*B11*B10*B9/1000,"0.0")&" kWh/day")`,
    // G9:I9
    batteryStorageDetail: `=IF(B20="","","Storage Rating: "&TEXT(B20,"0")&" Ah")`,
    batteryBankDetail: `="Chemistry: "&B7&" ("&TEXT(B8*100,"0")&"% DoD)"`,
    generationDetail: `=IF(OR(B17="",B26=""),"","Solar Yield: "&TEXT((B26*B13*B5*B12*B11*B10*B9)/B17*100,"0.0")&"% of Daily Demand")`,
    status: `="Architecture: "&B2&" | Bus: "&B4&"V DC | PSH: "&B5&" | ${DESIGN_STANDARD} | Live sheet formulas"`,
    // keep formula map referenced so tree-shaking doesn't drop unused in future
    _ref: f.dailyWh,
  };
}

/** Quotation BOM — qty & line totals as live formulas from System Design. */
export function quotationIeeeLayout(opts: {
  panelUnitPrice: number;
  inverterUnitPrice: number;
  batteryUnitPrice: number;
  batteryRack: number;
  roofMount: number;
  dcCable: number;
  batteryCableSet: number;
  surgeKit: number;
  earthKit: number;
  installationPct: number;
  contingencyPct: number;
  panelWatts: number;
  systemVoltage: number;
  batteryAh: number;
  computedAt: string;
}) {
  const o = opts;
  // Rows 2–10 line items; cols A–F
  const lines = [
    [
      `PV-${o.panelWatts}`,
      `Tier-1 Mono PERC Modules (live × ${o.panelWatts} Wp)`,
      "pcs",
      `=${SD}!B26`,
      o.panelUnitPrice,
      "=D2*E2",
    ],
    [
      "INV-HYB",
      `Hybrid Inverter Dual MPPT ${o.systemVoltage}V (IEEE surge class)`,
      "pcs",
      1,
      o.inverterUnitPrice,
      "=D3*E3",
    ],
    [
      "BAT-LFP",
      `LiFePO4 Battery ${o.batteryAh}Ah ${o.systemVoltage}V`,
      "pcs",
      `=${SD}!B21`,
      o.batteryUnitPrice,
      "=D4*E4",
    ],
    ["RACK", "Battery Rack & Inter-Module Busbar", "set", 1, o.batteryRack, "=D5*E5"],
    [
      "MOUNT",
      "Anodized Roof Mounting Hardware",
      "pcs",
      `=${SD}!B26`,
      o.roofMount,
      "=D6*E6",
    ],
    [
      "DC-CAB",
      "Solar DC Cable (100m drum)",
      "drum",
      `=MAX(1,CEILING(${SD}!B26/8,1))`,
      o.dcCable,
      "=D7*E7",
    ],
    [
      "BAT-CAB",
      "Battery Cable (50m coil) with Heavy-Duty Lugs",
      "set",
      1,
      o.batteryCableSet,
      "=D8*E8",
    ],
    ["SPD", "DC/AC Surge Protection & Isolation Kit", "set", 1, o.surgeKit, "=D9*E9"],
    ["EARTH", "Earthing & Lightning Bonding Kit", "set", 1, o.earthKit, "=D10*E10"],
  ];

  const footer = [
    [],
    ["", "Subtotal", "", "", "", "=SUM(F2:F10)"],
    ["", "Installation", "", "", "", `=F12*${o.installationPct}`],
    ["", "Contingency", "", "", "", `=F12*${o.contingencyPct}`],
    ["", "TOTAL", "", "", "", "=F12+F13+F14"],
    [],
    [
      "",
      `Realtime IEEE quotation · ${DESIGN_STANDARD} · ${o.computedAt}`,
      "",
      "",
      "",
      '=TEXT(F15,"₦#,##0")',
    ],
  ];

  return {
    header: [
      "SKU",
      "Description",
      "Unit",
      "Qty (live)",
      "Unit Price (NGN)",
      "Line Total (NGN)",
    ],
    lines,
    footer,
  };
}
