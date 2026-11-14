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
  } = options;

  const width = mapCanvas.width;
  const height = mapCanvas.height;

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

    // Continue the city map only under the caption, at the square map's scale.
    // Clipping the same map crop to the caption keeps the poster from looking
    // like a stretched duplicate sheet. Style only softens this lower region.
    const captionTop = y + size;
    const captionHeight = posterHeight - captionTop;
    const backdropWidth = posterWidth;
    const backdropHeight = backdropWidth * (mapCanvas.height / Math.max(1, mapCanvas.width));
    const backdropTop = captionTop - (backdropHeight - captionHeight) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, captionTop, posterWidth, captionHeight);
    ctx.clip();
    ctx.globalAlpha = 0.9;
    ctx.filter = overlayBottom
      ? `blur(${Math.max(2, Math.min(20, posterWidth * 0.0045))}px)`
      : "none";
    ctx.drawImage(mapCanvas, 0, backdropTop, backdropWidth, backdropHeight);
    ctx.restore();

    const captionWash = ctx.createLinearGradient(0, captionTop, 0, posterHeight);
    captionWash.addColorStop(0, withAlpha(theme.ui.bg, overlayBottom ? 0.05 : 0.02));
    captionWash.addColorStop(1, withAlpha(theme.ui.bg, overlayBottom ? 0.18 : 0.1));
    ctx.fillStyle = captionWash;
    ctx.fillRect(0, captionTop, posterWidth, captionHeight);

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

    const textColor = theme.ui.text || "#171717";
    const font = fontFamily ? `"${fontFamily}", "Space Grotesk", sans-serif` : '"Space Grotesk", sans-serif';
    const mono = fontFamily ? `"${fontFamily}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace';
    const base = Math.min(posterWidth, posterHeight) / 1000;
    const captionY = squareCaptionGeometry.captionY;
    ctx.fillStyle = textColor;
    ctx.textAlign = squareCaptionGeometry.captionAlign;
    ctx.textBaseline = "middle";
    if (showPosterText) {
      ctx.font = `600 ${Math.max(20, 48 * base * getPosterFontScale(fontSize))}px ${font}`;
      ctx.fillText(formatCityLabel(displayCity), squareCaptionGeometry.captionX, captionY, squareCaptionGeometry.captionWidth);
      if (displayCity && displayCountry) {
        ctx.globalAlpha = 0.55;
        const dividerWidth = Math.min(posterWidth * 0.14, squareCaptionGeometry.captionWidth * 0.2);
        const dividerX = squareCaptionGeometry.captionAlign === "left"
          ? squareCaptionGeometry.captionX
          : squareCaptionGeometry.captionAlign === "right"
            ? squareCaptionGeometry.captionX - dividerWidth
            : squareCaptionGeometry.captionX - dividerWidth / 2;
        ctx.fillRect(dividerX, captionY + posterHeight * 0.018, dividerWidth, Math.max(1, 2 * base));
        ctx.globalAlpha = 1;
      }
      let lineY = captionY + posterHeight * 0.044;
      if (displayCountry) {
        ctx.font = `400 ${Math.max(13, 25 * base * getPosterFontScale(fontSize))}px ${font}`;
        ctx.fillText(displayCountry.toUpperCase(), squareCaptionGeometry.captionX, lineY, squareCaptionGeometry.captionWidth);
        lineY += posterHeight * 0.032;
      }
      if (customDate?.trim()) {
        ctx.font = `400 ${Math.max(11, 19 * base * getPosterFontScale(fontSize))}px ${mono}`;
        ctx.fillText(customDate.trim(), squareCaptionGeometry.captionX, lineY, squareCaptionGeometry.captionWidth);
        lineY += posterHeight * 0.028;
      }
      ctx.globalAlpha = 0.72;
      ctx.font = `400 ${Math.max(10, 16 * base * getPosterFontScale(fontSize))}px ${mono}`;
      ctx.fillText(formatCoordinates(center.lat, center.lon), squareCaptionGeometry.captionX, lineY, squareCaptionGeometry.captionWidth);
      ctx.globalAlpha = 1;
    }

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

