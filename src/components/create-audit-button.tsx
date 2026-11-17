"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateAuditButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: "New Client" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to create");
      router.push(`/audits/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void create()}
      className="tt-btn tt-btn-primary tt-create-btn"
    >
      <span className="tt-create-full">{loading ? "Creating…" : "New proposal"}</span>
      <span className="tt-create-short">{loading ? "…" : "New"}</span>
    </button>
  );
}
