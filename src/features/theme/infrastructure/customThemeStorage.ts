import { DISPLAY_PALETTE_KEYS, type ThemeColorKey, type ThemeOption } from "../domain/types";
import { normalizeHexColor } from "@/shared/utils/color";

const STORAGE_KEY = "maparte.customThemes.v1";
const STARTER_SEED_KEY = "maparte.customThemes.starters.v1";

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

function createStarterTheme(
  id: string,
  name: string,
  description: string,
  palette: string[],
): SavedCustomTheme {
  const colors = Object.fromEntries(
    DISPLAY_PALETTE_KEYS.map((key, index) => [key, palette[index] ?? "#000000"]),
  ) as Record<ThemeColorKey, string>;
  return {
    id: `custom-theme-starter-${id}`,
    name,
    description,
    baseThemeId: "midnight_blue",
    palette: DISPLAY_PALETTE_KEYS.map((key) => colors[key]),
    colors,
    originalColors: { ...colors },
  };
}

function createStarterThemes(): SavedCustomTheme[] {
  return [
    createStarterTheme("aurora-coast", "Aurora Coast", "Cool northern lights over deep ocean blues.", [
      "#0B172A", "#A9F4D0", "#10243A", "#15334A", "#091B2E", "#36B6C1", "#2B5E50", "#254B62",
      "#31546C", "#77D7B2", "#F1C978", "#D8B56C", "#7CA697", "#547A79", "#9FC7A8", "#06111E",
    ]),
    createStarterTheme("ember-dusk", "Ember Dusk", "Warm clay roads and soft coastal water.", [
      "#25140F", "#FFD29A", "#F1E5D2", "#E6D4BB", "#A8BBC0", "#7899A5", "#B6C59C", "#DAC3A8",
      "#D8C6B7", "#D5835F", "#C75A38", "#C77A5A", "#B68F79", "#9B9D99", "#B9A084", "#FFF9EF",
    ]),
    createStarterTheme("sage-atlas", "Sage Atlas", "Quiet botanical greens on a warm paper map.", [
      "#15261F", "#D9E8BE", "#E5E6D2", "#D9E4CF", "#A7C6C0", "#7DAEA4", "#A8C68D", "#D0C7AF",
      "#D7D0C1", "#7D9271", "#7E826A", "#96977E", "#ABA994", "#C2BFA9", "#9EA88D", "#FCFBF3",
    ]),
    createStarterTheme("plum-afterglow", "Plum Afterglow", "A dusky violet palette with bright lilac routes.", [
      "#201329", "#F2C0DF", "#21152B", "#2B1F36", "#171F35", "#6973A5", "#30443A", "#433148",
      "#56415D", "#E8A7D0", "#D89CCF", "#AE83B5", "#806C8D", "#655C70", "#8B7993", "#110B17",
    ]),
  ];
}

export function loadCustomThemes(): SavedCustomTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let savedThemes: SavedCustomTheme[] = [];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      savedThemes = Array.isArray(parsed)
        ? parsed.map(normalizeSavedTheme).filter((theme): theme is SavedCustomTheme => theme !== null)
        : [];
    }

    if (window.localStorage.getItem(STARTER_SEED_KEY) === "1") return savedThemes;

    const savedIds = new Set(savedThemes.map((theme) => theme.id));
    const themes = [
      ...createStarterThemes().filter((theme) => !savedIds.has(theme.id)),
      ...savedThemes,
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
    window.localStorage.setItem(STARTER_SEED_KEY, "1");
    return themes;
  } catch {
    return createStarterThemes();
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

