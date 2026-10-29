import type { PosterForm } from "@/features/poster/application/posterReducer";
import type { MatchedCity } from "@/features/location/domain/cityRouteResolver";
import { defaultThemeName } from "@/features/theme/infrastructure/themeRepository";
import { defaultLayoutId } from "@/features/layout/infrastructure/layoutRepository";
import {
  DEFAULT_CITY,
  DEFAULT_COUNTRY,
  DEFAULT_DISTANCE_METERS,
} from "@/core/config";

export interface ParsedUrlPosterState {
  theme?: string;
  layout?: string;
  fontFamily?: string;
  customDate?: string;
  displayCity?: string;
  displayCountry?: string;
  distance?: string;
  showPosterText?: boolean;
  overlayTop?: boolean;
  overlayBottom?: boolean;
  posterTextColor?: string;
}

/**
 * Parses customization parameters from window.location.search (?theme=...&border=...)
 */
export function parsePosterStateFromUrl(search: string): ParsedUrlPosterState {
  const result: ParsedUrlPosterState = {};
  if (!search || typeof search !== "string") return result;

  try {
    const params = new URLSearchParams(search);

    const theme = params.get("theme");
    if (theme && theme.trim()) result.theme = theme.trim();

    const border = params.get("border") || params.get("layout");
    if (border && border.trim()) result.layout = border.trim();

    const font = params.get("font") || params.get("fontFamily");
    if (font && font.trim()) result.fontFamily = font.trim();

    const tagline = params.get("tagline") || params.get("date");
    if (tagline !== null && tagline !== undefined) result.customDate = tagline;

    const city = params.get("city");
    if (city && city.trim()) result.displayCity = city.trim();

    const country = params.get("country");
    if (country && country.trim()) result.displayCountry = country.trim();

    const dist = params.get("dist") || params.get("distance");
    if (dist && dist.trim()) result.distance = dist.trim();

    for (const key of ["overlayTop", "overlayBottom"] as const) {
      const value = params.get(key);
      if (value === "0" || value === "1") result[key] = value === "1";
    }
    const color = params.get("textColor");
    if (color && /^#[0-9a-f]{6}$/i.test(color)) result.posterTextColor = color;
    const text = params.get("text");
    if (text === "0" || text === "false") {
      result.showPosterText = false;
    } else if (text === "1" || text === "true") {
      result.showPosterText = true;
    }
  } catch {
    // ignore malformed params
  }

  return result;
}

/**
 * Serializes the current poster form state into a clean relative URL.
 * Only non-default values are appended as search params.
 */
export function serializePosterStateToUrl(
  form: PosterForm,
  matchedCity: MatchedCity | null,
): { path: string; search: string; fullUrl: string } {
  const path = matchedCity ? `/cities/${matchedCity.slug}` : "/";
  const params = new URLSearchParams();

  // 1. Theme (if customized)
  if (form.theme && form.theme !== defaultThemeName) {
    params.set("theme", form.theme);
  }

  // 2. Border / Neatline layout (if customized)
  if (form.layout && form.layout !== defaultLayoutId) {
    params.set("border", form.layout);
  }

  // 3. Font family (if customized)
  if (form.fontFamily && form.fontFamily.trim().length > 0) {
    params.set("font", form.fontFamily.trim());
  }

  // 4. Tagline / Custom date text (if provided)
  if (form.customDate && form.customDate.trim().length > 0) {
    params.set("tagline", form.customDate.trim());
  }

  // 5. Display city override (if different from city default)
  const baseCity = matchedCity ? matchedCity.city : DEFAULT_CITY;
  if (form.displayCity && form.displayCity.trim() !== baseCity.trim()) {
    params.set("city", form.displayCity.trim());
  }

  // 6. Display country override (if different from country default)
  const baseCountry = matchedCity ? matchedCity.country : DEFAULT_COUNTRY;
  if (form.displayCountry && form.displayCountry.trim() !== baseCountry.trim()) {
    params.set("country", form.displayCountry.trim());
  }

  // 7. Distance / Zoom level (if changed significantly)
  const baseDist = String(matchedCity?.distanceMeters || DEFAULT_DISTANCE_METERS);
  if (form.distance && form.distance !== baseDist) {
    params.set("dist", form.distance);
  }

  // 8. Toggle poster text overlay
  if (form.showPosterText === false) {
    params.set("text", "0");
  }

  for (const key of ["overlayTop", "overlayBottom"] as const) {
    if (form[key] !== undefined) params.set(key, form[key] ? "1" : "0");
  }
  if (form.posterTextColor) params.set("textColor", form.posterTextColor);
  const search = params.toString() ? `?${params.toString()}` : "";
  const fullUrl = `${path}${search}`;

  return { path, search, fullUrl };
}
