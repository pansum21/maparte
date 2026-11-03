export type MapShapeId =
  | "full"
  | "heart"
  | "circle"
  | "squircle"
  | "arch";

export type ShapeFinishId = "shadow" | "blur" | "border" | "clean";

export interface MapShapeDefinition {
  id: MapShapeId;
  name: string;
  subtitle: string;
  badge?: string;
  description: string;
  svgPath: string; // viewBox 0 0 100 100
  clipPathUnits?: "objectBoundingBox" | "userSpaceOnUse";
  normalizedPath?: string; // coordinates normalized 0..1 for clipPathUnits="objectBoundingBox"
}

export interface ShapeFinishDefinition {
  id: ShapeFinishId;
  name: string;
  badge?: string;
  description: string;
  icon: string;
}

// 0..1 normalized paths for SVG clipPath with clipPathUnits="objectBoundingBox"
export const MAP_SHAPES: MapShapeDefinition[] = [
  {
    id: "full",
    name: "Full Bleed",
    subtitle: "Classic Rectangle",
    description: "Standard edge-to-edge poster map coverage.",
    svgPath: "M 0 0 L 100 0 L 100 100 L 0 100 Z",
    normalizedPath: "M 0 0 L 1 0 L 1 1 L 0 1 Z",
  },
  {
    id: "heart",
    name: "Romantic Heart",
    subtitle: "Where We Met & Love",
    badge: "Best Seller",
    description: "Symmetrical fine-art heart aperture with elegant top lobes and softly rounded bottom tip.",
    svgPath: "M 50 20 C 52 14, 55 10, 61 8 C 71 4, 83 7, 90 16 C 96 24, 97 36, 92 46 C 82 65, 60 80, 53 87 C 51.5 88.8, 48.5 88.8, 47 87 C 40 80, 18 65, 8 46 C 3 36, 4 24, 10 16 C 17 7, 29 4, 39 8 C 45 10, 48 14, 50 20 Z",
    normalizedPath: "M 0.50 0.20 C 0.52 0.14, 0.55 0.10, 0.61 0.08 C 0.71 0.04, 0.83 0.07, 0.90 0.16 C 0.96 0.24, 0.97 0.36, 0.92 0.46 C 0.82 0.65, 0.60 0.80, 0.53 0.87 C 0.515 0.888, 0.485 0.888, 0.47 0.87 C 0.40 0.80, 0.18 0.65, 0.08 0.46 C 0.03 0.36, 0.04 0.24, 0.10 0.16 C 0.17 0.07, 0.29 0.04, 0.39 0.08 C 0.45 0.10, 0.48 0.14, 0.50 0.20 Z",
  },
  {
    id: "circle",
    name: "Minimalist Orb",
    subtitle: "Egg / Oval Curvature",
    badge: "Popular",
    description: "Continuous-curvature egg/oval aperture tailored for gallery fine-art prints.",
    svgPath: "M 50 6 A 44 44 0 1 0 50 94 A 44 44 0 1 0 50 6 Z",
    normalizedPath: "M 0.5 0.06 A 0.44 0.44 0 1 0 0.5 0.94 A 0.44 0.44 0 1 0 0.5 0.06 Z",
  },
  {
    id: "squircle",
    name: "Gallery Square",
    subtitle: "Expanded Soft Squircle",
    description: "Expanded continuous-curvature rounded square covering maximum canvas area.",
    svgPath: "M 20 6 L 80 6 C 92 6, 94 8, 94 20 L 94 80 C 94 92, 92 94, 80 94 L 20 94 C 8 94, 6 92, 6 80 L 6 20 C 6 8, 8 6, 20 6 Z",
    normalizedPath: "M 0.20 0.06 L 0.80 0.06 C 0.92 0.06, 0.94 0.08, 0.94 0.20 L 0.94 0.80 C 0.94 0.92, 0.92 0.94, 0.80 0.94 L 0.20 0.94 C 0.08 0.94, 0.06 0.92, 0.06 0.80 L 0.06 0.20 C 0.06 0.08, 0.08 0.06, 0.20 0.06 Z",
  },
  {
    id: "arch",
    name: "Modern Arch",
    subtitle: "Architectural Vault",
    description: "Mediterranean arched dome trending in luxury editorial prints.",
    svgPath: "M 8 94 L 8 46 A 42 42 0 0 1 92 46 L 92 94 Z",
    normalizedPath: "M 0.08 0.94 L 0.08 0.46 A 0.42 0.42 0 0 1 0.92 0.46 L 0.92 0.94 Z",
  },
];

export const SHAPE_FINISHES: ShapeFinishDefinition[] = [
  {
    id: "shadow",
    name: "3D Shadow",
    badge: "Luxury Depth",
    description: "Realistic gallery mat-board depth with soft multi-layer shadow.",
    icon: "layers",
  },
  {
    id: "blur",
    name: "Soft Blur",
    badge: "Seamless Fade",
    description: "Map softly dissolves into paper tones without a harsh border.",
    icon: "feather",
  },
  {
    id: "border",
    name: "Fine Border",
    description: "Ultra-delicate 0.05 mm architectural hairline framing the shape contour.",
    icon: "square",
  },
  {
    id: "clean",
    name: "Clean Cut",
    description: "Direct precision razor cutout without surrounding effects.",
    icon: "scissors",
  },
];
