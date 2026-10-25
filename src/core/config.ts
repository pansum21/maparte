/* ────── App config constants ────── */
/* Migrated from src/constants/appConfig.js — env-independent values */

export const CM_PER_INCH = 2.54;

export const MIN_POSTER_CM = 4;
export const MAX_POSTER_CM = 45;
export const DEFAULT_POSTER_WIDTH_CM = 20;
export const DEFAULT_POSTER_HEIGHT_CM = 30;
export const LAYOUT_MATCH_TOLERANCE_CM = 0.01;

export const MIN_DISTANCE_METERS = 15;
export const MAX_DISTANCE_METERS = 20_000_000;
export const DEFAULT_DISTANCE_METERS = 4_000;

/* ── Map / MapLibre ── */

/** Earth circumference at equator in meters. */
export const EARTH_CIRCUMFERENCE_M = 40_075_016.686;

/** Vector tile size for OpenMapTiles/OpenFreeMap tile scheme. */
export const TILE_SIZE_PX = 512;

/** Min zoom level allowed for the map. */
export const MIN_MAP_ZOOM = 0.5;

/** Max zoom level allowed for the map (zoom 22 allows street, alley, and building level inspection). */
export const MAX_MAP_ZOOM = 22;

/** Default container width (px) used before ResizeObserver measures the real one. */
export const DEFAULT_CONTAINER_PX = 600;

/** Duration (ms) for flyTo animation when selecting a location. */
export const FLY_TO_DURATION_MS = 1800;

/** Dehradun, India — default fallback when geolocation is denied. */
export const DEFAULT_LAT = 30.3165;
export const DEFAULT_LON = 78.0322;
export const DEFAULT_CITY = "Dehradun";
export const DEFAULT_COUNTRY = "India";

/**
 * The sidebar ad in the poster preview panel is OFF unless
 * VITE_ADS_SIDEBAR_ENABLED is explicitly set to "true".
 */
export const ADS_SIDEBAR_ENABLED =
  String(import.meta.env.VITE_ADS_SIDEBAR_ENABLED ?? "")
    .trim()
    .toLowerCase() === "true";

export const ADSENSE_AD_CLIENT =
  import.meta.env.VITE_ADSENSE_AD_CLIENT || "ca-pub-6768042074394876";
export const AD_SLOT_SIDEBAR = import.meta.env.VITE_AD_SLOT_SIDEBAR ?? "";

export const REPO_URL = import.meta.env.VITE_REPO_URL ?? "";
export const REPO_API_URL = import.meta.env.VITE_REPO_API_URL ?? "";
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? "";
/* Raw markdown URLs (e.g. raw.githubusercontent.com) for the in-app legal
   modal — imprint and privacy docs pulled from the meta repo. */
export const LEGAL_NOTICE_URL = import.meta.env.VITE_LEGAL_NOTICE_URL ?? "";
export const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL ?? "";

export const SOCIAL_LINKEDIN = import.meta.env.VITE_SOCIAL_LINKEDIN ?? "";
export const SOCIAL_INSTAGRAM = import.meta.env.VITE_SOCIAL_INSTAGRAM ?? "";
export const SOCIAL_REDDIT = import.meta.env.VITE_SOCIAL_REDDIT ?? "";
export const SOCIAL_THREADS = import.meta.env.VITE_SOCIAL_THREADS ?? "";
export const SOCIAL_YOUTUBE = import.meta.env.VITE_SOCIAL_YOUTUBE ?? "";
export const KOFI_URL = import.meta.env.VITE_KOFI_URL ?? "";
export const DEVELOPER_NAME = import.meta.env.VITE_DEVELOPER_NAME ?? "";
export const DEVELOPER_PROFILE_URL =
  import.meta.env.VITE_DEVELOPER_PROFILE_URL ?? "";
export const APP_CREDIT_URL =
  import.meta.env.VITE_APP_CREDIT_URL ?? "maparte.app";
export const APP_VERSION = String(
  import.meta.env.VITE_APP_VERSION ?? "0.0.0",
).trim();
export const UPDATES_URL = String(
  import.meta.env.VITE_UPDATES_URL ?? "/updates.json",
).trim();

export const INSTALL_DIAGNOSTICS_ENABLED = false;

export interface FontOption {
  value: string;
  label: string;
  category?: "Sans serif" | "Serif" | "Display" | "Monospace";
}

export const FONT_OPTIONS: FontOption[] = [
  { value: "", label: "Default (Space Grotesk)" },
  { value: "Instrument Sans", label: "Instrument Sans", category: "Sans serif" },
  { value: "Inter", label: "Inter", category: "Sans serif" },
  { value: "DM Sans", label: "DM Sans", category: "Sans serif" },
  { value: "Lato", label: "Lato", category: "Sans serif" },
  { value: "Montserrat", label: "Montserrat", category: "Sans serif" },
  { value: "Noto Sans JP", label: "Noto Sans JP", category: "Sans serif" },
  { value: "Poppins", label: "Poppins", category: "Sans serif" },
  { value: "Raleway", label: "Raleway", category: "Sans serif" },
  { value: "Source Sans Pro", label: "Source Sans Pro", category: "Sans serif" },
  { value: "Outfit", label: "Outfit", category: "Sans serif" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond", category: "Serif" },
  { value: "DM Serif Display", label: "DM Serif Display", category: "Serif" },
  { value: "Libre Baskerville", label: "Libre Baskerville", category: "Serif" },
  { value: "Lora", label: "Lora", category: "Serif" },
  { value: "Merriweather", label: "Merriweather", category: "Serif" },
  { value: "Playfair Display", label: "Playfair Display", category: "Serif" },
  { value: "Cinzel", label: "Cinzel", category: "Display" },
  { value: "Anton", label: "Anton", category: "Display" },
  { value: "Bebas Neue", label: "Bebas Neue", category: "Display" },
  { value: "Oswald", label: "Oswald", category: "Display" },
  { value: "Josefin Sans", label: "Josefin Sans", category: "Display" },
  { value: "IBM Plex Mono", label: "IBM Plex Mono", category: "Monospace" },
  { value: "Spline Sans Mono", label: "Spline Sans Mono", category: "Monospace" },
];

export const FONT_FAMILY_COUNT = new Set(
  FONT_OPTIONS.map((option) => option.value.trim() || "Space Grotesk"),
).size;
