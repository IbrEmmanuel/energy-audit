"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type Granted = {
  id: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  address: string | null;
  grantedBy: string | null;
  createdAt: string;
  loginCount: number;
  lastLoginAt: string | null;
};

const emptyForm = {
  email: "",
  companyName: "",
  phone: "",
  address: "",
};

function formatWhen(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccessManager({ initial }: { initial: Granted[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          companyName: form.companyName,
          phone: form.phone,
          address: form.address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows((prev) => {
        const next = prev.filter((r) => r.email !== data.email);
        const prior = prev.find((r) => r.email === data.email);
        return [
          {
            ...data,
            loginCount: prior?.loginCount ?? data.loginCount ?? 0,
            lastLoginAt: prior?.lastLoginAt ?? data.lastLoginAt ?? null,
          },
          ...next,
        ];
      });
      setForm(emptyForm);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(target: Granted) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: target.email,
          companyName: form.companyName,
          phone: form.phone,
          address: form.address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows((prev) =>
        prev.map((r) =>
          r.email === data.email
            ? {
                ...r,
                ...data,
                loginCount: data.loginCount ?? r.loginCount,
                lastLoginAt: data.lastLoginAt ?? r.lastLoginAt,
              }
            : r,
        ),
      );
      setForm(emptyForm);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(target: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows((prev) => prev.filter((r) => r.email !== target.toLowerCase()));
      if (editing === target.toLowerCase()) {
        setEditing(null);
        setForm(emptyForm);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: Granted) {
    setEditing(row.email);
    setForm({
      email: row.email,
      companyName: row.companyName ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
    });
    setError(null);
  }

  const totalLogins = rows.reduce((sum, r) => sum + (r.loginCount || 0), 0);

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (editing) {
            const target = rows.find((r) => r.email === editing);
            if (target) void saveProfile(target);
            return;
          }
          void grant(e);
        }}
        className="tt-box space-y-3"
      >
        <h3>{editing ? "Update access profile" : "Grant access"}</h3>
        <label className="block">
          <span className="tt-label">Email</span>
          <input
            className="tt-input"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder="colleague@gmail.com"
            value={form.email}
            disabled={Boolean(editing)}
            onChange={(e) => setField("email", e.target.value)}
          />
        </label>
        <div className="tt-field-grid tt-field-grid-2 tt-access-fields">
          <label>
            Company name
            <input
              className="tt-input"
              type="text"
              autoComplete="organization"
              placeholder="Company Ltd"
              value={form.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
            />
          </label>
          <label>
            Phone number
            <input
              className="tt-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+234…"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="tt-label">Address</span>
          <input
            className="tt-input"
            type="text"
            autoComplete="street-address"
            placeholder="Site or office address"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </label>
        {error ? <p className="text-[0.8rem] text-[var(--danger)]">{error}</p> : null}
        <div className="tt-btn-row flex flex-wrap gap-2">
          <button type="submit" className="tt-btn tt-btn-primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save profile" : "Grant"}
          </button>
          {editing ? (
            <button
              type="button"
              className="tt-btn tt-btn-ghost"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setError(null);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="tt-box">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3>Granted accounts</h3>
          <p className="text-[0.72rem] text-[var(--muted)]">
            {rows.length} user{rows.length === 1 ? "" : "s"} · {totalLogins} login
            {totalLogins === 1 ? "" : "s"}
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="text-[0.8rem] text-[var(--muted)]">
            No other accounts yet. Only the master can sign in.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {rows.map((r) => (
              <li key={r.id} className="space-y-2 py-3 text-[0.875rem]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-[var(--navy)] break-all">
                      {r.email}
                    </p>
                    <p className="text-[0.78rem] text-[var(--ink)]">
                      {r.companyName || "—"}
                      {" · "}
                      {r.phone || "—"}
                    </p>
                    <p className="text-[0.72rem] text-[var(--muted)]">
                      {r.address || "No address"}
                    </p>
                    <p className="text-[0.72rem] text-[var(--muted)]">
                      Logins: <strong className="tt-num text-[var(--navy)]">{r.loginCount}</strong>
                      {" · Last: "}
                      {formatWhen(r.lastLoginAt)}
                      {" · Granted "}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="tt-btn tt-btn-ghost"
                      disabled={busy}
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="tt-btn tt-btn-ghost"
                      disabled={busy}
                      onClick={() => void revoke(r.email)}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
