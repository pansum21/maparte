import MaparteScrollLanding from "./landing/MaparteScrollLanding";

/**
 * This copy carries the landing only. The editor lives in the main app, so
 * every "Open editor" action points there instead of a local route.
 */
export default function App() {
  return <MaparteScrollLanding />;
}
