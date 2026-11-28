import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { checkPaymentReturnUrl } from "@/features/export/infrastructure/planTier";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";

/**
 * One chunk per route. The galleries used to import the editor, MapLibre and
 * the poster state directly, so a phone on a slow link downloaded over a
 * megabyte of code that cannot run on those pages before anything appeared.
 */
const JourneyPreview = lazy(() => import("@/home/JourneyPreview"));
const GalleryLanding = lazy(() => import("@/home/GalleryLanding"));
const MotionLab = lazy(() => import("@/home/MotionLab"));
const MaparteScrollLanding = lazy(
  () => import("@/home/scroll/MaparteScrollLanding"),
);
const AboutPage = lazy(() => import("@/home/AboutPage"));
const LayoutsPage = lazy(() => import("@/home/LayoutsPage"));
const ThemesPage = lazy(() => import("@/home/ThemesPage"));

/** Providers and shell share the editor chunk; no other route needs them. */
const EditorRoute = lazy(async () => {
  const [{ AppProviders }, { default: AppShell }] = await Promise.all([
    import("@/core/AppProviders"),
    import("@/shared/ui/AppShell"),
  ]);
  return {
    default: function EditorRoute() {
      return (
        <AppProviders>
          <AppShell />
        </AppProviders>
      );
    },
  };
});

export default function App() {
  useEffect(() => {
    checkPaymentReturnUrl();
  }, []);

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  let route: ReactNode;

  if (pathname === "/journey-preview") {
    route = <JourneyPreview />;
  } else if (pathname === "/about") {
    route = <AboutPage />;
  } else if (pathname === "/layouts") {
    route = <LayoutsPage />;
  } else if (pathname === "/themes") {
    route = <ThemesPage />;
  } else if (pathname.startsWith("/themes/")) {
    route = <ThemesPage themeId={pathname.slice("/themes/".length)} />;
  } else {
    const search = new URLSearchParams(window.location.search);
    if (search.get("lab") === "motion") {
      route = <MotionLab />;
    } else if (
      ["maps", "themes", "layouts", "borders", "presets"].includes(
        search.get("gallery") || "",
      )
    ) {
      route = <GalleryLanding />;
    } else {
      const editorQueryKeys = [
        "editor",
        "dist",
        "city",
        "country",
        "lat",
        "lng",
        "lon",
        "zoom",
        "theme",
        "layout",
        "title",
        "payment",
        "checkout",
        "status",
        "order",
        "success",
      ];
      const hasEditorQuery = editorQueryKeys.some((key) => search.has(key));
      // The home route is the scroll landing; the older journey page stays
      // reachable at /journey-preview for comparison.
      route =
        pathname === "/" && !hasEditorQuery ? (
          <MaparteScrollLanding />
        ) : (
          <ErrorBoundary name="AppRoot">
            <EditorRoute />
          </ErrorBoundary>
        );
    }
  }

  return (
    <Suspense fallback={null}>
      {route}
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
}
