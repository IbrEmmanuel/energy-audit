/** System Design & Sizing — matches E-tech sheet math (verified against live values). */

export type DesignParams = {
  systemMode: string;
  siteType: string;
  systemVoltage: number;
  peakSunHours: number;
  daysAutonomy: number;
  batteryType: string;
  depthOfDischarge: number; // 0.8
  inverterEfficiency: number; // 0.93
  chargeEfficiency: number; // 0.95
  mpptEfficiency: number; // 0.98
  deratingFactor: number; // 0.8
  panelWatts: number; // 550
  batteryAh: number; // 100
};

export type DesignResults = {
  dailyWh: number;
  energyWithInverterLossWh: number;
  grossBatteryWh: number;
  requiredBatteryAh: number;
  batteryUnits: number;
  requiredArrayWatts: number;
  panelCount: number;
  inverterMinWatts: number;
  diversifiedLoadW: number;
};

/** SYSTEM PERFORMANCE & DESIGN KPI SUMMARY — sheet card values */
export type DesignKpi = {
  dailyEnergyKWh: number;
  totalLoadW: number;
  inverterContinuousKw: number;
  inverterSurgeKva: number;
  surgeFactor: number;
  arrayCapacityKwp: number;
  panelCount: number;
  panelWatts: number;
  batteryStorageKWh: number;
  storageRatingAh: number;
  batteryModules: number;
  systemVoltage: number;
  batteryAh: number;
  chemistryLabel: string;
  depthOfDischarge: number;
  estimatedGenerationKWh: number;
  solarYieldPct: number;
};

export const DEFAULT_DESIGN: DesignParams = {
  systemMode: "Hybrid",
  siteType: "Commercial",
  systemVoltage: 48,
  peakSunHours: 4.8,
  daysAutonomy: 1,
  batteryType: "Lithium LiFePO4",
  depthOfDischarge: 0.8,
  inverterEfficiency: 0.93,
  chargeEfficiency: 0.95,
  mpptEfficiency: 0.98,
  deratingFactor: 0.8,
  panelWatts: 550,
  batteryAh: 100,
};

export const SURGE_FACTOR = 1.25;

export function computeDesign(
  dailyWh: number,
  diversifiedLoadW: number,
  params: DesignParams = DEFAULT_DESIGN,
): DesignResults {
  const energyWithInverterLossWh = dailyWh / params.inverterEfficiency;
  const grossBatteryWh =
    (energyWithInverterLossWh * params.daysAutonomy) /
    (params.depthOfDischarge * params.chargeEfficiency);
  const requiredBatteryAh = grossBatteryWh / params.systemVoltage;
  const batteryUnits = Math.max(1, Math.ceil(requiredBatteryAh / params.batteryAh));

  // Array sizing: E_inv / (PSH × η_cc × derate × η_bat) → 4,332 Wp / 8×550 for 14.4 kWh
  const requiredArrayWatts =
    energyWithInverterLossWh /
    (params.peakSunHours *
      params.mpptEfficiency *
      params.deratingFactor *
      params.chargeEfficiency);
  const panelCount = Math.max(1, Math.ceil(requiredArrayWatts / params.panelWatts));

  // Inverter sized to diversified simultaneous load with margin
  const inverterMinWatts = Math.ceil(diversifiedLoadW * SURGE_FACTOR);

  return {
    dailyWh,
    energyWithInverterLossWh,
    grossBatteryWh,
    requiredBatteryAh,
    batteryUnits,
    requiredArrayWatts,
    panelCount,
    inverterMinWatts,
    diversifiedLoadW,
  };
}

/**
 * KPI cards from System Design & Sizing sheet.
 * Example (14.4 kWh / 1.2 kW load): 1.5 kVA·1.2 kW, 4.4 kWp, 24 kWh bank, ~14.6 kWh/day yield.
 */
export function computeDesignKpi(
  results: DesignResults,
  params: DesignParams = DEFAULT_DESIGN,
): DesignKpi {
  const dailyEnergyKWh = results.dailyWh / 1000;
  const totalLoadW = results.diversifiedLoadW;
  const inverterContinuousKw = totalLoadW / 1000;
  const inverterSurgeKva = (totalLoadW * SURGE_FACTOR) / 1000;

  const installedArrayWatts = results.panelCount * params.panelWatts;
  const arrayCapacityKwp = installedArrayWatts / 1000;

  const batteryStorageKWh =
    (results.batteryUnits * params.systemVoltage * params.batteryAh) / 1000;

  // Sheet performance ratio ≈ derate × MPPT × charge × inverter (≈0.694 → ~101.6% yield)
  const performanceRatio =
    params.deratingFactor *
    params.mpptEfficiency *
    params.chargeEfficiency *
    params.inverterEfficiency;
  const estimatedGenerationKWh =
    (installedArrayWatts * params.peakSunHours * performanceRatio) / 1000;
  const solarYieldPct =
    dailyEnergyKWh > 0 ? (estimatedGenerationKWh / dailyEnergyKWh) * 100 : 0;

  const chemistryLabel = params.batteryType.includes("LiFePO4")
    ? "LiFePO4"
    : params.batteryType;

  return {
    dailyEnergyKWh,
    totalLoadW,
    inverterContinuousKw,
    inverterSurgeKva,
    surgeFactor: SURGE_FACTOR,
    arrayCapacityKwp,
    panelCount: results.panelCount,
    panelWatts: params.panelWatts,
    batteryStorageKWh,
    storageRatingAh: results.requiredBatteryAh,
    batteryModules: results.batteryUnits,
    systemVoltage: params.systemVoltage,
    batteryAh: params.batteryAh,
    chemistryLabel,
    depthOfDischarge: params.depthOfDischarge,
    estimatedGenerationKWh,
    solarYieldPct,
  };
}

export function formatKpiKWh(n: number, digits = 2) {
  return `${n.toFixed(digits)} kWh`;
}

export function formatKpiKwp(n: number) {
  return `${n.toFixed(1)} kWp`;
}

export type LiveKpiBundle = {
  params: DesignParams;
  results: DesignResults;
  kpi: DesignKpi;
  computedAt: string;
};

/** Server + client single source for live System Design KPIs. */
export function buildLiveKpiBundle(
  dailyWh: number,
  diversifiedLoadW: number,
  params: DesignParams = DEFAULT_DESIGN,
): LiveKpiBundle {
  const merged = { ...DEFAULT_DESIGN, ...params };
  const results = computeDesign(dailyWh, diversifiedLoadW, merged);
  const kpi = computeDesignKpi(results, merged);
  return {
    params: merged,
    results,
    kpi,
    computedAt: new Date().toISOString(),
  };
}

export function parseDesignParams(json: string | null | undefined): DesignParams {
  if (!json) return DEFAULT_DESIGN;
  try {
    return { ...DEFAULT_DESIGN, ...JSON.parse(json) };
  } catch {
    return DEFAULT_DESIGN;
  }
}

/** Display strings written to System Design KPI cards (G/H/I). */
export function formatKpiSheetValues(kpi: DesignKpi) {
  const storage =
    kpi.batteryStorageKWh % 1 === 0
      ? `${kpi.batteryStorageKWh.toFixed(0)} kWh`
      : `${kpi.batteryStorageKWh.toFixed(1)} kWh`;
  return {
    dailyEnergy: formatKpiKWh(kpi.dailyEnergyKWh),
    dailyEnergyDetail: `Total Load: ${Math.round(kpi.totalLoadW).toLocaleString("en-US")} W`,
    inverter: `${kpi.inverterSurgeKva.toFixed(1)} kVA / ${kpi.inverterContinuousKw.toFixed(1)} kW`,
    inverterDetail: `Surge Factor: ${kpi.surgeFactor} | Pure Sine`,
    array: formatKpiKwp(kpi.arrayCapacityKwp),
    arrayDetail: `${kpi.panelCount} × ${kpi.panelWatts}Wp Tier-1 Modules`,
    batteryStorage: storage,
    batteryStorageDetail: `Storage Rating: ${Math.round(kpi.storageRatingAh)} Ah`,
    batteryBank: `${kpi.batteryModules} Modules (${kpi.systemVoltage}V ${kpi.batteryAh}Ah)`,
    batteryBankDetail: `Chemistry: ${kpi.chemistryLabel} (${Math.round(kpi.depthOfDischarge * 100)}% DoD)`,
    generation: `${kpi.estimatedGenerationKWh.toFixed(1)} kWh/day`,
    generationDetail: `Solar Yield: ${kpi.solarYieldPct.toFixed(1)}% of Daily Demand`,
  };
}
