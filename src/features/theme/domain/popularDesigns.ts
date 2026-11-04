export interface PopularDesign {
  id: string;
  name: string;
  subtitle: string;
  badge?: "Best seller" | "Popular" | "Trending" | "New" | "Luxury";
  themeId: string;
  fontFamily: string;
  description: string;
  bgPreview: string;
  accentPreview: string;
  textColor: string;
}

export const POPULAR_DESIGNS: PopularDesign[] = [
  {
    id: "modern",
    name: "Modern",
    subtitle: "High Contrast Minimalist",
    badge: "Best seller",
    themeId: "carrara",
    fontFamily: "Playfair Display",
    description: "Iconic monochrome architectural map with crisp editorial serif typography.",
    bgPreview: "#FFFFFF",
    accentPreview: "#1A1A1A",
    textColor: "#111827",
  },
  {
    id: "asphalt",
    name: "Asphalt",
    subtitle: "Charcoal Dark City",
    badge: "Popular",
    themeId: "midnight_blue",
    fontFamily: "Montserrat",
    description: "Deep noir slate streets with luminescent white grid lines.",
    bgPreview: "#18202F",
    accentPreview: "#5E7F9B",
    textColor: "#F9FAFB",
  },
  {
    id: "nautical",
    name: "Nautical",
    subtitle: "Coastal Sage & Cream",
    badge: "Popular",
    themeId: "sage",
    fontFamily: "Playfair Display",
    description: "Maritime coastlines with seafoam waters and warm sand parchment.",
    bgPreview: "#F4F6F0",
    accentPreview: "#587C6A",
    textColor: "#2D4A3E",
  },
  {
    id: "gaia",
    name: "Gaia",
    subtitle: "Warm Terracotta Earth",
    badge: "Trending",
    themeId: "terracotta",
    fontFamily: "Playfair Display",
    description: "Mediterranean clay and burnt sienna for earthy, organic gallery walls.",
    bgPreview: "#F5EDE4",
    accentPreview: "#A0522D",
    textColor: "#8B4513",
  },
  {
    id: "pantone",
    name: "Pantone",
    subtitle: "Architectural Blueprint",
    themeId: "blueprint",
    fontFamily: "Montserrat",
    description: "Crisp engineering schematic with technical vector drafting vibes.",
    bgPreview: "#0B1D3A",
    accentPreview: "#4D8DFE",
    textColor: "#FFFFFF",
  },
  {
    id: "humble",
    name: "Humble",
    subtitle: "Blush Rose & Pastel",
    badge: "New",
    themeId: "blush",
    fontFamily: "Playfair Display",
    description: "Gentle romantic blush warmth with soft rose gold contours.",
    bgPreview: "#FBF5F4",
    accentPreview: "#D87D7D",
    textColor: "#6B3A3A",
  },
  {
    id: "carrara",
    name: "Carrara",
    subtitle: "Italian Marble Gallery",
    badge: "Luxury",
    themeId: "carrara",
    fontFamily: "Playfair Display",
    description: "Timeless white marble and subtle vein textures inspired by Florence.",
    bgPreview: "#F7F7F6",
    accentPreview: "#2B2D2F",
    textColor: "#1F2937",
  },
  {
    id: "ocean",
    name: "Ocean",
    subtitle: "Deep Cobalt Maritime",
    themeId: "ocean",
    fontFamily: "Montserrat",
    description: "Nordic fjord blues and oceanic depth for modern coastal living.",
    bgPreview: "#E8F0F7",
    accentPreview: "#235B88",
    textColor: "#133E60",
  },
];
