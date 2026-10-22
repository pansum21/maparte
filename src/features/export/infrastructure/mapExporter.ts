import maplibregl from "maplibre-gl";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import {
  waitForMapIdle,
  createOffscreenContainer,
  resolveExportRenderParams,
} from "./exportUtils";

export interface CapturedMapResult {
  canvas: HTMLCanvasElement;
  markerProjection: MarkerProjectionInput;
  markerScaleX: number;
  markerScaleY: number;
  markerSizeScale: number;
}

/**
 * Captures the currently visible map view at full export resolution.
 * Uses a hidden offscreen map so PNG/PDF output remains sharp.
 */
export async function captureMapAsCanvas(
  map: MaplibreMap,
  exportWidth: number,
  exportHeight: number,
): Promise<CapturedMapResult> {
  await waitForMapIdle(map);

  const {
    center,
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
    center: [center.lng, center.lat],
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

    const glCanvas = exportMap.getCanvas();
    const sourceWidth = glCanvas.width || renderWidth;
    const sourceHeight = glCanvas.height || renderHeight;
    const outputScale = Math.min(1, exportWidth / sourceWidth, exportHeight / sourceHeight);
    const outputWidth = Math.max(1, Math.floor(sourceWidth * outputScale));
    const outputHeight = Math.max(1, Math.floor(sourceHeight * outputScale));
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = outputWidth;
    exportCanvas.height = outputHeight;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create 2D context for export canvas");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(glCanvas, 0, 0, outputWidth, outputHeight);

    return {
      canvas: exportCanvas,
      markerProjection,
      markerScaleX: outputWidth / sourceWidth,
      markerScaleY: outputHeight / sourceHeight,
      markerSizeScale,
    };
  } finally {
    exportMap.remove();
    offscreenContainer.remove();
  }
}
