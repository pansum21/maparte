export type MapShapeId =
  | "full"
  | "heart"
  | "circle"
  | "squircle"
  | "arch"
  | "house"
  | "mountain"
  | "stamp"
  | "scroll"
  | "baby";

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
    description: "Symmetrical fine-art heart aperture with smooth top cleft and elegant continuous rounded apex.",
    svgPath: "M 50 89 C 48.6 89, 44 83, 37 76 C 22 62, 9 48, 9 32 C 9 17, 21 8, 34 8 C 42 8, 47.5 13, 49.2 18 C 49.6 19.2, 50.4 19.2, 50.8 18 C 52.5 13, 58 8, 66 8 C 79 8, 91 17, 91 32 C 91 48, 78 62, 63 76 C 56 83, 51.4 89, 50 89 Z",
    normalizedPath: "M 0.50 0.89 C 0.486 0.89, 0.44 0.83, 0.37 0.76 C 0.22 0.62, 0.09 0.48, 0.09 0.32 C 0.09 0.17, 0.21 0.08, 0.34 0.08 C 0.42 0.08, 0.475 0.13, 0.492 0.18 C 0.496 0.192, 0.504 0.192, 0.508 0.18 C 0.525 0.13, 0.58 0.08, 0.66 0.08 C 0.79 0.08, 0.91 0.17, 0.91 0.32 C 0.91 0.48, 0.78 0.62, 0.63 0.76 C 0.56 0.83, 0.514 0.89, 0.50 0.89 Z",
  },
  {
    id: "circle",
    name: "Gallery Circle",
    subtitle: "Flawless Geometric Circle",
    badge: "Popular",
    description: "Silky-smooth, true 1:1 circular gallery aperture for timeless prints.",
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
  {
    id: "house",
    name: "Our First Home",
    subtitle: "Architectural House",
    badge: "New",
    description: "3D architectural home aperture with designer terracotta roof and chimney.",
    svgPath: "M 50 6 L 90 38 L 90 92 C 90 94, 88 96, 86 96 L 14 96 C 12 96, 10 94, 10 92 L 10 38 L 24 27 L 24 14 C 24 13, 25 12, 26 12 L 34 12 C 35 12, 36 13, 36 14 L 36 17.5 Z",
    normalizedPath: "M 0.50 0.06 L 0.90 0.38 L 0.90 0.92 C 0.90 0.94, 0.88 0.96, 0.86 0.96 L 0.14 0.96 C 0.12 0.96, 0.10 0.94, 0.10 0.92 L 0.10 0.38 L 0.24 0.27 L 0.24 0.14 C 0.24 0.13, 0.25 0.12, 0.26 0.12 L 0.34 0.12 C 0.35 0.12, 0.36 0.13, 0.36 0.14 L 0.36 0.175 Z",
  },
  {
    id: "mountain",
    name: "Alpine Summit",
    subtitle: "Triple Mountain Peaks",
    badge: "Trending",
    description: "Three sculpted mountain peaks with alpine ridgelines and 3D depth.",
    svgPath: "M 6 94 L 94 94 C 94 94, 91 80, 87 70 L 76 40 C 74 36, 70 36, 68 40 L 60 56 L 53 22 C 52 18, 48 18, 47 22 L 38 52 L 31 38 C 29 34, 25 34, 23 38 L 12 70 C 9 80, 6 94, 6 94 Z",
    normalizedPath: "M 0.06 0.94 L 0.94 0.94 C 0.94 0.94, 0.91 0.80, 0.87 0.70 L 0.76 0.40 C 0.74 0.36, 0.70 0.36, 0.68 0.40 L 0.60 0.56 L 0.53 0.22 C 0.52 0.18, 0.48 0.18, 0.47 0.22 L 0.38 0.52 L 0.31 0.38 C 0.29 0.34, 0.25 0.34, 0.23 0.38 L 0.12 0.70 C 0.09 0.80, 0.06 0.94, 0.06 0.94 Z",
  },
  {
    id: "stamp",
    name: "Travel Stamp",
    subtitle: "Vintage Airmail",
    badge: "Travel",
    description: "Classic vintage postage stamp aperture with 3D airmail accents.",
    svgPath: "M 10 10 H 90 C 92 10, 93 11, 93 13 V 87 C 93 89, 92 90, 90 90 H 10 C 8 90, 7 89, 7 87 V 13 C 7 11, 8 10, 10 10 Z",
    normalizedPath: "M 0.10 0.10 H 0.90 C 0.92 0.10, 0.93 0.11, 0.93 0.13 V 0.87 C 0.93 0.89, 0.92 0.90, 0.90 0.90 H 0.10 C 0.08 0.90, 0.07 0.89, 0.07 0.87 V 0.13 C 0.07 0.11, 0.08 0.10, 0.10 0.10 Z",
  },
  {
    id: "scroll",
    name: "Marathon Scroll",
    subtitle: "Vintage Finisher Scroll",
    badge: "Athletic",
    description: "Classic parchment scroll banner aperture with finisher medal seal.",
    svgPath: "M 12 14 C 20 10, 80 10, 88 14 C 92 16, 92 22, 90 28 L 90 74 C 92 80, 92 86, 88 88 C 80 92, 20 92, 12 88 C 8 86, 8 80, 10 74 L 10 28 C 8 22, 8 16, 12 14 Z",
    normalizedPath: "M 0.12 0.14 C 0.20 0.10, 0.80 0.10, 0.88 0.14 C 0.92 0.16, 0.92 0.22, 0.90 0.28 L 0.90 0.74 C 0.92 0.80, 0.92 0.86, 0.88 0.88 C 0.80 0.92, 0.20 0.92, 0.12 0.88 C 0.08 0.86, 0.08 0.80, 0.10 0.74 L 0.10 0.28 C 0.08 0.22, 0.08 0.16, 0.12 0.14 Z",
  },
  {
    id: "baby",
    name: "Baby Arrival",
    subtitle: "Tiny Footprints",
    badge: "Nursery",
    description: "Adorable newborn footprints aperture celebrating baby's birthplace.",
    svgPath: "M 30 82 C 26 82, 23 76, 24 68 C 25 60, 22 50, 20 40 C 18 32, 23 27, 30 27 C 37 27, 40 32, 38 40 C 36 50, 36 60, 35 68 C 34 76, 33 82, 30 82 Z M 37 19 A 4.2 4.2 0 1 0 37 10.6 A 4.2 4.2 0 1 0 37 19 Z M 30 18 A 3.5 3.5 0 1 0 30 11 A 3.5 3.5 0 1 0 30 18 Z M 24 20 A 3 3 0 1 0 24 14 A 3 3 0 1 0 24 20 Z M 19 23 A 2.5 2.5 0 1 0 19 18 A 2.5 2.5 0 1 0 19 23 Z M 15 27 A 2 2 0 1 0 15 23 A 2 2 0 1 0 15 27 Z M 70 76 C 67 76, 66 70, 65 62 C 64 54, 64 44, 62 34 C 60 26, 63 21, 70 21 C 77 21, 82 26, 80 34 C 78 44, 75 54, 76 62 C 77 70, 74 76, 70 76 Z M 63 13 A 4.2 4.2 0 1 0 63 4.6 A 4.2 4.2 0 1 0 63 13 Z M 70 12 A 3.5 3.5 0 1 0 70 5 A 3.5 3.5 0 1 0 70 12 Z M 76 14 A 3 3 0 1 0 76 8 A 3 3 0 1 0 76 14 Z M 81 17 A 2.5 2.5 0 1 0 81 12 A 2.5 2.5 0 1 0 81 17 Z M 85 21 A 2 2 0 1 0 85 17 A 2 2 0 1 0 85 21 Z",
    normalizedPath: "M 0.30 0.82 C 0.26 0.82, 0.23 0.76, 0.24 0.68 C 0.25 0.60, 0.22 0.50, 0.20 0.40 C 0.18 0.32, 0.23 0.27, 0.30 0.27 C 0.37 0.27, 0.40 0.32, 0.38 0.40 C 0.36 0.50, 0.36 0.60, 0.35 0.68 C 0.34 0.76, 0.33 0.82, 0.30 0.82 Z M 0.37 0.19 A 0.042 0.042 0 1 0 0.37 0.106 A 0.042 0.042 0 1 0 0.37 0.19 Z M 0.30 0.18 A 0.035 0.035 0 1 0 0.30 0.11 A 0.035 0.035 0 1 0 0.30 0.18 Z M 0.24 0.20 A 0.03 0.03 0 1 0 0.24 0.14 A 0.03 0.03 0 1 0 0.24 0.20 Z M 0.19 0.23 A 0.025 0.025 0 1 0 0.19 0.18 A 0.025 0.025 0 1 0 0.19 0.23 Z M 0.15 0.27 A 0.02 0.02 0 1 0 0.15 0.23 A 0.02 0.02 0 1 0 0.15 0.27 Z M 0.70 0.76 C 0.67 0.76, 0.66 0.70, 0.65 0.62 C 0.64 0.54, 0.64 0.44, 0.62 0.34 C 0.60 0.26, 0.63 0.21, 0.70 0.21 C 0.77 0.21, 0.82 0.26, 0.80 0.34 C 0.78 0.44, 0.75 0.54, 0.76 0.62 C 0.77 0.70, 0.74 0.76, 0.70 0.76 Z M 0.63 0.13 A 0.042 0.042 0 1 0 0.63 0.046 A 0.042 0.042 0 1 0 0.63 0.13 Z M 0.70 0.12 A 0.035 0.035 0 1 0 0.70 0.05 A 0.035 0.035 0 1 0 0.70 0.12 Z M 0.76 0.14 A 0.03 0.03 0 1 0 0.76 0.08 A 0.03 0.03 0 1 0 0.76 0.14 Z M 0.81 0.17 A 0.025 0.025 0 1 0 0.81 0.12 A 0.025 0.025 0 1 0 0.81 0.17 Z M 0.85 0.21 A 0.02 0.02 0 1 0 0.85 0.17 A 0.02 0.02 0 1 0 0.85 0.21 Z",
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
