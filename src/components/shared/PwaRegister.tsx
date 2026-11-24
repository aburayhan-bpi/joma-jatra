"use client";

import { useEffect } from "react";

/**
 * Registers the JomaJatra PWA service worker cleanly in supported browsers.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      window.location.protocol === "file:"
    ) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: app continues normally if service worker registration is blocked
    });
  }, []);

  return null;
}
