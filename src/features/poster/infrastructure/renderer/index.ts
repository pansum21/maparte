import { applyFades } from "./layers";
import { drawPosterText } from "./typography";
import { drawMarkersOnCanvas } from "@/features/markers/infrastructure/rendering";
import { drawRoutesOnCanvas } from "@/features/routes/infrastructure/rendering";
import { routeEndpointMarkerItems } from "@/features/routes/infrastructure/helpers";
import type { ExportOptions, CanvasSize } from "../../domain/types";


type CarvedFrameStyle = "none" | "black" | "oak" | "white" | "gold";

const CARVED_FRAME_PALETTES: Record<
  Exclude<CarvedFrameStyle, "none">,
  { light: string; mid: string; dark: string; ornament: string }
> = {
  black: { light: "#786b50", mid: "#292722", dark: "#08090b", ornament: "#d6bd7e" },
  oak: { light: "#f2c98e", mid: "#a96d37", dark: "#4d2b17", ornament: "#f7e1b8" },
  white: { light: "#ffffff", mid: "#d6dce1", dark: "#8a96a1", ornament: "#73808b" },
  gold: { light: "#fff0b8", mid: "#c18a28", dark: "#65420d", ornament: "#fff3c9" },
};

function drawFrameRosette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.82;
  for (let i = 0; i < 8; i += 1) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 8);
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.48, radius * 0.2, radius * 0.43, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCarvedFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: CarvedFrameStyle = "black",
) {
  if (style === "none") return;
  const palette = CARVED_FRAME_PALETTES[style] ?? CARVED_FRAME_PALETTES.black;
  const thickness = Math.max(24, Math.round(Math.min(width, height) * 0.032));
  const bevel = Math.max(2, Math.round(thickness * 0.08));

  const top = ctx.createLinearGradient(0, 0, 0, thickness);
  top.addColorStop(0, palette.light);
  top.addColorStop(0.22, palette.mid);
  top.addColorStop(0.78, palette.dark);
  top.addColorStop(1, palette.mid);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, thickness);

  const bottom = ctx.createLinearGradient(0, height - thickness, 0, height);
  bottom.addColorStop(0, palette.mid);
  bottom.addColorStop(0.22, palette.dark);
  bottom.addColorStop(0.78, palette.mid);
  bottom.addColorStop(1, palette.light);
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height - thickness, width, thickness);

  const left = ctx.createLinearGradient(0, 0, thickness, 0);
  left.addColorStop(0, palette.light);
  left.addColorStop(0.22, palette.mid);
  left.addColorStop(0.78, palette.dark);
  left.addColorStop(1, palette.mid);
  ctx.fillStyle = left;
  ctx.fillRect(0, thickness, thickness, height - thickness * 2);

  const right = ctx.createLinearGradient(width - thickness, 0, width, 0);
  right.addColorStop(0, palette.mid);
  right.addColorStop(0.22, palette.dark);
  right.addColorStop(0.78, palette.mid);
  right.addColorStop(1, palette.light);
  ctx.fillStyle = right;
  ctx.fillRect(width - thickness, thickness, thickness, height - thickness * 2);

  ctx.save();
  ctx.lineWidth = bevel;
  ctx.strokeStyle = palette.ornament;
  ctx.globalAlpha = 0.72;
  ctx.strokeRect(bevel, bevel, width - bevel * 2, height - bevel * 2);
  ctx.globalAlpha = 0.58;
  ctx.lineWidth = Math.max(1, bevel * 0.6);
  ctx.strokeRect(thickness * 0.28, thickness * 0.28, width - thickness * 0.56, height - thickness * 0.56);
  ctx.restore();

  const radius = Math.max(4, thickness * 0.22);
  const step = thickness * 1.45;
  for (let x = thickness * 0.85; x < width - thickness * 0.85; x += step) {
    drawFrameRosette(ctx, x, thickness * 0.5, radius, palette.ornament);
    drawFrameRosette(ctx, x, height - thickness * 0.5, radius, palette.ornament);
  }
  for (let y = thickness * 0.85; y < height - thickness * 0.85; y += step) {
    drawFrameRosette(ctx, thickness * 0.5, y, radius, palette.ornament);
    drawFrameRosette(ctx, width - thickness * 0.5, y, radius, palette.ornament);
  }

  const cornerRadius = thickness * 0.32;
  drawFrameRosette(ctx, thickness * 0.5, thickness * 0.5, cornerRadius, palette.ornament);
  drawFrameRosette(ctx, width - thickness * 0.5, thickness * 0.5, cornerRadius, palette.ornament);
  drawFrameRosette(ctx, thickness * 0.5, height - thickness * 0.5, cornerRadius, palette.ornament);
  drawFrameRosette(ctx, width - thickness * 0.5, height - thickness * 0.5, cornerRadius, palette.ornament);

  ctx.save();
  ctx.lineWidth = Math.max(1, bevel * 0.7);
  ctx.strokeStyle = palette.dark;
  ctx.globalAlpha = 0.72;
  ctx.strokeRect(thickness, thickness, width - thickness * 2, height - thickness * 2);
  ctx.restore();
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
    theme,
    center,
    widthInches: _wi,
    heightInches: _hi,
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
    frameStyle = "black",
  } = options;

  const width = mapCanvas.width;
  const height = mapCanvas.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not available.");

  // 1. Draw map snapshot
  ctx.drawImage(mapCanvas, 0, 0);

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

  // 6. Carved frame, composed at export resolution so it prints with the artwork.
  drawCarvedFrame(ctx, width, height, frameStyle);

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

  const size: CanvasSize = {
    width,
    height,
    requestedWidth: width,
    requestedHeight: height,
    downscaleFactor: 1,
  };

  return { canvas, size };
}

export { resolveCanvasSize } from "./canvas";
export { applyFades } from "./layers";
export { drawPosterText } from "./typography";
