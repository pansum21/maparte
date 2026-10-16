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

function canvasToDataUrl(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create 2D context for SVG overlay export.");
  }
  ctx.clearRect(0, 0, width, height);
  draw(ctx);
  return canvas.toDataURL("image/png");
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

export async function createLayeredSvgBlobFromMap({
  map,
  exportWidth,
  exportHeight,
  theme,
  center,
  displayCity,
  displayCountry,
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

    const exportStyle = exportMap.getStyle();
    const layerIds = (exportStyle.layers ?? []).map((layer) => layer.id);
    const originalVisibility = new Map<string, string>();
    const visibleLayerIds = layerIds.filter((layerId) => {
      const visibility = String(
        exportMap.getLayoutProperty(layerId, "visibility") ?? "visible",
      );
      originalVisibility.set(layerId, visibility);
      return visibility !== "none";
    });

    for (const layerId of visibleLayerIds) {
      exportMap.setLayoutProperty(layerId, "visibility", "none");
    }
    await waitForMapIdle(exportMap);

    const mapLayerDataUrls: { id: string; dataUrl: string }[] = [];
    for (const layerId of visibleLayerIds) {
      exportMap.setLayoutProperty(layerId, "visibility", "visible");
      await waitForMapIdle(exportMap);
      mapLayerDataUrls.push({
        id: layerId,
        dataUrl: renderMapCanvasToDataUrl(
          exportMap.getCanvas(),
          exportWidth,
          exportHeight,
        ),
      });
      exportMap.setLayoutProperty(layerId, "visibility", "none");
      await waitForMapIdle(exportMap);
    }

    for (const layerId of layerIds) {
      const visibility = originalVisibility.get(layerId) ?? "visible";
      exportMap.setLayoutProperty(layerId, "visibility", visibility);
    }
    await waitForMapIdle(exportMap);

    const overlayLayers: { id: string; dataUrl: string }[] = [];

    if (showOverlay) {
      overlayLayers.push({
        id: "fades",
        dataUrl: canvasToDataUrl(exportWidth, exportHeight, (ctx) => {
          applyFades(ctx, exportWidth, exportHeight, theme.ui.bg);
        }),
      });
    }

    if (routes.length > 0) {
      const routesCanvas = document.createElement("canvas");
      routesCanvas.width = exportWidth;
      routesCanvas.height = exportHeight;
      const routesCtx = routesCanvas.getContext("2d");
      if (routesCtx) {
        drawRoutesOnCanvas(
          routesCtx,
          routes,
          markerProjection,
          markerScaleX,
          markerScaleY,
          markerSizeScale,
        );
        overlayLayers.push({
          id: "routes",
          dataUrl: routesCanvas.toDataURL("image/png"),
        });
      }
    }

    if (routes.length > 0 && markerIcons.length > 0) {
      const endpointItems = routeEndpointMarkerItems(routes);
      if (endpointItems.length > 0) {
        const endpointsCanvas = document.createElement("canvas");
        endpointsCanvas.width = exportWidth;
        endpointsCanvas.height = exportHeight;
        const endpointsCtx = endpointsCanvas.getContext("2d");
        if (endpointsCtx) {
          await drawMarkersOnCanvas(
            endpointsCtx,
            endpointItems,
            markerIcons,
            markerProjection,
            markerScaleX,
            markerScaleY,
            markerSizeScale,
          );
          overlayLayers.push({
            id: "route-endpoints",
            dataUrl: endpointsCanvas.toDataURL("image/png"),
          });
        }
      }
    }

    if (markers.length > 0 && markerIcons.length > 0) {
      // drawMarkersOnCanvas is async; render through explicit await canvas path.
      const markersCanvas = document.createElement("canvas");
      markersCanvas.width = exportWidth;
      markersCanvas.height = exportHeight;
      const markersCtx = markersCanvas.getContext("2d");
      if (markersCtx) {
        await drawMarkersOnCanvas(
          markersCtx,
          markers,
          markerIcons,
          markerProjection,
          markerScaleX,
          markerScaleY,
          markerSizeScale,
        );
        overlayLayers.push({
          id: "markers",
          dataUrl: markersCanvas.toDataURL("image/png"),
        });
      }
    }

    const textColor = theme.ui?.text || "#111111";
    const landColor = theme.map?.land || "#808080";
    const attributionColor = computeAttributionColor(textColor, landColor, showOverlay);
    const attributionAlpha = showOverlay ? 0.55 : 0.9;
    const cleanFont = (fontFamily || "Space Grotesk").replace(/['"]/g, "").trim();
    const titleFontFamily = cleanFont ? `'${cleanFont}', 'Space Grotesk', sans-serif` : "'Space Grotesk', sans-serif";
    const bodyFontFamily = "'IBM Plex Mono', 'Space Grotesk', monospace";

    const dimScale = Math.max(
      0.45,
      Math.min(exportWidth, exportHeight) / TEXT_DIMENSION_REFERENCE_PX,
    );
    const attributionFontSize = ATTRIBUTION_FONT_BASE_PX * dimScale;

    let vectorTypographySvg = "";

    if (showPosterText) {
      const cityLabel = formatCityLabel(displayCity);
      const cityFontSize = CITY_FONT_BASE_PX * dimScale * computeCityFontScale(displayCity);
      const countryFontSize = COUNTRY_FONT_BASE_PX * dimScale;
      const coordinateFontSize = COORDS_FONT_BASE_PX * dimScale;
      const cityY = exportHeight * TEXT_CITY_Y_RATIO;
      const lineY = exportHeight * TEXT_DIVIDER_Y_RATIO;
      const countryY = exportHeight * TEXT_COUNTRY_Y_RATIO;
      const coordinatesY = exportHeight * TEXT_COORDS_Y_RATIO;
      const coordsText = formatCoordinates(center.lat, center.lon);
      const lineW = 3 * dimScale;
      const lineX1 = exportWidth * 0.4;
      const lineX2 = exportWidth * 0.6;

      vectorTypographySvg += `
  <text x="${exportWidth * 0.5}" y="${cityY}" text-anchor="middle" dominant-baseline="central" font-family="${titleFontFamily}" font-size="${cityFontSize}" font-weight="700" fill="${textColor}">${escapeXml(cityLabel)}</text>
  <line x1="${lineX1}" y1="${lineY}" x2="${lineX2}" y2="${lineY}" stroke="${textColor}" stroke-width="${lineW}" stroke-linecap="round" />
  <text x="${exportWidth * 0.5}" y="${countryY}" text-anchor="middle" dominant-baseline="central" font-family="${titleFontFamily}" font-size="${countryFontSize}" font-weight="300" letter-spacing="0.1em" fill="${textColor}">${escapeXml(displayCountry.toUpperCase())}</text>
  <text x="${exportWidth * 0.5}" y="${coordinatesY}" text-anchor="middle" dominant-baseline="central" font-family="${bodyFontFamily}" font-size="${coordinateFontSize}" font-weight="400" opacity="0.75" fill="${textColor}">${escapeXml(coordsText)}</text>
`;
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

    const mapLayerGroups = mapLayerDataUrls
      .map(
        (layer) => `<g id="map-layer-${sanitizeLayerId(layer.id)}">
  <image href="${layer.dataUrl}" width="${exportWidth}" height="${exportHeight}" preserveAspectRatio="none" />
</g>`,
      )
      .join("\n");

    const overlayGroups = overlayLayers
      .map(
        (layer) => `<g id="overlay-layer-${sanitizeLayerId(layer.id)}">
  <image href="${layer.dataUrl}" width="${exportWidth}" height="${exportHeight}" preserveAspectRatio="none" />
</g>`,
      )
      .join("\n");

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">
${mapLayerGroups}
${overlayGroups}
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
