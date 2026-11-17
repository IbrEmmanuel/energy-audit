"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardProposal } from "@/lib/dashboard";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  client: "Client",
  audit: "Audit",
  design: "Design",
  quote: "Quote",
  synced: "Synced",
};

type DateFilter = "all" | "today" | "7d" | "30d" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(iso: string) {
  return startOfDay(new Date(iso)).getTime();
}

function inFilter(p: DashboardProposal, filter: DateFilter, customDate: string) {
  const stamp = p.updatedAt || p.createdAt;
  const updated = new Date(stamp);
  const now = new Date();
  if (filter === "all") return true;
  if (filter === "today") {
    return dayKey(stamp) === startOfDay(now).getTime();
  }
  if (filter === "7d") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return updated >= from;
  }
  if (filter === "30d") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 29);
    return updated >= from;
  }
  if (filter === "custom" && customDate) {
    const day = startOfDay(new Date(`${customDate}T12:00:00`));
    return dayKey(stamp) === day.getTime();
  }
  return true;
}

export function DashboardProposals({ proposals }: { proposals: DashboardProposal[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<DateFilter>("all");
  const [customDate, setCustomDate] = useState("");
  const [rows, setRows] = useState(proposals);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  useEffect(() => {
    setRows(proposals);
  }, [proposals]);

  const visible = useMemo(
    () => rows.filter((p) => inFilter(p, filter, customDate)),
    [rows, filter, customDate],
  );

  const canBulkDelete =
    visible.length > 0 &&
    ((filter === "today") || (filter === "custom" && Boolean(customDate)));

  async function deleteOne(id: string) {
    const res = await fetch(`/api/audits/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Delete failed");
    return id;
  }

  async function removeProposal(p: DashboardProposal) {
    setBusyId(p.id);
    setError(null);
    try {
      await deleteOne(p.id);
      setRows((prev) => prev.filter((r) => r.id !== p.id));
      setConfirmId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeFiltered() {
    setBulkBusy(true);
    setError(null);
    const ids = visible.map((p) => p.id);
    const failed: string[] = [];
    try {
      for (const id of ids) {
        try {
          await deleteOne(id);
        } catch {
          failed.push(id);
        }
      }
      setRows((prev) => prev.filter((r) => !ids.includes(r.id) || failed.includes(r.id)));
      setConfirmBulk(false);
      router.refresh();
      if (failed.length) {
        setError(`Deleted ${ids.length - failed.length}; ${failed.length} failed.`);
      }
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section className="tt-surface overflow-hidden">
      <div className="tt-panel-head tt-panel-head-wrap">
        <div>
          <h2>Client audits</h2>
          <p>
            {visible.length} shown
            {filter !== "all" ? " · filtered by date" : ""}
          </p>
        </div>
        <div className="tt-proposal-filters">
          <div className="tt-range" role="group" aria-label="Filter audits by date">
            {(
              [
                ["all", "All"],
                ["today", "Today"],
                ["7d", "7d"],
                ["30d", "30d"],
                ["custom", "Date"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="tt-range-btn"
                data-active={filter === id}
                onClick={() => {
                  setFilter(id);
                  setConfirmBulk(false);
                  setConfirmId(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {filter === "custom" ? (
            <input
              type="date"
              className="tt-date-input"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setConfirmBulk(false);
              }}
              aria-label="Filter by date"
            />
          ) : null}
          {canBulkDelete ? (
            confirmBulk ? (
              <div className="tt-delete-confirm">
                <button
                  type="button"
                  className="tt-btn-danger"
                  disabled={bulkBusy}
                  onClick={() => void removeFiltered()}
                >
                  {bulkBusy ? "Deleting…" : `Delete ${visible.length}`}
                </button>
                <button
                  type="button"
                  className="tt-btn tt-btn-ghost"
                  disabled={bulkBusy}
                  onClick={() => setConfirmBulk(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="tt-btn-delete"
                onClick={() => setConfirmBulk(true)}
              >
                Delete by date
              </button>
            )
          ) : null}
          <Link href="/audits" className="tt-link text-[0.75rem]">
            View all
          </Link>
        </div>
      </div>

      {error ? <p className="tt-inline-error">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="tt-empty-inline">
          {rows.length === 0
            ? "No proposals yet. Create one to start Energy Audit → Design → Quotation."
            : "No client audits match this date filter."}
        </p>
      ) : (
        <>
          <div className="tt-only-desktop overflow-x-auto">
            <table className="tt-list-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Stage</th>
                  <th>Energy Audit</th>
                  <th>System Design</th>
                  <th>Quotation</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/audits/${p.id}`} className="tt-link font-semibold">
                        {p.clientName}
                      </Link>
                      <div className="tt-num text-[0.72rem] text-[var(--muted)]">
                        {p.proposalNo ?? "Draft"}
                      </div>
                    </td>
                    <td className="text-[0.78rem] text-[var(--muted)]">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </td>
                    <td className="tt-num">
                      <Link href={`/audits/${p.id}?step=audit`} className="tt-link">
                        {p.energyLabel}
                      </Link>
                    </td>
                    <td className="tt-num">
                      <Link href={`/audits/${p.id}?step=design`} className="tt-link">
                        {p.arrayLabel}
                      </Link>
                    </td>
                    <td className="tt-num">
                      <Link href={`/audits/${p.id}?step=quote`} className="tt-link">
                        {p.quoteLabel}
                      </Link>
                    </td>
                    <td className="text-[0.75rem] text-[var(--muted)]">
                      <div>{new Date(p.updatedAt).toLocaleDateString()}</div>
                      <div className="tt-num">
                        {new Date(p.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td>
                      {confirmId === p.id ? (
                        <div className="tt-delete-confirm">
                          <button
                            type="button"
                            className="tt-btn-danger"
                            disabled={busyId === p.id || bulkBusy}
                            onClick={() => void removeProposal(p)}
                          >
                            {busyId === p.id ? "Deleting…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            className="tt-btn tt-btn-ghost"
                            disabled={busyId === p.id}
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="tt-btn-delete"
                          disabled={bulkBusy}
                          onClick={() => {
                            setConfirmBulk(false);
                            setConfirmId(p.id);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="tt-only-mobile tt-module-list">
            {visible.map((p) => (
              <li key={p.id}>
                <Link href={`/audits/${p.id}`}>
                  <strong>{p.clientName}</strong>
                  <span>
                    {STATUS_LABEL[p.status] ?? p.status} ·{" "}
                    {new Date(p.updatedAt).toLocaleDateString()} · {p.quoteLabel}
                  </span>
                </Link>
                <div className="tt-row-actions">
                  <Link href={`/audits/${p.id}?step=audit`}>Audit</Link>
                  <Link href={`/audits/${p.id}?step=design`}>Design</Link>
                  <Link href={`/audits/${p.id}?step=quote`}>Quote</Link>
                  {confirmId === p.id ? (
                    <>
                      <button
                        type="button"
                        className="tt-btn-danger"
                        disabled={busyId === p.id || bulkBusy}
                        onClick={() => void removeProposal(p)}
                      >
                        {busyId === p.id ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        className="tt-btn-delete"
                        disabled={busyId === p.id}
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="tt-btn-delete"
                      disabled={bulkBusy}
                      onClick={() => {
                        setConfirmBulk(false);
                        setConfirmId(p.id);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
