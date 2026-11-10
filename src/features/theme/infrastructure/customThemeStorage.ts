import { DISPLAY_PALETTE_KEYS, type ThemeColorKey, type ThemeOption } from "../domain/types";
import { normalizeHexColor } from "@/shared/utils/color";

const STORAGE_KEY = "maparte.customThemes.v1";

export interface SavedCustomTheme extends ThemeOption {
  baseThemeId: string;
  colors: Partial<Record<ThemeColorKey, string>>;
  originalColors: Partial<Record<ThemeColorKey, string>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeSavedTheme(value: unknown): SavedCustomTheme | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const baseThemeId = typeof value.baseThemeId === "string" ? value.baseThemeId : "";
  if (!id.startsWith("custom-theme-") || !name || !baseThemeId || !isRecord(value.colors)) return null;

  const colors: Partial<Record<ThemeColorKey, string>> = {};
  const originalColors: Partial<Record<ThemeColorKey, string>> = {};
  for (const key of DISPLAY_PALETTE_KEYS) {
    const color = normalizeHexColor(String(value.colors[key] ?? ""));
    if (color) colors[key] = color;
    const original = normalizeHexColor(String((isRecord(value.originalColors) ? value.originalColors[key] : "") ?? ""));
    // Older saved themes did not store a baseline. Their current palette becomes
    // the reset point so existing user themes remain intact after the upgrade.
    originalColors[key] = original || color || "";
  }
  if (DISPLAY_PALETTE_KEYS.some((key) => !colors[key] || !originalColors[key])) return null;

  return {
    id,
    name,
    description: typeof value.description === "string" ? value.description : "Your saved map color palette.",
    baseThemeId,
    colors,
    originalColors,
    palette: DISPLAY_PALETTE_KEYS.map((key) => colors[key] as string),
  };
}

export function loadCustomThemes(): SavedCustomTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeSavedTheme).filter((theme): theme is SavedCustomTheme => theme !== null)
      : [];
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: SavedCustomTheme[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  } catch {
    // Keep editing usable when browser storage is disabled or full.
  }
}

