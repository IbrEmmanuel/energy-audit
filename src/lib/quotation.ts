import type { DesignParams, DesignResults } from "./design";
import { DEFAULT_DESIGN } from "./design";

export type QuoteLine = {
  sku: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number; // NGN
};

export type QuotationResult = {
  lines: QuoteLine[];
  subtotal: number;
  installation: number;
  contingency: number;
  total: number;
  currency: "NGN";
  computedAt: string;
  standard: "IEEE-1562/1013";
  panelWatts: number;
  inverterMinWatts: number;
};

/** Live NGN catalog — quantities always follow IEEE design results in real time. */
export const CATALOG_PRICES = {
  panelPerWp: 336, // ~₦185k / 550 Wp
  inverterPerKw: 420000,
  battery100Ah: 950000,
  batteryRack: 85000,
  roofMount: 18000,
  dcCable100m: 95000,
  batteryCable50m: 120000,
  lugKit: 45000,
  surgeProtector: 75000,
  groundingKit: 55000,
  installationPct: 0.12,
  contingencyPct: 0.05,
};

/** @deprecated kept for older UI references — prefer panelPerWp */
export const CATALOG_LEGACY = {
  panel550: 185000,
  inverterHybrid: 1850000,
};

export function buildQuotation(
  design: DesignResults,
  params: DesignParams = DEFAULT_DESIGN,
): QuotationResult {
  const p = { ...DEFAULT_DESIGN, ...params };
  const panelWatts = Math.max(50, p.panelWatts);
  const panelUnitPrice = Math.round(CATALOG_PRICES.panelPerWp * panelWatts);
  const inverterKw = Math.max(3, Math.ceil(design.inverterMinWatts / 1000));
  const inverterUnitPrice = Math.round(CATALOG_PRICES.inverterPerKw * inverterKw);

  const lines: QuoteLine[] = [
    {
      sku: `PV-${panelWatts}`,
      description: `Tier-1 Mono PERC Modules (${design.panelCount} × ${panelWatts} Wp)`,
      unit: "pcs",
      quantity: design.panelCount,
      unitPrice: panelUnitPrice,
    },
    {
      sku: "INV-HYB",
      description: `Hybrid Inverter Dual MPPT ${p.systemVoltage}V (~${inverterKw} kW · IEEE surge class)`,
      unit: "pcs",
      quantity: 1,
      unitPrice: inverterUnitPrice,
    },
    {
      sku: "BAT-LFP",
      description: `LiFePO4 Battery ${p.batteryAh}Ah ${p.systemVoltage}V (${design.batteryUnits} units)`,
      unit: "pcs",
      quantity: design.batteryUnits,
      unitPrice: CATALOG_PRICES.battery100Ah,
    },
    {
      sku: "RACK",
      description: "Battery Rack & Inter-Module Busbar",
      unit: "set",
      quantity: 1,
      unitPrice: CATALOG_PRICES.batteryRack,
    },
    {
      sku: "MOUNT",
      description: "Anodized Roof Mounting Hardware",
      unit: "pcs",
      quantity: design.panelCount,
      unitPrice: CATALOG_PRICES.roofMount,
    },
    {
      sku: "DC-CAB",
      description: "Solar DC Cable (100m drum)",
      unit: "drum",
      quantity: Math.max(1, Math.ceil(design.panelCount / 8)),
      unitPrice: CATALOG_PRICES.dcCable100m,
    },
    {
      sku: "BAT-CAB",
      description: "Battery Cable (50m coil) with Heavy-Duty Lugs",
      unit: "set",
      quantity: 1,
      unitPrice: CATALOG_PRICES.batteryCable50m + CATALOG_PRICES.lugKit,
    },
    {
      sku: "SPD",
      description: "DC/AC Surge Protection & Isolation Kit",
      unit: "set",
      quantity: 1,
      unitPrice: CATALOG_PRICES.surgeProtector,
    },
    {
      sku: "EARTH",
      description: "Earthing & Lightning Bonding Kit",
      unit: "set",
      quantity: 1,
      unitPrice: CATALOG_PRICES.groundingKit,
    },
  ];

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const installation = Math.round(subtotal * CATALOG_PRICES.installationPct);
  const contingency = Math.round(subtotal * CATALOG_PRICES.contingencyPct);
  const total = subtotal + installation + contingency;

  return {
    lines,
    subtotal,
    installation,
    contingency,
    total,
    currency: "NGN",
    computedAt: new Date().toISOString(),
    standard: "IEEE-1562/1013",
    panelWatts,
    inverterMinWatts: design.inverterMinWatts,
  };
}

export function formatNaira(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}
