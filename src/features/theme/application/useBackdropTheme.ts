import { useState, useEffect, useCallback } from "react";
import {
  BACKDROP_PRESETS,
  DEFAULT_BACKDROP_STATE,
  BACKDROP_STORAGE_KEY,
  type BackdropPreset,
  type BackdropThemeState,
  type CustomGradientConfig,
} from "../domain/backdropThemes";

function applyBackdropToDOM(state: BackdropThemeState) {
  if (typeof document === "undefined") return;

  // Wall paint belongs to the poster stage only. Never theme the app shell,
  // page body, navigation, or settings panels.
  const root = document.documentElement;
  const body = document.body;
  root.removeAttribute("data-backdrop-mode");
  body.classList.remove("has-custom-backdrop");
  body.style.removeProperty("--app-custom-bg-color");
  body.style.removeProperty("--app-custom-bg-image");

  let backgroundColor: string | null = null;
  let backgroundImage: string | null = null;

  if (state.type === "preset") {
    const preset =
      BACKDROP_PRESETS.find((item) => item.id === state.presetId) ||
      BACKDROP_PRESETS[0];
    if (preset.background !== "default") {
      const isGradient = preset.background.includes("gradient(");
      backgroundColor = isGradient ? "transparent" : preset.background;
      backgroundImage = isGradient ? preset.background : "none";
    }
  } else {
    const { color1, color2, angle } = state.custom;
    const gradient = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
    backgroundColor = color1;
    backgroundImage = gradient;
  }

  document.querySelectorAll<HTMLElement>(".poster-viewport").forEach((viewport) => {
    viewport.classList.toggle("has-custom-wall-color", state.type === "custom");
    if (backgroundColor === null || backgroundImage === null) {
      viewport.classList.remove("has-wall-theme");
      viewport.style.removeProperty("--wall-bg-color");
      viewport.style.removeProperty("--wall-bg-image");
      return;
    }

    viewport.classList.add("has-wall-theme");
    viewport.style.setProperty("--wall-bg-color", backgroundColor);
    viewport.style.setProperty("--wall-bg-image", backgroundImage);
  });
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

export function resetBackdropThemeToDefault() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(BACKDROP_STORAGE_KEY, JSON.stringify(DEFAULT_BACKDROP_STATE)); } catch { /* Continue with the in-memory reset. */ }
  applyBackdropToDOM(DEFAULT_BACKDROP_STATE);
  window.dispatchEvent(new CustomEvent("maparte:backdrop:change", { detail: DEFAULT_BACKDROP_STATE }));
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

  const selectNextPreset = useCallback(() => {
    setBackdropState((prev) => {
      const idx = BACKDROP_PRESETS.findIndex((p) => p.id === prev.presetId);
      const nextIdx = idx >= 0 ? (idx + 1) % BACKDROP_PRESETS.length : 0;
      return {
        ...prev,
        type: "preset",
        presetId: BACKDROP_PRESETS[nextIdx].id,
      };
    });
  }, []);

  const selectPrevPreset = useCallback(() => {
    setBackdropState((prev) => {
      const idx = BACKDROP_PRESETS.findIndex((p) => p.id === prev.presetId);
      const prevIdx =
        idx >= 0
          ? (idx - 1 + BACKDROP_PRESETS.length) % BACKDROP_PRESETS.length
          : BACKDROP_PRESETS.length - 1;
      return {
        ...prev,
        type: "preset",
        presetId: BACKDROP_PRESETS[prevIdx].id,
      };
    });
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
    selectNextPreset,
    selectPrevPreset,
    updateCustomGradient,
    resetToDefault,
  };
}
