import maplibregl, {
  type Map as MaplibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";

const EXPORT_MAP_TIMEOUT_MS = 15_000;

/**
 * Waits for MapLibre to finish rendering (idle, no active movement).
 * Rejects if tiles don't settle within the timeout.
 */
export function waitForMapIdle(map: MaplibreMap): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Timed out while waiting for map tiles to render."));
    }, EXPORT_MAP_TIMEOUT_MS);

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };

    if (map.loaded() && !map.isMoving()) {
      finish();
      return;
    }

    map.once("idle", finish);
  });
}

function getDeviceMaxWebGlDimension(): number {
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

      const isMobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

      // On mobile devices, keep a ceiling of 2560px to avoid memory clamp on budget GPUs / iOS WebKit
      return isMobile ? Math.min(safeLimit, 2560) : Math.min(safeLimit, 8192);
    }
  } catch {
    // fallback
  }
  return 2560;
}

/**
 * Creates a fixed, invisible offscreen container for the export map.
 * Caller is responsible for appending to the DOM and removing when done.
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
  el.style.opacity = "0";
  el.style.zIndex = "-9999";
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
}

/**
 * Derives all render dimensions and marker projection data needed to create
 * an offscreen export map that matches the live preview framing.
 */
export function resolveExportRenderParams(
  map: MaplibreMap,
  exportWidth: number,
  exportHeight: number,
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

  // Determine safe render dimensions that do NOT exceed mobile WebGL limits.
  // Rendering directly at export dimensions (or bounded by safe WebGL limit)
  // prevents creating oversized 4950px+ canvases on mobile GPUs that clamp viewports.
  const safeMaxGlDim = getDeviceMaxWebGlDimension();
  let renderWidth = exportWidth;
  let renderHeight = exportHeight;

  const maxTargetSide = Math.max(renderWidth, renderHeight);
  if (maxTargetSide > safeMaxGlDim) {
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
  };
}
