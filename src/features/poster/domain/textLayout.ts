/**
 * Shared poster text layout constants and pure helpers used by both the live
 * preview overlay and the export canvas renderer.
 */
import { parseHex } from "@/shared/utils/color";
export const TEXT_DIMENSION_REFERENCE_PX = 3600;

export const TEXT_CITY_Y_RATIO = 0.845;
export const TEXT_DIVIDER_Y_RATIO = 0.875;
export const TEXT_COUNTRY_Y_RATIO = 0.9;
export const TEXT_COORDS_Y_RATIO = 0.93;

/**
 * Physical spacing constants (in millimeters) calibrated for museum-grade map posters.
 * The gap between city title and divider line is strictly 2.5 mm (within the user's 2-3 mm requirement).
 */
export const PHYSICAL_DIVIDER_GAP_MM = 2.5;
export const PHYSICAL_COUNTRY_GAP_MM = 2.8;
export const PHYSICAL_TAGLINE_GAP_MM = 2.4;
export const PHYSICAL_COORDS_GAP_MM = 2.4;

/** Margin from the edges for attribution/credits. */
export const TEXT_EDGE_MARGIN_RATIO = 0.02;

/** City text scales down when labels get long. */
export const CITY_TEXT_SHRINK_THRESHOLD = 10;

export const CITY_FONT_BASE_PX = 250;
export const CITY_FONT_MIN_PX = 110;
export const COUNTRY_FONT_BASE_PX = 92;
export const COORDS_FONT_BASE_PX = 58;
export const ATTRIBUTION_FONT_BASE_PX = 50;
export const DEFAULT_POSTER_FONT_SIZE = 16;
export const MIN_POSTER_FONT_SIZE = 8;
export const MAX_POSTER_FONT_SIZE = 72;

export function getPosterFontScale(fontSize?: number): number {
  const size = Number.isFinite(fontSize) ? Number(fontSize) : DEFAULT_POSTER_FONT_SIZE;
  return Math.max(MIN_POSTER_FONT_SIZE, Math.min(MAX_POSTER_FONT_SIZE, size)) /
    DEFAULT_POSTER_FONT_SIZE;
}

export function isLatinScript(text: string | undefined | null): boolean {
  if (!text) {
    return true;
  }

  let latinCount = 0;
  let alphaCount = 0;

  for (const char of text) {
    if (/[A-Za-z\u00C0-\u024F]/.test(char)) {
      latinCount += 1;
      alphaCount += 1;
    } else if (/\p{L}/u.test(char)) {
      alphaCount += 1;
    }
  }

  if (alphaCount === 0) {
    return true;
  }

  return latinCount / alphaCount > 0.8;
}

export function formatCityLabel(city: string): string {
  return isLatinScript(city) ? city.toUpperCase().split("").join("  ") : city;
}

export interface CityDisplayLayout {
  lines: string[];
  isMultiLine: boolean;
  lineSpacingRatio: number;
}

/**
 * Intelligent layout formatter for city titles across all layouts:
 * - In narrow boxes (e.g. square caption landscape right column), automatically breaks into 2 lines.
 * - In portrait / narrow formats, cleanly breaks multi-word names (e.g. "SAN FRANCISCO", "RIO DE JANEIRO").
 * - Handles "City of ..." prefixes on their own upper line.
 * - Splits long hyphenated names (e.g. "CHAMONIX-MONT-BLANC").
 */
export function resolveCityDisplay(
  city: string,
  aspectRatio: number = 0.707,
  isNarrowBox: boolean = false,
): CityDisplayLayout {
  const trimmed = (city || "").trim();
  if (!trimmed) {
    return { lines: [""], isMultiLine: false, lineSpacingRatio: 1.0 };
  }

  // 1. "City of ..." prefix
  const cityOfMatch = trimmed.match(/^(the\s+)?city\s+of\s+(.+)$/i);
  if (cityOfMatch) {
    const prefix = cityOfMatch[1] ? "THE CITY OF" : "CITY OF";
    const mainCity = cityOfMatch[2].trim().toUpperCase();
    return {
      lines: [prefix, mainCity],
      isMultiLine: true,
      lineSpacingRatio: 0.85,
    };
  }

  // 2. Wide landscape banner (when NOT a narrow box)
  const isLandscape = aspectRatio > 1.25;
  if (isLandscape && !isNarrowBox && trimmed.length <= 16 && !trimmed.includes("-")) {
    return {
      lines: [trimmed.toUpperCase()],
      isMultiLine: false,
      lineSpacingRatio: 1.0,
    };
  }

  // 3. Multi-word or long hyphenated city names in portrait / narrow layouts
  let words = trimmed.split(/\s+/);
  if (words.length === 1 && trimmed.includes("-") && (isNarrowBox ? trimmed.length > 8 : trimmed.length > 11)) {
    const parts = trimmed.split("-");
    if (parts.length === 2) {
      words = [`${parts[0]}-`, parts[1]];
    } else if (parts.length >= 3) {
      const mid = Math.ceil(parts.length / 2);
      words = [`${parts.slice(0, mid).join("-")}-`, parts.slice(mid).join("-")];
    }
  }

  const wrapThreshold = isNarrowBox ? 6 : 7;
  if (words.length >= 2 && trimmed.length > wrapThreshold) {
    if (words.length === 2) {
      return {
        lines: [words[0].toUpperCase(), words[1].toUpperCase()],
        isMultiLine: true,
        lineSpacingRatio: 0.95,
      };
    }
    if (words.length === 3) {
      // Balance character length across lines
      const optA = [`${words[0]} ${words[1]}`, words[2]];
      const optB = [words[0], `${words[1]} ${words[2]}`];
      const diffA = Math.abs(optA[0].length - optA[1].length);
      const diffB = Math.abs(optB[0].length - optB[1].length);
      const chosen = diffA <= diffB ? optA : optB;
      return {
        lines: [chosen[0].toUpperCase(), chosen[1].toUpperCase()],
        isMultiLine: true,
        lineSpacingRatio: 0.95,
      };
    }
    // 4 or more words: find optimal split minimizing length difference
    let bestSplit = Math.ceil(words.length / 2);
    let minDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const l1 = words.slice(0, i).join(" ");
      const l2 = words.slice(i).join(" ");
      const diff = Math.abs(l1.length - l2.length);
      if (diff < minDiff) {
        minDiff = diff;
        bestSplit = i;
      }
    }
    return {
      lines: [
        words.slice(0, bestSplit).join(" ").toUpperCase(),
        words.slice(bestSplit).join(" ").toUpperCase(),
      ],
      isMultiLine: true,
      lineSpacingRatio: 0.95,
    };
  }

  return {
    lines: [trimmed.toUpperCase()],
    isMultiLine: false,
    lineSpacingRatio: 1.0,
  };
}

/**
 * Returns a multiplier (≤1) to shrink the city font for long names.
 * Callers apply it to their own base font size.
 */
export function computeCityFontScale(
  city: string,
  lines?: string[],
  isNarrowBox: boolean = false,
): number {
  const maxLineLen = lines && lines.length > 0
    ? Math.max(...lines.map((l) => l.length))
    : Math.max(city.length, 1);

  const baseThreshold = isNarrowBox ? 7 : 9;

  if (maxLineLen <= baseThreshold) {
    return isNarrowBox ? 0.90 : 1.0;
  }
  const scale = baseThreshold / maxLineLen;
  const minScale = isNarrowBox ? 0.35 : 0.40;
  return Math.max(minScale, Number(scale.toFixed(3)));
}

/**
 * Computes elegant letter spacing for city titles:
 * Short names get majestic letter-spacing (0.15em), while longer names
 * smoothly condense (down to 0.04em) to avoid line overflow.
 */
export function computeCityLetterSpacing(
  maxLineLength: number,
  isNarrowBox: boolean = false,
): string {
  if (isNarrowBox) {
    if (maxLineLength > 11) return "0.04em";
    if (maxLineLength > 8) return "0.08em";
    return "0.12em";
  }
  if (maxLineLength > 14) return "0.06em";
  if (maxLineLength > 10) return "0.10em";
  return "0.15em";
}

/**
 * Ensures strict contrast between text and background.
 * When forceCustom is true (user explicitly picked a color), the user's choice is respected.
 * Otherwise:
 * Dark background (< 0.5 luma) -> text MUST be light (fallback #FFFFFF).
 * Light background (>= 0.5 luma) -> text MUST be dark (fallback #111111).
 */
export function ensureContrastTextColor(
  textColor: string,
  bgHex: string,
  forceCustom: boolean = false,
): string {
  if (forceCustom) {
    // Honor explicit user color selection
    return textColor;
  }
  const bgRgb = parseHex(bgHex);
  const bgLuma = bgRgb ? (0.2126 * bgRgb.r + 0.7152 * bgRgb.g + 0.0722 * bgRgb.b) / 255 : 0.5;
  const txtRgb = parseHex(textColor);
  const txtLuma = txtRgb ? (0.2126 * txtRgb.r + 0.7152 * txtRgb.g + 0.0722 * txtRgb.b) / 255 : (bgLuma < 0.5 ? 1 : 0);

  if (bgLuma < 0.5) {
    if (txtLuma < 0.45) return "#FFFFFF";
  } else {
    if (txtLuma > 0.55) return "#111111";
  }
  return textColor;
}

/**
 * Determines the correct attribution text colour.
 * Strictly guarantees high legibility against the land/background color.
 */
export function computeAttributionColor(
  textColor: string,
  landHex: string,
  _showOverlay?: boolean,
): string {
  return ensureContrastTextColor(textColor, landHex);
}

/** Collapse omitted location fields without reserving empty text rows. */
export function resolvePosterLabels(city: string, state = "", country = "") {
  const labels = [city, state, country].map(value => value.trim()).filter(Boolean);
  return { city: labels[0] || "", country: labels.slice(1).join(" · ") };
}

export interface ActivePosterLabelsInput {
  textMode?: "map" | "preset";
  displayCity: string;
  displayTown?: string;
  displayCountry: string;
  displayState?: string;
  customDate?: string;
  presetTitle?: string;
  presetSubtitle?: string;
  presetExtra?: string;
}

/** Resolves poster labels depending on whether Map Text or Preset Text mode is active. */
export function getActivePosterLabels(form: ActivePosterLabelsInput) {
  const isPreset = form.textMode === "preset" || (form.textMode !== "map" && Boolean(form.presetTitle));
  const mainTitle = isPreset ? (form.presetTitle || form.displayCity) : (form.displayCity || form.displayTown || "");
  const subtitle = isPreset
    ? (form.presetSubtitle !== undefined ? form.presetSubtitle : form.displayCountry)
    : form.displayCountry;
  const extraLine = isPreset
    ? (form.presetExtra !== undefined ? form.presetExtra : form.customDate)
    : form.customDate;

  const { city, country } = resolvePosterLabels(
    mainTitle,
    isPreset ? "" : (form.displayState || ""),
    subtitle,
  );
  return { city, country, customDate: extraLine };
}
