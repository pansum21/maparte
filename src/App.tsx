import { useEffect } from "react";
import { AppProviders } from "@/core/AppProviders";
import AppShell from "@/shared/ui/AppShell";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { checkPaymentReturnUrl } from "@/features/export/infrastructure/planTier";
import JourneyPreview from "@/home/JourneyPreview";
import GalleryLanding from "@/home/GalleryLanding";

export default function App() {
  useEffect(() => {
    checkPaymentReturnUrl();
  }, []);

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/journey-preview") return <JourneyPreview />;

  const search = new URLSearchParams(window.location.search);
  if (["maps", "themes", "layouts", "borders", "presets"].includes(search.get("gallery") || "")) {
    return <GalleryLanding />;
  }
  const editorQueryKeys = ["editor", "dist", "city", "country", "lat", "lng", "lon", "zoom", "theme", "payment", "checkout", "status", "order", "success"];
  const hasEditorQuery = editorQueryKeys.some((key) => search.has(key));
  if (pathname === "/" && !hasEditorQuery) return <JourneyPreview />;

  return (
    <AppProviders>
      <AppShell />
      <Analytics />
      <SpeedInsights />
    </AppProviders>
  );
}


