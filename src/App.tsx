import { useEffect } from "react";
import { AppProviders } from "@/core/AppProviders";
import AppShell from "@/shared/ui/AppShell";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { checkPaymentReturnUrl } from "@/features/export/infrastructure/planTier";
import HomePage from "@/home/HomePage";

export default function App() {
  useEffect(() => {
    checkPaymentReturnUrl();
  }, []);

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const search = new URLSearchParams(window.location.search);
  const editorQueryKeys = ["editor", "dist", "city", "country", "lat", "lng", "lon", "zoom", "theme", "payment", "checkout", "status", "order", "success"];
  const hasEditorQuery = editorQueryKeys.some((key) => search.has(key));
  const isHomepage = pathname === "/" && !hasEditorQuery;

  if (isHomepage) return <HomePage />;

  return (
    <AppProviders>
      <AppShell />
      <Analytics />
      <SpeedInsights />
    </AppProviders>
  );
}
