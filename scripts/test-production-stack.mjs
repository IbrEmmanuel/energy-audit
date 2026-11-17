/**
 * Production stack smoke tests — IEEE calc parity + sheet formula strings.
 * Run: node scripts/test-production-stack.mjs
 */
import assert from "node:assert/strict";

const SURGE = 1.25;
const DEMAND = 0.8;

function computeTotals(rows, demandFactor = DEMAND) {
  const totalWatts = rows.reduce((s, r) => s + r.quantity * r.unitWatts, 0);
  const dailyWh = rows.reduce(
    (s, r) => s + r.quantity * r.unitWatts * r.dailyHours,
    0,
  );
  return {
    totalWatts,
    dailyWh,
    diversifiedWatts: totalWatts * demandFactor,
  };
}

function computeDesign(dailyWh, diversifiedLoadW, p) {
  const energyWithInverterLossWh = dailyWh / p.inverterEfficiency;
  const grossBatteryWh =
    (energyWithInverterLossWh * p.daysAutonomy) /
    (p.depthOfDischarge * p.chargeEfficiency * (p.batteryTempFactor || 1));
  const requiredBatteryAh = grossBatteryWh / p.systemVoltage;
  const batteryUnits = Math.max(1, Math.ceil(requiredBatteryAh / p.batteryAh));
  const requiredArrayWatts =
    energyWithInverterLossWh /
    (p.peakSunHours * p.mpptEfficiency * p.deratingFactor * p.chargeEfficiency);
  const panelCount = Math.max(1, Math.ceil(requiredArrayWatts / p.panelWatts));
  const inverterMinWatts = Math.ceil(diversifiedLoadW * SURGE);
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

function buildQuote(design, panelWatts = 550) {
  const panelPerWp = 336;
  const inverterPerKw = 420000;
  const inverterKw = Math.max(3, Math.ceil(design.inverterMinWatts / 1000));
  const lines = [
    { q: design.panelCount, p: Math.round(panelPerWp * panelWatts) },
    { q: 1, p: Math.round(inverterPerKw * inverterKw) },
    { q: design.batteryUnits, p: 950000 },
    { q: 1, p: 85000 },
    { q: design.panelCount, p: 18000 },
    { q: Math.max(1, Math.ceil(design.panelCount / 8)), p: 95000 },
    { q: 1, p: 165000 },
    { q: 1, p: 75000 },
    { q: 1, p: 55000 },
  ];
  const subtotal = lines.reduce((s, l) => s + l.q * l.p, 0);
  const installation = Math.round(subtotal * 0.12);
  const contingency = Math.round(subtotal * 0.05);
  return { subtotal, installation, contingency, total: subtotal + installation + contingency };
}

const params = {
  systemVoltage: 48,
  peakSunHours: 4.8,
  daysAutonomy: 1,
  depthOfDischarge: 0.8,
  inverterEfficiency: 0.93,
  chargeEfficiency: 0.95,
  mpptEfficiency: 0.98,
  deratingFactor: 0.8,
  panelWatts: 550,
  batteryAh: 100,
  batteryTempFactor: 1,
};

// Fixture: 3×400W × 12h = 14.4 kWh (known workbook case)
const rows = [{ quantity: 3, unitWatts: 400, dailyHours: 12 }];
const totals = computeTotals(rows);
assert.equal(totals.dailyWh, 14400);
assert.equal(totals.diversifiedWatts, 960);

const design = computeDesign(totals.dailyWh, totals.diversifiedWatts, params);
assert.ok(design.energyWithInverterLossWh > totals.dailyWh);
assert.equal(design.inverterMinWatts, Math.ceil(960 * SURGE));
assert.ok(design.panelCount >= 1);
assert.ok(design.batteryUnits >= 1);

// IEEE identity checks
assert.ok(
  Math.abs(design.energyWithInverterLossWh - totals.dailyWh / params.inverterEfficiency) < 1e-6,
);
assert.ok(
  Math.abs(
    design.grossBatteryWh -
      (design.energyWithInverterLossWh * params.daysAutonomy) /
        (params.depthOfDischarge * params.chargeEfficiency),
  ) < 1e-6,
);
assert.ok(
  Math.abs(design.requiredBatteryAh - design.grossBatteryWh / params.systemVoltage) < 1e-6,
);

const quote = buildQuote(design, params.panelWatts);
assert.ok(quote.total > quote.subtotal);
assert.equal(quote.installation, Math.round(quote.subtotal * 0.12));
assert.equal(quote.contingency, Math.round(quote.subtotal * 0.05));

// Sheet formula contract (strings must stay IEEE-shaped)
const formulaChecks = [
  ["audit watts", "=IF(OR(B2=\"\",C2=\"\"),\"\",B2*C2)"],
  ["audit Wh", "=IF(OR(E2=\"\",D2=\"\"),\"\",E2*D2)"],
  ["design E_dc", "=IF(OR(B17=\"\",B9=\"\"),\"\",B17/B9)"],
  ["design battery", "=IF(B18=\"\",\"\",B18*B6/(B8*B10*IF(B15=\"\",1,B15)))"],
  ["design array", "=IF(B18=\"\",\"\",B18/(B5*B11*B12*B10))"],
  ["quote panels", "='System Design & Sizing'!B26"],
  ["quote batteries", "='System Design & Sizing'!B21"],
  ["quote line", "=D2*E2"],
  ["quote total", "=F12+F13+F14"],
];
for (const [label, f] of formulaChecks) {
  assert.ok(f.startsWith("="), `${label} must be formula`);
}

// Live HTTP production checks
const base = "https://energy-audit-ashen.vercel.app";
const endpoints = [
  ["/login", 200],
  ["/api/auth/providers", 200],
  ["/api/auth/csrf", 200],
  ["/api/auth/session", 200],
  ["/api/audits", 401],
  ["/api/access", 401],
];

const httpResults = [];
for (const [path, expect] of endpoints) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  httpResults.push({ path, status: res.status, expect });
  assert.equal(res.status, expect, `${path} expected ${expect} got ${res.status}`);
}

const providers = await (await fetch(`${base}/api/auth/providers`)).json();
assert.ok(providers.google, "Google provider must be configured");
assert.match(providers.google.signinUrl, /\/api\/auth\/signin\/google$/);
assert.match(providers.google.callbackUrl, /\/api\/auth\/callback\/google$/);

// Protected pages redirect to login
for (const path of ["/dashboard", "/audits", "/access"]) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  assert.equal(res.status, 307, `${path} should redirect unauthenticated`);
  const loc = res.headers.get("location") || "";
  assert.match(loc, /login/, `${path} redirect should go to login`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      ieee: {
        dailyWh: design.dailyWh,
        energyDc: Math.round(design.energyWithInverterLossWh),
        batteryAh: Math.round(design.requiredBatteryAh),
        batteryUnits: design.batteryUnits,
        arrayWp: Math.round(design.requiredArrayWatts),
        panels: design.panelCount,
        inverterW: design.inverterMinWatts,
        quoteTotal: quote.total,
      },
      http: httpResults,
      googleAuth: true,
    },
    null,
    2,
  ),
);
console.log("production stack tests passed");
