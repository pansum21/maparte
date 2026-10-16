import { useState, useEffect, useCallback } from "react";

export type UiTheme = "dark" | "light";

const UI_THEME_KEY = "maparte_ui_theme";

export function getInitialUiTheme(): UiTheme {
  try {
    const saved = window.localStorage.getItem(UI_THEME_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // ignore
  }
  return "dark";
}

export function useUiTheme() {
  const [uiTheme, setUiThemeState] = useState<UiTheme>(getInitialUiTheme);

  const applyTheme = useCallback((theme: UiTheme) => {
    document.documentElement.setAttribute("data-ui-theme", theme);
    document.body.setAttribute("data-ui-theme", theme);
    try {
      window.localStorage.setItem(UI_THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    applyTheme(uiTheme);
  }, [uiTheme, applyTheme]);

  const toggleUiTheme = useCallback(() => {
    setUiThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  return { uiTheme, toggleUiTheme, setUiTheme: setUiThemeState };
}
