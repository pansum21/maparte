import { doubleSlotCaptionGeometry, type DoubleMapGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import {
  layoutCirclePosterCaption,
  type CirclePosterCaptionLayout,
  type CirclePosterCaptionInput,
  type MeasureText,
} from "@/features/poster/domain/circlePosterCaption";

export interface DoubleMapCaptionSlotText {
  city: string;
  country: string;
  coords: string;
}

export interface DoubleMapCaptionInput {
  geometry: DoubleMapGeometry;
  slots: [DoubleMapCaptionSlotText, DoubleMapCaptionSlotText];
  customDate?: string;
  showText: boolean;
  includeCredits: boolean;
  creditUrl: string;
  headingFamily: string;
  midlineFamily: string;
  bottomFamily: string;
  creditFamily: string;
  headingScale: number;
  midlineScale: number;
  bottomScale: number;
}

/** Heading size of a double layout relative to a single name block, so two names fit the column. */
export const DOUBLE_HEADING_FACTOR = 0.5;

/**
 * Both name blocks of a double layout. Shared by the live preview, the PNG export
 * and the layered SVG, like the single name block.
 */
export function layoutDoubleMapCaption(
  input: DoubleMapCaptionInput,
  measure: MeasureText,
): CirclePosterCaptionLayout {
  const out: CirclePosterCaptionLayout = { runs: [], rules: [], credits: [] };
  ([0, 1] as const).forEach((i) => {
    const text = input.slots[i];
    const base: CirclePosterCaptionInput = {
      geometry: doubleSlotCaptionGeometry(input.geometry, i),
      city: text.city,
      country: text.country,
      coords: text.coords,
      customDate: i === 0 ? input.customDate : undefined,
      showText: input.showText,
      includeCredits: input.includeCredits && i === 0,
      creditUrl: input.creditUrl,
      headingFamily: input.headingFamily,
      midlineFamily: input.midlineFamily,
      bottomFamily: input.bottomFamily,
      creditFamily: input.creditFamily,
      headingScale: input.headingScale * DOUBLE_HEADING_FACTOR,
      midlineScale: input.midlineScale * 0.62,
      bottomScale: input.bottomScale * 0.7,
    };
    const part = layoutCirclePosterCaption(base, measure);
    out.runs.push(...part.runs);
    out.rules.push(...part.rules);
    out.credits.push(...part.credits);
  });
  return out;
}
