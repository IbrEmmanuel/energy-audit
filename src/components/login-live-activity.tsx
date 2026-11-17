"use client";

import { useEffect, useState } from "react";
import { activityLabel } from "@/lib/activity";

type FeedItem = {
  id: string;
  type: string;
  label: string;
  detail: string | null;
  actor: string;
  createdAt: string;
};

type Feed = {
  generatedAt: string;
  loginsToday: number;
  activitiesToday: number;
  recent: FeedItem[];
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function LoginLiveActivity({ initial }: { initial: Feed }) {
  const [feed, setFeed] = useState(initial);

  useEffect(() => {
    void fetch("/api/activity/login-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "view" }),
    }).catch(() => undefined);

    const id = window.setInterval(() => {
      void fetch("/api/activity/live")
        .then((r) => r.json())
        .then((data: Feed) => {
          if (data?.recent) setFeed(data);
        })
        .catch(() => undefined);
    }, 12000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <aside className="tt-login-live" aria-live="polite">
      <div className="tt-login-live-head">
        <span className="tt-login-live-pulse" aria-hidden />
        <div>
          <strong>Live dashboard activity</strong>
          <p>
            {feed.loginsToday} login{feed.loginsToday === 1 ? "" : "s"} today ·{" "}
            {feed.activitiesToday} event{feed.activitiesToday === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      {feed.recent.length === 0 ? (
        <p className="tt-login-live-empty">Waiting for live events…</p>
      ) : (
        <ul className="tt-login-live-list">
          {feed.recent.slice(0, 8).map((e) => (
            <li key={e.id}>
              <div>
                <p className="title">{e.label || activityLabel(e.type)}</p>
                <p className="meta">
                  {e.actor}
                  {e.detail ? ` · ${e.detail}` : ""}
                </p>
              </div>
              <time dateTime={e.createdAt}>{formatWhen(e.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
