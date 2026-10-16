import { AppProviders } from "@/core/AppProviders";
import AppShell from "@/shared/ui/AppShell";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

export default function App() {
  return (
    <AppProviders>
      <AppShell />
      <Analytics />
      <SpeedInsights />
    </AppProviders>
  );
}
