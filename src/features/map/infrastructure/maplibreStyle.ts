import type { ResolvedTheme } from "@/features/theme/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";
import { blendHex } from "@/shared/utils/color";
import type { StyleSpecification } from "maplibre-gl";

const OPENFREEMAP_SOURCE = "https://tiles.openfreemap.org/planet";
const SOURCE_ID = "openfreemap";

/**
 * OpenFreeMap is OpenMapTiles-based and can generalize data at low zooms.
 * Setting maxzoom explicitly keeps high zoom behavior deterministic (standard overzoom above this level).
 */
const SOURCE_MAX_ZOOM = 14;

const BUILDING_BLEND_FACTOR = 0.14;
const BUILDING_FILL_OPACITY = 0.84;
const MAP_BUILDING_MIN_ZOOM_DEFAULT = 13.0;
const MAP_BUILDING_MIN_ZOOM_PRESERVE = 12.5;
const DETAIL_PRESERVE_DISTANCE_METERS = 30_000;

const MAP_WATERWAY_WIDTH_STOPS: [number, number][] = [
  [0, 0.3],
  [6, 0.6],
  [12, 1.2],
  [16, 2.2],
  [18, 3.5],
  [20, 5.5],
  [22, 8.0],
];

const MAP_RAIL_WIDTH_STOPS: [number, number][] = [
  [3, 0.3],
  [6, 0.6],
  [10, 1.0],
  [14, 1.5],
  [18, 2.2],
  [20, 3.0],
  [22, 4.0],
];

/**
 * OpenMapTiles transportation layer classes:
 * - motorway, trunk (Major expressways)
 * - primary, secondary (Main arterial roads)
 * - tertiary (Collector roads)
 * - minor, service (Residential streets, neighborhood grid, living streets)
 * - path, track (Pedestrian walkways, trails, paths)
 */
const MAP_ROAD_MAJOR_CLASSES = ["motorway", "trunk"];
const MAP_ROAD_MINOR_HIGH_CLASSES = ["primary", "secondary"];
const MAP_ROAD_MINOR_MID_CLASSES = ["tertiary"];
const MAP_ROAD_MINOR_LOW_CLASSES = [
  "minor",
  "service",
  "residential",
  "living_street",
  "unclassified",
  "pedestrian",
  "footway",
  "alley",
];
const MAP_ROAD_PATH_CLASSES = ["path", "track"];
const MAP_RAIL_CLASSES = ["rail", "transit"];

/**
 * Two-stage minor/path rendering:
 * - overview layer: fine, razor-sharp lines at low zoom
 * - detail layer: sharp, elegant, architectural road network from mid zoom upward
 */
const MAP_ROAD_MAJOR_WIDTH_STOPS: [number, number][] = [
  [5, 0.45],
  [7, 0.85],
  [9, 1.4],
  [11, 2.2],
  [13, 3.0],
  [15, 3.8],
  [17, 4.6],
  [20, 5.5],
];

const MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS: [number, number][] = [
  [6, 0.35],
  [8, 0.7],
  [10, 1.2],
  [12, 1.8],
  [14, 2.4],
  [16, 3.0],
  [18, 3.8],
  [20, 4.5],
];

const MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS: [number, number][] = [
  [7, 0.25],
  [9, 0.55],
  [11, 0.95],
  [13, 1.4],
  [15, 1.9],
  [17, 2.4],
  [20, 3.0],
];

const MAP_ROAD_MINOR_LOW_DETAIL_WIDTH_STOPS: [number, number][] = [
  [8, 0.35],
  [10, 0.65],
  [12, 1.05],
  [14, 1.55],
  [16, 2.15],
  [18, 2.85],
  [20, 3.5],
];

const MAP_ROAD_PATH_DETAIL_WIDTH_STOPS: [number, number][] = [
  [8, 0.25],
  [10, 0.45],
  [12, 0.8],
  [14, 1.2],
  [16, 1.65],
  [18, 2.1],
  [20, 2.7],
];

const MAP_ROAD_MINOR_HIGH_OVERVIEW_WIDTH_STOPS = MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS;
const MAP_ROAD_MINOR_MID_OVERVIEW_WIDTH_STOPS = MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS;
const MAP_ROAD_MINOR_LOW_OVERVIEW_WIDTH_STOPS = MAP_ROAD_MINOR_LOW_DETAIL_WIDTH_STOPS;
const MAP_ROAD_PATH_OVERVIEW_WIDTH_STOPS = MAP_ROAD_PATH_DETAIL_WIDTH_STOPS;

const ROAD_MINOR_OVERVIEW_MIN_ZOOM = 6;
const ROAD_MINOR_DETAIL_MIN_ZOOM = 6;
const ROAD_PATH_OVERVIEW_MIN_ZOOM = 8;
const ROAD_PATH_DETAIL_MIN_ZOOM = 8;
const ROAD_OVERVIEW_MAX_ZOOM = 11.8;

const LINE_GEOMETRY_FILTER = [
  "match",
  ["geometry-type"],
  ["LineString", "MultiLineString"],
  true,
  false,
] as const;

/**
 * 1:1 crisp screen stops for razor-sharp vector rendering on desktop & mobile previews.
 */
const OVERZOOM_LINE_WIDTH_SCALE = 1.0;
const OVERZOOM_TEXT_SCALE = 1.0;

const TEXT_FIELD_NAME: any = [
  "coalesce",
  ["get", "name_en"],
  ["get", "name:en"],
  ["get", "name:latin"],
  ["get", "name"],
  "",
];

function resolveBuildingMinZoom(distanceMeters?: number): number {
  if (
    Number.isFinite(distanceMeters) &&
    Number(distanceMeters) <= DETAIL_PRESERVE_DISTANCE_METERS
  ) {
    return MAP_BUILDING_MIN_ZOOM_PRESERVE;
  }
  return MAP_BUILDING_MIN_ZOOM_DEFAULT;
}

function widthExpr(stops: [number, number][]): any {
  const flat = stops.flatMap(([zoom, width]) => [zoom, width]);
  return ["interpolate", ["linear"], ["zoom"], ...flat];
}

function textSizeStops(stops: [number, number][]): any {
  const flat = stops.flatMap(([zoom, size]) => [zoom, size * OVERZOOM_TEXT_SCALE]);
  return ["interpolate", ["linear"], ["zoom"], ...flat];
}

function opacityExpr(stops: [number, number][]): any {
  const flat = stops.flatMap(([zoom, opacity]) => [zoom, opacity]);
  return ["interpolate", ["linear"], ["zoom"], ...flat];
}

function scaledStops(
  stops: [number, number][],
  scale: number,
): [number, number][] {
  return stops.map(([zoom, width]) => [zoom, width * scale]);
}

function compensateLineWidthStops(
  stops: [number, number][],
): [number, number][] {
  return scaledStops(stops, OVERZOOM_LINE_WIDTH_SCALE);
}

function lineClassFilter(classes: string[]): any {
  return [
    "all",
    LINE_GEOMETRY_FILTER,
    ["match", ["get", "class"], classes, true, false],
  ];
}

export function generateMapStyle(
  theme: ResolvedTheme,
  options?: {
    includeLandcover?: boolean;
    includeForests?: boolean;
    includeParks?: boolean;
    includeMountains?: boolean;
    includeBuildings?: boolean;
    includeWater?: boolean;
    includeAeroway?: boolean;
    includeRail?: boolean;
    includeRoads?: boolean;
    includeRoadPath?: boolean;
    includeRoadMinorLow?: boolean;
    includeRoadOutline?: boolean;
    includeRoadNames?: boolean;
    includePlaceLabels?: boolean;
    includeNeighborhoodLabels?: boolean;
    includeWaterLabels?: boolean;
    includePoiLabels?: boolean;
    includeBoundaries?: boolean;
    distanceMeters?: number;
  },
): StyleSpecification {
  const buildingFill =
    theme.map.buildings ||
    blendHex(
      theme.map.land || "#ffffff",
      theme.ui.text || "#111111",
      BUILDING_BLEND_FACTOR,
    );

  const includeLandcover = options?.includeLandcover ?? true;
  const includeForests = options?.includeForests ?? false;
  const includeParks = options?.includeParks ?? false;
  const includeMountains = options?.includeMountains ?? false;
  const includeBuildings = options?.includeBuildings ?? false;
  const includeWater = options?.includeWater ?? true;
  const includeAeroway = options?.includeAeroway ?? false;
  const includeRail = options?.includeRail ?? true;
  const includeBoundaries = options?.includeBoundaries ?? true;
  const includeRoads = options?.includeRoads ?? true;
  const includeRoadPath = options?.includeRoadPath ?? true;
  const includeRoadMinorLow = options?.includeRoadMinorLow ?? true;
  const includeRoadOutline = options?.includeRoadOutline ?? true;
  const includeRoadNames = options?.includeRoadNames ?? false;
  const includePlaceLabels = options?.includePlaceLabels ?? false;
  const includeNeighborhoodLabels = options?.includeNeighborhoodLabels ?? false;
  const includeWaterLabels = options?.includeWaterLabels ?? false;
  const includePoiLabels = options?.includePoiLabels ?? false;
  const buildingMinZoom = resolveBuildingMinZoom(options?.distanceMeters);

  const minorHighCasingStops = MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS;
  const majorCasingStops = MAP_ROAD_MAJOR_WIDTH_STOPS;
  const waterwayWidthStops = compensateLineWidthStops(MAP_WATERWAY_WIDTH_STOPS);
  const railWidthStops = compensateLineWidthStops(MAP_RAIL_WIDTH_STOPS);
  const roadMinorOverviewHighWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_HIGH_OVERVIEW_WIDTH_STOPS,
  );
  const roadMinorOverviewMidWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_MID_OVERVIEW_WIDTH_STOPS,
  );
  const roadMinorOverviewLowWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_LOW_OVERVIEW_WIDTH_STOPS,
  );
  const roadPathOverviewWidthStops = compensateLineWidthStops(
    MAP_ROAD_PATH_OVERVIEW_WIDTH_STOPS,
  );
  const roadMinorDetailHighWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS,
  );
  const roadMinorDetailMidWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS,
  );
  const roadMinorDetailLowWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_LOW_DETAIL_WIDTH_STOPS,
  );
  const roadPathDetailWidthStops = compensateLineWidthStops(
    MAP_ROAD_PATH_DETAIL_WIDTH_STOPS,
  );
  const roadMajorWidthStops = compensateLineWidthStops(
    MAP_ROAD_MAJOR_WIDTH_STOPS,
  );
  const roadMinorHighCasingStops =
    compensateLineWidthStops(minorHighCasingStops);
  const roadMajorCasingStops = compensateLineWidthStops(majorCasingStops);
  const roadMinorHighColor = theme.map.roads.minor_high;
  const roadMinorMidColor = theme.map.roads.minor_mid;
  const roadMinorLowColor = theme.map.roads.minor_low;
  const roadPathColor = theme.map.roads.path;
  const roadOutlineColor = theme.map.roads.outline;

  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "sky-color": "#020409",
      "horizon-color": "rgba(56, 189, 248, 0.35)",
      "fog-color": "#020409",
      "sky-horizon-blend": 0.05,
      "atmosphere-blend": 0.25,
    },
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      [SOURCE_ID]: {
        type: "vector",
        url: OPENFREEMAP_SOURCE,
        maxzoom: SOURCE_MAX_ZOOM,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": theme.map.land,
        },
      },

      // Landcover (grass, scrub, wetland, natural fields)
      {
        id: "landcover",
        source: SOURCE_ID,
        "source-layer": "landcover",
        type: "fill" as const,
        filter: ["!", ["match", ["get", "class"], ["wood", "forest"], true, false]] as any,
        layout: { visibility: includeLandcover ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": theme.map.landcover,
          "fill-opacity": 0.65,
        },
      },

      // Forests & Woodlands (Natural green forest cover from landcover + landuse)
      {
        id: "forest-landcover",
        source: SOURCE_ID,
        "source-layer": "landcover",
        type: "fill" as const,
        filter: ["match", ["get", "class"], ["wood", "forest", "dense_tree"], true, false] as any,
        layout: { visibility: includeForests ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": blendHex(theme.map.parks || theme.map.landcover, theme.map.landcover || "#88aa77", 0.4),
          "fill-opacity": 0.88,
        },
      },
      {
        id: "forest-landuse",
        source: SOURCE_ID,
        "source-layer": "landuse",
        type: "fill" as const,
        filter: ["match", ["get", "class"], ["wood", "forest"], true, false] as any,
        layout: { visibility: includeForests ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": blendHex(theme.map.parks || theme.map.landcover, theme.map.landcover || "#88aa77", 0.4),
          "fill-opacity": 0.88,
        },
      },

      // City Parks & Public Gardens (Human-made recreational parks & lawns)
      {
        id: "park",
        source: SOURCE_ID,
        "source-layer": "park",
        type: "fill" as const,
        layout: { visibility: includeParks ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": theme.map.parks },
      },

      // Mountains: Alpine Rock, Scree & Glaciers (Zoom 6+)
      {
        id: "mountain-terrain",
        source: SOURCE_ID,
        "source-layer": "landcover",
        type: "fill" as const,
        filter: ["match", ["get", "class"], ["rock", "scree", "glacier"], true, false] as any,
        layout: { visibility: includeMountains ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": blendHex(theme.map.land || "#f5ede4", theme.ui.text || "#333333", 0.16),
          "fill-opacity": 0.82,
        },
      },

      // Mountain Peaks: Distinct ▲ Marker and Elevation (Zoom 7+)
      {
        id: "mountain-peaks",
        source: SOURCE_ID,
        "source-layer": "mountain_peak",
        type: "symbol" as const,
        minzoom: 7,
        layout: {
          visibility: includeMountains && includePlaceLabels ? ("visible" as const) : ("none" as const),
          "text-field": [
            "case",
            ["has", "elevation_m"],
            ["concat", "▲ ", TEXT_FIELD_NAME, " (", ["to-string", ["get", "elevation_m"]], "m)"],
            ["concat", "▲ ", TEXT_FIELD_NAME],
          ] as any,
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([[7, 8.5], [10, 10.5], [14, 13]]),
          "text-offset": [0, 0.4],
          "text-anchor": "top",
          "text-padding": 12,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.4 * OVERZOOM_TEXT_SCALE,
        },
      },

      {
        id: "water",
        source: SOURCE_ID,
        "source-layer": "water",
        type: "fill" as const,
        layout: { visibility: includeWater ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": theme.map.water },
      },
      {
        id: "waterway",
        source: SOURCE_ID,
        "source-layer": "waterway",
        type: "line" as const,
        filter: lineClassFilter(["river", "canal", "stream", "ditch"]),
        paint: {
          "line-color": theme.map.waterway,
          "line-width": widthExpr(waterwayWidthStops),
        },
        layout: {
          visibility: includeWater ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "aeroway",
        source: SOURCE_ID,
        "source-layer": "aeroway",
        type: "fill" as const,
        filter: [
          "match",
          ["geometry-type"],
          ["MultiPolygon", "Polygon"],
          true,
          false,
        ],
        layout: { visibility: includeAeroway ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": theme.map.aeroway,
          "fill-opacity": 0.85,
        },
      },

      // World Country Boundaries (Visible on Globe & Continents; automatically fades out on city zoom)
      {
        id: "boundary-country",
        source: SOURCE_ID,
        "source-layer": "boundary",
        type: "line" as const,
        minzoom: 0,
        maxzoom: 5.8,
        filter: [
          "all",
          ["==", ["get", "admin_level"], 2],
          ["!=", ["get", "maritime"], 1],
        ],
        paint: {
          "line-color": theme.map.rail || theme.ui.text,
          "line-width": widthExpr([
            [0, 0.65],
            [2.5, 0.95],
            [4.5, 1.45],
            [5.5, 1.8],
          ]),
          "line-opacity": opacityExpr([
            [0, 0.75],
            [4.0, 0.75],
            [5.4, 0.0],
          ]),
          "line-dasharray": [4, 2.5],
        },
        layout: {
          visibility: includeBoundaries ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      // State / Province Boundaries (Visible on Globe & Regional view; automatically fades out on city zoom)
      {
        id: "boundary-state",
        source: SOURCE_ID,
        "source-layer": "boundary",
        type: "line" as const,
        minzoom: 2.5,
        maxzoom: 5.8,
        filter: [
          "all",
          ["==", ["get", "admin_level"], 4],
          ["!=", ["get", "maritime"], 1],
        ],
        paint: {
          "line-color": theme.map.rail || theme.ui.text,
          "line-width": widthExpr([
            [2.5, 0.40],
            [4.0, 0.70],
            [5.5, 1.1],
          ]),
          "line-opacity": opacityExpr([
            [2.5, 0.58],
            [4.0, 0.58],
            [5.4, 0.0],
          ]),
          "line-dasharray": [2.5, 2],
        },
        layout: {
          visibility: includeBoundaries ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "building",
        source: SOURCE_ID,
        "source-layer": "building",
        type: "fill" as const,
        minzoom: buildingMinZoom,
        layout: { visibility: includeBuildings ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": buildingFill,
          "fill-opacity": BUILDING_FILL_OPACITY,
        },
      },

      {
        id: "rail",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line" as const,
        minzoom: 12,
        filter: lineClassFilter(MAP_RAIL_CLASSES),
        paint: {
          "line-color": theme.map.rail,
          "line-width": widthExpr(railWidthStops),
          "line-opacity": opacityExpr([
            [12, 0.45],
            [15, 0.60],
            [18, 0.72],
          ]),
        },
        layout: {
          visibility: includeRail ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "road-minor-overview-high",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES),
        paint: {
          "line-color": roadMinorHighColor,
          "line-width": widthExpr(roadMinorOverviewHighWidthStops),
          "line-opacity": opacityExpr([
            [6, 0.75],
            [9, 0.88],
            [12, 0.96],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-overview-mid",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES),
        paint: {
          "line-color": roadMinorMidColor,
          "line-width": widthExpr(roadMinorOverviewMidWidthStops),
          "line-opacity": opacityExpr([
            [6, 0.65],
            [9, 0.80],
            [12, 0.92],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-overview-low",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_LOW_CLASSES),
        paint: {
          "line-color": roadMinorLowColor,
          "line-width": widthExpr(roadMinorOverviewLowWidthStops),
          "line-opacity": includeRoadMinorLow
            ? opacityExpr([
                [6.5, 0.55],
                [9, 0.72],
                [12, 0.88],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-path-overview",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_PATH_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_PATH_CLASSES),
        paint: {
          "line-color": roadPathColor,
          "line-width": widthExpr(roadPathOverviewWidthStops),
          "line-opacity": includeRoadPath
            ? opacityExpr([
                [8, 0.55],
                [10, 0.72],
                [12, 0.85],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoadPath ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "road-minor-high-casing",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES),
        paint: {
          "line-color": theme.map.land || "#000000",
          "line-width": widthExpr(roadMinorHighCasingStops),
          "line-opacity": includeRoadOutline
            ? opacityExpr([
                [8, 0.50],
                [12, 0.75],
                [18, 0.88],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-major-casing",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: 5.5,
        filter: lineClassFilter(MAP_ROAD_MAJOR_CLASSES),
        paint: {
          "line-color": theme.map.land || "#000000",
          "line-width": widthExpr(roadMajorCasingStops),
          "line-opacity": includeRoadOutline ? 0.45 : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "road-path",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_PATH_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_PATH_CLASSES),
        paint: {
          "line-color": roadPathColor,
          "line-width": widthExpr(roadPathDetailWidthStops),
          "line-opacity": includeRoadPath
            ? opacityExpr([
                [8, 0.65],
                [12, 0.82],
                [16, 0.90],
                [18, 0.96],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoadPath ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-low",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_LOW_CLASSES),
        paint: {
          "line-color": roadMinorLowColor,
          "line-width": widthExpr(roadMinorDetailLowWidthStops),
          "line-opacity": includeRoadMinorLow
            ? opacityExpr([
                [6, 0.68],
                [9, 0.82],
                [12, 0.92],
                [16, 0.98],
                [18, 1.0],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-mid",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES),
        paint: {
          "line-color": roadMinorMidColor,
          "line-width": widthExpr(roadMinorDetailMidWidthStops),
          "line-opacity": opacityExpr([
            [6, 0.76],
            [9, 0.88],
            [12, 0.95],
            [16, 1.0],
            [18, 1.0],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-high",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES),
        paint: {
          "line-color": roadMinorHighColor,
          "line-width": widthExpr(roadMinorDetailHighWidthStops),
          "line-opacity": opacityExpr([
            [6, 0.85],
            [9, 0.94],
            [12, 0.98],
            [16, 1.0],
            [18, 1.0],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-major",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: 5.5,
        filter: lineClassFilter(MAP_ROAD_MAJOR_CLASSES),
        paint: {
          "line-color": theme.map.roads.major,
          "line-width": widthExpr(roadMajorWidthStops),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      // 1. Water Labels (Rivers, Lakes, Seas, Oceans)
      {
        id: "water-name-label",
        source: SOURCE_ID,
        "source-layer": "water_name",
        type: "symbol",
        minzoom: 1,
        layout: {
          visibility: includeWaterLabels ? ("visible" as const) : ("none" as const),
          "symbol-placement": "line-center" as const,
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Italic"],
          "text-size": textSizeStops([
            [1, 4.2],
            [5, 5.5],
            [9, 10],
            [13, 14],
            [17, 18],
          ]),
          "text-letter-spacing": 0.1,
        },
        paint: {
          "text-color": theme.map.water || theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.2 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 2. Country Names (Zoom 3.5-6.5, never cluttering global orbit)
      {
        id: "place-label-country",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol",
        minzoom: 3.5,
        maxzoom: 6.5,
        filter: ["==", ["get", "class"], "country"],
        layout: {
          visibility: includePlaceLabels ? ("visible" as const) : ("none" as const),
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([
            [3.5, 4.5],
            [5, 6.0],
            [6.5, 7.5],
          ]),
          "text-transform": "uppercase" as const,
          "text-letter-spacing": 0.08,
          "text-padding": 28,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 0.4,
          "text-halo-blur": 0.4,
        },
      },
      // 3. State & Province Names (Zoom 5.5-9.5)
      {
        id: "place-label-state",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol",
        minzoom: 5.5,
        maxzoom: 9.5,
        filter: ["==", ["get", "class"], "state"],
        layout: {
          visibility: includePlaceLabels ? ("visible" as const) : ("none" as const),
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([
            [5.5, 11],
            [7, 13.5],
            [9, 17],
          ]),
          "text-transform": "uppercase" as const,
          "text-letter-spacing": 0.1,
          "text-padding": 14,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.8 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 4. Major Cities & Capitals (Zoom 5.0-14, hidden at globe zoom to avoid clutter)
      {
        id: "place-label-city",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol",
        minzoom: 5.0,
        maxzoom: 14,
        filter: ["==", ["get", "class"], "city"],
        layout: {
          visibility: includePlaceLabels ? ("visible" as const) : ("none" as const),
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Bold"],
          "text-size": textSizeStops([
            [5.0, 12],
            [7, 15],
            [9, 19],
            [12, 24],
          ]),
          "text-letter-spacing": 0.06,
          "text-padding": 14,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 2.2 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 5. Towns & Regional Centers (Zoom 6-15)
      {
        id: "place-label-town",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol",
        minzoom: 6,
        maxzoom: 15,
        filter: ["==", ["get", "class"], "town"],
        layout: {
          visibility: includePlaceLabels ? ("visible" as const) : ("none" as const),
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([
            [6, 11],
            [9, 14],
            [12, 17.5],
            [15, 20.5],
          ]),
          "text-letter-spacing": 0.04,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.8 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 6. Suburbs & Neighborhoods (Zoom 9.5+)
      {
        id: "place-label-neighborhood",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol",
        minzoom: 9.5,
        filter: ["match", ["get", "class"], ["suburb", "neighbourhood", "quarter", "village", "hamlet"], true, false],
        layout: {
          visibility: includeNeighborhoodLabels ? ("visible" as const) : ("none" as const),
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([
            [9.5, 10],
            [12, 12.5],
            [15, 15.5],
            [18, 18.5],
          ]),
          "text-letter-spacing": 0.04,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.6 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 7. Major Road & Highway Names (Zoom 11+)
      {
        id: "road-name-major",
        source: SOURCE_ID,
        "source-layer": "transportation_name",
        type: "symbol",
        minzoom: 11,
        filter: ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk", "motorway"], true, false],
        layout: {
          visibility: includeRoadNames ? ("visible" as const) : ("none" as const),
          "symbol-placement": "line" as const,
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Bold"],
          "text-rotation-alignment": "map" as const,
          "text-size": textSizeStops([
            [11, 10.5],
            [13, 12.5],
            [15, 15],
            [18, 18],
          ]),
          "text-letter-spacing": 0.05,
        },
        paint: {
          "text-color": theme.map.roads.major || theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.8 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 8. Minor Road & Street Names (Zoom 13+)
      {
        id: "road-name-minor",
        source: SOURCE_ID,
        "source-layer": "transportation_name",
        type: "symbol",
        minzoom: 13,
        filter: ["match", ["get", "class"], ["minor", "service", "residential", "path", "street", "living_street"], true, false],
        layout: {
          visibility: includeRoadNames ? ("visible" as const) : ("none" as const),
          "symbol-placement": "line" as const,
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Regular"],
          "text-rotation-alignment": "map" as const,
          "text-size": textSizeStops([
            [13, 9.5],
            [15, 11.5],
            [17, 13.5],
            [19, 16],
          ]),
          "text-letter-spacing": 0.03,
        },
        paint: {
          "text-color": theme.map.roads.minor_mid || theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.6 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 9. Landmarks, Parks & Points of Interest (Zoom 12.5+)
      {
        id: "poi-label",
        source: SOURCE_ID,
        "source-layer": "poi",
        type: "symbol",
        minzoom: 12.5,
        layout: {
          visibility: includePoiLabels ? ("visible" as const) : ("none" as const),
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([
            [12.5, 9.5],
            [15, 11.5],
            [18, 14.5],
          ]),
          "text-letter-spacing": 0.04,
          "text-max-width": 8,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.6 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 10. Building Names (Zoom 15+)
      {
        id: "building-label",
        source: SOURCE_ID,
        "source-layer": "building",
        type: "symbol",
        minzoom: 15,
        filter: ["has", "name"],
        layout: {
          visibility: includeBuildings && includePlaceLabels ? ("visible" as const) : ("none" as const),
          "text-field": TEXT_FIELD_NAME,
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([
            [15, 9],
            [17, 11],
            [19, 13.5],
          ]),
          "text-letter-spacing": 0.03,
          "text-max-width": 7,
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.5 * OVERZOOM_TEXT_SCALE,
        },
      },
      // 11. House Numbers / Addresses (Zoom 16.5+)
      {
        id: "housenumber-label",
        source: SOURCE_ID,
        "source-layer": "housenumber",
        type: "symbol",
        minzoom: 16.5,
        layout: {
          visibility: includePlaceLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["get", "housenumber"],
          "text-font": ["Noto Sans Regular"],
          "text-size": textSizeStops([
            [16.5, 8.5],
            [18, 10.5],
            [20, 13],
          ]),
        },
        paint: {
          "text-color": theme.ui.text,
          "text-halo-color": theme.map.land,
          "text-halo-width": 1.2 * OVERZOOM_TEXT_SCALE,
        },
      },
    ],
  };
}
