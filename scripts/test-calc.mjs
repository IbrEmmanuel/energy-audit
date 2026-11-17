import assert from "node:assert/strict";

function computeRow({ quantity, unitWatts, dailyHours }) {
  const totalWatts = quantity * unitWatts;
  const dailyWh = totalWatts * dailyHours;
  return { totalWatts, dailyWh, dailyKWh: dailyWh / 1000 };
}

function computeTotals(rows, demandFactor = 0.8) {
  const totalWatts = rows.reduce((s, r) => s + r.quantity * r.unitWatts, 0);
  const dailyWh = rows.reduce((s, r) => s + r.quantity * r.unitWatts * r.dailyHours, 0);
  return {
    totalWatts,
    dailyWh,
    dailyKWh: dailyWh / 1000,
    diversifiedWatts: totalWatts * demandFactor,
    diversifiedWh: dailyWh * demandFactor,
    diversifiedKWh: (dailyWh * demandFactor) / 1000,
  };
}

const row = computeRow({ quantity: 3, unitWatts: 400, dailyHours: 12 });
assert.equal(row.totalWatts, 1200);
assert.equal(row.dailyWh, 14400);
assert.equal(row.dailyKWh, 14.4);

const totals = computeTotals([{ quantity: 3, unitWatts: 400, dailyHours: 12 }]);
assert.equal(totals.diversifiedWatts, 960);
assert.equal(totals.diversifiedWh, 11520);
assert.equal(totals.diversifiedKWh, 11.52);

console.log("calc tests passed");
