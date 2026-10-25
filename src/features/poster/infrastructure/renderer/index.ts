import { applyFades } from "./layers";
import { drawPosterText } from "./typography";
import { drawMarkersOnCanvas } from "@/features/markers/infrastructure/rendering";
import { drawRoutesOnCanvas } from "@/features/routes/infrastructure/rendering";
import { routeEndpointMarkerItems } from "@/features/routes/infrastructure/helpers";
import type { ExportOptions, CanvasSize } from "../../domain/types";


async function drawNeatlineSvg(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  svgMarkup?: string,
) {
  if (!svgMarkup) return;
  const objectUrl = URL.createObjectURL(
    new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render the selected border."));
    });
    ctx.drawImage(image, width * 0.04, height * 0.04, width * 0.92, height * 0.92);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Composites a final poster from a MapLibre snapshot canvas.
 *
 * 1. Draws the captured map image.
 * 2. Applies gradient fades (top + bottom).
 * 3. Draws poster text (city, country, coords, attribution).
 *
 * Returns the composited canvas + its size metadata.
 */
export async function compositeExport(
  mapCanvas: HTMLCanvasElement,
  options: ExportOptions,
): Promise<{ canvas: HTMLCanvasElement; size: CanvasSize }> {
  const {
    mapAlreadyInset = false,
    theme,
    center,
    widthInches,
    heightInches,
    displayCity,
    displayCountry,
    customDate,
    fontFamily,
    showPosterText = true,
    showOverlay = true,
    includeCredits = true,
    markers = [],
    markerIcons = [],
    markerProjection,
    markerScaleX = 1,
    markerScaleY = 1,
    markerSizeScale = 1,
    routes = [],
    neatlineSvg,
  } = options;

  const width = mapCanvas.width;
  const height = mapCanvas.height;

  const canvas = mapAlreadyInset ? mapCanvas : document.createElement("canvas");
  if (!mapAlreadyInset) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not available.");

  // Keep a generous white print mat around the artwork.
  if (!mapAlreadyInset) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.save();
  ctx.translate(width * 0.085, height * 0.085);
  ctx.scale(0.83, 0.83);

  // 1. Draw map snapshot inside the print mat.
  if (!mapAlreadyInset) ctx.drawImage(mapCanvas, 0, 0);

  // 2. Gradient fades
  if (showOverlay) {
    applyFades(ctx, width, height, theme.ui.bg);
  }

  // 3. Routes (below markers)
  if (routes.length > 0 && markerProjection) {
    drawRoutesOnCanvas(
      ctx,
      routes,
      markerProjection,
      markerScaleX,
      markerScaleY,
      markerSizeScale,
    );
  }

  // 4. Route endpoint markers (between route lines and user markers)
  if (routes.length > 0 && markerIcons.length > 0 && markerProjection) {
    const endpointItems = routeEndpointMarkerItems(routes);
    if (endpointItems.length > 0) {
      await drawMarkersOnCanvas(
        ctx,
        endpointItems,
        markerIcons,
        markerProjection,
        markerScaleX,
        markerScaleY,
        markerSizeScale,
      );
    }
  }

  // 5. User markers
  if (markers.length > 0 && markerIcons.length > 0 && markerProjection) {
    await drawMarkersOnCanvas(
      ctx,
      markers,
      markerIcons,
      markerProjection,
      markerScaleX,
      markerScaleY,
      markerSizeScale,
    );
  }

  // 7. Poster text
  drawPosterText(
    ctx,
    width,
    height,
    theme,
    center,
    displayCity,
    displayCountry,
    fontFamily,
    showPosterText,
    showOverlay,
    includeCredits,
    customDate,
  );
  ctx.restore();

  // The wooden frame stays physical; print the decorative line and white mat.
  await drawNeatlineSvg(ctx, width, height, neatlineSvg);

  const size: CanvasSize = {
    width,
    height,
    requestedWidth: width,
    requestedHeight: height,
    downscaleFactor: 1,
    requestedDpi: 0,
    effectiveDpiX: widthInches > 0 ? width / widthInches : 0,
    effectiveDpiY: heightInches > 0 ? height / heightInches : 0,
    effectiveDpi: Math.floor(Math.min(widthInches > 0 ? width / widthInches : 0, heightInches > 0 ? height / heightInches : 0)),
  };

  return { canvas, size };
}

export { resolveCanvasSize } from "./canvas";
export { applyFades } from "./layers";
export { drawPosterText } from "./typography";
