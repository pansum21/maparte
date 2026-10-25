const GOOGLE_MAP_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.google.co.in",
  "www.google.co.in",
]);

export interface MapCoordinates {
  lat: number;
  lon: number;
}

export function isGoogleMapsLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && GOOGLE_MAP_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function validCoordinates(lat: number, lon: number): MapCoordinates | null {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    ? { lat, lon }
    : null;
}

export function extractGoogleMapsCoordinates(value: string): MapCoordinates | null {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the original URL when it contains an incomplete escape sequence.
  }

  const patterns: Array<{ regex: RegExp; order?: "lat-lon" | "lon-lat" }> = [
    { regex: /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/ },
    { regex: /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/ },
    { regex: /!4d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/, order: "lon-lat" },
    { regex: /(?:\/place\/|[?&](?:q|query|center)=)(-?\d+(?:\.\d+)?)[,%2C]+(-?\d+(?:\.\d+)?)/i },
    { regex: /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/, order: "lon-lat" },
  ];

  for (const { regex, order = "lat-lon" } of patterns) {
    const match = decoded.match(regex);
    if (!match) continue;
    const first = Number(match[1]);
    const second = Number(match[2]);
    return order === "lat-lon"
      ? validCoordinates(first, second)
      : validCoordinates(second, first);
  }

  return null;
}

export async function resolveGoogleMapsCoordinates(
  value: string,
  signal?: AbortSignal,
): Promise<MapCoordinates> {
  const trimmed = value.trim();
  if (!isGoogleMapsLink(trimmed)) {
    throw new Error("Paste a valid Google Maps link.");
  }

  const directCoordinates = extractGoogleMapsCoordinates(trimmed);
  if (directCoordinates) return directCoordinates;

  const response = await fetch("/api/resolve-google-maps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: trimmed }),
    signal,
  });
  const data = (await response.json().catch(() => ({}))) as {
    finalUrl?: string;
    error?: string;
  };

  if (!response.ok || !data.finalUrl) {
    throw new Error(data.error || "Could not read the location from this Google Maps link.");
  }

  const coordinates = extractGoogleMapsCoordinates(data.finalUrl);
  if (!coordinates) {
    throw new Error("This link did not contain a pinned map coordinate.");
  }
  return coordinates;
}
