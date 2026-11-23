import type { Map as MaplibreMap } from "maplibre-gl";
import { APP_CREDIT_URL } from "@/core/config";
import { formatCoordinates } from "@/shared/geo/posterBounds";
import type { DoubleMapGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import { createCanvasMeasure } from "@/features/poster/domain/circlePosterCaption";
import { layoutDoubleMapCaption } from "@/features/poster/domain/doubleMapCaption";
import { heartPath2D } from "@/features/poster/domain/heartShape";
import { posterFontStack } from "@/features/poster/domain/posterFontStack";
import { getPosterFontScale } from "@/features/poster/domain/textLayout";
import { captureMapAsCanvas } from "./mapExporter";

export interface DoubleExportSlotText {
  city: string;
  country: string;
  lat: number;
  lon: number;
  hasPlace: boolean;
}

export interface DoublePosterExportOptions {
  geometry: DoubleMapGeometry;
  maps: [MaplibreMap, MaplibreMap];
  slots: [DoubleExportSlotText, DoubleExportSlotText];
  background: string;
  textColor: string;
  showPosterText: boolean;
  includeCredits: boolean;
  customDate?: string;
  fontFamily: string;
  fontSize: number;
  headingFontFamily?: string;
  headingFontSize?: number;
  midlineFontFamily?: string;
  midlineFontSize?: number;
  bottomLineFontFamily?: string;
  bottomLineFontSize?: number;
}

function clipShape(
  ctx: CanvasRenderingContext2D,
  shape: DoubleMapGeometry["shape"],
  x: number,
  y: number,
  size: number,
) {
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === "heart") {
    ctx.clip(heartPath2D(x, y, size));
  } else {
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
  }
}

/**
 * Draws a whole double map poster: both maps clipped to their shape, then the name
 * blocks from the same layout the preview uses. No map credit is drawn on the poster.
 */
export async function renderDoublePoster(opts: DoublePosterExportOptions): Promise<HTMLCanvasElement> {
  const { geometry } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(geometry.posterWidth);
  canvas.height = Math.round(geometry.posterHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This device could not allocate the poster canvas.");

  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const i of [0, 1] as const) {
    const slot = geometry.slots[i];
    const side = Math.max(1, Math.round(slot.size));
    const { canvas: mapCanvas } = await captureMapAsCanvas(opts.maps[i], side, side, false, 0, 0);
    ctx.save();
    clipShape(ctx, geometry.shape, slot.x, slot.y, slot.size);
    ctx.drawImage(mapCanvas, slot.x, slot.y, slot.size, slot.size);
    ctx.restore();
  }

  const coords = (s: DoubleExportSlotText) =>
    s.hasPlace && Number.isFinite(s.lat) && Number.isFinite(s.lon) ? formatCoordinates(s.lat, s.lon) : "";
  const measureCtx = ctx;
  const layout = layoutDoubleMapCaption(
    {
      geometry,
      slots: [
        { city: opts.slots[0].city, country: opts.slots[0].country, coords: coords(opts.slots[0]) },
        { city: opts.slots[1].city, country: opts.slots[1].country, coords: coords(opts.slots[1]) },
      ],
      customDate: opts.customDate?.trim() || undefined,
      showText: opts.showPosterText,
      includeCredits: opts.includeCredits,
      creditUrl: APP_CREDIT_URL,
      headingFamily: posterFontStack(opts.headingFontFamily?.trim() || opts.fontFamily),
      midlineFamily: posterFontStack(opts.midlineFontFamily?.trim() || opts.fontFamily),
      bottomFamily: posterFontStack(opts.bottomLineFontFamily?.trim() || opts.fontFamily, true),
      creditFamily: posterFontStack(opts.fontFamily, true),
      headingScale: getPosterFontScale(opts.headingFontSize ?? opts.fontSize),
      midlineScale: getPosterFontScale(opts.midlineFontSize ?? opts.fontSize),
      bottomScale: getPosterFontScale(opts.bottomLineFontSize ?? opts.fontSize),
    },
    (font, text) => {
      measureCtx.font = font;
      return measureCtx.measureText(text).width;
    },
  );

  ctx.fillStyle = opts.textColor;
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
      Array.from(run.chars).forEach((ch, idx) => ctx.fillText(ch, run.xs[idx], run.baselineY));
    }
  }
  for (const credit of layout.credits) {
    ctx.globalAlpha = credit.opacity;
    ctx.font = `300 ${credit.size}px ${credit.family}`;
    ctx.textAlign = credit.anchor === "end" ? "right" : "left";
    ctx.fillText(credit.text, credit.x, credit.y);
  }
  ctx.globalAlpha = 1;
  return canvas;
}
