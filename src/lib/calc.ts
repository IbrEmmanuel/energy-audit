import { DEMAND_FACTOR } from "./appliances";

/**
 * Energy audit load math (IEEE Std 1562 load analysis):
 *   P_i = qty × unitWatts
 *   E_i = P_i × dailyHours
 *   P_connected = Σ P_i
 *   E_day = Σ E_i
 * Diversified simultaneous demand (practice aligned with IEEE/NEC diversity):
 *   P_div = P_connected × demandFactor
 * Daily energy for PV/battery sizing uses E_day (not DF-reduced).
 */

export type LoadInput = {
  quantity: number;
  unitWatts: number;
  dailyHours: number;
};

export type LoadRowComputed = LoadInput & {
  totalWatts: number;
  dailyWh: number;
  dailyKWh: number;
};

export type LoadTotals = {
  totalWatts: number;
  dailyWh: number;
  dailyKWh: number;
  diversifiedWatts: number;
  diversifiedWh: number;
  diversifiedKWh: number;
  demandFactor: number;
};

export function computeRow(input: LoadInput): LoadRowComputed {
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const unitWatts = Math.max(0, Number(input.unitWatts) || 0);
  const dailyHours = Math.max(0, Math.min(24, Number(input.dailyHours) || 0));
  const totalWatts = quantity * unitWatts;
  const dailyWh = totalWatts * dailyHours;
  const dailyKWh = dailyWh / 1000;
  return { quantity, unitWatts, dailyHours, totalWatts, dailyWh, dailyKWh };
}

export function computeTotals(
  rows: LoadInput[],
  demandFactor = DEMAND_FACTOR,
): LoadTotals {
  const df = Math.max(0.1, Math.min(1, Number(demandFactor) || DEMAND_FACTOR));
  const computed = rows.map(computeRow);
  const totalWatts = computed.reduce((s, r) => s + r.totalWatts, 0);
  const dailyWh = computed.reduce((s, r) => s + r.dailyWh, 0);
  const dailyKWh = dailyWh / 1000;
  return {
    totalWatts,
    dailyWh,
    dailyKWh,
    diversifiedWatts: totalWatts * df,
    diversifiedWh: dailyWh * df,
    diversifiedKWh: (dailyWh * df) / 1000,
    demandFactor: df,
  };
}

export function formatWatts(n: number) {
  return `${Math.round(n).toLocaleString("en-US")} W`;
}

export function formatWh(n: number) {
  return `${Math.round(n).toLocaleString("en-US")} Wh`;
}

export function formatKWh(n: number) {
  return `${n.toFixed(2)} kWh`;
}
