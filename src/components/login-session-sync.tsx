"use client";

import { useEffect } from "react";
import { getSession } from "next-auth/react";

/** When Android OAuth returns via Chrome, re-check session and enter the app. */
export function LoginSessionSync({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = await getSession();
      if (cancelled) return;
      if (session?.user?.id) {
        window.location.replace(callbackUrl);
      }
    }

    void check();

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onFocus = () => void check();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void check(), 2500);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [callbackUrl]);

  return null;
}
