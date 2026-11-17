export type ApplianceDefault = {
  sheetRow: number;
  name: string;
  unitWatts: number;
  defaultHours: number;
};

/** Mapped 1:1 from live E-tech Energy Audit rows 2–25 */
export const APPLIANCE_DEFAULTS: ApplianceDefault[] = [
  { sheetRow: 2, name: "LED Light Points (Indoor)", unitWatts: 15, defaultHours: 8.0 },
  { sheetRow: 3, name: "Outdoor Security Floodlights (LED)", unitWatts: 50, defaultHours: 10.0 },
  { sheetRow: 4, name: "Ceiling Fans", unitWatts: 70, defaultHours: 10.0 },
  { sheetRow: 5, name: "Standing Rechargeable Fans", unitWatts: 35, defaultHours: 6.0 },
  { sheetRow: 6, name: 'Smart LED TV (55")', unitWatts: 120, defaultHours: 7.0 },
  { sheetRow: 7, name: "Satellite Decoder & Soundbar", unitWatts: 40, defaultHours: 7.0 },
  { sheetRow: 8, name: "Inverter Deep Freezer", unitWatts: 200, defaultHours: 12.0 },
  { sheetRow: 9, name: "Double Door Refrigerator", unitWatts: 180, defaultHours: 14.0 },
  { sheetRow: 10, name: "Laptops / Workstations", unitWatts: 65, defaultHours: 8.0 },
  { sheetRow: 11, name: "Desktop Computer & Monitor", unitWatts: 150, defaultHours: 6.0 },
  { sheetRow: 12, name: "Multi-Port Phone Charging Hub (30 Ports)", unitWatts: 250, defaultHours: 10.0 },
  { sheetRow: 13, name: "Professional Hair Clippers", unitWatts: 15, defaultHours: 6.0 },
  { sheetRow: 14, name: "Inverter Air Conditioner (1.5 HP)", unitWatts: 1100, defaultHours: 5.0 },
  { sheetRow: 15, name: "Submersible Water Pump (1 HP)", unitWatts: 750, defaultHours: 1.5 },
  { sheetRow: 16, name: "Microwave Oven", unitWatts: 1200, defaultHours: 0.5 },
  { sheetRow: 17, name: "Electric Dry Iron", unitWatts: 1000, defaultHours: 0.8 },
  { sheetRow: 18, name: "Wi-Fi Router & CCTV DVR System", unitWatts: 45, defaultHours: 24.0 },
  { sheetRow: 19, name: "Water Dispenser (Hot/Cold)", unitWatts: 450, defaultHours: 4.0 },
  { sheetRow: 20, name: "Washing Machine", unitWatts: 500, defaultHours: 1.0 },
  { sheetRow: 21, name: "Electric Cooker (Induction)", unitWatts: 1500, defaultHours: 1.0 },
  { sheetRow: 22, name: "Commercial Blender / Grinder", unitWatts: 400, defaultHours: 0.5 },
  { sheetRow: 23, name: "POS Payment Terminals", unitWatts: 10, defaultHours: 12.0 },
  { sheetRow: 24, name: "Commercial Phone Charging Bank (50 Ports)", unitWatts: 400, defaultHours: 12.0 },
  { sheetRow: 25, name: "Soldering & Electronics Repair Bench", unitWatts: 80, defaultHours: 4.0 },
];

export const DEMAND_FACTOR = 0.8;
export const SHEET_ID = process.env.GOOGLE_SHEETS_ID ?? "1I0axW4PgeZus3ZfyqOfTiUbn29T_wx2HF3ewQcrSVxg";
export const ENERGY_AUDIT_TAB = "Energy Audit";
export const SYSTEM_DESIGN_TAB = "System Design & Sizing";
export const QUOTATION_TAB = "Quotation";
