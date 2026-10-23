import maplibregl, {
  type Map as MaplibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";

const EXPORT_MAP_TIMEOUT_MS = 20_000;

/**
 * Waits for MapLibre to finish rendering (idle, no active movement).
 * Rejects if tiles don't settle within the timeout.
 */
export function waitForMapIdle(map: MaplibreMap): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve();
    }, EXPORT_MAP_TIMEOUT_MS);

    const checkAndFinish = () => {
      if (settled) return;
      const isLoaded = typeof map.loaded === "function" ? map.loaded() : true;
      const tilesLoaded = typeof map.areTilesLoaded === "function" ? map.areTilesLoaded() : true;
      const isMoving = typeof map.isMoving === "function" ? map.isMoving() : false;

      if (isLoaded && tilesLoaded && !isMoving) {
        settled = true;
        window.clearTimeout(timeout);
        map.off("idle", checkAndFinish);
        map.off("render", checkAndFinish);
        // Small delay to allow WebGL frame buffer swap on mobile devices
        setTimeout(resolve, 200);
      }
    };

    map.on("idle", checkAndFinish);
    map.on("render", checkAndFinish);
    if (typeof map.triggerRepaint === "function") {
      map.triggerRepaint();
    }
    checkAndFinish();
  });
}

export function getDeviceMaxWebGlDimension(): number {
  if (typeof window === "undefined") return 4096;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (gl) {
      const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      const maxRenderbuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

      const viewportLimit =
        Array.isArray(maxViewportDims) || maxViewportDims instanceof Int32Array
          ? Math.min(maxViewportDims[0], maxViewportDims[1])
          : 4096;

      const safeLimit = Math.min(
        viewportLimit || 4096,
        maxRenderbuffer || 4096,
        maxTextureSize || 4096,
      );

      gl.getExtension("WEBGL_lose_context")?.loseContext();

      // Respect the current browser/GPU limit. The final raster export uses
      // these rendered dimensions so its PPI metadata cannot overstate detail.
      return Math.min(safeLimit, 8192);
    }
  } catch {
    // fallback
  }
  return 2560;
}

/**
 * Creates a fixed offscreen container for the export map.
 * Positioned in the visible viewport at (0, 0) underneath document body (z-index: -999)
 * with opacity: 1 and visibility: visible so mobile WebKit and Blink engines do not
 * cull or suspend WebGL rendering and tile decoding passes.
 */
export function createOffscreenContainer(
  width: number,
  height: number,
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "0";
  el.style.top = "0";
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.pointerEvents = "none";
  el.style.opacity = "1";
  el.style.visibility = "visible";
  el.style.zIndex = "-999";
  return el;
}

export interface ExportRenderParams {
  center: maplibregl.LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
  style: StyleSpecification;
  previewWidth: number;
  previewHeight: number;
  renderWidth: number;
  renderHeight: number;
  pixelRatio: number;
  markerProjection: MarkerProjectionInput;
  markerScaleX: number;
  markerScaleY: number;
  markerSizeScale: number;
  effectivePreviewWidth: number;
  effectivePreviewHeight: number;
  maxGlDimension: number;
}

/**
 * Derives all render dimensions and marker projection data needed to create
 * an offscreen export map that matches the live preview framing.
 */
export function resolveExportRenderParams(
  map: MaplibreMap,
  exportWidth: number,
  exportHeight: number,
  fullResolution = false,
  knownMaxGlDimension?: number,
): ExportRenderParams {
  const internalMapContainer = map.getContainer();
  const visibleContainer = internalMapContainer.parentElement;

  // Derive the actual overzoom scale from the DOM so the export matches the
  // live preview even when adaptive overzoom has scaled beyond the static
  // MAP_OVERZOOM_SCALE (e.g. on small mobile viewports).
  const actualOverzoomScale =
    visibleContainer && visibleContainer.clientWidth > 0
      ? internalMapContainer.clientWidth / visibleContainer.clientWidth
      : MAP_OVERZOOM_SCALE;

  const visiblePreviewWidth =
    visibleContainer?.clientWidth ||
    Math.round(internalMapContainer.clientWidth / actualOverzoomScale);
  const visiblePreviewHeight =
    visibleContainer?.clientHeight ||
    Math.round(internalMapContainer.clientHeight / actualOverzoomScale);
  const previewWidth = Math.max(visiblePreviewWidth, 1);
  const previewHeight = Math.max(visiblePreviewHeight, 1);

  const center = map.getCenter();
  const liveZoom = map.getZoom();
  const pitch = map.getPitch();
  const bearing = map.getBearing();
  const style = map.getStyle() as StyleSpecification;

  // Effective container dimensions that the live preview map rendered:
  const effectivePreviewWidth = Math.max(
    1,
    Math.round(previewWidth * actualOverzoomScale),
  );

  const safeMaxGlDim =
    knownMaxGlDimension ?? getDeviceMaxWebGlDimension();

  // High-detail supersampled render target:
  // Render the offscreen WebGL map at high resolution (up to safeMaxGlDim, target ~2560px for the larger side)
  // so that MapLibre stays at high zoom levels (zoom 14+), preserving all fine street networks,
  // residential roads, and building footprints, while supersampling cleanly onto the export canvas.
  const aspect = exportHeight / exportWidth;
  let renderWidth: number;
  let renderHeight: number;

  if (fullResolution) {
    renderWidth = exportWidth;
    renderHeight = exportHeight;
  } else if (aspect >= 1) {
    // Portrait: height is the larger dimension
    renderHeight = Math.min(safeMaxGlDim, Math.max(exportHeight, 2560));
    renderWidth = Math.max(1, Math.round(renderHeight / aspect));
  } else {
    // Landscape: width is the larger dimension
    renderWidth = Math.min(safeMaxGlDim, Math.max(exportWidth, 2560));
    renderHeight = Math.max(1, Math.round(renderWidth * aspect));
  }

  // Ensure neither dimension exceeds safeMaxGlDim
  const maxTargetSide = Math.max(renderWidth, renderHeight);
  if (!fullResolution && maxTargetSide > safeMaxGlDim) {
    const scaleDown = safeMaxGlDim / maxTargetSide;
    renderWidth = Math.max(1, Math.round(renderWidth * scaleDown));
    renderHeight = Math.max(1, Math.round(renderHeight * scaleDown));
  }

  // Adjust zoom so that the offscreen map at renderWidth covers the EXACT same geographical span
  // as the live preview map did at effectivePreviewWidth.
  // spanMeters = containerWidth * (C / (512 * 2^zoom))
  // Setting zoom = liveZoom + log2(renderWidth / effectivePreviewWidth) ensures spanMeters is identical.
  const deltaZoom = Math.log2(renderWidth / effectivePreviewWidth);
  const zoom = liveZoom + deltaZoom;

  const pixelRatio = 1;

  const markerProjection: MarkerProjectionInput = {
    centerLat: center.lat,
    centerLon: center.lng,
    zoom,
    bearingDeg: bearing,
    canvasWidth: renderWidth,
    canvasHeight: renderHeight,
  };

  return {
    center,
    zoom,
    pitch,
    bearing,
    style,
    previewWidth,
    previewHeight,
    renderWidth,
    renderHeight,
    pixelRatio,
    markerProjection,
    markerScaleX: exportWidth / renderWidth,
    markerScaleY: exportHeight / renderHeight,
    markerSizeScale: renderWidth / previewWidth,
    effectivePreviewWidth,
    effectivePreviewHeight: Math.max(1, Math.round(previewHeight * actualOverzoomScale)),
    maxGlDimension: safeMaxGlDim,
  };
}
