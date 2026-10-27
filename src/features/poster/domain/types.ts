import type { ResolvedTheme } from "@/features/theme/domain/types";
import type {
  MarkerIconDefinition,
  MarkerItem,
  MarkerProjectionInput,
} from "@/features/markers/domain/types";
import type { Route } from "@/features/routes/domain/types";

export interface CanvasSize {
  width: number;
  height: number;
  requestedWidth: number;
  requestedHeight: number;
  downscaleFactor: number;
  requestedDpi: number;
  effectiveDpiX: number;
  effectiveDpiY: number;
  effectiveDpi: number;
}

/** Options passed to the export compositor (map snapshot + text overlay). */
export interface ExportOptions {
  /** Map pixels were rendered directly into the page canvas' 10% print mat. */
  mapAlreadyInset?: boolean;
  /** Whether the white paper mat sheet should frame the poster map. */
  showWhiteMat?: boolean;
  matInsetXRatio?: number;
  matInsetYRatio?: number;
  mapInsetXRatio?: number;
  mapInsetYRatio?: number;
  theme: ResolvedTheme;
  center: { lat: number; lon: number };
  widthInches: number;
  heightInches: number;
  displayCity: string;
  displayCountry: string;
  displayContinent?: string;
  customDate?: string;
  fontFamily: string;
  fontSize: number;
  showPosterText: boolean;
  showOverlay?: boolean;
  includeCredits?: boolean;
  markers?: MarkerItem[];
  markerIcons?: MarkerIconDefinition[];
  markerProjection?: MarkerProjectionInput;
  markerScaleX?: number;
  markerScaleY?: number;
  markerSizeScale?: number;
  routes?: Route[];
  neatlineSvg?: string;
}

export interface Typography {
  displayCity: string;
  displayCountry: string;
  displayContinent?: string;
  customDate?: string;
  fontFamily: string;
  fontSize: number;
  showPosterText: boolean;
  includeCredits?: boolean;
}
