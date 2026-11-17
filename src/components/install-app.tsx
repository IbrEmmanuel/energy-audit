"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

type Props = {
  variant?: "login" | "dock";
};

export function InstallApp({ variant = "login" }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    try {
      if (sessionStorage.getItem("etec-install-dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const show = useMemo(() => {
    if (installed || dismissed) return false;
    if (deferred) return true;
    if (isIos()) return true;
    return false;
  }, [installed, dismissed, deferred]);

  if (!show) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setIosHint((v) => !v);
  }

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("etec-install-dismissed", "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className={variant === "login" ? "tt-install tt-install-login" : "tt-install tt-install-dock"}>
      <div className="tt-install-copy">
        <strong>Install E-TEC</strong>
        <p>
          {deferred
            ? "Add to your phone home screen for fast staff access."
            : "On iPhone: Share → Add to Home Screen."}
        </p>
        {iosHint && !deferred ? (
          <p className="tt-install-ios">
            Safari → Share button → <em>Add to Home Screen</em> → Add
          </p>
        ) : null}
      </div>
      <div className="tt-install-actions">
        <button type="button" className="tt-install-btn" onClick={() => void install()}>
          {deferred ? "Install app" : "How to install"}
        </button>
        <button type="button" className="tt-install-dismiss" onClick={dismiss} aria-label="Dismiss">
          Not now
        </button>
      </div>
    </div>
  );
}
