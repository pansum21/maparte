import { applyFades } from "./layers";
import { drawPosterText } from "./typography";
import { drawMarkersOnCanvas } from "@/features/markers/infrastructure/rendering";
import { drawRoutesOnCanvas } from "@/features/routes/infrastructure/rendering";
import { routeEndpointMarkerItems } from "@/features/routes/infrastructure/helpers";
import { formatCoordinates } from "@/shared/geo/posterBounds";
import { withAlpha } from "@/shared/utils/color";
import { APP_CREDIT_URL } from "@/core/config";
import { formatCityLabel, getPosterFontScale } from "@/features/poster/domain/textLayout";
import { buildMinimapOverlaySvg, hasMinimapContent } from "../../domain/minimapOverlay";
import { layoutCirclePosterCaption } from "../../domain/circlePosterCaption";
import { posterFontStack } from "../../domain/posterFontStack";
import type { ExportOptions, CanvasSize } from "../../domain/types";

async function drawNeatlineSvg(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  svgMarkup?: string,
  insetXRatio = 0.025,
  insetYRatio = 0.025,
  rect?: { x: number; y: number; w: number; h: number },
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
    const x = rect ? rect.x : width * insetXRatio;
    const y = rect ? rect.y : height * insetYRatio;
    const w = rect ? rect.w : width * (1 - insetXRatio * 2);
    const h = rect ? rect.h : height * (1 - insetYRatio * 2);
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
    headingFontFamily,
    headingFontSize,
    midlineFontFamily,
    midlineFontSize,
    bottomLineFontFamily,
    bottomLineFontSize,
    textAlign = "center",
    textPosition = "bottom",
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
    minimapOverlay,
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
      pageCtx.fillRect(g.x, g.y + g.height, g.width, g.captionHeight);
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

    if (g.style === "box") {
      pageCtx.save();
      pageCtx.shadowColor = "rgba(0,0,0,.22)";
      pageCtx.shadowBlur = Math.max(6, page.width * .006);
      pageCtx.shadowOffsetY = Math.max(2, page.height * .003);
      pageCtx.fillStyle = "rgba(255,255,255,.98)";
      const boxW = g.captionWidth;
      const boxH = g.captionHeight || page.height * .12;
      const boxX = g.captionX - boxW / 2;
      const boxY = g.captionY - boxH / 2;
      pageCtx.fillRect(boxX, boxY, boxW, boxH);
      pageCtx.restore();
    }

    const textColor = g.style === "dark" ? "#fff" : g.style === "box" ? "#171717" : (theme.ui.text || "#171717");
    const headingFamily = headingFontFamily?.trim() || fontFamily;
    const midlineFamily = midlineFontFamily?.trim() || fontFamily;
    const bottomLineFamily = bottomLineFontFamily?.trim() || fontFamily;
    const fontFor = (family: string | undefined, body = false) => {
      const clean = (family || "").replace(/['"]/g, "").trim();
      const serif = /serif|times|cormorant|baskerville|lora|merriweather|playfair/i.test(clean);
      if (body) return serif ? `"${clean}", 'Times New Roman', Times, serif` : (clean ? `"${clean}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace');
      return clean ? `"${clean}", ${serif ? "'Times New Roman', Times, serif" : "\"Space Grotesk\", sans-serif"}` : '"Space Grotesk", sans-serif';
    };
    const headingFont = fontFor(headingFamily);
    const midlineFont = fontFor(midlineFamily);
    const bottomLineFont = fontFor(bottomLineFamily, true);
    const headingScale = getPosterFontScale(headingFontSize ?? fontSize);
    const midlineScale = getPosterFontScale(midlineFontSize ?? fontSize);
    const bottomLineScale = getPosterFontScale(bottomLineFontSize ?? fontSize);
    const scale = Math.min(page.width, page.height) / 1000 * getPosterFontScale(fontSize);
    const creditFont = fontFor(fontFamily, true);
    const captionY = g.captionY;
    const captionX = g.captionX;
    pageCtx.fillStyle = textColor;
    pageCtx.textAlign = g.captionAlign;
    pageCtx.textBaseline = "middle";
    if (showPosterText && g.style !== "full-map") {
      pageCtx.font = `600 ${Math.max(18, (g.style === "title" ? 66 : 42) * Math.min(page.width, page.height) / 1000 * headingScale)}px ${headingFont}`;
      pageCtx.fillText(formatCityLabel(displayCity), captionX, captionY, g.captionWidth);
      let lineY = captionY + page.height * .041;
      if (displayCountry) {
        pageCtx.font = `400 ${Math.max(12, 23 * Math.min(page.width, page.height) / 1000 * midlineScale)}px ${midlineFont}`;
        pageCtx.fillText(displayCountry.toUpperCase(), captionX, lineY, g.captionWidth);
        lineY += page.height * .03;
      }
      if (customDate?.trim()) {
        pageCtx.font = `400 ${Math.max(10, 17 * Math.min(page.width, page.height) / 1000 * bottomLineScale)}px ${bottomLineFont}`;
        pageCtx.fillText(customDate.trim(), captionX, lineY, g.captionWidth);
        lineY += page.height * .026;
      }
      pageCtx.globalAlpha = .72;
      pageCtx.font = `400 ${Math.max(9, 14 * Math.min(page.width, page.height) / 1000 * bottomLineScale)}px ${bottomLineFont}`;
      pageCtx.fillText(formatCoordinates(center.lat, center.lon), captionX, lineY, g.captionWidth);
      pageCtx.globalAlpha = 1;
    } else if (showPosterText) {
      drawPosterText(pageCtx, page.width, page.height, theme, center, displayCity, displayCountry, fontFamily, true, overlayBottom, includeCredits, customDate, fontSize, textAlign, { headingFontFamily, headingFontSize, midlineFontFamily, midlineFontSize, bottomLineFontFamily, bottomLineFontSize }, textPosition);
    }
    pageCtx.textBaseline = "bottom";
    pageCtx.globalAlpha = .68;
    pageCtx.font = `300 ${Math.max(9, 12 * scale)}px ${creditFont}`;
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
    const isPosterStyle = Boolean(squareCaptionGeometry.posterStyle);
    ctx.fillStyle = showWhiteMat && !isPosterStyle ? "#fff" : theme.ui.bg;
    ctx.fillRect(0, 0, posterWidth, posterHeight);

    // The export map is captured square, so all map based overlays share its
    // exact projection and are scaled into the same square opening.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / width, size / height);
    if (squareCaptionGeometry.shape === "circle") {
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
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

    if (minimapOverlay && hasMinimapContent(minimapOverlay)) {
      const slotSize = isPosterStyle ? (squareCaptionGeometry.overlaySize ?? size) : size;
      await drawNeatlineSvg(
        ctx,
        1,
        1,
        buildMinimapOverlaySvg(minimapOverlay, Math.min(2400, Math.max(600, Math.round(slotSize)))),
        0,
        0,
        {
          x: isPosterStyle ? (squareCaptionGeometry.overlayX ?? x) : x,
          y: isPosterStyle ? (squareCaptionGeometry.overlayY ?? y) : y,
          w: slotSize,
          h: slotSize,
        },
      );
    }

    const textColor = theme.ui.text || "#171717";
    const headingFamily = headingFontFamily?.trim() || fontFamily;
    const midlineFamily = midlineFontFamily?.trim() || fontFamily;
    const bottomLineFamily = bottomLineFontFamily?.trim() || fontFamily;
    const fontFor = (family: string | undefined, body = false) => {
      const clean = (family || "").replace(/['"]/g, "").trim();
      const serif = /serif|times|cormorant|baskerville|lora|merriweather|playfair/i.test(clean);
      if (body) return serif ? `"${clean}", 'Times New Roman', Times, serif` : (clean ? `"${clean}", "IBM Plex Mono", monospace` : '"IBM Plex Mono", monospace');
      return clean ? `"${clean}", ${serif ? "'Times New Roman', Times, serif" : "\"Space Grotesk\", sans-serif"}` : '"Space Grotesk", sans-serif';
    };
    const headingFont = fontFor(headingFamily);
    const midlineFont = fontFor(midlineFamily);
    const bottomLineFont = fontFor(bottomLineFamily, true);
    const creditFont = fontFor(fontFamily, true);
    const headingScale = getPosterFontScale(headingFontSize ?? fontSize);
    const midlineScale = getPosterFontScale(midlineFontSize ?? fontSize);
    const bottomLineScale = getPosterFontScale(bottomLineFontSize ?? fontSize);
    const base = Math.min(posterWidth, posterHeight) / 1000;
    const captionY = squareCaptionGeometry.captionY;
    ctx.fillStyle = textColor;
    ctx.textAlign = squareCaptionGeometry.captionAlign;
    ctx.textBaseline = "middle";
    if (isPosterStyle) {
      const measureCtx = ctx;
      const layout = layoutCirclePosterCaption(
        {
          geometry: squareCaptionGeometry,
          city: displayCity || "",
          country: displayCountry || "",
          coords: formatCoordinates(center.lat, center.lon),
          customDate: customDate?.trim() || undefined,
          showText: Boolean(showPosterText),
          includeCredits: Boolean(includeCredits),
          creditUrl: APP_CREDIT_URL,
          headingFamily: posterFontStack(headingFamily),
          midlineFamily: posterFontStack(midlineFamily),
          bottomFamily: posterFontStack(bottomLineFamily, true),
          creditFamily: posterFontStack(fontFamily, true),
          headingScale,
          midlineScale,
          bottomScale: bottomLineScale,
        },
        (font, text) => {
          measureCtx.font = font;
          return measureCtx.measureText(text).width;
        },
      );
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      for (const rule of layout.rules) {
        ctx.globalAlpha = rule.opacity;
        ctx.fillRect(rule.x, rule.y, rule.w, rule.h);
      }
      for (const run of layout.runs) {
        ctx.globalAlpha = run.opacity;
        ctx.font = `${run.weight} ${run.size}px ${run.family}`;
        if (run.xs.length === 1 && run.chars.length > 1) {
          ctx.fillText(run.chars, run.xs[0], run.baselineY);
        } else {
          Array.from(run.chars).forEach((ch, i) => ctx.fillText(ch, run.xs[i], run.baselineY));
        }
      }
      for (const credit of layout.credits) {
        ctx.globalAlpha = credit.opacity;
        ctx.font = `300 ${credit.size}px ${credit.family}`;
        ctx.textAlign = credit.anchor === "end" ? "right" : "left";
        ctx.fillText(credit.text, credit.x, credit.y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = squareCaptionGeometry.captionAlign;
    }
    if (showPosterText && !isPosterStyle) {
      ctx.font = `600 ${Math.max(20, 48 * base * headingScale)}px ${headingFont}`;
      ctx.fillText(formatCityLabel(displayCity), squareCaptionGeometry.captionX, captionY, squareCaptionGeometry.captionWidth);
      if (displayCity && displayCountry) {
        ctx.globalAlpha = 0.55;
        // The rule matches the printed width of the city name, so it is short for
        // short names and never wider than the name itself.
        const nameInk = Math.min(
          ctx.measureText(formatCityLabel(displayCity)).width,
          squareCaptionGeometry.captionWidth,
        );
        const dividerWidth = Math.max(posterWidth * 0.02, nameInk);
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
        ctx.font = `400 ${Math.max(13, 25 * base * midlineScale)}px ${midlineFont}`;
        ctx.fillText(displayCountry.toUpperCase(), squareCaptionGeometry.captionX, lineY, squareCaptionGeometry.captionWidth);
        lineY += posterHeight * 0.032;
      }
      if (customDate?.trim()) {
        ctx.font = `400 ${Math.max(11, 19 * base * bottomLineScale)}px ${bottomLineFont}`;
        ctx.fillText(customDate.trim(), squareCaptionGeometry.captionX, lineY, squareCaptionGeometry.captionWidth);
        lineY += posterHeight * 0.028;
      }
      ctx.globalAlpha = 0.72;
      ctx.font = `400 ${Math.max(10, 16 * base * bottomLineScale)}px ${bottomLineFont}`;
      ctx.fillText(formatCoordinates(center.lat, center.lon), squareCaptionGeometry.captionX, lineY, squareCaptionGeometry.captionWidth);
      ctx.globalAlpha = 1;
    }

    const creditY = posterHeight - safeInsetY;
    const creditSize = Math.max(9, 13 * base);
    if (!isPosterStyle) {
    ctx.font = `300 ${creditSize}px ${creditFont}`;
    ctx.textBaseline = "bottom";
    ctx.globalAlpha = 0.68;
    ctx.textAlign = "right";
    ctx.fillText("© OpenStreetMap contributors", posterWidth - safeInsetX, creditY, posterWidth * 0.42);
    if (includeCredits) {
      ctx.textAlign = "left";
      ctx.fillText(APP_CREDIT_URL, safeInsetX, creditY, posterWidth * 0.42);
    }
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
      { headingFontFamily, headingFontSize, midlineFontFamily, midlineFontSize, bottomLineFontFamily, bottomLineFontSize },
      textPosition,
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
        { headingFontFamily, headingFontSize, midlineFontFamily, midlineFontSize, bottomLineFontFamily, bottomLineFontSize },
        textPosition,
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
        { headingFontFamily, headingFontSize, midlineFontFamily, midlineFontSize, bottomLineFontFamily, bottomLineFontSize },
        textPosition,
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


