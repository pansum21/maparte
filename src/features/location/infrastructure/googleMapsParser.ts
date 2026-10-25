export interface ParsedGoogleMapsLocation {
  lat: number | null;
  lon: number | null;
  placeName: string | null;
  shortUrl?: string;
  isGoogleMaps: boolean;
}

export function isValidLatLon(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Extracts coordinates, place name, and Google Maps metadata from a string or URL.
 * Supports:
 * 1. Google Maps place URLs (!3d<lat>!4d<lon> pinned destination coordinates)
 * 2. Viewport URLs (@<lat>,<lon>)
 * 3. Search / Query URLs (?q=<lat>,<lon>, ?query=, ?ll=, ?daddr=, ?center=)
 * 4. Raw decimal coordinates (e.g. "30.316500, 78.032200" or "30.3165 78.0322")
 * 5. DMS coordinates (e.g. 30°18'59.4"N 78°01'55.9"E)
 * 6. Short share links (maps.app.goo.gl / goo.gl/maps)
 */
export function parseCoordinatesOrGoogleMaps(
  input: string,
): ParsedGoogleMapsLocation | null {
  if (!input || typeof input !== "string") return null;
  const str = input.trim();
  if (str.length < 2) return null;

  // 1. Check for Google Maps URL inside the input
  const urlMatch = str.match(
    /(https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s]*)/i,
  );
  const isUrl = Boolean(urlMatch);
  const target = urlMatch ? urlMatch[1] : str;

  // Extract place name from /place/<Name>/ if present
  let placeName: string | null = null;
  const placeMatch = target.match(/\/place\/([^/@?]+)/i);
  if (placeMatch) {
    try {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
    } catch {
      placeName = placeMatch[1].replace(/\+/g, " ").trim();
    }
  }

  // 1a. Check for !3d<lat>!4d<lon> (Google Maps pin marker coordinates)
  const pinMatch = target.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pinMatch) {
    const lat = parseFloat(pinMatch[1]);
    const lon = parseFloat(pinMatch[2]);
    if (isValidLatLon(lat, lon)) {
      return { lat, lon, placeName, isGoogleMaps: true };
    }
  }

  // 1b. Check for @<lat>,<lon>
  const atMatch = target.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lon = parseFloat(atMatch[2]);
    if (isValidLatLon(lat, lon)) {
      return { lat, lon, placeName, isGoogleMaps: true };
    }
  }

  // 1c. Check query params (q=lat,lon or query=lat,lon or ll=lat,lon or daddr=lat,lon or center=lat,lon)
  const qCoordMatch = target.match(
    /[?&](?:q|query|ll|daddr|center)=(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/i,
  );
  if (qCoordMatch) {
    const lat = parseFloat(qCoordMatch[1]);
    const lon = parseFloat(qCoordMatch[2]);
    if (isValidLatLon(lat, lon)) {
      return { lat, lon, placeName, isGoogleMaps: true };
    }
  }

  // 2. Check for DMS coordinates: 30°18'59.4"N 78°01'55.9"E
  const dmsMatch = str.match(
    /(\d{1,2})[°\s]+(\d{1,2})['\s]+([\d.]+)?["\s]*([NSEW])[\s,]+(\d{1,3})[°\s]+(\d{1,2})['\s]+([\d.]+)?["\s]*([NSEW])/i,
  );
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = dmsMatch[3] ? parseFloat(dmsMatch[3]) : 0;
    const latHem = dmsMatch[4].toUpperCase();

    const lonDeg = parseFloat(dmsMatch[5]);
    const lonMin = parseFloat(dmsMatch[6]);
    const lonSec = dmsMatch[7] ? parseFloat(dmsMatch[7]) : 0;
    const lonHem = dmsMatch[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latHem === "S") lat = -lat;
    let lon = lonDeg + lonMin / 60 + lonSec / 3600;
    if (lonHem === "W") lon = -lon;

    if (isValidLatLon(lat, lon)) {
      return { lat, lon, placeName: null, isGoogleMaps: false };
    }
  }

  // 3. Check for raw decimal coordinates: "30.316500, 78.032200" or "30.3165 78.0322"
  const rawCoordMatch = str.match(
    /^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/,
  );
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lon = parseFloat(rawCoordMatch[2]);
    if (isValidLatLon(lat, lon)) {
      return { lat, lon, placeName: null, isGoogleMaps: false };
    }
  }

  // 4. Short link with or without surrounding text (e.g. "Taj Mahal https://maps.app.goo.gl/xxx")
  if (isUrl && /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(target)) {
    const cleanedText = str.replace(urlMatch![1], "").trim();
    return {
      lat: null,
      lon: null,
      placeName: cleanedText || null,
      shortUrl: urlMatch![1],
      isGoogleMaps: true,
    };
  }

  return null;
}

/**
 * Resolves short Google Maps URLs by expanding them via the serverless resolver
 * or parsing coordinates directly.
 */
export async function resolveGoogleMapsLocation(
  input: string,
  signal?: AbortSignal,
): Promise<{
  lat: number;
  lon: number;
  placeName: string | null;
  isGoogleMaps: boolean;
} | null> {
  const parsed = parseCoordinatesOrGoogleMaps(input);
  if (!parsed) return null;

  if (parsed.lat != null && parsed.lon != null) {
    return {
      lat: parsed.lat,
      lon: parsed.lon,
      placeName: parsed.placeName,
      isGoogleMaps: parsed.isGoogleMaps,
    };
  }

  if (parsed.shortUrl) {
    try {
      const endpoint = `/api/resolve-maps-url?url=${encodeURIComponent(parsed.shortUrl)}`;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4000);

      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: signal ?? controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.expandedUrl === "string") {
          const resolvedParsed = parseCoordinatesOrGoogleMaps(data.expandedUrl);
          if (resolvedParsed && resolvedParsed.lat != null && resolvedParsed.lon != null) {
            return {
              lat: resolvedParsed.lat,
              lon: resolvedParsed.lon,
              placeName: resolvedParsed.placeName || parsed.placeName,
              isGoogleMaps: true,
            };
          }
        }
      }
    } catch {
      // Fall through to returning null if expansion fails
    }
  }

  return null;
}
