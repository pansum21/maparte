import { applyFades } from "./layers";
import { drawPosterText } from "./typography";
import { drawMarkersOnCanvas } from "@/features/markers/infrastructure/rendering";
import { drawRoutesOnCanvas } from "@/features/routes/infrastructure/rendering";
import { routeEndpointMarkerItems } from "@/features/routes/infrastructure/helpers";
import { formatCoordinates } from "@/shared/geo/posterBounds";
import { withAlpha } from "@/shared/utils/color";
import { APP_CREDIT_URL } from "@/core/config";
import { formatCityLabel, getPosterFontScale } from "@/features/poster/domain/textLayout";
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
    textAlign = "center",
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
    squareCaptionGeometry,
    frameLayoutGeometry,
  } = options;

  const width = mapCanvas.width;
  const height = mapCanvas.height;

  if (frameLayoutGeometry) {
    const g = frameLayoutGeometry;
    const page = document.createElement("canvas");
    page.width = g.posterWidth;
    page.height = g.posterHeight;
    const pageCtx = page.getContext("2d");
    if (!pageCtx) throw new Error("Canvas rendering is not available.");
    pageCtx.fillStyle = g.style === "full-map" ? theme.ui.bg : "#fff";
    pageCtx.fillRect(0, 0, page.width, page.height);
    if (g.style === "dark") {
      pageCtx.fillStyle = "#111";
      pageCtx.fillRect(g.x, g.y + g.height, g.width, page.height - (g.y + g.height) - g.safeInsetY);
    }
    if (g.style === "box") {
      pageCtx.save();
      pageCtx.shadowColor = "rgba(0,0,0,.16)";
      pageCtx.shadowBlur = Math.max(2, page.width * .003);
      pageCtx.fillStyle = "rgba(255,255,255,.96)";
      pageCtx.fillRect(g.captionX - g.captionWidth / 2, g.y + g.height - page.height * .075, g.captionWidth, page.height * .12);
      pageCtx.restore();
    }
    pageCtx.save();
    pageCtx.translate(g.x, g.y);
    pageCtx.scale(g.width / width, g.height / height);
    pageCtx.drawImage(mapCanvas, 0, 0, width, height);
    if (overlayTop || overlayBottom) applyFades(pageCtx, width, height, theme.ui.bg, overlayTop, overlayBottom);
    if (routes.length > 0 && markerProjection) {
      drawRoutesOnCanvas(pageCtx, routes, markerProjection, markerScaleX, markerScaleY, markerSizeScale);
      if (markerIcons.length > 0) {
        const endpoints = routeEndpointMarkerItems(routes);
        if (endpoints.length) await drawMarkersOnCanvas(pageCtx, endpoints, markerIcons, markerProjection, markerScaleX, markerScaleY, markerSizeScale);
      }
    }
    if (markers.length > 0 && markerIcons.length > 0 && markerProjection) {
      await drawMarkersOnCanvas(pageCtx, markers, markerIcons, markerProjection, markerScaleX, markerScaleY, markerSizeScale);
    }
    pageCtx.restore();

    const textColor = g.style === "dark" ? "#fff" : (theme.ui.text || "#171717");
    const font = fontFamily ? `"${fontFamily}", "Space Grotesk", sans-serif` : '"Space Grotesk", sans-serif';
    const mono = fontFamily ? `"${fontFamily}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace';
    const scale = Math.min(page.width, page.height) / 1000 * getPosterFontScale(fontSize);
    const box = g.style === "box";
    const captionY = box ? g.y + g.height - page.height * .047 : g.captionY;
    const captionX = g.captionX;
    pageCtx.fillStyle = textColor;
    pageCtx.textAlign = g.captionAlign;
    pageCtx.textBaseline = "middle";
    if (showPosterText && g.style !== "full-map") {
      pageCtx.font = `600 ${Math.max(18, (g.style === "title" ? 66 : 42) * scale)}px ${font}`;
      pageCtx.fillText(formatCityLabel(displayCity), captionX, captionY, g.captionWidth);
      let lineY = captionY + page.height * .041;
      if (displayCountry) {
        pageCtx.font = `400 ${Math.max(12, 23 * scale)}px ${font}`;
        pageCtx.fillText(displayCountry.toUpperCase(), captionX, lineY, g.captionWidth);
        lineY += page.height * .03;
      }
      if (customDate?.trim()) {
        pageCtx.font = `400 ${Math.max(10, 17 * scale)}px ${mono}`;
        pageCtx.fillText(customDate.trim(), captionX, lineY, g.captionWidth);
        lineY += page.height * .026;
      }
      pageCtx.globalAlpha = .72;
      pageCtx.font = `400 ${Math.max(9, 14 * scale)}px ${mono}`;
      pageCtx.fillText(formatCoordinates(center.lat, center.lon), captionX, lineY, g.captionWidth);
      pageCtx.globalAlpha = 1;
    } else if (showPosterText) {
      drawPosterText(pageCtx, page.width, page.height, theme, center, displayCity, displayCountry, fontFamily, true, overlayBottom, includeCredits, customDate, fontSize, textAlign);
    }
    pageCtx.textBaseline = "bottom";
    pageCtx.globalAlpha = .68;
    pageCtx.font = `300 ${Math.max(9, 12 * scale)}px ${mono}`;
    pageCtx.textAlign = "left";
    pageCtx.fillStyle = g.style === "dark" ? "#fff" : textColor;
    pageCtx.fillText(APP_CREDIT_URL, g.safeInsetX, page.height - g.safeInsetY, page.width * .42);
    pageCtx.textAlign = "right";
    pageCtx.fillText("© OpenStreetMap contributors", page.width - g.safeInsetX, page.height - g.safeInsetY, page.width * .42);
    pageCtx.globalAlpha = 1;
    await drawNeatlineSvg(pageCtx, page.width, page.height, neatlineSvg, matInsetXRatio, matInsetYRatio);
    const densityX = widthInches > 0 ? page.width / widthInches : 0;
    const densityY = heightInches > 0 ? page.height / heightInches : 0;
    return {
      canvas: page,
      size: {
        width: page.width, height: page.height, requestedWidth: page.width, requestedHeight: page.height,
        downscaleFactor: 1, requestedDpi: 0, effectiveDpiX: densityX, effectiveDpiY: densityY,
        effectiveDpi: Math.floor(Math.min(densityX, densityY)),
      },
    };
  }

  const canvas = squareCaptionGeometry
    ? document.createElement("canvas")
    : mapAlreadyInset
      ? mapCanvas
      : document.createElement("canvas");
  if (!mapAlreadyInset) {
    canvas.width = width;
    canvas.height = height;
  }
  if (squareCaptionGeometry) {
    canvas.width = squareCaptionGeometry.posterWidth;
    canvas.height = squareCaptionGeometry.posterHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not available.");

  if (squareCaptionGeometry) {
    const { posterWidth, posterHeight, x, y, size, safeInsetX, safeInsetY } = squareCaptionGeometry;
    ctx.fillStyle = showWhiteMat ? "#fff" : theme.ui.bg;
    ctx.fillRect(0, 0, posterWidth, posterHeight);

    // The export map is captured square, so all map based overlays share its
    // exact projection and are scaled into the same square opening.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / width, size / height);
    ctx.drawImage(mapCanvas, 0, 0, width, height);
    if (overlayTop || overlayBottom) {
      applyFades(ctx, width, height, theme.ui.bg, overlayTop, overlayBottom);
    }
    if (routes.length > 0 && markerProjection) {
      drawRoutesOnCanvas(ctx, routes, markerProjection, markerScaleX, markerScaleY, markerSizeScale);
      if (markerIcons.length > 0) {
        const endpoints = routeEndpointMarkerItems(routes);
        if (endpoints.length) await drawMarkersOnCanvas(ctx, endpoints, markerIcons, markerProjection, markerScaleX, markerScaleY, markerSizeScale);
      }
    }
    if (markers.length > 0 && markerIcons.length > 0 && markerProjection) {
      await drawMarkersOnCanvas(ctx, markers, markerIcons, markerProjection, markerScaleX, markerScaleY, markerSizeScale);
    }
    ctx.restore();

    const isLandscapeSquare = squareCaptionGeometry.posterWidth > squareCaptionGeometry.posterHeight;
    drawPosterText(
      ctx,
      posterWidth,
      posterHeight,
      theme,
      center,
      displayCity,
      displayCountry,
      fontFamily,
      showPosterText,
      overlayBottom,
      false, // Credits drawn separately below with exact border-inset positioning
      customDate,
      fontSize,
      squareCaptionGeometry.captionAlign as CanvasTextAlign,
      {
        squareCaptionGeometry,
        isNarrowBox: isLandscapeSquare,
      },
    );

    const base = Math.min(posterWidth, posterHeight) / 1000;
    const mono = fontFamily ? `"${fontFamily}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace';

    const creditY = posterHeight - safeInsetY;
    const creditSize = Math.max(9, 13 * base);
    ctx.font = `300 ${creditSize}px ${mono}`;
    ctx.textBaseline = "bottom";
    ctx.globalAlpha = 0.68;
    ctx.textAlign = "right";
    ctx.fillText("© OpenStreetMap contributors", posterWidth - safeInsetX, creditY, posterWidth * 0.42);
    if (includeCredits) {
      ctx.textAlign = "left";
      ctx.fillText(APP_CREDIT_URL, safeInsetX, creditY, posterWidth * 0.42);
    }
    ctx.globalAlpha = 1;
    await drawNeatlineSvg(ctx, posterWidth, posterHeight, neatlineSvg, matInsetXRatio, matInsetYRatio);

    const sizeInfo: CanvasSize = {
      width: posterWidth,
      height: posterHeight,
      requestedWidth: posterWidth,
      requestedHeight: posterHeight,
      downscaleFactor: 1,
      requestedDpi: 0,
      effectiveDpiX: widthInches > 0 ? posterWidth / widthInches : 0,
      effectiveDpiY: heightInches > 0 ? posterHeight / heightInches : 0,
      effectiveDpi: Math.floor(Math.min(widthInches > 0 ? posterWidth / widthInches : 0, heightInches > 0 ? posterHeight / heightInches : 0)),
    };
    return { canvas, size: sizeInfo };
  }

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
      textAlign,
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
        textAlign,
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
        textAlign,
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


