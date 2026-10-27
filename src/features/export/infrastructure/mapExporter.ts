import maplibregl from "maplibre-gl";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MarkerProjectionInput } from "@/features/markers/domain/types";
import {
  waitForMapIdle,
  createOffscreenContainer,
  resolveExportRenderParams,
} from "./exportUtils";
import { buildExportRenderTiles } from "./renderTiles";

export interface CapturedMapResult {
  canvas: HTMLCanvasElement;
  mapAlreadyInset: boolean;
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
  showWhiteMat = false,
  mapInsetXRatio = 0.055,
  mapInsetYRatio = 0.055,
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
    maxGlDimension,
  } = resolveExportRenderParams(map, exportWidth, exportHeight);

  // A phone GPU may cap a single WebGL surface below the requested print
  // dimensions. Render overlapping sections at the *same full-output zoom*,
  // then stitch only their non-overlapping cores into the print canvas.
  const maxRequestedSide = Math.max(exportWidth, exportHeight);
  if (maxRequestedSide > maxGlDimension) {
    const fullResolutionParams = resolveExportRenderParams(
      map,
      exportWidth,
      exportHeight,
      true,
      maxGlDimension,
    );
    const tiles = buildExportRenderTiles(
      exportWidth,
      exportHeight,
      fullResolutionParams.maxGlDimension,
    );
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const outputContext = exportCanvas.getContext("2d");
    if (!outputContext) {
      throw new Error("This device could not allocate the full-size print canvas.");
    }
    if (showWhiteMat) {
      outputContext.fillStyle = "#fff";
      outputContext.fillRect(0, 0, exportWidth, exportHeight);
      outputContext.save();
      const mapW = exportWidth * (1 - mapInsetXRatio * 2);
      const mapH = exportHeight * (1 - mapInsetYRatio * 2);
      outputContext.translate(exportWidth * mapInsetXRatio, exportHeight * mapInsetYRatio);
      outputContext.scale(mapW / exportWidth, mapH / exportHeight);
    }

    const sourceContainer = map.getContainer();
    const scaleToExport = exportWidth / fullResolutionParams.effectivePreviewWidth;
    for (const tile of tiles) {
      const offsetX =
        tile.renderX + tile.renderWidth / 2 - exportWidth / 2;
      const offsetY =
        tile.renderY + tile.renderHeight / 2 - exportHeight / 2;
      const tileCenter = map.unproject([
        sourceContainer.clientWidth / 2 + offsetX / scaleToExport,
        sourceContainer.clientHeight / 2 + offsetY / scaleToExport,
      ]);
      const tileContainer = createOffscreenContainer(
        tile.renderWidth,
        tile.renderHeight,
      );
      document.body.appendChild(tileContainer);

      const tileMap = new maplibregl.Map({
        container: tileContainer,
        style: fullResolutionParams.style,
        center: [tileCenter.lng, tileCenter.lat],
        zoom: fullResolutionParams.zoom,
        pitch: fullResolutionParams.pitch,
        bearing: fullResolutionParams.bearing,
        interactive: false,
        attributionControl: false,
        pixelRatio: 1,
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });

      try {
        await waitForMapIdle(tileMap);
        const tileCanvas = tileMap.getCanvas();
        const gl =
          tileCanvas.getContext("webgl2") ||
          tileCanvas.getContext("webgl") ||
          (tileCanvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
        const renderedWidth = gl?.drawingBufferWidth || tileCanvas.width;
        const renderedHeight = gl?.drawingBufferHeight || tileCanvas.height;
        if (
          renderedWidth < tile.renderWidth ||
          renderedHeight < tile.renderHeight
        ) {
          throw new Error(
            `This device's graphics limit is below the print tile size (${renderedWidth} × ${renderedHeight}px).`,
          );
        }

        outputContext.drawImage(
          tileCanvas,
          tile.sourceX,
          tile.sourceY,
          tile.width,
          tile.height,
          tile.x,
          tile.y,
          tile.width,
          tile.height,
        );
      } finally {
        tileMap.remove();
        tileContainer.remove();
      }
    }
    if (showWhiteMat) {
      outputContext.restore();
    }

    return {
      canvas: exportCanvas,
      mapAlreadyInset: showWhiteMat,
      markerProjection: fullResolutionParams.markerProjection,
      markerScaleX: fullResolutionParams.markerScaleX,
      markerScaleY: fullResolutionParams.markerScaleY,
      markerSizeScale: fullResolutionParams.markerSizeScale,
    };
  }

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
      mapAlreadyInset: false,
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
