import { useEffect, useMemo, useState } from "react";
import { APP_CREDIT_URL } from "@/core/config";
import { formatCoordinates } from "@/shared/geo/posterBounds";
import type { SquareCaptionGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import {
  createCanvasMeasure,
  layoutCirclePosterCaption,
} from "@/features/poster/domain/circlePosterCaption";
import { getPosterFontScale } from "@/features/poster/domain/textLayout";
import { posterFontStack } from "@/features/poster/domain/posterFontStack";

interface CirclePosterCaptionProps {
  geometry: SquareCaptionGeometry;
  city: string;
  country: string;
  lat: number;
  lon: number;
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

/**
 * Name block of the poster style circle layout, drawn as SVG on the poster's own
 * pixel grid. It uses the same layout as the PNG and SVG exports.
 */
export default function CirclePosterCaption(props: CirclePosterCaptionProps) {
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

  const layout = useMemo(() => {
    const measure = createCanvasMeasure();
    return layoutCirclePosterCaption(
      {
        geometry,
        city: props.city,
        country: props.country,
        coords: formatCoordinatesSafe(props.lat, props.lon),
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
    geometry, props.city, props.country, props.lat, props.lon, props.customDate,
    props.showPosterText, props.includeCredits, props.fontFamily, props.fontSize,
    props.headingFontFamily, props.headingFontSize, props.midlineFontFamily, props.midlineFontSize,
    props.bottomLineFontFamily, props.bottomLineFontSize, fontTick,
  ]);

  return (
    <svg
      className="poster-circle-caption"
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

function formatCoordinatesSafe(lat: number, lon: number): string {
  return Number.isFinite(lat) && Number.isFinite(lon) ? formatCoordinates(lat, lon) : "";
}
