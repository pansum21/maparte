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

export const predefinedMarkerIcons: MarkerIconDefinition[] = [
  createImageIcon("app-marker", "MAPARTE", "/assets/marker-ma.png"),
  createImageIcon("app-marker-a", "ART", "/assets/marker-a.png"),
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
