import type { PosterForm } from "@/features/poster/application/posterReducer";
import type { MatchedCity } from "@/features/location/domain/cityRouteResolver";
import { defaultThemeName } from "@/features/theme/infrastructure/themeRepository";
import { defaultLayoutId, getLayoutOption } from "@/features/layout/infrastructure/layoutRepository";
import {
  DEFAULT_CITY,
  DEFAULT_COUNTRY,
  DEFAULT_DISTANCE_METERS,
} from "@/core/config";

export interface ParsedUrlPosterState {
  theme?: string;
  layout?: string;
  width?: string;
  height?: string;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  textPosition?: "top" | "center" | "bottom";
  circleTextSide?: "left" | "right";
  minimapRing?: boolean;
  minimapRoute?: boolean;
  navMarker?: boolean;
  navMarkerSize?: number;
  navMarkerColor?: string;
  customDate?: string;
  displayCity?: string;
  displayCountry?: string;
  displayState?: string;
  distance?: string;
  latitude?: string;
  longitude?: string;
  showPosterText?: boolean;
  overlayTop?: boolean;
  overlayBottom?: boolean;
  posterTextColor?: string;
  textMode?: "map" | "preset";
  presetTitle?: string;
  presetSubtitle?: string;
  presetExtra?: string;
}

export interface ParsedSecondMapState {
  latitude?: string;
  longitude?: string;
  displayCity?: string;
  displayCountry?: string;
  distance?: string;
  /** 1 = first map is active, 2 = second map is active. */
  active?: 1 | 2;
}

/**
 * Second map of a double layout (?lat2=&lon2=&city2=&country2=&dist2=&active=2).
 * Only read once at start, which is enough for sharing a link and for testing.
 */
export function parseSecondMapFromUrl(search: string): ParsedSecondMapState {
  const result: ParsedSecondMapState = {};
  if (!search || typeof search !== "string") return result;
  try {
    const params = new URLSearchParams(search);
    const lat = params.get("lat2");
    if (lat && !isNaN(Number(lat))) result.latitude = lat.trim();
    const lon = params.get("lon2");
    if (lon && !isNaN(Number(lon))) result.longitude = lon.trim();
    const city = params.get("city2");
    if (city !== null) result.displayCity = city.trim();
    const country = params.get("country2");
    if (country !== null) result.displayCountry = country.trim();
    const dist = params.get("dist2");
    if (dist && !isNaN(Number(dist))) result.distance = dist.trim();
    const active = params.get("active");
    if (active === "1" || active === "2") result.active = Number(active) as 1 | 2;
  } catch {
    // ignore malformed params
  }
  return result;
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

    const layoutParam = params.get("layout");
    if (layoutParam && layoutParam.trim()) {
      const opt = getLayoutOption(layoutParam.trim());
      if (opt) {
        result.layout = opt.id;
        result.width = String((opt as any).posterWidthCm || opt.widthCm);
        result.height = String((opt as any).posterHeightCm || opt.heightCm);
      } else {
        result.layout = layoutParam.trim();
      }
    }

    const widthParam = params.get("width");
    if (widthParam && !isNaN(Number(widthParam))) result.width = widthParam.trim();

    const heightParam = params.get("height");
    if (heightParam && !isNaN(Number(heightParam))) result.height = heightParam.trim();

    const font = params.get("font") || params.get("fontFamily");
    if (font && font.trim()) result.fontFamily = font.trim();
    const align = params.get("align");
    if (align === "left" || align === "center" || align === "right") result.textAlign = align;
    const pos = params.get("pos");
    if (pos === "top" || pos === "center" || pos === "bottom") result.textPosition = pos;

    const side = params.get("textside");
    if (side === "left" || side === "right") result.circleTextSide = side;
    const ring = params.get("ring");
    if (ring === "0" || ring === "1") result.minimapRing = ring === "1";
    const route = params.get("mroute");
    if (route === "0" || route === "1") result.minimapRoute = route === "1";
    const arrow = params.get("arrow");
    if (arrow === "0" || arrow === "1") result.navMarker = arrow === "1";
    const arrowSize = Number(params.get("arrowsize"));
    if (params.get("arrowsize") && Number.isFinite(arrowSize) && arrowSize >= 0.5 && arrowSize <= 2) {
      result.navMarkerSize = arrowSize;
    }
    const arrowColor = params.get("arrowcolor");
    if (arrowColor && /^[0-9a-fA-F]{6}$/.test(arrowColor)) result.navMarkerColor = `#${arrowColor}`;

    const tagline = params.get("tagline") || params.get("date");
    if (tagline !== null && tagline !== undefined) {
      result.customDate = tagline;
      result.presetSubtitle = tagline;
    }

    const title = params.get("title") || params.get("headline");
    const city = params.get("city");
    if (title && title.trim()) {
      result.textMode = "preset";
      result.presetTitle = title.trim();
      if (city !== null && city.trim()) {
        result.displayCity = city.trim();
      }
    } else {
      if (city !== null) result.displayCity = city.trim();
    }

    if (params.has("state")) result.displayState = params.get("state") || "";
    const country = params.get("country");
    if (country !== null) result.displayCountry = country.trim();

    const dist = params.get("dist") || params.get("distance");
    if (dist && dist.trim()) result.distance = dist.trim();

    const lat = params.get("lat") || params.get("latitude");
    if (lat && !isNaN(Number(lat))) result.latitude = lat.trim();

    const lon = params.get("lon") || params.get("longitude");
    if (lon && !isNaN(Number(lon))) result.longitude = lon.trim();

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

  // 2. Poster Layout (if customized)
  if (form.layout && form.layout !== "custom" && form.layout !== defaultLayoutId) {
    params.set("layout", form.layout);
  }

  // 3. Font family (if customized)
  if (form.fontFamily && form.fontFamily.trim().length > 0) {
    params.set("font", form.fontFamily.trim());
  }
  if (form.textAlign && form.textAlign !== "center") params.set("align", form.textAlign);
  if (form.textPosition && form.textPosition !== "bottom") params.set("pos", form.textPosition);
  if (form.circleTextSide === "left") params.set("textside", "left");
  if (form.minimapRing === false) params.set("ring", "0");
  if (form.minimapRoute) params.set("mroute", "1");
  if (form.navMarker) {
    params.set("arrow", "1");
    if (form.navMarkerSize && form.navMarkerSize !== 1) params.set("arrowsize", String(form.navMarkerSize));
    if (form.navMarkerColor && form.navMarkerColor.toLowerCase() !== "#2f7bff") {
      params.set("arrowcolor", form.navMarkerColor.replace("#", ""));
    }
  }

  // 4. Tagline / Custom date text (if provided)
  if (form.customDate && form.customDate.trim().length > 0) {
    params.set("tagline", form.customDate.trim());
  }

  // 5. Display city override (if different from city default)
  const baseCity = matchedCity ? matchedCity.city : DEFAULT_CITY;
  if (form.displayCity && form.displayCity.trim() !== baseCity.trim()) {
    params.set("title", form.displayCity.trim());
  }

  // 6. Display country override (if different from country default)
  const baseCountry = matchedCity ? matchedCity.country : DEFAULT_COUNTRY;
  if (form.displayCountry.trim() !== baseCountry.trim()) {
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
  if (form.displayState) params.set("state", form.displayState);
  const search = params.toString() ? `?${params.toString()}` : "";
  const fullUrl = `${path}${search}`;

  return { path, search, fullUrl };
}
