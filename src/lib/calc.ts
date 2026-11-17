import { DEMAND_FACTOR } from "./appliances";

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
};

export function computeRow(input: LoadInput): LoadRowComputed {
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const unitWatts = Math.max(0, Number(input.unitWatts) || 0);
  const dailyHours = Math.max(0, Number(input.dailyHours) || 0);
  const totalWatts = quantity * unitWatts;
  const dailyWh = totalWatts * dailyHours;
  const dailyKWh = dailyWh / 1000;
  return { quantity, unitWatts, dailyHours, totalWatts, dailyWh, dailyKWh };
}

export function computeTotals(
  rows: LoadInput[],
  demandFactor = DEMAND_FACTOR,
): LoadTotals {
  const computed = rows.map(computeRow);
  const totalWatts = computed.reduce((s, r) => s + r.totalWatts, 0);
  const dailyWh = computed.reduce((s, r) => s + r.dailyWh, 0);
  const dailyKWh = dailyWh / 1000;
  return {
    totalWatts,
    dailyWh,
    dailyKWh,
    diversifiedWatts: totalWatts * demandFactor,
    diversifiedWh: dailyWh * demandFactor,
    diversifiedKWh: (dailyWh * demandFactor) / 1000,
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
