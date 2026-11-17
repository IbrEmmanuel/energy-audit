"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeRow, computeTotals, formatKWh, formatWatts, formatWh } from "@/lib/calc";

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

export type AuditState = {
  id: string;
  clientName: string;
  siteAddress: string | null;
  phone: string | null;
  notes: string | null;
  sheetSyncedAt: string | null;
  sheetSyncError: string | null;
  rows: AuditRowState[];
};

type Props = { initial: AuditState };

export function AuditForm({ initial }: Props) {
  const [audit, setAudit] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("Ready");

  const totals = useMemo(
    () => computeTotals(audit.rows),
    [audit.rows],
  );

  const save = useCallback(
    async (syncSheet = true) => {
      setStatus("saving");
      setMessage(syncSheet ? "Saving & syncing sheet…" : "Saving…");
      try {
        const res = await fetch(`/api/audits/${audit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: audit.clientName,
            siteAddress: audit.siteAddress,
            phone: audit.phone,
            notes: audit.notes,
            rows: audit.rows,
            syncSheet,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Save failed");

        if (data.audit) {
          setAudit({
            ...data.audit,
            siteAddress: data.audit.siteAddress ?? null,
            phone: data.audit.phone ?? null,
            notes: data.audit.notes ?? null,
          });
        }

        setDirty(false);

        if (data.sync && !data.sync.ok) {
          setStatus("error");
          setMessage(data.sync.error || "Sheet sync failed (data saved locally)");
          return;
        }

        setStatus("saved");
        setMessage(syncSheet ? "Saved & synced to Google Sheet" : "Saved");
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Save failed");
      }
    },
    [audit],
  );

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      void save(true);
    }, 2000);
    return () => clearTimeout(t);
  }, [dirty, audit, save]);

  function updateRow(id: string, patch: Partial<AuditRowState>) {
    setDirty(true);
    setStatus("idle");
    setMessage("Editing…");
    setAudit((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }

  function updateHeader(patch: Partial<AuditState>) {
    setDirty(true);
    setStatus("idle");
    setMessage("Editing…");
    setAudit((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">
            Writes to E-tech → <span className="font-medium text-amber-800">Energy Audit</span> columns B–D only (formulas kept)
          </p>
          <p
            className={`mt-1 text-sm ${
              status === "error"
                ? "text-red-600"
                : status === "saved"
                  ? "text-emerald-700"
                  : "text-stone-500"
            }`}
          >
            {status === "idle" ? "Editing…" : message}
            {audit.sheetSyncedAt && status === "saved"
              ? ` · Sheet: ${new Date(audit.sheetSyncedAt).toLocaleString()}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save(true)}
            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Save & Sync Sheet
          </button>
          <a
            href={`/api/audits/${audit.id}/pdf`}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Export PDF
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">Client name</span>
          <input
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
            value={audit.clientName}
            onChange={(e) => updateHeader({ clientName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">Phone</span>
          <input
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
            value={audit.phone ?? ""}
            onChange={(e) => updateHeader({ phone: e.target.value })}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-stone-600">Site address</span>
          <input
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2"
            value={audit.siteAddress ?? ""}
            onChange={(e) => updateHeader({ siteAddress: e.target.value })}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#1e3a5f] text-white">
            <tr>
              <th className="px-3 py-2 font-medium">Appliance Description</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Unit (W)</th>
              <th className="px-3 py-2 font-medium">Hours</th>
              <th className="px-3 py-2 font-medium">Load (W)</th>
              <th className="px-3 py-2 font-medium">Wh</th>
              <th className="px-3 py-2 font-medium">kWh</th>
            </tr>
          </thead>
          <tbody>
            {audit.rows.map((row) => {
              const c = computeRow(row);
              return (
                <tr key={row.id} className="border-t border-stone-100 odd:bg-stone-50/60">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded border border-stone-300 px-2 py-1"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(row.id, { quantity: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded border border-stone-300 px-2 py-1"
                      value={row.unitWatts}
                      onChange={(e) =>
                        updateRow(row.id, { unitWatts: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.1}
                      className="w-20 rounded border border-stone-300 px-2 py-1"
                      value={row.dailyHours}
                      onChange={(e) =>
                        updateRow(row.id, { dailyHours: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-stone-700">
                    {formatWatts(c.totalWatts)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-stone-700">
                    {formatWh(c.dailyWh)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-stone-700">
                    {formatKWh(c.dailyKWh)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <p className="font-semibold text-stone-900">
          TOTAL CONNECTED LOAD & DAILY ENERGY — {formatWatts(totals.totalWatts)} ·{" "}
          {formatWh(totals.dailyWh)} · {formatKWh(totals.dailyKWh)}
        </p>
        <p className="font-semibold text-amber-900">
          DIVERSIFIED SIMULTANEOUS LOAD (80% DEMAND FACTOR) —{" "}
          {formatWatts(totals.diversifiedWatts)} · {formatWh(totals.diversifiedWh)} ·{" "}
          {formatKWh(totals.diversifiedKWh)}
        </p>
      </div>
    </div>
  );
}
