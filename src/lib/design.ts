/**
 * Stand-alone / hybrid PV sizing per IEEE Std 1562 (array & battery sizing)
 * and IEEE Std 1013 (battery capacity practice), with inverter surge margin
 * aligned to common IEEE/IEC continuous + short-time overload practice.
 *
 * Energy path (IEEE 1562):
 *   E_load (Wh/day) from audit Σ(P × qty × hours)
 *   E_dc   = E_load / η_inv
 *   C_Wh   = (E_dc × N_days) / (DoD × η_chg × f_temp)
 *   C_Ah   = C_Wh / V_sys
 *   P_array = E_dc / (PSH × η_mppt × f_derate × η_chg)
 * Inverter continuous rating uses diversified simultaneous load (demand factor).
 */

export type DesignParams = {
  systemMode: string;
  siteType: string;
  systemVoltage: number;
  peakSunHours: number;
  daysAutonomy: number;
  batteryType: string;
  depthOfDischarge: number; // IEEE usable fraction of nameplate
  inverterEfficiency: number;
  chargeEfficiency: number;
  mpptEfficiency: number;
  deratingFactor: number; // soiling, mismatch, wiring, aging (IEEE array derate)
  panelWatts: number;
  batteryAh: number;
  /** IEEE 1013-style temperature correction (1.0 typical for LiFePO4 @ ~25°C). */
  batteryTempFactor: number;
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
  standard: "IEEE-1562/1013";
};

/** SYSTEM PERFORMANCE & DESIGN KPI SUMMARY */
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
  standardLabel: string;
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
  batteryTempFactor: 1.0,
};

/** Continuous → short-time overload margin for inverter selection. */
export const SURGE_FACTOR = 1.25;

export const DESIGN_STANDARD = "IEEE Std 1562 / IEEE Std 1013";

export function computeDesign(
  dailyWh: number,
  diversifiedLoadW: number,
  params: DesignParams = DEFAULT_DESIGN,
): DesignResults {
  const p = { ...DEFAULT_DESIGN, ...params };
  const etaInv = Math.max(0.5, Math.min(1, p.inverterEfficiency));
  const etaChg = Math.max(0.5, Math.min(1, p.chargeEfficiency));
  const etaMppt = Math.max(0.5, Math.min(1, p.mpptEfficiency));
  const dod = Math.max(0.1, Math.min(1, p.depthOfDischarge));
  const derate = Math.max(0.4, Math.min(1, p.deratingFactor));
  const fTemp = Math.max(0.7, Math.min(1.3, p.batteryTempFactor || 1));
  const psh = Math.max(0.5, p.peakSunHours);
  const days = Math.max(0.25, p.daysAutonomy);
  const vSys = Math.max(12, p.systemVoltage);
  const batAh = Math.max(1, p.batteryAh);
  const panelW = Math.max(50, p.panelWatts);

  // IEEE 1562: refer AC daily energy to DC bus through inverter efficiency
  const energyWithInverterLossWh = dailyWh / etaInv;

  // IEEE 1013 / 1562 battery Wh then Ah at system bus voltage
  const grossBatteryWh =
    (energyWithInverterLossWh * days) / (dod * etaChg * fTemp);
  const requiredBatteryAh = grossBatteryWh / vSys;
  const batteryUnits = Math.max(1, Math.ceil(requiredBatteryAh / batAh));

  // IEEE 1562 array: daily DC energy / (PSH × charge-controller & array derates)
  const requiredArrayWatts =
    energyWithInverterLossWh / (psh * etaMppt * derate * etaChg);
  const panelCount = Math.max(1, Math.ceil(requiredArrayWatts / panelW));

  // Inverter continuous from diversified simultaneous load + surge class
  const inverterMinWatts = Math.ceil(Math.max(0, diversifiedLoadW) * SURGE_FACTOR);

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
    standard: "IEEE-1562/1013",
  };
}

export function computeDesignKpi(
  results: DesignResults,
  params: DesignParams = DEFAULT_DESIGN,
): DesignKpi {
  const p = { ...DEFAULT_DESIGN, ...params };
  const dailyEnergyKWh = results.dailyWh / 1000;
  const totalLoadW = results.diversifiedLoadW;
  const inverterContinuousKw = totalLoadW / 1000;
  const inverterSurgeKva = (totalLoadW * SURGE_FACTOR) / 1000;

  const installedArrayWatts = results.panelCount * p.panelWatts;
  const arrayCapacityKwp = installedArrayWatts / 1000;

  const batteryStorageKWh =
    (results.batteryUnits * p.systemVoltage * p.batteryAh) / 1000;

  // Estimated AC generation with IEEE-style performance ratio chain
  const performanceRatio =
    p.deratingFactor * p.mpptEfficiency * p.chargeEfficiency * p.inverterEfficiency;
  const estimatedGenerationKWh =
    (installedArrayWatts * p.peakSunHours * performanceRatio) / 1000;
  const solarYieldPct =
    dailyEnergyKWh > 0 ? (estimatedGenerationKWh / dailyEnergyKWh) * 100 : 0;

  const chemistryLabel = p.batteryType.includes("LiFePO4")
    ? "LiFePO4"
    : p.batteryType;

  return {
    dailyEnergyKWh,
    totalLoadW,
    inverterContinuousKw,
    inverterSurgeKva,
    surgeFactor: SURGE_FACTOR,
    arrayCapacityKwp,
    panelCount: results.panelCount,
    panelWatts: p.panelWatts,
    batteryStorageKWh,
    storageRatingAh: results.requiredBatteryAh,
    batteryModules: results.batteryUnits,
    systemVoltage: p.systemVoltage,
    batteryAh: p.batteryAh,
    chemistryLabel,
    depthOfDischarge: p.depthOfDischarge,
    estimatedGenerationKWh,
    solarYieldPct,
    standardLabel: DESIGN_STANDARD,
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

/** Server + client single source for live System Design KPIs (IEEE). */
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
  if (!json) return { ...DEFAULT_DESIGN };
  try {
    return { ...DEFAULT_DESIGN, ...JSON.parse(json) };
  } catch {
    return { ...DEFAULT_DESIGN };
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
    inverterDetail: `Surge ×${kpi.surgeFactor} | IEEE continuous+overload`,
    array: formatKpiKwp(kpi.arrayCapacityKwp),
    arrayDetail: `${kpi.panelCount} × ${kpi.panelWatts}Wp | ${kpi.standardLabel}`,
    batteryStorage: storage,
    batteryStorageDetail: `Storage Rating: ${Math.round(kpi.storageRatingAh)} Ah`,
    batteryBank: `${kpi.batteryModules} Modules (${kpi.systemVoltage}V ${kpi.batteryAh}Ah)`,
    batteryBankDetail: `Chemistry: ${kpi.chemistryLabel} (${Math.round(kpi.depthOfDischarge * 100)}% DoD)`,
    generation: `${kpi.estimatedGenerationKWh.toFixed(1)} kWh/day`,
    generationDetail: `Solar Yield: ${kpi.solarYieldPct.toFixed(1)}% of Daily Demand`,
  };
}
