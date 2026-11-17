"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Granted = {
  id: string;
  email: string;
  grantedBy: string | null;
  createdAt: string;
};

export function AccessManager({ initial }: { initial: Granted[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows((prev) => [data, ...prev.filter((r) => r.email !== data.email)]);
      setEmail("");
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => void grant(e)} className="tt-box space-y-3">
        <h3>Grant access</h3>
        <label className="block">
          <span className="tt-label">Google email</span>
          <input
            className="tt-input"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder="colleague@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {error ? <p className="text-[0.8rem] text-[var(--danger)]">{error}</p> : null}
        <button type="submit" className="tt-btn tt-btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Grant"}
        </button>
      </form>

      <div className="tt-box">
        <h3>Granted accounts</h3>
        {rows.length === 0 ? (
          <p className="text-[0.8rem] text-[var(--muted)]">
            No other accounts yet. Only the master can sign in.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-[0.875rem]"
              >
                <div>
                  <p className="font-semibold text-[var(--navy)]">{r.email}</p>
                  <p className="text-[0.72rem] text-[var(--muted)]">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="tt-btn tt-btn-ghost"
                  disabled={busy}
                  onClick={() => void revoke(r.email)}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
