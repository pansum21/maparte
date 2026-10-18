import maplibregl from "maplibre-gl";
import type { Map as MaplibreMap } from "maplibre-gl";
import type {
  MarkerIconDefinition,
  MarkerItem,
} from "@/features/markers/domain/types";
import { drawMarkersOnCanvas } from "@/features/markers/infrastructure/rendering";
import type { Route } from "@/features/routes/domain/types";
import { drawRoutesOnCanvas } from "@/features/routes/infrastructure/rendering";
import { routeEndpointMarkerItems } from "@/features/routes/infrastructure/helpers";
import { applyFades } from "@/features/poster/infrastructure/renderer/layers";
import { formatCoordinates } from "@/shared/geo/posterBounds";
import { APP_CREDIT_URL } from "@/core/config";
import {
  TEXT_DIMENSION_REFERENCE_PX,
  TEXT_CITY_Y_RATIO,
  TEXT_DIVIDER_Y_RATIO,
  TEXT_COUNTRY_Y_RATIO,
  TEXT_COORDS_Y_RATIO,
  TEXT_EDGE_MARGIN_RATIO,
  CITY_FONT_BASE_PX,
  COUNTRY_FONT_BASE_PX,
  COORDS_FONT_BASE_PX,
  ATTRIBUTION_FONT_BASE_PX,
  formatCityLabel,
  computeCityFontScale,
  computeAttributionColor,
} from "@/features/poster/domain/textLayout";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import { blendHex } from "@/shared/utils/color";
import {
  waitForMapIdle,
  createOffscreenContainer,
  resolveExportRenderParams,
} from "./exportUtils";

interface LayeredSvgOptions {
  map: MaplibreMap;
  exportWidth: number;
  exportHeight: number;
  theme: ResolvedTheme;
  center: { lat: number; lon: number };
  displayCity: string;
  displayCountry: string;
  customDate?: string;
  fontFamily?: string;
  showPosterText: boolean;
  showOverlay: boolean;
  includeCredits: boolean;
  markers: MarkerItem[];
  markerIcons: MarkerIconDefinition[];
  routes?: Route[];
}

function renderMapCanvasToDataUrl(
  mapCanvas: HTMLCanvasElement,
  exportWidth: number,
  exportHeight: number,
): string {
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = exportWidth;
  layerCanvas.height = exportHeight;
  const ctx = layerCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create 2D context for SVG layer export.");
  }
  ctx.clearRect(0, 0, exportWidth, exportHeight);
  ctx.drawImage(mapCanvas, 0, 0, exportWidth, exportHeight);
  return layerCanvas.toDataURL("image/png");
}

function sanitizeLayerId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function interpolateWidth(stops: [number, number][], zoom: number): number {
  if (!stops || stops.length === 0) return 1;
  if (zoom <= stops[0][0]) return stops[0][1];
  if (zoom >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [z1, w1] = stops[i];
    const [z2, w2] = stops[i + 1];
    if (zoom >= z1 && zoom <= z2) {
      const t = (zoom - z1) / (z2 - z1);
      return w1 + t * (w2 - w1);
    }
  }
  return stops[stops.length - 1][1];
}

const ROAD_MAJOR_STOPS: [number, number][] = [
  [0, 0.36],
  [3, 0.52],
  [9, 1.1],
  [14, 2.05],
  [18, 3.6],
  [20, 7.2],
  [22, 14.0],
];

const ROAD_MINOR_HIGH_STOPS: [number, number][] = [
  [6, 0.46],
  [10, 0.8],
  [14, 1.48],
  [18, 2.8],
  [20, 5.6],
  [22, 11.0],
];

const ROAD_MINOR_MID_STOPS: [number, number][] = [
  [6, 0.34],
  [10, 0.62],
  [14, 1.2],
  [18, 2.4],
  [20, 4.8],
  [22, 9.5],
];

const ROAD_MINOR_LOW_STOPS: [number, number][] = [
  [6, 0.24],
  [10, 0.44],
  [14, 0.84],
  [18, 1.8],
  [20, 3.6],
  [22, 7.2],
];

const ROAD_PATH_STOPS: [number, number][] = [
  [8, 0.2],
  [12, 0.42],
  [16, 0.85],
  [18, 1.4],
  [20, 2.6],
  [22, 5.0],
];

const WATERWAY_STOPS: [number, number][] = [
  [0, 0.2],
  [6, 0.34],
  [12, 0.8],
  [18, 2.4],
  [20, 5.0],
  [22, 10.0],
];

const RAIL_STOPS: [number, number][] = [
  [3, 0.4],
  [6, 0.7],
  [10, 1.0],
  [18, 1.6],
  [20, 3.2],
  [22, 5.5],
];

function coordsToSvgPath(
  geometry: any,
  project: (lngLat: [number, number]) => { x: number; y: number },
): string {
  if (!geometry || !geometry.type || !geometry.coordinates) return "";

  const fmt = (c: [number, number]) => {
    const pt = project(c);
    return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  };

  if (geometry.type === "LineString") {
    const coords = geometry.coordinates as [number, number][];
    if (coords.length < 2) return "";
    return `M ${coords.map(fmt).join(" L ")}`;
  }

  if (geometry.type === "MultiLineString") {
    const lines = geometry.coordinates as [number, number][][];
    return lines
      .filter((line) => line.length >= 2)
      .map((line) => `M ${line.map(fmt).join(" L ")}`)
      .join(" ");
  }

  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates as [number, number][][];
    return rings
      .filter((ring) => ring.length >= 3)
      .map((ring) => `M ${ring.map(fmt).join(" L ")} Z`)
      .join(" ");
  }

  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates as [number, number][][][];
    return polys
      .map((rings) =>
        rings
          .filter((ring) => ring.length >= 3)
          .map((ring) => `M ${ring.map(fmt).join(" L ")} Z`)
          .join(" "),
      )
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

export async function createLayeredSvgBlobFromMap({
  map,
  exportWidth,
  exportHeight,
  theme,
  center,
  displayCity,
  displayCountry,
  customDate,
  fontFamily,
  showPosterText,
  showOverlay,
  includeCredits,
  markers,
  markerIcons,
  routes = [],
}: LayeredSvgOptions): Promise<Blob> {
  await waitForMapIdle(map);

  const {
    center: mapCenter,
    zoom,
    pitch,
    bearing,
    style,
    renderWidth,
    renderHeight,
    pixelRatio,
    markerProjection,
    markerScaleX,
    markerScaleY,
    markerSizeScale,
  } = resolveExportRenderParams(map, exportWidth, exportHeight);

  const offscreenContainer = createOffscreenContainer(renderWidth, renderHeight);
  document.body.appendChild(offscreenContainer);

  const exportMap = new maplibregl.Map({
    container: offscreenContainer,
    style,
    center: [mapCenter.lng, mapCenter.lat],
    zoom,
    pitch,
    bearing,
    interactive: false,
    attributionControl: false,
    pixelRatio,
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  try {
    await waitForMapIdle(exportMap);

    const projectCoord = (coord: [number, number]) => {
      const pt = exportMap.project(coord);
      return {
        x: pt.x * (exportWidth / renderWidth),
        y: pt.y * (exportHeight / renderHeight),
      };
    };

    const currentZoom = exportMap.getZoom();
    const scaleFactor = Math.min(exportWidth, exportHeight) / 1000;
    const buildingFill =
      theme.map.buildings ||
      blendHex(theme.map.land || "#ffffff", theme.ui.text || "#111111", 0.14);

    const exportStyle = exportMap.getStyle();
    const layerDefs = exportStyle.layers ?? [];

    let vectorLayersSvg = "";
    let totalVectorElements = 0;

    // 1. Pure Vector Background
    vectorLayersSvg += `<g id="map-background">\n  <rect width="${exportWidth}" height="${exportHeight}" fill="${theme.map.land}" />\n</g>\n`;

    // 2. Query features and extract mathematical vector paths
    for (const layer of layerDefs) {
      if (layer.id === "background") continue;

      let features: any[] = [];
      try {
        features = exportMap.queryRenderedFeatures({ layers: [layer.id] });
      } catch {
        features = [];
      }

      if (!features || features.length === 0) continue;

      const pathChunks: string[] = [];
      for (const feat of features) {
        const d = coordsToSvgPath(feat.geometry, projectCoord);
        if (d) pathChunks.push(d);
      }

      if (pathChunks.length === 0) continue;

      totalVectorElements += pathChunks.length;
      const combinedD = pathChunks.join(" ");
      const layerIdSanitized = sanitizeLayerId(layer.id);

      // Determine layer styling
      if (layer.id === "landcover") {
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="${theme.map.landcover}" fill-opacity="0.7" />\n</g>\n`;
      } else if (layer.id === "park") {
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="${theme.map.parks}" />\n</g>\n`;
      } else if (layer.id === "water") {
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="${theme.map.water}" />\n</g>\n`;
      } else if (layer.id === "aeroway") {
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="${theme.map.aeroway}" fill-opacity="0.85" />\n</g>\n`;
      } else if (layer.id === "building") {
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="${buildingFill}" fill-opacity="0.84" />\n</g>\n`;
      } else if (layer.id === "waterway") {
        const w = Math.max(0.5, interpolateWidth(WATERWAY_STOPS, currentZoom) * scaleFactor);
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="none" stroke="${theme.map.waterway}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />\n</g>\n`;
      } else if (layer.id === "rail") {
        const w = Math.max(0.5, interpolateWidth(RAIL_STOPS, currentZoom) * scaleFactor);
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="none" stroke="${theme.map.rail}" stroke-width="${w.toFixed(2)}" stroke-dasharray="6,4" stroke-opacity="0.7" stroke-linecap="round" stroke-linejoin="round" />\n</g>\n`;
      } else if (layer.id.includes("casing")) {
        let baseWidth = interpolateWidth(ROAD_MINOR_MID_STOPS, currentZoom);
        let casingFactor = 1.25;
        if (layer.id.includes("major")) {
          baseWidth = interpolateWidth(ROAD_MAJOR_STOPS, currentZoom);
          casingFactor = 1.38;
        } else if (layer.id.includes("high")) {
          baseWidth = interpolateWidth(ROAD_MINOR_HIGH_STOPS, currentZoom);
          casingFactor = 1.45;
        } else if (layer.id.includes("path")) {
          baseWidth = interpolateWidth(ROAD_PATH_STOPS, currentZoom);
          casingFactor = 1.6;
        }
        const w = Math.max(1, baseWidth * casingFactor * scaleFactor);
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="none" stroke="${theme.map.roads.outline}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.85" />\n</g>\n`;
      } else if (layer.id.includes("road")) {
        let roadColor = theme.map.roads.minor_mid;
        let w = interpolateWidth(ROAD_MINOR_MID_STOPS, currentZoom);
        if (layer.id.includes("major")) {
          roadColor = theme.map.roads.major;
          w = interpolateWidth(ROAD_MAJOR_STOPS, currentZoom);
        } else if (layer.id.includes("high")) {
          roadColor = theme.map.roads.minor_high;
          w = interpolateWidth(ROAD_MINOR_HIGH_STOPS, currentZoom);
        } else if (layer.id.includes("low")) {
          roadColor = theme.map.roads.minor_low;
          w = interpolateWidth(ROAD_MINOR_LOW_STOPS, currentZoom);
        } else if (layer.id.includes("path")) {
          roadColor = theme.map.roads.path;
          w = interpolateWidth(ROAD_PATH_STOPS, currentZoom);
        }
        const strokeW = Math.max(0.4, w * scaleFactor);
        vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="none" stroke="${roadColor}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />\n</g>\n`;
      } else {
        // Fallback for custom layers
        const fillProp = exportMap.getPaintProperty(layer.id, "fill-color");
        if (fillProp && typeof fillProp === "string") {
          vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="${fillProp}" />\n</g>\n`;
        } else {
          const lineProp = exportMap.getPaintProperty(layer.id, "line-color");
          const strokeColor = typeof lineProp === "string" ? lineProp : theme.map.roads.minor_mid;
          vectorLayersSvg += `<g id="map-layer-${layerIdSanitized}">\n  <path d="${combinedD}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />\n</g>\n`;
        }
      }
    }

    // Safety fallback: if WebGL context didn't return vector features, fallback to canvas capture
    if (totalVectorElements === 0) {
      vectorLayersSvg = `<g id="map-layer-raster-fallback">\n  <image href="${renderMapCanvasToDataUrl(exportMap.getCanvas(), exportWidth, exportHeight)}" width="${exportWidth}" height="${exportHeight}" preserveAspectRatio="none" />\n</g>\n`;
    }

    // 3. Pure Vector Routes
    let routesSvg = "";
    if (routes.length > 0) {
      const routePaths: string[] = [];
      for (let rIdx = 0; rIdx < routes.length; rIdx++) {
        const route = routes[rIdx];
        if (!route.visible || !route.segments || route.segments.length === 0) continue;
        const segmentPaths: string[] = [];
        for (const seg of route.segments) {
          if (!seg || seg.length < 2) continue;
          const coords: [number, number][] = seg.map((pt) => [pt.lon, pt.lat]);
          const d = coordsToSvgPath({ type: "LineString", coordinates: coords }, projectCoord);
          if (d) segmentPaths.push(d);
        }
        if (segmentPaths.length > 0) {
          const routeColor = route.color || "#e63946";
          const routeWidth = Math.max(1, (route.strokeWidth || 3) * scaleFactor);
          const dash =
            route.lineStyle === "dashed" ? ' stroke-dasharray="8,6"' : "";
          const opacity = route.opacity ?? 1;
          routePaths.push(
            `<path id="route-${rIdx}" d="${segmentPaths.join(" ")}" fill="none" stroke="${routeColor}" stroke-width="${routeWidth.toFixed(2)}"${dash} stroke-opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" />`,
          );
        }
      }
      if (routePaths.length > 0) {
        routesSvg = `<g id="overlay-routes">\n${routePaths.join("\n")}\n</g>\n`;
      }
    }

    // 4. Pure Vector Fades
    let fadesSvg = "";
    if (showOverlay) {
      const topFadeHeight = exportHeight * 0.22;
      const bottomFadeHeight = exportHeight * 0.32;
      const bottomFadeY = exportHeight - bottomFadeHeight;
      fadesSvg = `
<defs>
  <linearGradient id="maparte-fade-top" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${theme.ui.bg}" stop-opacity="0.96" />
    <stop offset="60%" stop-color="${theme.ui.bg}" stop-opacity="0.45" />
    <stop offset="100%" stop-color="${theme.ui.bg}" stop-opacity="0" />
  </linearGradient>
  <linearGradient id="maparte-fade-bottom" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${theme.ui.bg}" stop-opacity="0" />
    <stop offset="40%" stop-color="${theme.ui.bg}" stop-opacity="0.5" />
    <stop offset="100%" stop-color="${theme.ui.bg}" stop-opacity="0.98" />
  </linearGradient>
</defs>
<g id="overlay-fades">
  <rect x="0" y="0" width="${exportWidth}" height="${topFadeHeight.toFixed(1)}" fill="url(#maparte-fade-top)" />
  <rect x="0" y="${bottomFadeY.toFixed(1)}" width="${exportWidth}" height="${bottomFadeHeight.toFixed(1)}" fill="url(#maparte-fade-bottom)" />
</g>
`;
    }

    // 5. Pure Vector Markers
    let markersSvg = "";
    if (markers.length > 0) {
      const markerItemsSvg: string[] = [];
      for (const m of markers) {
        const pt = projectCoord([m.lon, m.lat]);
        const radius = Math.max(4, (m.size || 16) * 0.5 * scaleFactor);
        const strokeW = Math.max(1.5, radius * 0.28);
        markerItemsSvg.push(`  <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${theme.ui.text}" stroke="${theme.ui.bg}" stroke-width="${strokeW.toFixed(1)}" />`);
        markerItemsSvg.push(`  <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(radius * 0.35).toFixed(1)}" fill="${theme.ui.bg}" />`);
      }
      if (markerItemsSvg.length > 0) {
        markersSvg = `<g id="overlay-markers">\n${markerItemsSvg.join("\n")}\n</g>\n`;
      }
    }

    // 6. Vector Typography
    const textColor = theme.ui?.text || "#111111";
    const landColor = theme.map?.land || "#808080";
    const attributionColor = computeAttributionColor(textColor, landColor, showOverlay);
    const attributionAlpha = showOverlay ? 0.55 : 0.9;
    const cleanFont = (fontFamily || "Space Grotesk").replace(/['"]/g, "").trim();
    const titleFontFamily = cleanFont ? `'${cleanFont}', 'Space Grotesk', sans-serif` : "'Space Grotesk', sans-serif";
    const bodyFontFamily = "'IBM Plex Mono', 'Space Grotesk', monospace";

    const dimScale =
      Math.min(exportWidth, exportHeight) / TEXT_DIMENSION_REFERENCE_PX;
    const maxContentWidth = exportWidth * 0.88;

    let vectorTypographySvg = "";

    if (showPosterText) {
      const hasTagline = Boolean(customDate && customDate.trim().length > 0);
      const cityLabel = formatCityLabel(displayCity);
      let cityFontSize = CITY_FONT_BASE_PX * dimScale * computeCityFontScale(displayCity);

      // SVG auto-fit: ensure city name never overflows export width
      const approxCityWidth = cityLabel.length * cityFontSize * 0.65;
      if (approxCityWidth > maxContentWidth && approxCityWidth > 0) {
        cityFontSize = Math.max(12, cityFontSize * (maxContentWidth / approxCityWidth));
      }

      let countryFontSize = COUNTRY_FONT_BASE_PX * dimScale;
      const approxCountryWidth = displayCountry.length * countryFontSize * 0.65;
      if (approxCountryWidth > maxContentWidth && approxCountryWidth > 0) {
        countryFontSize = Math.max(10, countryFontSize * (maxContentWidth / approxCountryWidth));
      }

      const coordsText = formatCoordinates(center.lat, center.lon);
      let coordinateFontSize = COORDS_FONT_BASE_PX * dimScale;
      const approxCoordsWidth = coordsText.length * coordinateFontSize * 0.6;
      if (approxCoordsWidth > maxContentWidth && approxCoordsWidth > 0) {
        coordinateFontSize = Math.max(8, coordinateFontSize * (maxContentWidth / approxCoordsWidth));
      }

      const taglineFontSize = Math.max(12, Math.round(countryFontSize * 0.88));
      const cityY = exportHeight * TEXT_CITY_Y_RATIO;
      const lineY = exportHeight * TEXT_DIVIDER_Y_RATIO;
      const countryY = exportHeight * (hasTagline ? 0.896 : TEXT_COUNTRY_Y_RATIO);
      const taglineY = exportHeight * 0.918;
      const coordinatesY = exportHeight * (hasTagline ? 0.938 : TEXT_COORDS_Y_RATIO);
      const lineW = Math.max(1, 3 * dimScale);
      const lineX1 = exportWidth * 0.4;
      const lineX2 = exportWidth * 0.6;

      vectorTypographySvg += `
  <text x="${exportWidth * 0.5}" y="${cityY}" text-anchor="middle" dominant-baseline="central" font-family="${titleFontFamily}" font-size="${cityFontSize}" font-weight="700" fill="${textColor}">${escapeXml(cityLabel)}</text>
  <line x1="${lineX1}" y1="${lineY}" x2="${lineX2}" y2="${lineY}" stroke="${textColor}" stroke-width="${lineW}" stroke-linecap="round" />
  <text x="${exportWidth * 0.5}" y="${countryY}" text-anchor="middle" dominant-baseline="central" font-family="${titleFontFamily}" font-size="${countryFontSize}" font-weight="300" letter-spacing="0.1em" fill="${textColor}">${escapeXml(displayCountry.toUpperCase())}</text>
`;
      if (hasTagline) {
        vectorTypographySvg += `
  <text x="${exportWidth * 0.5}" y="${taglineY}" text-anchor="middle" dominant-baseline="central" font-family="${bodyFontFamily}" font-size="${taglineFontSize}" font-weight="500" opacity="0.88" fill="${textColor}">${escapeXml(customDate!.trim())}</text>
`;
      }
      vectorTypographySvg += `
  <text x="${exportWidth * 0.5}" y="${coordinatesY}" text-anchor="middle" dominant-baseline="central" font-family="${bodyFontFamily}" font-size="${coordinateFontSize}" font-weight="400" opacity="0.75" fill="${textColor}">${escapeXml(coordsText)}</text>
`;
    }

    let attributionFontSize = ATTRIBUTION_FONT_BASE_PX * dimScale;
    const osmText = "© OpenStreetMap contributors";
    const appText = `✦ MAPARTE • ${APP_CREDIT_URL}`;
    const approxOsmWidth = osmText.length * attributionFontSize * 0.6;
    const approxAppWidth = includeCredits ? appText.length * attributionFontSize * 0.6 : 0;
    const edgeMargin = exportWidth * TEXT_EDGE_MARGIN_RATIO;
    const availableAttrWidth = exportWidth - (edgeMargin * 2) - (includeCredits ? exportWidth * 0.04 : 0);
    const requiredAttrWidth = approxOsmWidth + approxAppWidth;
    if (requiredAttrWidth > availableAttrWidth && requiredAttrWidth > 0) {
      attributionFontSize = Math.max(7, attributionFontSize * (availableAttrWidth / requiredAttrWidth));
    }

    const attrY = exportHeight * (1 - TEXT_EDGE_MARGIN_RATIO);
    const osmX = exportWidth * (1 - TEXT_EDGE_MARGIN_RATIO);
    vectorTypographySvg += `
  <text x="${osmX}" y="${attrY}" text-anchor="end" dominant-baseline="auto" font-family="${bodyFontFamily}" font-size="${attributionFontSize}" font-weight="300" opacity="${attributionAlpha}" fill="${attributionColor}">© OpenStreetMap contributors</text>
`;

    if (includeCredits) {
      const credX = exportWidth * TEXT_EDGE_MARGIN_RATIO;
      vectorTypographySvg += `
  <text x="${credX}" y="${attrY}" text-anchor="start" dominant-baseline="auto" font-family="${bodyFontFamily}" font-size="${attributionFontSize}" font-weight="300" opacity="${attributionAlpha}" fill="${attributionColor}">✦ MAPARTE • ${escapeXml(APP_CREDIT_URL)}</text>
`;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">
${vectorLayersSvg}
${routesSvg}
${fadesSvg}
${markersSvg}
<g id="vector-typography">
${vectorTypographySvg}
</g>
</svg>`;

    return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  } finally {
    exportMap.remove();
    offscreenContainer.remove();
  }
}
