import React from "react";
import ReactDOM from "react-dom/client";
import { isNativePlatform, onPlatformAdapterChange } from "@/core/platform";
import { initGlobalErrorSentinel } from "@/core/telemetry/sentinel";
import App from "./App";

initGlobalErrorSentinel();

// Self-hosted UI typefaces: essential weights for high-speed initial rendering.
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/spline-sans-mono/400.css";
import "@fontsource/bebas-neue/400.css";

// Default poster typefaces: essential weights
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/ibm-plex-mono/400.css";

import "./styles/index.css";

const syncDisplayMode = () => {
  const isStandalone =
    isNativePlatform() ||
    !!(window as unknown as Record<string, unknown>).Capacitor ||
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari PWA fallback.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  document.documentElement.dataset.displayMode = isStandalone
    ? "standalone"
    : "browser";
};

syncDisplayMode();
onPlatformAdapterChange(syncDisplayMode);
const displayModeQuery = window.matchMedia("(display-mode: standalone)");
if (typeof displayModeQuery.addEventListener === "function") {
  displayModeQuery.addEventListener("change", syncDisplayMode);
} else {
  displayModeQuery.onchange = syncDisplayMode;
}

if ("serviceWorker" in navigator && !isNativePlatform()) {
  window.addEventListener("load", async () => {
    const hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);
    let updateNoticeDispatched = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadControllerAtLoad || updateNoticeDispatched) return;
      updateNoticeDispatched = true;
      window.dispatchEvent(new Event("maparte:update-ready"));
    });

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      // Check immediately as well as during the browser's normal update cycle.
      await registration.update();
    } catch (error) {
      console.warn("Service worker update check failed", error);
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
