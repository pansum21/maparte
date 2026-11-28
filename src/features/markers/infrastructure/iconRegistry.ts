import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconType } from "react-icons";
import {
  FaBuilding,
  FaCamera,
  FaCircle,
  FaFlag,
  FaHeart,
  FaHouse,
  FaLocationDot,
  FaMoon,
  FaPaperPlane,
  FaRegSnowflake,
  FaShop,
  FaSquare,
  FaStar,
  FaSun,
  FaTree,
  FaXmark,
  FaRing,
  FaGem,
  FaChampagneGlasses,
  FaCakeCandles,
  FaGift,
  FaPersonRunning,
  FaHospital,
  FaBaby,
  FaCar,
  FaPlane,
  FaMountain,
} from "react-icons/fa6";
import { IoMdFlower } from "react-icons/io";
import { SlTarget } from "react-icons/sl";
import type {
  MarkerIconDefinition,
  MarkerItem,
} from "@/features/markers/domain/types";
import { MARKER_FEATURED_ICON_COUNT } from "@/features/markers/infrastructure/constants";
import { getEmojiAssetUrl } from "@/features/markers/infrastructure/fluentEmojiAssets";

function addMarkerRelief(id: string, svg: string) {
  const filter = `marker-relief-${id}`;
  const extent = Number(svg.match(/viewBox="[^"]*?([\d.]+)\s*"/)?.[1]) || 512;
  const gradient = `marker-volume-${id}`;
  const defs = `<defs><linearGradient id="${gradient}" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="currentColor"/><stop offset=".65" stop-color="currentColor"/><stop offset="1" stop-color="#111827"/></linearGradient><filter id="${filter}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="${extent * .018}" result="soft"/><feSpecularLighting in="soft" surfaceScale="${extent * .08}" specularConstant="1.1" specularExponent="14" lighting-color="#ffffff" result="shine"><fePointLight x="${extent * .15}" y="${-extent * .2}" z="${extent * .65}"/></feSpecularLighting><feComposite in="shine" in2="SourceAlpha" operator="in" result="clipped"/><feComposite in="SourceGraphic" in2="clipped" operator="arithmetic" k1="0" k2="1" k3=".85" k4="0"/></filter></defs>`;
  svg = svg.replace('fill="currentColor"', `fill="url(#${gradient})"`);
  return svg.replace(/(<svg[^>]*>)/, `$1${defs}<g filter="url(#${filter})">`).replace('</svg>', '</g></svg>');
}

function createSvgIcon(id: string, label: string, component: IconType) {
  return {
    id,
    label,
    source: "predefined",
    kind: "svg",
    component,
    svgMarkup: addMarkerRelief(id, renderToStaticMarkup(
      createElement(component, {
        size: 24,
        color: "currentColor",
        "aria-hidden": true,
      }),
    )),
  } satisfies MarkerIconDefinition;
}

function createImageIcon(id: string, label: string, sourcePath: string) {
  return {
    id,
    label,
    source: "predefined",
    kind: "image",
    dataUrl: sourcePath,
    tintWithMarkerColor: false,
  } satisfies MarkerIconDefinition;
}

const DEFAULT_GTA6_BLUE = "#2F7BFF";

function mixHex(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (target - c) * amount);
  };
  const out = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${out.toString(16).padStart(6, "0")}`;
}

export function buildGta6NavSvgMarkup(): string {
  const color = DEFAULT_GTA6_BLUE;
  const tip: [number, number] = [0, -60];
  const right: [number, number] = [42, 48];
  const notch: [number, number] = [0, 24];
  const left: [number, number] = [-42, 48];

  const outline: [number, number][] = [tip, right, notch, left];
  const leftFacet: [number, number][] = [tip, notch, left];
  const rightFacet: [number, number][] = [tip, right, notch];

  const dark = mixHex(color, 0, 0.55);
  const mid = mixHex(color, 0, 0.12);
  const light = mixHex(color, 255, 0.32);
  const depth = 14;

  const pts = (list: [number, number][]) => list.map(([x, y]) => `${x},${y}`).join(" ");

  const extrusion: string[] = [];
  for (let i = depth; i >= 1; i -= 1) {
    extrusion.push(
      `<polygon points="${pts(outline.map(([x, y]) => [x, y + i]))}" fill="${dark}" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>`,
    );
  }

  const shadowBase: [number, number][] = outline.map(([x, y]) => [x + 6, y + depth + 10]);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-65 -75 130 165" width="130" height="165">` +
    `<defs><filter id="marker-relief-gta6-shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
    `<polygon points="${pts(shadowBase)}" fill="#000000" fill-opacity="0.38" filter="url(#marker-relief-gta6-shadow)"/>` +
    `<polygon points="${pts(outline.map(([x, y]) => [x, y + depth]))}" fill="none" stroke="#FFFFFF" stroke-width="13" stroke-linejoin="round"/>` +
    extrusion.join("") +
    `<polygon points="${pts(outline)}" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linejoin="round"/>` +
    `<polygon points="${pts(leftFacet)}" fill="${light}"/>` +
    `<polygon points="${pts(rightFacet)}" fill="${mid}"/>` +
    `<polyline points="${pts([tip, notch])}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>` +
    `<polygon points="${pts(outline)}" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linejoin="round"/>` +
    `</svg>`
  );
}

const Gta6Nav3DIcon: IconType = (props) =>
  createElement("span", {
    className: "gta6-marker-icon-root",
    style: { display: "inline-flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    dangerouslySetInnerHTML: { __html: buildGta6NavSvgMarkup() },
  });

function createGta6NavIcon(): MarkerIconDefinition {
  return {
    id: "gta-6",
    label: "GTA 6",
    source: "predefined",
    kind: "svg",
    component: Gta6Nav3DIcon,
    svgMarkup: buildGta6NavSvgMarkup(),
    tintWithMarkerColor: false,
  };
}

export const predefinedMarkerIcons: MarkerIconDefinition[] = [
  createImageIcon("app-marker", "MAPARTE", "/assets/marker-ma.webp"),
  createImageIcon("app-marker-a", "ART", "/assets/marker-a-full.webp"),
  createGta6NavIcon(),
  createSvgIcon("pin", "Pin", FaLocationDot),
  createSvgIcon("heart", "Heart", FaHeart),
  createSvgIcon("ring", "Ring", FaRing),
  createSvgIcon("gem", "Diamond", FaGem),
  createSvgIcon("champagne", "Cheers", FaChampagneGlasses),
  createSvgIcon("cake", "Cake", FaCakeCandles),
  createSvgIcon("gift", "Gift", FaGift),
  createSvgIcon("home", "Home", FaHouse),
  createSvgIcon("star", "Star", FaStar),
  createSvgIcon("circle", "Circle", FaCircle),
  createSvgIcon("square", "Square", FaSquare),
  createSvgIcon("x", "X", FaXmark),
  createSvgIcon("target", "Target", SlTarget),
  createSvgIcon("sun", "Sun", FaSun),
  createSvgIcon("moon", "Moon", FaMoon),
  createSvgIcon("building", "Building", FaBuilding),
  createSvgIcon("send", "Send", FaPaperPlane),
  createSvgIcon("snowflake", "Snowflake", FaRegSnowflake),
  createSvgIcon("shop", "Shop", FaShop),
  createSvgIcon("camera", "Camera", FaCamera),
  createSvgIcon("flower", "Flower", IoMdFlower),
  createSvgIcon("tree", "Tree", FaTree),
  createSvgIcon("flag", "Flag", FaFlag),
  createSvgIcon("runner", "Runner", FaPersonRunning),
  createSvgIcon("hospital", "Hospital", FaHospital),
  createSvgIcon("baby", "Baby", FaBaby),
  createSvgIcon("car", "Car", FaCar),
  createSvgIcon("plane", "Plane", FaPlane),
  createSvgIcon("mountain", "Mountain", FaMountain),
];

export const featuredMarkerIcons = predefinedMarkerIcons.slice(
  0,
  MARKER_FEATURED_ICON_COUNT,
);

function createEmojiIcon(iconId: string): MarkerIconDefinition | null {
  if (!iconId.startsWith("emoji:")) return null;
  const emoji = iconId
    .slice("emoji:".length)
    .split("-")
    .map((codePoint) => Number.parseInt(codePoint, 16))
    .filter(Number.isFinite)
    .map((codePoint) => String.fromCodePoint(codePoint))
    .join("");
  if (!emoji) return null;

  return {
    id: iconId,
    label: `${emoji} Emoji`,
    source: "predefined",
    kind: "emoji",
    emoji,
    emojiAssetUrl: getEmojiAssetUrl(iconId.slice("emoji:".length)),
  };
}

export function getAllMarkerIcons(
  customIcons: MarkerIconDefinition[],
  markers: MarkerItem[] = [],
) {
  const emojiIconIds = new Set(
    markers.map((marker) => marker.iconId).filter((iconId) => iconId.startsWith("emoji:")),
  );
  const emojiIcons = [...emojiIconIds]
    .map(createEmojiIcon)
    .filter((icon): icon is MarkerIconDefinition => icon !== null);
  return [...predefinedMarkerIcons, ...customIcons, ...emojiIcons];
}

export function findMarkerIcon(
  iconId: string,
  customIcons: MarkerIconDefinition[],
) {
  const emojiIcon = createEmojiIcon(iconId);
  if (emojiIcon) return emojiIcon;

  return (
    getAllMarkerIcons(customIcons).find((icon) => icon.id === iconId) ?? null
  );
}
