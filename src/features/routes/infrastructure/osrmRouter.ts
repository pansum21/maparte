import type { Coordinate } from "@/shared/geo/types";

export type RoutingProfile = "walking" | "driving" | "bike";

interface OSRMResponse {
  code: string;
  routes?: Array<{
    geometry: {
      coordinates: [number, number][]; // [lon, lat]
    };
    distance: number;
    duration: number;
  }>;
  message?: string;
}

/**
 * Fetch real street-snapped route coordinates via Open Source Routing Machine (OSRM).
 * 100% Free, OpenStreetMap data, zero API key required.
 */
export async function fetchRoadRoute(
  waypoints: Coordinate[],
  profile: RoutingProfile = "walking",
): Promise<{ coordinates: Coordinate[]; distanceMeters: number }> {
  if (waypoints.length < 2) {
    return { coordinates: waypoints, distanceMeters: 0 };
  }

  // Format: {lon1},{lat1};{lon2},{lat2};...
  const coordsParam = waypoints
    .map((pt) => `${pt.lon.toFixed(6)},${pt.lat.toFixed(6)}`)
    .join(";");

  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsParam}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`);
    }

    const data: OSRMResponse = await response.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const rawCoords = data.routes[0].geometry.coordinates;
      const coordinates: Coordinate[] = rawCoords.map(([lon, lat]) => ({
        lat,
        lon,
      }));
      return {
        coordinates,
        distanceMeters: data.routes[0].distance,
      };
    }
  } catch (error) {
    console.warn("OSRM routing fallback to interpolated curve:", error);
  }

  // Fallback: Generate smooth interpolated geodesic curve if network fails
  return {
    coordinates: generateInterpolatedPoints(waypoints),
    distanceMeters: 0,
  };
}

/**
 * Generates an elegant Great-Circle high-altitude curved flight arc
 * for long-distance Travel Memories (e.g. between two cities or countries).
 */
export function createCurvedFlightArc(
  start: Coordinate,
  end: Coordinate,
  numPoints: number = 60,
  altitudeFactor: number = 0.2,
): Coordinate[] {
  const points: Coordinate[] = [];
  const startLatRad = (start.lat * Math.PI) / 180;
  const startLonRad = (start.lon * Math.PI) / 180;
  const endLatRad = (end.lat * Math.PI) / 180;
  const endLonRad = (end.lon * Math.PI) / 180;

  // Spherical distance
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((startLatRad - endLatRad) / 2), 2) +
          Math.cos(startLatRad) *
            Math.cos(endLatRad) *
            Math.pow(Math.sin((startLonRad - endLonRad) / 2), 2),
      ),
    );

  if (d < 0.0001) {
    return [start, end];
  }

  // Midpoint latitude boost to simulate beautiful curved flight trajectory
  const midLatOffset = Math.sin(Math.PI * 0.5) * altitudeFactor * (d * (180 / Math.PI));

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);

    const x =
      a * Math.cos(startLatRad) * Math.cos(startLonRad) +
      b * Math.cos(endLatRad) * Math.cos(endLonRad);
    const y =
      a * Math.cos(startLatRad) * Math.sin(startLonRad) +
      b * Math.cos(endLatRad) * Math.sin(endLonRad);
    const z = a * Math.sin(startLatRad) + b * Math.sin(endLatRad);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
    const lon = Math.atan2(y, x) * (180 / Math.PI);

    // Parabolic arc curve height
    const arcBulge = Math.sin(Math.PI * f) * midLatOffset * 0.25;

    points.push({
      lat: Math.max(-85, Math.min(85, lat + arcBulge)),
      lon,
    });
  }

  return points;
}

/**
 * Helper to smoothly interpolate points between waypoints
 */
function generateInterpolatedPoints(
  waypoints: Coordinate[],
  segmentsPerLeg: number = 24,
): Coordinate[] {
  const result: Coordinate[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    for (let j = 0; j < segmentsPerLeg; j++) {
      const t = j / segmentsPerLeg;
      result.push({
        lat: p1.lat + (p2.lat - p1.lat) * t,
        lon: p1.lon + (p2.lon - p1.lon) * t,
      });
    }
  }
  result.push(waypoints[waypoints.length - 1]);
  return result;
}
