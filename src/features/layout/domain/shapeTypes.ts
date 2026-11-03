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
    description: "Symmetrical fine-art heart aperture with elegant top lobes and sharp bottom tip.",
    svgPath: "M 50 94 C 42 84, 18 66, 8 46 C 3 36, 4 24, 10 16 C 17 7, 29 4, 39 8 C 45 10, 48 14, 50 20 C 52 14, 55 10, 61 8 C 71 4, 83 7, 90 16 C 96 24, 97 36, 92 46 C 82 66, 58 84, 50 94 Z",
    normalizedPath: "M 0.50 0.94 C 0.42 0.84, 0.18 0.66, 0.08 0.46 C 0.03 0.36, 0.04 0.24, 0.10 0.16 C 0.17 0.07, 0.29 0.04, 0.39 0.08 C 0.45 0.10, 0.48 0.14, 0.50 0.20 C 0.52 0.14, 0.55 0.10, 0.61 0.08 C 0.71 0.04, 0.83 0.07, 0.90 0.16 C 0.96 0.24, 0.97 0.36, 0.92 0.46 C 0.82 0.66, 0.58 0.84, 0.50 0.94 Z",
  },
  {
    id: "circle",
    name: "Minimalist Orb",
    subtitle: "Egg / Oval Curvature",
    badge: "Popular",
    description: "Continuous-curvature egg/oval aperture tailored for gallery fine-art prints.",
    svgPath: "M 50 4 A 46 46 0 1 0 50 96 A 46 46 0 1 0 50 4 Z",
    normalizedPath: "M 0.5 0.04 A 0.46 0.46 0 1 0 0.5 0.96 A 0.46 0.46 0 1 0 0.5 0.04 Z",
  },
  {
    id: "squircle",
    name: "Gallery Square",
    subtitle: "Expanded Soft Squircle",
    description: "Expanded continuous-curvature rounded square covering maximum canvas area.",
    svgPath: "M 18 2 L 82 2 C 95 2, 98 5, 98 18 L 98 82 C 98 95, 95 98, 82 98 L 18 98 C 5 98, 2 95, 2 82 L 2 18 C 2 5, 5 2, 18 2 Z",
    normalizedPath: "M 0.18 0.02 L 0.82 0.02 C 0.95 0.02, 0.98 0.05, 0.98 0.18 L 0.98 0.82 C 0.98 0.95, 0.95 0.98, 0.82 0.98 L 0.18 0.98 C 0.05 0.98, 0.02 0.95, 0.02 0.82 L 0.02 0.18 C 0.02 0.05, 0.05 0.02, 0.18 0.02 Z",
  },
  {
    id: "arch",
    name: "Modern Arch",
    subtitle: "Architectural Vault",
    description: "Mediterranean arched dome trending in luxury editorial prints.",
    svgPath: "M 6 96 L 6 46 A 44 44 0 0 1 94 46 L 94 96 Z",
    normalizedPath: "M 0.06 0.96 L 0.06 0.46 A 0.44 0.44 0 0 1 0.94 0.46 L 0.94 0.96 Z",
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
    description: "Clean 1.2mm architectural stroke framing the shape contour.",
    icon: "square",
  },
  {
    id: "clean",
    name: "Clean Cut",
    description: "Direct precision razor cutout without surrounding effects.",
    icon: "scissors",
  },
];
