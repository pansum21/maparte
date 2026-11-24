import { useEffect, useMemo, useState } from "react";
import { APP_CREDIT_URL } from "@/core/config";
import { formatCoordinates } from "@/shared/geo/posterBounds";
import type { DoubleMapGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import { createCanvasMeasure } from "@/features/poster/domain/circlePosterCaption";
import { layoutDoubleMapCaption } from "@/features/poster/domain/doubleMapCaption";
import { getPosterFontScale } from "@/features/poster/domain/textLayout";
import { posterFontStack } from "@/features/poster/domain/posterFontStack";

export interface DoubleMapCaptionSlot {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

interface DoubleMapCaptionProps {
  geometry: DoubleMapGeometry;
  slots: [DoubleMapCaptionSlot, DoubleMapCaptionSlot];
  fontFamily: string;
  fontSize: number;
  headingFontFamily?: string;
  headingFontSize?: number;
  midlineFontFamily?: string;
  midlineFontSize?: number;
  bottomLineFontFamily?: string;
  bottomLineFontSize?: number;
  textColor: string;
  showPosterText: boolean;
  includeCredits: boolean;
  customDate?: string;
}

/** Coordinates of a map that has not been given a place yet stay empty. */
export function doubleSlotCoords(lat: number, lon: number, hasPlace: boolean): string {
  return hasPlace && Number.isFinite(lat) && Number.isFinite(lon) ? formatCoordinates(lat, lon) : "";
}

/**
 * Name blocks of a double layout, drawn as SVG on the poster's own pixel grid.
 * Uses the same layout as the PNG and SVG exports.
 */
export default function DoubleMapCaption(props: DoubleMapCaptionProps) {
  const { geometry } = props;
  const [fontTick, setFontTick] = useState(0);

  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) return undefined;
    const bump = () => setFontTick((n) => n + 1);
    fonts.addEventListener?.("loadingdone", bump);
    void fonts.ready.then(bump);
    return () => fonts.removeEventListener?.("loadingdone", bump);
  }, []);

  const [a, b] = props.slots;
  const layout = useMemo(() => {
    const measure = createCanvasMeasure();
    return layoutDoubleMapCaption(
      {
        geometry,
        slots: [
          { city: a.city, country: a.country, coords: doubleSlotCoords(a.lat, a.lon, Boolean(a.city || a.country)) },
          { city: b.city, country: b.country, coords: doubleSlotCoords(b.lat, b.lon, Boolean(b.city || b.country)) },
        ],
        customDate: props.customDate,
        showText: props.showPosterText,
        includeCredits: props.includeCredits,
        creditUrl: APP_CREDIT_URL,
        headingFamily: posterFontStack(props.headingFontFamily?.trim() || props.fontFamily),
        midlineFamily: posterFontStack(props.midlineFontFamily?.trim() || props.fontFamily),
        bottomFamily: posterFontStack(props.bottomLineFontFamily?.trim() || props.fontFamily, true),
        creditFamily: posterFontStack(props.fontFamily, true),
        headingScale: getPosterFontScale(props.headingFontSize ?? props.fontSize),
        midlineScale: getPosterFontScale(props.midlineFontSize ?? props.fontSize),
        bottomScale: getPosterFontScale(props.bottomLineFontSize ?? props.fontSize),
      },
      measure,
    );
    // fontTick re-measures once web fonts have finished loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geometry, a.city, a.country, a.lat, a.lon, b.city, b.country, b.lat, b.lon, props.customDate,
    props.showPosterText, props.includeCredits, props.fontFamily, props.fontSize,
    props.headingFontFamily, props.headingFontSize, props.midlineFontFamily, props.midlineFontSize,
    props.bottomLineFontFamily, props.bottomLineFontSize, fontTick,
  ]);

  return (
    <svg
      className="poster-circle-caption poster-double-caption"
      viewBox={`0 0 ${geometry.posterWidth} ${geometry.posterHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      fill={props.textColor}
    >
      {layout.rules.map((r, i) => (
        <rect key={`rule-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fillOpacity={r.opacity} />
      ))}
      {layout.runs.map((r, i) => (
        <text
          key={`run-${i}`}
          x={r.xs.join(" ")}
          y={r.baselineY}
          fontSize={r.size}
          fontWeight={r.weight}
          fontFamily={r.family}
          fillOpacity={r.opacity}
          textRendering="geometricPrecision"
        >
          {r.chars}
        </text>
      ))}
      {layout.credits.map((c, i) => (
        <text
          key={`credit-${i}`}
          x={c.x}
          y={c.y}
          fontSize={c.size}
          fontWeight={300}
          fontFamily={c.family}
          fillOpacity={c.opacity}
          textAnchor={c.anchor}
        >
          {c.text}
        </text>
      ))}
    </svg>
  );
}
