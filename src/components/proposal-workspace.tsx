"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeRow,
  computeTotals,
  formatKWh,
  formatWatts,
  formatWh,
} from "@/lib/calc";
import {
  buildLiveKpiBundle,
  formatKpiKWh,
  formatKpiKwp,
  parseDesignParams,
  type DesignParams,
} from "@/lib/design";
import { buildQuotation, formatNaira } from "@/lib/quotation";

export type AuditRowState = {
  id: string;
  name: string;
  sheetRow: number;
  quantity: number;
  unitWatts: number;
  dailyHours: number;
  sortOrder: number;
  isCustom: boolean;
};

export type ProposalState = {
  id: string;
  proposalNo: string | null;
  clientName: string;
  siteAddress: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  demandFactor: number;
  sheetSyncedAt: string | null;
  sheetSyncError: string | null;
  designJson: string | null;
  rows: AuditRowState[];
};

type Step = "client" | "audit" | "design" | "quote";

const STEPS: { id: Step; label: string }[] = [
  { id: "client", label: "Client" },
  { id: "audit", label: "Energy Audit" },
  { id: "design", label: "System Design" },
  { id: "quote", label: "Quotation" },
];

function parseStep(raw?: string | null): Step {
  if (raw === "client" || raw === "audit" || raw === "design" || raw === "quote") {
    return raw;
  }
  return "audit";
}

export function ProposalWorkspace({
  initial,
  initialStep,
}: {
  initial: ProposalState;
  initialStep?: string | null;
}) {
  const [proposal, setProposal] = useState(initial);
  const [step, setStep] = useState<Step>(() => parseStep(initialStep));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("Ready");
  const [design, setDesign] = useState<DesignParams>(() =>
    parseDesignParams(initial.designJson),
  );

  const totals = useMemo(
    () => computeTotals(proposal.rows, proposal.demandFactor),
    [proposal.rows, proposal.demandFactor],
  );
  const live = useMemo(
    () => buildLiveKpiBundle(totals.dailyWh, totals.diversifiedWatts, design),
    [totals.dailyWh, totals.diversifiedWatts, design],
  );
  const designResults = live.results;
  const kpi = live.kpi;
  const quote = useMemo(
    () => buildQuotation(designResults, design),
    [designResults, design],
  );

  const save = useCallback(
    async (syncSheet = true) => {
      setStatus("saving");
      setMessage(syncSheet ? "Saving & syncing…" : "Saving…");
      try {
        const res = await fetch(`/api/audits/${proposal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: proposal.clientName,
            siteAddress: proposal.siteAddress,
            phone: proposal.phone,
            notes: proposal.notes,
            rows: proposal.rows,
            designJson: JSON.stringify(design),
            quoteJson: JSON.stringify(quote),
            status: step === "quote" ? "quote" : step,
            syncSheet,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");

        if (data.audit) {
          setProposal((p) => ({
            ...p,
            ...data.audit,
            siteAddress: data.audit.siteAddress ?? null,
            phone: data.audit.phone ?? null,
            notes: data.audit.notes ?? null,
            proposalNo: data.audit.proposalNo ?? p.proposalNo,
            sheetSyncedAt: data.audit.sheetSyncedAt,
            sheetSyncError: data.audit.sheetSyncError,
            rows: data.audit.rows ?? p.rows,
          }));
        }
        setDirty(false);
        if (data.sync && !data.sync.ok) {
          setStatus("error");
          setMessage(data.sync.error || "Sheet sync failed — saved locally");
          return;
        }
        setStatus("saved");
        setMessage(
          syncSheet
            ? "Synced Energy Audit + Design + Quotation (IEEE live formulas)"
            : "Saved live KPIs",
        );
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Save failed");
      }
    },
    [proposal, design, quote, step],
  );

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void save(true), 1800);
    return () => clearTimeout(t);
  }, [dirty, proposal, design, save]);

  function touch(updater: (prev: ProposalState) => ProposalState) {
    setDirty(true);
    setStatus("idle");
    setMessage("Unsaved changes");
    setProposal(updater);
  }

  function updateRow(id: string, patch: Partial<AuditRowState>) {
    touch((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }

  function patchDesign<K extends keyof DesignParams>(key: K, value: DesignParams[K]) {
    setDirty(true);
    setStatus("idle");
    setMessage("Unsaved changes");
    setDesign((d) => ({ ...d, [key]: value }));
  }

  return (
    <div>
      <div className="tt-toolbar">
        <div className="min-w-0 flex-1">
          <h1 className="truncate">{proposal.clientName || "Untitled client"}</h1>
          <p className="tt-toolbar-meta">
            <span className="tt-num">{proposal.proposalNo ?? "Draft"}</span>
            <span className="tt-sync" data-state={status}>
              {message}
            </span>
            {proposal.sheetSyncedAt ? (
              <span className="tt-toolbar-sync-time">
                synced {new Date(proposal.sheetSyncedAt).toLocaleString()}
              </span>
            ) : null}
          </p>
        </div>
        <div className="tt-btn-row tt-toolbar-actions">
          <button type="button" className="tt-btn tt-btn-navy" onClick={() => void save(true)}>
            Save & sync
          </button>
          <a className="tt-btn tt-btn-ghost" href={`/api/audits/${proposal.id}/pdf`}>
            Export PDF
          </a>
        </div>
      </div>

      <nav className="tt-tabs" aria-label="Proposal modules">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="tt-tab"
            data-active={step === s.id}
            onClick={() => setStep(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {step === "client" && (
        <section className="tt-box space-y-3">
          <div className="tt-section-head">
            <h2>Client & site</h2>
            <p>Stored with the proposal record</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="tt-label">Client name</span>
              <input
                className="tt-input"
                value={proposal.clientName}
                onChange={(e) => touch((p) => ({ ...p, clientName: e.target.value }))}
              />
            </label>
            <label>
              <span className="tt-label">Phone</span>
              <input
                className="tt-input"
                inputMode="tel"
                value={proposal.phone ?? ""}
                onChange={(e) => touch((p) => ({ ...p, phone: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="tt-label">Site address</span>
              <input
                className="tt-input"
                value={proposal.siteAddress ?? ""}
                onChange={(e) => touch((p) => ({ ...p, siteAddress: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="tt-label">Notes</span>
              <textarea
                className="tt-input min-h-24"
                value={proposal.notes ?? ""}
                onChange={(e) => touch((p) => ({ ...p, notes: e.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="tt-btn tt-btn-navy" onClick={() => setStep("audit")}>
            Open Energy Audit
          </button>
        </section>
      )}

      {step === "audit" && (
        <section>
          <div className="tt-section-head">
            <h2>Energy Audit</h2>
            <p>Sheet tab · writes Quantity / Watts / Hours (B–D)</p>
          </div>

          <div className="tt-only-mobile tt-mobile-cards">
            {proposal.rows.map((row) => {
              const c = computeRow(row);
              return (
                <article key={row.id} className="tt-mobile-card">
                  <h4 className="tt-mobile-card-title">{row.name}</h4>
                  <div className="tt-field-grid">
                    <label>
                      Qty
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="tt-input"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.id, { quantity: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      Watts
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        className="tt-input"
                        value={row.unitWatts}
                        onChange={(e) =>
                          updateRow(row.id, { unitWatts: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      Hours
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={24}
                        step={0.1}
                        className="tt-input"
                        value={row.dailyHours}
                        onChange={(e) =>
                          updateRow(row.id, { dailyHours: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                  </div>
                  <div className="tt-mobile-meta">
                    <span>
                      Load <strong>{formatWatts(c.totalWatts)}</strong>
                    </span>
                    <span>
                      Wh <strong>{formatWh(c.dailyWh)}</strong>
                    </span>
                    <span>
                      kWh <strong>{formatKWh(c.dailyKWh)}</strong>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="tt-only-desktop tt-table-wrap">
            <table className="tt-table">
              <thead>
                <tr>
                  <th>Appliance</th>
                  <th>Qty</th>
                  <th>Unit (W)</th>
                  <th>Hours</th>
                  <th>Load (W)</th>
                  <th>Wh</th>
                  <th>kWh</th>
                </tr>
              </thead>
              <tbody>
                {proposal.rows.map((row) => {
                  const c = computeRow(row);
                  return (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="tt-input w-[4.5rem]"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(row.id, { quantity: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="tt-input w-[5.5rem]"
                          value={row.unitWatts}
                          onChange={(e) =>
                            updateRow(row.id, { unitWatts: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.1}
                          className="tt-input w-[4.5rem]"
                          value={row.dailyHours}
                          onChange={(e) =>
                            updateRow(row.id, { dailyHours: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="tt-num">{formatWatts(c.totalWatts)}</td>
                      <td className="tt-num">{formatWh(c.dailyWh)}</td>
                      <td className="tt-num">{formatKWh(c.dailyKWh)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="tt-footer-bar">
            <div className="totals space-y-0.5">
              <p>
                Connected{" "}
                <strong>
                  {formatWatts(totals.totalWatts)} · {formatWh(totals.dailyWh)} ·{" "}
                  {formatKWh(totals.dailyKWh)}
                </strong>
              </p>
              <p>
                Diversified {Math.round(totals.demandFactor * 100)}%{" "}
                <strong>
                  {formatWatts(totals.diversifiedWatts)} · {formatWh(totals.diversifiedWh)} ·{" "}
                  {formatKWh(totals.diversifiedKWh)}
                </strong>
              </p>
            </div>
            <button type="button" className="tt-btn tt-btn-navy" onClick={() => setStep("design")}>
              System Design
            </button>
          </div>
        </section>
      )}

      {step === "design" && (
        <section className="space-y-3">
          <div className="tt-section-head">
            <h2>System Design & Sizing</h2>
            <p>
              IEEE 1562 / 1013 · sheet B17:B26 + KPI cards are live formulas
            </p>
          </div>

          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">
            {kpi.standardLabel} · live KPI
          </p>

          <div className="tt-kpi-strip" data-live="true">
            <Kpi
              label="Daily energy demand"
              value={formatKpiKWh(kpi.dailyEnergyKWh)}
              detail={`Total load ${Math.round(kpi.totalLoadW).toLocaleString()} W`}
            />
            <Kpi
              label="Recommended inverter"
              value={`${kpi.inverterSurgeKva.toFixed(1)} kVA / ${kpi.inverterContinuousKw.toFixed(1)} kW`}
              detail={`Surge ${kpi.surgeFactor} · Pure sine`}
            />
            <Kpi
              label="PV array capacity"
              value={formatKpiKwp(kpi.arrayCapacityKwp)}
              detail={`${kpi.panelCount} × ${kpi.panelWatts} Wp`}
            />
            <Kpi
              label="Battery storage"
              value={`${kpi.batteryStorageKWh % 1 === 0 ? kpi.batteryStorageKWh.toFixed(0) : kpi.batteryStorageKWh.toFixed(1)} kWh`}
              detail={`${Math.round(kpi.storageRatingAh)} Ah required`}
            />
            <Kpi
              label="Battery bank"
              value={`${kpi.batteryModules} × ${kpi.systemVoltage}V ${kpi.batteryAh}Ah`}
              detail={`${kpi.chemistryLabel} · ${Math.round(kpi.depthOfDischarge * 100)}% DoD`}
            />
            <Kpi
              label="Est. generation"
              value={`${kpi.estimatedGenerationKWh.toFixed(1)} kWh/day`}
              detail={`Yield ${kpi.solarYieldPct.toFixed(1)}% of demand`}
            />
          </div>

          <div className="tt-split">
            <div className="tt-box">
              <h3>Design parameters</h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label>
                  <span className="tt-label">System mode</span>
                  <select
                    className="tt-input"
                    value={design.systemMode}
                    onChange={(e) => patchDesign("systemMode", e.target.value)}
                  >
                    <option>Hybrid</option>
                    <option>Off-grid</option>
                    <option>Grid-tied</option>
                  </select>
                </label>
                <label>
                  <span className="tt-label">Site type</span>
                  <select
                    className="tt-input"
                    value={design.siteType}
                    onChange={(e) => patchDesign("siteType", e.target.value)}
                  >
                    <option>Residential</option>
                    <option>Commercial</option>
                    <option>Industrial</option>
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="tt-label">Battery type</span>
                  <select
                    className="tt-input"
                    value={design.batteryType}
                    onChange={(e) => patchDesign("batteryType", e.target.value)}
                  >
                    <option>Lithium LiFePO4</option>
                    <option>Tubular Lead-Acid</option>
                    <option>Gel</option>
                  </select>
                </label>
                {(
                  [
                    ["systemVoltage", "System voltage (V)"],
                    ["peakSunHours", "Peak sun hours"],
                    ["daysAutonomy", "Days of autonomy"],
                    ["panelWatts", "Panel rating (Wp)"],
                    ["batteryAh", "Battery Ah"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <span className="tt-label">{label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="tt-input"
                      value={design[key]}
                      onChange={(e) => patchDesign(key, Number(e.target.value) || 0)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="tt-box">
              <h3>Calculated values</h3>
              <Result line="Daily energy" value={formatWh(designResults.dailyWh)} />
              <Result
                line="With inverter losses"
                value={formatWh(designResults.energyWithInverterLossWh)}
              />
              <Result line="Gross battery energy" value={formatWh(designResults.grossBatteryWh)} />
              <Result
                line="Battery capacity required"
                value={`${Math.round(designResults.requiredBatteryAh)} Ah`}
              />
              <Result line="Battery units" value={`${designResults.batteryUnits}`} />
              <Result
                line="Array size"
                value={`${Math.round(designResults.requiredArrayWatts).toLocaleString()} W`}
              />
              <Result line="Panel count" value={`${designResults.panelCount}`} />
              <Result
                line="Inverter class (min)"
                value={`${designResults.inverterMinWatts.toLocaleString()} W`}
              />
              <button
                type="button"
                className="tt-btn tt-btn-navy mt-3"
                onClick={() => setStep("quote")}
              >
                Quotation
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "quote" && (
        <section>
          <div className="tt-section-head">
            <h2>Quotation</h2>
            <p>
              Realtime IEEE BOM · Quotation qty/totals are live sheet formulas ·{" "}
              {formatNaira(quote.total)}
            </p>
          </div>

          <div className="tt-only-mobile tt-mobile-cards">
            {quote.lines.map((l) => (
              <article key={l.sku} className="tt-mobile-card">
                <h4 className="tt-mobile-card-title">{l.description}</h4>
                <p className="mb-2 text-[0.72rem] text-[var(--muted)]">{l.sku}</p>
                <div className="tt-mobile-meta">
                  <span>
                    Qty <strong>{l.quantity}</strong> {l.unit}
                  </span>
                  <span>
                    Unit <strong>{formatNaira(l.unitPrice)}</strong>
                  </span>
                  <span>
                    Amount <strong>{formatNaira(l.quantity * l.unitPrice)}</strong>
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="tt-only-desktop tt-table-wrap">
            <table className="tt-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((l) => (
                  <tr key={l.sku}>
                    <td>
                      <div className="font-medium">{l.description}</div>
                      <div className="text-[0.72rem] text-[var(--muted)]">{l.sku}</div>
                    </td>
                    <td className="tt-num">{l.quantity}</td>
                    <td>{l.unit}</td>
                    <td className="tt-num">{formatNaira(l.unitPrice)}</td>
                    <td className="tt-num font-semibold">
                      {formatNaira(l.quantity * l.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tt-box mt-3">
            <Result line="Subtotal" value={formatNaira(quote.subtotal)} />
            <Result line="Installation (12%)" value={formatNaira(quote.installation)} />
            <Result line="Contingency (5%)" value={formatNaira(quote.contingency)} />
            <p className="pt-3 text-[1.05rem] font-bold text-[var(--navy)]">
              Grand total{" "}
              <span className="tt-num">{formatNaira(quote.total)}</span>
            </p>
            <div className="tt-btn-row pt-3">
              <button type="button" className="tt-btn tt-btn-navy" onClick={() => void save(true)}>
                Sync sheet
              </button>
              <a className="tt-btn tt-btn-ghost" href={`/api/audits/${proposal.id}/pdf`}>
                Download PDF
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Result({ line, value }: { line: string; value: string }) {
  return (
    <div className="tt-result">
      <span>{line}</span>
      <span>{value}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="tt-kpi-cell">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
      <p className="detail">{detail}</p>
    </div>
  );
}
