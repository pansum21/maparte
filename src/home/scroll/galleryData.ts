import { PALETTES, type Palette } from "./CityMap";
import { getOsm } from "./osm";
import type { OsmCity } from "./osmTypes";

export type FrameKind = "double" | "hair" | "mat" | "ticket" | "rule" | "arch";
export type LayoutKind = "full" | "margin" | "stack" | "split" | "corner" | "band";

export type Poster = {
  id: string;
  city: string;
  country: string;
  coords: string;
  palette: Palette;
  data: OsmCity;
  data2?: OsmCity;
  frame?: FrameKind;
  layout?: LayoutKind;
  note?: string;
};

export type Place = { slug: string; city: string; country: string; coords: string };

export const PLACES: Place[] = [
  { slug: "jaipur", city: "Jaipur", country: "India", coords: "26.9124° N · 75.7873° E" },
  { slug: "kyoto", city: "Kyoto", country: "Japan", coords: "35.0116° N · 135.7681° E" },
  { slug: "lisbon", city: "Lisbon", country: "Portugal", coords: "38.7130° N · 9.1380° W" },
  { slug: "portland", city: "Portland", country: "Oregon", coords: "45.5152° N · 122.6784° W" },
  { slug: "reykjavik", city: "Reykjavík", country: "Iceland", coords: "64.1466° N · 21.9426° W" },
  { slug: "buenos-aires", city: "Buenos Aires", country: "Argentina", coords: "34.6037° S · 58.3816° W" },
  { slug: "nairobi", city: "Nairobi", country: "Kenya", coords: "1.2921° S · 36.8219° E" },
  { slug: "osaka", city: "Osaka", country: "Japan", coords: "34.6937° N · 135.5023° E" },
  { slug: "tbilisi", city: "Tbilisi", country: "Georgia", coords: "41.7151° N · 44.8271° E" },
  { slug: "valparaiso", city: "Valparaíso", country: "Chile", coords: "33.0472° S · 71.6127° W" },
  { slug: "hanoi", city: "Hanoi", country: "Vietnam", coords: "21.0278° N · 105.8342° E" },
  { slug: "marrakesh", city: "Marrakesh", country: "Morocco", coords: "31.6295° N · 7.9811° W" },
  { slug: "montreal", city: "Montréal", country: "Québec", coords: "45.5019° N · 73.5674° W" },
  { slug: "seoul", city: "Seoul", country: "South Korea", coords: "37.5665° N · 126.9780° E" },
  { slug: "bristol", city: "Bristol", country: "England", coords: "51.4545° N · 2.5879° W" },
  { slug: "istanbul", city: "Istanbul", country: "Türkiye", coords: "41.0082° N · 28.9784° E" },
  { slug: "mexico-city", city: "Mexico City", country: "Mexico", coords: "19.4326° N · 99.1332° W" },
  { slug: "copenhagen", city: "Copenhagen", country: "Denmark", coords: "55.6761° N · 12.5683° E" },
  { slug: "cape-town", city: "Cape Town", country: "South Africa", coords: "33.9150° S · 18.4200° E" },
  { slug: "sydney", city: "Sydney", country: "Australia", coords: "33.8688° S · 151.2093° E" },
];

const PALETTE_KEYS = Object.keys(PALETTES);

const buildPoster = (
  place: Place,
  paletteKey: string,
  extra: Partial<Poster> = {}
): Poster => ({
  id: `${place.slug}-${paletteKey}`,
  city: place.city,
  country: place.country,
  coords: place.coords,
  palette: PALETTES[paletteKey],
  data: getOsm(place.slug),
  ...extra,
});

/* --------------------------------------------------------------- the map */

/** Twenty real cities on one travelling shelf, each in a double-rule frame. */
export const MAP_GALLERY: Poster[] = PLACES.map((place, i) =>
  buildPoster(place, PALETTE_KEYS[i % PALETTE_KEYS.length], { frame: "double" })
);

/* ------------------------------------------------------------- the moods */

const THEME_SET: Array<{ name: string; palette: string; note: string }> = [
  { name: "Ink", palette: "ink", note: "Hairline streets on warm rag paper" },
  { name: "Blueprint", palette: "blueprint", note: "Surveyor's blue, chalk lines" },
  { name: "Terracotta", palette: "terracotta", note: "Sun-baked clay and rust ink" },
  { name: "Botanical", palette: "botanical", note: "Atlas green, garden fills" },
  { name: "Midnight", palette: "midnight", note: "Night flights over the harbour" },
  { name: "Newsprint", palette: "newsprint", note: "Cold type, one-colour press" },
  { name: "Paper", palette: "paper", note: "Bare stock, ghosted grid" },
];

/** One city, seven palettes: the same streets recoloured, never redrawn. */
const THEME_PLACE = PLACES[2]; // Lisbon

export const THEME_GALLERY: Poster[] = THEME_SET.map((theme, i) =>
  buildPoster(THEME_PLACE, theme.palette, {
    note: theme.name,
    frame: "double",
    id: `theme-${theme.palette}-${i}`,
  })
);

/* ------------------------------------------------------------ the layouts */

const LAYOUTS: Array<{ kind: LayoutKind; name: string; note: string; frame: FrameKind }> = [
  { kind: "full", name: "Full bleed", note: "Map runs to the trim edge", frame: "hair" },
  { kind: "margin", name: "Gallery margin", note: "Deep mat, single rule", frame: "mat" },
  { kind: "stack", name: "Title stack", note: "City set above the plate", frame: "double" },
  { kind: "split", name: "Diptych", note: "Two districts, one sheet", frame: "rule" },
  { kind: "corner", name: "Corner mark", note: "Type tucked into the corners", frame: "double" },
  { kind: "band", name: "Band crop", note: "A wide slice of the network", frame: "arch" },
];

export const LAYOUT_GALLERY: Poster[] = LAYOUTS.map((layout, i) => {
  const place = PLACES[(i + 2) % PLACES.length];
  return buildPoster(place, PALETTE_KEYS[i % PALETTE_KEYS.length], {
    layout: layout.kind,
    frame: layout.frame,
    note: layout.note,
    city: layout.name,
    country: `Layout ${String(i + 1).padStart(2, "0")}`,
    coords: place.coords,
    id: `layout-${layout.kind}-${i}`,
    data2: layout.kind === "split" ? getOsm(PLACES[(i + 9) % PLACES.length].slug) : undefined,
  });
});

export const LAYOUT_NAMES = LAYOUTS.map((l) => l.name);

/* --------------------------------------------------- borders and presets */

const FRAMES: Array<{ kind: FrameKind; name: string; note: string }> = [
  { kind: "double", name: "Double rule", note: "1 pt outer, 0.5 pt inner" },
  { kind: "hair", name: "Hairline", note: "Single 0.5 pt keyline" },
  { kind: "mat", name: "Passe-partout", note: "24 mm museum mat" },
  { kind: "ticket", name: "Perforated", note: "Dashed tear-off edge" },
  { kind: "rule", name: "Caption rule", note: "Type under a solid bar" },
  { kind: "arch", name: "Arched top", note: "Rounded head, square foot" },
];

export const FRAME_GALLERY: Poster[] = FRAMES.map((frame, i) => {
  const place = PLACES[(i + 7) % PLACES.length];
  return buildPoster(place, PALETTE_KEYS[(i + 3) % PALETTE_KEYS.length], {
    frame: frame.kind,
    note: frame.note,
    city: frame.name,
    country: `Border ${String(i + 1).padStart(2, "0")}`,
    id: `frame-${frame.kind}-${i}`,
  });
});

/* ---------------------------------------------------------------- presets */

export const PRESETS = [
  { name: "Studio", size: "30 × 40 cm", finish: "Uncoated 200 gsm" },
  { name: "Gallery", size: "50 × 70 cm", finish: "Cotton rag 310 gsm" },
  { name: "Desk", size: "21 × 30 cm", finish: "Matte, board back" },
  { name: "Oversize", size: "70 × 100 cm", finish: "Fine art, tube rolled" },
];

/* ------------------------------------------------- the preset gallery */

/** Four stock sizes on one staircase, so the paper is the thing you compare. */
export const PRESET_GALLERY: Poster[] = PRESETS.map((preset, i) =>
  buildPoster(PLACES[2], PALETTE_KEYS[(i + 2) % PALETTE_KEYS.length], {
    city: preset.name,
    country: `Preset ${String(i + 1).padStart(2, "0")}`,
    note: `${preset.size} · ${preset.finish}`,
    frame: (["double", "mat", "rule", "arch"] as FrameKind[])[i],
    id: `preset-${i}`,
  })
);

/* ---------------------------------------------------------- the motions */

export type MotionId = "rail" | "coverflow" | "columns" | "fan" | "staircase";

/** Named after the bookmark each one is lifted from, so we can talk about them. */
export const MOTION_LABEL: Record<MotionId, string> = {
  rail: "picture rail",
  coverflow: "cover flow",
  columns: "tilted columns",
  fan: "curved arc",
  staircase: "staircase",
};

export const MAP_COUNT = MAP_GALLERY.length;
