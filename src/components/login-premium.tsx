"use client";

import { useEffect, useMemo, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function solarDayProgress(now = new Date()) {
  // Approximate civil daylight window for field ops (06:00–18:30 local)
  const mins = now.getHours() * 60 + now.getMinutes();
  const dawn = 6 * 60;
  const dusk = 18 * 60 + 30;
  if (mins <= dawn) return { phase: "pre-dawn" as const, pct: 0 };
  if (mins >= dusk) return { phase: "night" as const, pct: 100 };
  const pct = ((mins - dawn) / (dusk - dawn)) * 100;
  if (pct < 35) return { phase: "morning" as const, pct };
  if (pct < 70) return { phase: "peak" as const, pct };
  return { phase: "afternoon" as const, pct };
}

function phaseLabel(phase: string) {
  switch (phase) {
    case "pre-dawn":
      return "Pre-dawn window";
    case "morning":
      return "Morning irradiance rise";
    case "peak":
      return "Peak solar window";
    case "afternoon":
      return "Afternoon taper";
    default:
      return "Night / standby";
  }
}

export function LoginPremiumHud() {
  const [now, setNow] = useState(() => new Date());
  const [secure, setSecure] = useState(true);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setSecure(window.isSecureContext && location.protocol === "https:");
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const solar = useMemo(() => solarDayProgress(now), [now]);
  const local = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const utc = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} UTC`;

  return (
    <div className="tt-login-hud" aria-label="E-TEC secure gate status">
      <div className="tt-login-hud-row">
        <span className="tt-login-chip" data-on={secure}>
          <i />
          {secure ? "TLS secured" : "Insecure context"}
        </span>
        <span className="tt-login-chip">Google SSO</span>
        <span className="tt-login-chip">{standalone ? "Installed app" : "Web gate"}</span>
      </div>

      <div className="tt-login-solar">
        <div className="tt-login-solar-head">
          <strong>Solar day engine</strong>
          <span>{phaseLabel(solar.phase)}</span>
        </div>
        <div
          className="tt-login-solar-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(solar.pct)}
          aria-label="Daylight progress"
        >
          <span style={{ width: `${solar.pct}%` }} />
          <em style={{ left: `${Math.min(98, Math.max(2, solar.pct))}%` }} />
        </div>
        <div className="tt-login-solar-meta">
          <span>{Math.round(solar.pct)}% daylight</span>
          <span>
            {local} · {utc}
          </span>
        </div>
      </div>

      <svg className="tt-login-wave" viewBox="0 0 320 36" aria-hidden>
        <path
          className="tt-login-wave-path"
          d="M0 22 C28 8 48 8 72 22 S120 36 144 22 192 8 216 22 264 36 288 22 320 8 320 22"
          fill="none"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
}

export function LoginParallax() {
  useEffect(() => {
    const root = document.querySelector(".tt-login") as HTMLElement | null;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 8;
      root.style.setProperty("--lx", `${x.toFixed(2)}px`);
      root.style.setProperty("--ly", `${y.toFixed(2)}px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}

export function LoginHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "g") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      const btn = document.querySelector(".tt-btn-google") as HTMLButtonElement | null;
      btn?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <p className="tt-login-hotkey">
      Press <kbd>G</kbd> to continue with Google
    </p>
  );
}
