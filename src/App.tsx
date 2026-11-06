import { useEffect } from "react";
import { AppProviders } from "@/core/AppProviders";
import AppShell from "@/shared/ui/AppShell";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { checkPaymentReturnUrl } from "@/features/export/infrastructure/planTier";
import HomepagePreview from "@/features/home/ui/HomepagePreview";

export default function App() {
  useEffect(() => {
    checkPaymentReturnUrl();
  }, []);

  if (window.location.pathname === "/homepage-preview") {
    return <HomepagePreview />;
  }

  return (
    <AppProviders>
      <AppShell />
      <Analytics />
      <SpeedInsights />
    </AppProviders>
  );
}
