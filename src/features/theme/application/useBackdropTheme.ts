import { useState, useEffect, useCallback } from "react";
import {
  BACKDROP_PRESETS,
  DEFAULT_BACKDROP_STATE,
  BACKDROP_STORAGE_KEY,
  type BackdropPreset,
  type BackdropThemeState,
  type CustomGradientConfig,
} from "../domain/backdropThemes";

function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex.length === 3
    ? cleanHex.split("").map((c) => c + c).join("")
    : cleanHex, 16);
  if (isNaN(num)) return 0;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function applyBackdropToDOM(state: BackdropThemeState) {
  if (typeof document === "undefined") return;

  const docEl = document.documentElement;
  const body = document.body;

  if (state.type === "preset") {
    const preset =
      BACKDROP_PRESETS.find((p) => p.id === state.presetId) ||
      BACKDROP_PRESETS[0];

    docEl.setAttribute("data-backdrop-mode", preset.mode);

    if (preset.id === "classic_dark" || preset.background === "default") {
      body.style.removeProperty("--app-custom-bg-color");
      body.style.removeProperty("--app-custom-bg-image");
      body.classList.remove("has-custom-backdrop");
    } else {
      body.classList.add("has-custom-backdrop");
      if (preset.background.startsWith("linear-gradient") || preset.background.startsWith("radial-gradient")) {
        body.style.setProperty("--app-custom-bg-image", preset.background);
        body.style.setProperty("--app-custom-bg-color", "transparent");
      } else {
        body.style.setProperty("--app-custom-bg-color", preset.background);
        body.style.setProperty("--app-custom-bg-image", "none");
      }
    }
  } else {
    // Custom gradient
    const { color1, color2, angle } = state.custom;
    const gradient = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
    const avgLum = (getLuminance(color1) + getLuminance(color2)) / 2;
    const mode = avgLum > 165 ? "light" : "dark";

    docEl.setAttribute("data-backdrop-mode", mode);
    body.classList.add("has-custom-backdrop");
    body.style.setProperty("--app-custom-bg-image", gradient);
    body.style.setProperty("--app-custom-bg-color", color1);
  }
}

export function initBackdropThemeFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(BACKDROP_STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as BackdropThemeState;
      applyBackdropToDOM(state);
      return;
    }
  } catch {
    // Ignore
  }
  applyBackdropToDOM(DEFAULT_BACKDROP_STATE);
}

// Auto-run when file is loaded in browser
if (typeof window !== "undefined") {
  initBackdropThemeFromStorage();
}

export function useBackdropTheme() {
  const [backdropState, setBackdropState] = useState<BackdropThemeState>(() => {
    if (typeof window === "undefined") return DEFAULT_BACKDROP_STATE;
    try {
      const stored = localStorage.getItem(BACKDROP_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as BackdropThemeState;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_BACKDROP_STATE;
  });

  useEffect(() => {
    applyBackdropToDOM(backdropState);
    try {
      localStorage.setItem(BACKDROP_STORAGE_KEY, JSON.stringify(backdropState));
      window.dispatchEvent(
        new CustomEvent("maparte:backdrop:change", { detail: backdropState }),
      );
    } catch {
      // Storage unavailable
    }
  }, [backdropState]);

  useEffect(() => {
    const handleRemoteChange = (e: Event) => {
      const customEvent = e as CustomEvent<BackdropThemeState>;
      if (customEvent.detail) {
        setBackdropState(customEvent.detail);
      }
    };
    window.addEventListener("maparte:backdrop:change", handleRemoteChange);
    return () => {
      window.removeEventListener("maparte:backdrop:change", handleRemoteChange);
    };
  }, []);

  const selectPreset = useCallback((presetId: string) => {
    setBackdropState((prev) => ({
      ...prev,
      type: "preset",
      presetId,
    }));
  }, []);

  const updateCustomGradient = useCallback(
    (custom: Partial<CustomGradientConfig>) => {
      setBackdropState((prev) => ({
        ...prev,
        type: "custom",
        custom: {
          ...prev.custom,
          ...custom,
        },
      }));
    },
    [],
  );

  const resetToDefault = useCallback(() => {
    setBackdropState(DEFAULT_BACKDROP_STATE);
  }, []);

  const activePreset =
    BACKDROP_PRESETS.find((p) => p.id === backdropState.presetId) ||
    BACKDROP_PRESETS[0];

  return {
    backdropState,
    activePreset,
    presets: BACKDROP_PRESETS,
    selectPreset,
    updateCustomGradient,
    resetToDefault,
  };
}
