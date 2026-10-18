import type { ResolvedTheme, ThemeRoadColors } from "../domain/types";
import { blendHex, normalizeHexColor } from "@/shared/utils/color";

export interface SnazzyStyler {
  color?: string;
  visibility?: "on" | "off" | "simplified";
  weight?: number;
  lightness?: number;
  saturation?: number;
  gamma?: number;
  hue?: string;
  invert_lightness?: boolean;
}

export interface SnazzyRule {
  featureType?: string;
  elementType?: string;
  stylers?: SnazzyStyler[];
}

function extractColorFromStylers(stylers?: SnazzyStyler[]): string | null {
  if (!Array.isArray(stylers)) return null;
  for (const s of stylers) {
    if (s.color) {
      const norm = normalizeHexColor(s.color);
      if (norm) return norm;
    }
  }
  return null;
}

function getLuminance(hex: string): number {
  const norm = normalizeHexColor(hex) || "#ffffff";
  const r = parseInt(norm.slice(1, 3), 16) / 255;
  const g = parseInt(norm.slice(3, 5), 16) / 255;
  const b = parseInt(norm.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parses a Snazzy Maps / Google Maps JavaScript API Style Array into a MapArte ResolvedTheme.
 * Accepts either a parsed array or a raw JSON string.
 */
export function convertSnazzyMapsToTheme(
  input: string | SnazzyRule[],
  options?: { name?: string; description?: string },
): ResolvedTheme {
  let rules: SnazzyRule[] = [];

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input.trim());
      if (Array.isArray(parsed)) {
        rules = parsed;
      } else if (parsed && Array.isArray(parsed.style)) {
        rules = parsed.style;
      }
    } catch {
      throw new Error("Invalid Snazzy Maps JSON format. Please provide a valid JSON array of rules.");
    }
  } else if (Array.isArray(input)) {
    rules = input;
  }

  if (!rules || rules.length === 0) {
    throw new Error("No style rules found in Snazzy Maps input.");
  }

  let landscapeColor: string | null = null;
  let allBgColor: string | null = null;
  let waterColor: string | null = null;
  let waterwayColor: string | null = null;
  let highwayColor: string | null = null;
  let highwayStrokeColor: string | null = null;
  let arterialColor: string | null = null;
  let localRoadColor: string | null = null;
  let genericRoadColor: string | null = null;
  let genericRoadStroke: string | null = null;
  let parksColor: string | null = null;
  let landcoverColor: string | null = null;
  let buildingsColor: string | null = null;
  let railColor: string | null = null;
  let textColor: string | null = null;

  for (const rule of rules) {
    const f = (rule.featureType || "all").toLowerCase();
    const e = (rule.elementType || "all").toLowerCase();
    const color = extractColorFromStylers(rule.stylers);

    if (!color) continue;

    if (f === "all") {
      if (e === "all" || e === "geometry" || e === "geometry.fill") {
        allBgColor = color;
      } else if (e.startsWith("labels.text")) {
        textColor = color;
      }
    } else if (f.startsWith("landscape")) {
      if (f === "landscape.natural" || f === "landscape.natural.landcover") {
        landcoverColor = color;
      } else {
        landscapeColor = color;
      }
    } else if (f.startsWith("water")) {
      waterColor = color;
    } else if (f.startsWith("road.highway")) {
      if (e === "geometry.stroke") {
        highwayStrokeColor = color;
      } else {
        highwayColor = color;
      }
    } else if (f.startsWith("road.arterial")) {
      arterialColor = color;
    } else if (f.startsWith("road.local")) {
      localRoadColor = color;
    } else if (f.startsWith("road")) {
      if (e === "geometry.stroke") {
        genericRoadStroke = color;
      } else {
        genericRoadColor = color;
      }
    } else if (f.startsWith("poi.park") || f.startsWith("poi")) {
      parksColor = color;
    } else if (f.startsWith("transit")) {
      railColor = color;
    } else if (f.includes("building") || f.includes("man_made")) {
      buildingsColor = color;
    }
  }

  // Derive base colors
  const land = landscapeColor || allBgColor || "#f4efe6";
  const bg = allBgColor || landscapeColor || land;
  const isLight = getLuminance(land) > 0.45;

  const text =
    textColor ||
    (isLight ? "#1a1a1a" : "#f5f5f5");

  const water =
    waterColor ||
    (isLight ? blendHex(land, "#4a90e2", 0.35) : blendHex(land, "#1b2a47", 0.6));

  const waterway = waterwayColor || water;

  const outline =
    highwayStrokeColor ||
    genericRoadStroke ||
    (isLight ? blendHex(land, "#000000", 0.15) : blendHex(land, "#ffffff", 0.15));

  const major =
    highwayColor ||
    genericRoadColor ||
    (isLight ? "#ffffff" : blendHex(land, "#ffffff", 0.45));

  const minorHigh =
    arterialColor ||
    genericRoadColor ||
    blendHex(major, land, 0.25);

  const minorMid = blendHex(minorHigh, land, 0.2);

  const minorLow =
    localRoadColor ||
    blendHex(minorMid, land, 0.25);

  const path = blendHex(minorLow, land, 0.2);

  const parks =
    parksColor ||
    landcoverColor ||
    (isLight ? blendHex(land, "#c8d6af", 0.3) : blendHex(land, "#1e3323", 0.4));

  const landcover =
    landcoverColor ||
    blendHex(land, parks, 0.5);

  const buildings =
    buildingsColor ||
    (isLight ? blendHex(land, "#000000", 0.08) : blendHex(land, "#ffffff", 0.1));

  const rail =
    railColor ||
    (isLight ? blendHex(text, land, 0.4) : blendHex(text, land, 0.3));

  const roads: ThemeRoadColors = {
    major,
    minor_high: minorHigh,
    minor_mid: minorMid,
    minor_low: minorLow,
    path,
    outline,
  };

  const name = options?.name || "Custom Snazzy Map";
  const description =
    options?.description || "Imported directly from Snazzy Maps style array";

  return {
    name,
    description,
    ui: {
      bg,
      text,
    },
    map: {
      land,
      landcover,
      water,
      waterway,
      parks,
      buildings,
      aeroway: blendHex(land, roads.major, 0.3),
      rail,
      roads,
    },
  };
}
