export type MapShapeId = "full" | "heart" | "circle" | "squircle" | "arch" | "star";

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
    description: "Elegant cubic-bezier heart cutout with dimensional depth.",
    svgPath: "M 50 80 C 20 56, 5 40, 5 24 C 5 10, 16 2, 31 2 C 40 2, 47 6, 50 13 C 53 6, 60 2, 69 2 C 84 2, 95 10, 95 24 C 95 40, 80 56, 50 80 Z",
    normalizedPath: "M 0.50 0.80 C 0.20 0.56, 0.05 0.40, 0.05 0.24 C 0.05 0.10, 0.16 0.02, 0.31 0.02 C 0.40 0.02, 0.47 0.06, 0.50 0.13 C 0.53 0.06, 0.60 0.02, 0.69 0.02 C 0.84 0.02, 0.95 0.10, 0.95 0.24 C 0.95 0.40, 0.80 0.56, 0.50 0.80 Z",
  },
  {
    id: "circle",
    name: "Minimalist Orb",
    subtitle: "Zen & Scandinavian",
    badge: "Popular",
    description: "Classic balanced circular aperture for modern interiors.",
    svgPath: "M 50 5 A 45 45 0 1 0 50 95 A 45 45 0 1 0 50 5 Z",
    normalizedPath: "M 0.5 0.05 A 0.45 0.45 0 1 0 0.5 0.95 A 0.45 0.45 0 1 0 0.5 0.05 Z",
  },
  {
    id: "squircle",
    name: "Soft Squircle",
    subtitle: "Apple Rounded Frame",
    badge: "New",
    description: "Continuous curvature rounded square with softened borders.",
    svgPath: "M 25 5 L 75 5 C 92 5, 95 8, 95 25 L 95 75 C 95 92, 92 95, 75 95 L 25 95 C 8 95, 5 92, 5 75 L 5 25 C 5 8, 8 5, 25 5 Z",
    normalizedPath: "M 0.25 0.05 L 0.75 0.05 C 0.92 0.05, 0.95 0.08, 0.95 0.25 L 0.95 0.75 C 0.95 0.92, 0.92 0.95, 0.75 0.95 L 0.25 0.95 C 0.08 0.95, 0.05 0.92, 0.05 0.75 L 0.05 0.25 C 0.05 0.08, 0.08 0.05, 0.25 0.05 Z",
  },
  {
    id: "arch",
    name: "Modern Arch",
    subtitle: "Architectural Vault",
    badge: "Trending",
    description: "Mediterranean arched dome trending in luxury editorial prints.",
    svgPath: "M 10 92 L 10 48 A 40 40 0 0 1 90 48 L 90 92 Z",
    normalizedPath: "M 0.10 0.92 L 0.10 0.48 A 0.40 0.40 0 0 1 0.90 0.48 L 0.90 0.92 Z",
  },
  {
    id: "star",
    name: "Celestial Star",
    subtitle: "Baby Born & Milestones",
    description: "5-pointed star mask celebrating newborn dates and summits.",
    svgPath: "M 50 5 L 61.2 36.8 L 95 38.2 L 68.5 59.8 L 77.3 93.2 L 50 74.5 L 22.7 93.2 L 31.5 59.8 L 5 38.2 L 38.8 36.8 Z",
    normalizedPath: "M 0.50 0.05 L 0.612 0.368 L 0.95 0.382 L 0.685 0.598 L 0.773 0.932 L 0.50 0.745 L 0.227 0.932 L 0.315 0.598 L 0.05 0.382 L 0.388 0.368 Z",
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
    description: "Minimalist, flat edge-cut without shadows or strokes.",
    icon: "scissors",
  },
];
