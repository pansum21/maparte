import layoutsManifest from "@/data/layouts.json";
import { toPositiveNumber } from "@/shared/utils/number";
import type { Layout, LayoutGroup } from "../domain/types";

const fallbackSymbol =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 40'><rect x='2' y='2' width='60' height='36' rx='5' fill='none' stroke='#9CC3DA' stroke-width='2'/><rect x='14' y='8' width='36' height='24' rx='3' fill='#4B91B7'/></svg>";

const fallbackLayout: Layout = {
  id: "print_poster_20x30",
  name: "Poster 20 x 30 cm",
  description: "Classic portrait poster size (2:3 ratio).",
  width: 20,
  height: 30,
  unit: "cm",
  widthCm: 20,
  heightCm: 30,
  symbol: fallbackSymbol,
  categoryId: "print",
  categoryName: "Print",
};

function normalizeUnit(value: unknown): "cm" | "px" {
  const unit = String(value ?? "")
    .trim()
    .toLowerCase();
  return unit === "px" ? "px" : "cm";
}

function formatDecimal(value: number): string {
  const rounded = Math.round(Number(value) * 100) / 100;
  return String(rounded);
}

function createSymbolFromRatio(width: number, height: number): string {
  const isPortrait = height > width;
  const ratio = Math.max(0.15, Math.min(6, width / height));

  if (isPortrait) {
    // ── PORTRAIT PAPER OUTLINE (ViewBox: 40 x 56) ──
    const maxInnerWidth = 30;
    const maxInnerHeight = 44;
    let innerHeight = maxInnerHeight;
    let innerWidth = innerHeight * ratio;
    if (innerWidth > maxInnerWidth) {
      innerWidth = maxInnerWidth;
      innerHeight = innerWidth / ratio;
    }
    const x = Number(((40 - innerWidth) / 2).toFixed(2));
    const y = Number(((56 - innerHeight) / 2).toFixed(2));
    const w = Number(innerWidth.toFixed(2));
    const h = Number(innerHeight.toFixed(2));
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 56'><rect x='2' y='2' width='36' height='52' rx='4' fill='none' stroke='#9CC3DA' stroke-width='2'/><rect x='${x}' y='${y}' width='${w}' height='${h}' rx='2.5' fill='#4B91B7'/></svg>`;
  } else {
    // ── LANDSCAPE PAPER OUTLINE (ViewBox: 56 x 40) ──
    const maxInnerWidth = 44;
    const maxInnerHeight = 30;
    let innerWidth = maxInnerWidth;
    let innerHeight = innerWidth / ratio;
    if (innerHeight > maxInnerHeight) {
      innerHeight = maxInnerHeight;
      innerWidth = innerHeight * ratio;
    }
    const x = Number(((56 - innerWidth) / 2).toFixed(2));
    const y = Number(((40 - innerHeight) / 2).toFixed(2));
    const w = Number(innerWidth.toFixed(2));
    const h = Number(innerHeight.toFixed(2));
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 40'><rect x='2' y='2' width='52' height='36' rx='4' fill='none' stroke='#9CC3DA' stroke-width='2'/><rect x='${x}' y='${y}' width='${w}' height='${h}' rx='2.5' fill='#4B91B7'/></svg>`;
  }
}

function normalizeLayout(
  category: { id: string; name: string },
  layout: any,
  fallbackIdSuffix: string | number,
): Layout {
  const width = toPositiveNumber(layout?.width, fallbackLayout.width);
  const height = toPositiveNumber(layout?.height, fallbackLayout.height);
  const unit = normalizeUnit(layout?.unit);

  const widthCm = toPositiveNumber(
    layout?.posterWidthCm,
    unit === "cm" ? width : fallbackLayout.widthCm,
  );
  const heightCm = toPositiveNumber(
    layout?.posterHeightCm,
    unit === "cm" ? height : fallbackLayout.heightCm,
  );

  const rawSymbol = String(layout?.symbol ?? "").trim();

  return {
    id: String(layout?.id ?? `${category.id}_${fallbackIdSuffix}`),
    name: String(layout?.name ?? "Unnamed Layout"),
    description: String(layout?.description ?? "").trim(),
    width,
    height,
    unit,
    widthCm,
    heightCm,
    symbol: rawSymbol || createSymbolFromRatio(width, height),
    categoryId: category.id,
    categoryName: category.name,
  };
}

const rawCategories = Array.isArray((layoutsManifest as any)?.categories)
  ? (layoutsManifest as any).categories
  : [];

export const layoutGroups: LayoutGroup[] = rawCategories
  .map((category: any, categoryIndex: number) => {
    const categoryId = String(category?.id ?? `category_${categoryIndex}`);
    const categoryName = String(category?.name ?? categoryId);
    const rawLayouts = Array.isArray(category?.layouts) ? category.layouts : [];
    const options = rawLayouts
      .map((layout: any, layoutIndex: number) =>
        normalizeLayout(
          { id: categoryId, name: categoryName },
          layout,
          layoutIndex,
        ),
      )
      // Keep the custom MAPARTE print compositions grouped at the end.
      .sort((a, b) => Number(a.id.includes("maparte_")) - Number(b.id.includes("maparte_")));

    return { id: categoryId, name: categoryName, options };
  })
  .filter((group: LayoutGroup) => group.options.length > 0);

export const layoutOptions: Layout[] = layoutGroups.flatMap(
  (group) => group.options,
);

const layoutOptionsById: Record<string, Layout> = layoutOptions.reduce(
  (acc: Record<string, Layout>, option) => {
    if (!acc[option.id]) acc[option.id] = option;
    return acc;
  },
  {},
);

const manifestDefaultId = String(
  (layoutsManifest as any)?.defaultLayoutId ?? "",
).trim();

export const defaultLayoutId: string = layoutOptionsById[manifestDefaultId]
  ? manifestDefaultId
  : (layoutOptions[0]?.id ?? fallbackLayout.id);

export const MAPARTE_SQUARE_CAPTION_LAYOUT_ID =
  "print_maparte_square_caption_a4_portrait";

export function isMaparteSquareCaptionLayout(layoutId: string): boolean {
  return getMaparteCaptionVariant(layoutId) !== null;
}

export type MaparteCaptionVariant =
  | "center-bottom"
  | "left-bottom"
  | "right-bottom"
  | "top-left"
  | "top-center"
  | "bottom-left";

const maparteCaptionVariants: Record<string, MaparteCaptionVariant> = {
  [MAPARTE_SQUARE_CAPTION_LAYOUT_ID]: "center-bottom",
  print_maparte_square_caption_a4_top: "top-center",
  print_maparte_left_caption_a4_portrait: "left-bottom",
  print_maparte_right_caption_a4_portrait: "right-bottom",
  print_maparte_square_caption_a4_landscape: "center-bottom",
  print_maparte_square_caption_a4_landscape_left: "center-bottom",
  print_maparte_left_caption_a4_landscape: "left-bottom",
  print_maparte_right_caption_a4_landscape: "right-bottom",
  print_maparte_circle_caption_a4_portrait: "center-bottom",
  print_maparte_circle_caption_a4_top: "top-center",
  print_maparte_circle_caption_a4_landscape: "center-bottom",
  print_maparte_circle_caption_a4_landscape_left: "center-bottom",
  print_maparte_circle_poster_a4_portrait: "center-bottom",
  print_maparte_circle_poster_a4_top: "top-center",
  print_maparte_circle_poster_a4_landscape: "center-bottom",
  print_maparte_circle_poster_a4_landscape_left: "center-bottom",
};

export function isMaparteLandscapeLeftLayout(layoutId: string): boolean {
  return (
    layoutId === "print_maparte_square_caption_a4_landscape_left" ||
    layoutId === "print_maparte_circle_caption_a4_landscape_left" ||
    layoutId === "print_maparte_circle_poster_a4_landscape_left" ||
    layoutId === "print_maparte_left_caption_a4_landscape"
  );
}

export const MAPARTE_CIRCLE_POSTER_LAYOUT_IDS = [
  "print_maparte_circle_poster_a4_portrait",
  "print_maparte_circle_poster_a4_top",
  "print_maparte_circle_poster_a4_landscape",
  "print_maparte_circle_poster_a4_landscape_left",
] as const;

export const MAPARTE_CIRCLE_LAYOUT_IDS = [
  "print_maparte_circle_caption_a4_portrait",
  "print_maparte_circle_caption_a4_top",
  "print_maparte_circle_caption_a4_landscape",
  "print_maparte_circle_caption_a4_landscape_left",
  ...MAPARTE_CIRCLE_POSTER_LAYOUT_IDS,
] as const;

/** Poster style circle: compass ring outside the map, name block in the lower 30%. */
export function isMaparteCirclePosterLayout(layoutId: string): boolean {
  return (MAPARTE_CIRCLE_POSTER_LAYOUT_IDS as readonly string[]).includes(layoutId);
}

export const MAPARTE_DOUBLE_MAP_LAYOUT_IDS: Record<string, "square" | "circle" | "heart"> = {
  print_maparte_double_square_a4_landscape: "square",
  print_maparte_double_circle_a4_landscape: "circle",
  print_maparte_double_heart_a4_landscape: "heart",
};

export type MaparteMultiMapLayout = {
  shape: "square" | "circle" | "heart" | "rectangle";
  count: 1 | 2 | 3;
  orientation: "portrait" | "landscape";
};
const mapShapes = ["square", "circle", "heart", "rectangle"] as const;
const orientations = ["portrait", "landscape"] as const;
export const MAPARTE_MULTI_MAP_LAYOUTS: Record<string, MaparteMultiMapLayout> = Object.fromEntries(
  mapShapes.flatMap((shape) => [1, 2, 3].flatMap((count) => orientations.map((orientation) => {
    const id = count === 2 && orientation === "landscape" && shape !== "rectangle"
      ? `print_maparte_double_${shape}_a4_landscape`
      : count === 3 && shape !== "rectangle"
        ? `frame_maparte_triple_${shape}_a4_${orientation}`
        : `frame_maparte_${count === 1 ? "single" : count === 2 ? "double" : "triple"}_${shape}_a4_${orientation}`;
    return [id, { shape, count: count as 1 | 2 | 3, orientation }];
  }))),
);

export function getMaparteMultiMapLayout(layoutId: string): MaparteMultiMapLayout | null {
  return MAPARTE_MULTI_MAP_LAYOUTS[layoutId] ?? null;
}

/** Returns the map shape for any MapArte single, double, or triple composition. */
export function getDoubleMapShape(layoutId: string): "square" | "circle" | "heart" | "rectangle" | null {
  return MAPARTE_MULTI_MAP_LAYOUTS[layoutId]?.shape ?? null;
}

export function isMaparteCircleLayout(layoutId: string): boolean {
  return (MAPARTE_CIRCLE_LAYOUT_IDS as readonly string[]).includes(layoutId);
}

export function getMaparteCaptionVariant(layoutId: string): MaparteCaptionVariant | null {
  return maparteCaptionVariants[layoutId] ?? null;
}

export function formatLayoutDimensions(layoutOption: Layout): string {
  if (!layoutOption) return "";
  return `${formatDecimal(layoutOption.width)} x ${formatDecimal(layoutOption.height)} ${layoutOption.unit}`;
}

export function getLayoutOption(layoutId: string): Layout | null {
  const normalizedId = String(layoutId ?? "").trim();
  if (normalizedId === "custom") return null;
  if (layoutOptionsById[normalizedId]) return layoutOptionsById[normalizedId];
  if (layoutOptionsById[defaultLayoutId])
    return layoutOptionsById[defaultLayoutId];
  return fallbackLayout;
}

export function createCustomLayoutOption(
  widthCm: number,
  heightCm: number,
): Layout {
  const normalizedWidthCm = toPositiveNumber(widthCm, fallbackLayout.widthCm);
  const normalizedHeightCm = toPositiveNumber(
    heightCm,
    fallbackLayout.heightCm,
  );
  const symbol = createSymbolFromRatio(normalizedWidthCm, normalizedHeightCm);

  return {
    id: "custom",
    name: "Custom Layout",
    description: "Manual width and height values.",
    width: normalizedWidthCm,
    height: normalizedHeightCm,
    unit: "cm",
    widthCm: normalizedWidthCm,
    heightCm: normalizedHeightCm,
    symbol,
    categoryId: "custom",
    categoryName: "Custom",
  };
}

