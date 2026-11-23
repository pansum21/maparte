import type { MinimapOverlayOptions } from "./minimapOverlay";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import type {
  MarkerIconDefinition,
  MarkerItem,
  MarkerProjectionInput,
} from "@/features/markers/domain/types";
import type { Route } from "@/features/routes/domain/types";
import type { SquareCaptionGeometry } from "@/features/layout/domain/squareCaptionGeometry";
import type { FrameLayoutGeometry } from "@/features/layout/domain/frameLayoutGeometry";

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
  squareCaptionGeometry?: SquareCaptionGeometry;
  frameLayoutGeometry?: FrameLayoutGeometry;
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
  headingFontFamily?: string;
  headingFontSize?: number;
  midlineFontFamily?: string;
  midlineFontSize?: number;
  bottomLineFontFamily?: string;
  bottomLineFontSize?: number;
  textAlign?: "left" | "center" | "right";
  textPosition?: "top" | "center" | "bottom";
  showPosterText: boolean;
  showOverlay?: boolean;
  overlayTop?: boolean;
  overlayBottom?: boolean;
  includeCredits?: boolean;
  markers?: MarkerItem[];
  markerIcons?: MarkerIconDefinition[];
  markerProjection?: MarkerProjectionInput;
  markerScaleX?: number;
  markerScaleY?: number;
  markerSizeScale?: number;
  routes?: Route[];
  neatlineSvg?: string;
  /** Circle ring, route line and navigation arrow drawn over the map window. */
  minimapOverlay?: MinimapOverlayOptions;
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

