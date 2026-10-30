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
  insetXRatio = 0.025,
  insetYRatio = 0.025,
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
    const x = width * insetXRatio;
    const y = height * insetYRatio;
    const w = width * (1 - insetXRatio * 2);
    const h = height * (1 - insetYRatio * 2);
    ctx.drawImage(image, x, y, w, h);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Composites a final poster from a MapLibre snapshot canvas.
 *
 * 1. Draws the captured map image (full-bleed or within white paper mat).
 * 2. Applies gradient fades (top + bottom).
 * 3. Draws routes and markers.
 * 4. Draws poster text (city, country, coords, attribution).
 * 5. Draws selected neatline border (over full-bleed map or over white paper mat).
 *
 * Returns the composited canvas + its size metadata.
 */
export async function compositeExport(
  mapCanvas: HTMLCanvasElement,
  options: ExportOptions,
): Promise<{ canvas: HTMLCanvasElement; size: CanvasSize }> {
  const {
    showWhiteMat = false,
    mapAlreadyInset = false,
    matInsetXRatio = showWhiteMat ? 0.02 : 0.025,
    matInsetYRatio = showWhiteMat ? 0.02 : 0.025,
    mapInsetXRatio = showWhiteMat ? 0.055 : 0,
    mapInsetYRatio = showWhiteMat ? 0.055 : 0,
    theme,
    center,
    widthInches,
    heightInches,
    displayCity,
    displayCountry,
    customDate,
    fontFamily,
    fontSize = 16,
    showPosterText = true,
    showOverlay = true,
    overlayTop = showOverlay,
    overlayBottom = showOverlay,
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

  if (showWhiteMat) {
    // 1. Fill crisp white paper mat background
    if (!mapAlreadyInset) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
    }

    const mapX = width * mapInsetXRatio;
    const mapY = height * mapInsetYRatio;
    const mapW = width * (1 - mapInsetXRatio * 2);
    const mapH = height * (1 - mapInsetYRatio * 2);

    ctx.save();
    ctx.translate(mapX, mapY);
    ctx.scale(mapW / width, mapH / height);

    // Draw map snapshot inside the white paper mat opening
    if (!mapAlreadyInset) ctx.drawImage(mapCanvas, 0, 0, width, height);

    // Gradient fades
    if (overlayTop || overlayBottom) {
      applyFades(ctx, width, height, theme.ui.bg, overlayTop, overlayBottom);
    }

    // Routes (below markers)
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

    // Route endpoint markers
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

    // User markers
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

    // Poster text
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
      overlayBottom,
      includeCredits,
      customDate,
      fontSize,
    );
    ctx.restore();

    // Draw neatline border on the white paper mat
    await drawNeatlineSvg(ctx, width, height, neatlineSvg, matInsetXRatio, matInsetYRatio);
  } else {
    // CLEAN MAP (With or without border line)
    const hasMapInset = (mapInsetXRatio > 0 || mapInsetYRatio > 0);

    if (hasMapInset && !mapAlreadyInset) {
      // Background fill matching theme behind inset border
      ctx.fillStyle = theme.ui.bg;
      ctx.fillRect(0, 0, width, height);

      const mapX = width * mapInsetXRatio;
      const mapY = height * mapInsetYRatio;
      const mapW = width * (1 - mapInsetXRatio * 2);
      const mapH = height * (1 - mapInsetYRatio * 2);

      ctx.save();
      ctx.translate(mapX, mapY);
      ctx.scale(mapW / width, mapH / height);

      ctx.drawImage(mapCanvas, 0, 0, width, height);

      if (overlayTop || overlayBottom) {
        applyFades(ctx, width, height, theme.ui.bg, overlayTop, overlayBottom);
      }

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
        overlayBottom,
        includeCredits,
        customDate,
        fontSize,
      );

      ctx.restore();
    } else {
      if (!mapAlreadyInset) {
        ctx.drawImage(mapCanvas, 0, 0, width, height);
      }

      if (overlayTop || overlayBottom) {
        applyFades(ctx, width, height, theme.ui.bg, overlayTop, overlayBottom);
      }

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
        overlayBottom,
        includeCredits,
        customDate,
        fontSize,
      );
    }

    // Draw neatline border around the map opening (never overlapping map)
    await drawNeatlineSvg(ctx, width, height, neatlineSvg, matInsetXRatio, matInsetYRatio);
  }

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
