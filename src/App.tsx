import { useEffect } from "react";
import { AppProviders } from "@/core/AppProviders";
import AppShell from "@/shared/ui/AppShell";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { checkPaymentReturnUrl } from "@/features/export/infrastructure/planTier";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import JourneyPreview from "@/home/JourneyPreview";
import GalleryLanding from "@/home/GalleryLanding";
import MotionLab from "@/home/MotionLab";
import MaparteScrollLanding from "@/home/scroll/MaparteScrollLanding";
import AboutPage from "@/home/AboutPage";
import LayoutsPage from "@/home/LayoutsPage";
import ThemesPage from "@/home/ThemesPage";

export default function App() {
  useEffect(() => {
    checkPaymentReturnUrl();
  }, []);

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/journey-preview") return <JourneyPreview />;
  if (pathname === "/about") return <AboutPage />;
  if (pathname === "/layouts") return <LayoutsPage />;
  if (pathname === "/themes") return <ThemesPage />;
  if (pathname.startsWith("/themes/")) {
    return <ThemesPage themeId={pathname.slice("/themes/".length)} />;
  }

  const search = new URLSearchParams(window.location.search);
  if (search.get("lab") === "motion") return <MotionLab />;
  if (["maps", "themes", "layouts", "borders", "presets"].includes(search.get("gallery") || "")) {
    return <GalleryLanding />;
  }
  const editorQueryKeys = ["editor", "dist", "city", "country", "lat", "lng", "lon", "zoom", "theme", "layout", "title", "payment", "checkout", "status", "order", "success"];
  const hasEditorQuery = editorQueryKeys.some((key) => search.has(key));
  // The home route is the scroll landing; the older journey page stays
    // reachable at /journey-preview for comparison.
    if (pathname === "/" && !hasEditorQuery) return <MaparteScrollLanding />;

  return (
    <ErrorBoundary name="AppRoot">
      <AppProviders>
        <AppShell />
        <Analytics />
        <SpeedInsights />
      </AppProviders>
    </ErrorBoundary>
  );
}


