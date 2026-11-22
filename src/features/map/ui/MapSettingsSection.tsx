import MinimapControls from "@/features/poster/ui/MinimapControls";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createCustomLayoutOption } from "@/features/layout/infrastructure/layoutRepository";
import {
  DISPLAY_PALETTE_KEYS,
  PALETTE_COLOR_LABELS,
  type ThemeColorKey,
  type ThemeOption,
} from "@/features/theme/domain/types";
import { getThemeColorByPath } from "@/features/theme/domain/colorPaths";
import { normalizeHexColor } from "@/shared/utils/color";
import {
  buildDynamicColorChoices,
  createFallbackThemeOption,
} from "@/features/theme/domain/colorSuggestions";
import LayoutCard from "@/features/layout/ui/LayoutCard";
import MapDimensionFields from "./MapDimensionFields";
import ColorPicker from "@/features/theme/ui/ColorPicker";
import ThemeColorEditor from "@/features/theme/ui/ThemeColorEditor";
import ThemeSummarySection from "@/features/theme/ui/ThemeSummarySection";
import { CheckIcon, EditIcon } from "@/shared/ui/Icons";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import type { LayoutGroup } from "@/features/layout/domain/types";
import { loadCustomThemes, saveCustomThemes, type SavedCustomTheme } from "@/features/theme/infrastructure/customThemeStorage";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { applyThemeColorOverrides } from "@/features/theme/domain/colorPaths";

const FALLBACK_COLOR = "#000000";

interface MapSettingsForm {
  theme: string;
  layout: string;
  frameLayout?: string;
  width: string;
  height: string;
  distance: string;
  includeBuildings: boolean;
  includeLandcover: boolean;
  includeWater: boolean;
  includeParks: boolean;
  includeAeroway: boolean;
  includeRail: boolean;
  includeRoads: boolean;
  includeRoadPath: boolean;
  includeRoadMinorLow: boolean;
  includeRoadOutline: boolean;
}

interface MapSettingsSectionProps {
  activeMobileTab?: string;
  form: MapSettingsForm;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onNumericFieldBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  onThemeChange: (themeId: string) => void;
  onLayoutChange: (layoutId: string) => void;
  onFrameLayoutChange?: (frameLayout: string) => void;
  onFontChange?: (font: string) => void;
  selectedTheme: ResolvedTheme;
  themeOptions: ThemeOption[];
  layoutGroups: LayoutGroup[];
  minPosterCm: number;
  maxPosterCm: number;
  customColors: Record<string, string>;
  onColorChange: (key: string, value: string) => void;
  onResetColors: () => void;
  onColorEditorActiveChange?: (active: boolean) => void;
}

export default function MapSettingsSection({
  activeMobileTab,
  form,
  onChange,
  onNumericFieldBlur,
  onThemeChange,
  onLayoutChange,
  onFrameLayoutChange,
  onFontChange,
  selectedTheme,
  themeOptions,
  layoutGroups,
  minPosterCm,
  maxPosterCm,
  customColors,
  onColorChange,
  onResetColors,
  onColorEditorActiveChange,
}: MapSettingsSectionProps) {
  const [isThemeEditing, setIsThemeEditing] = useState(false);
  const [savedCustomThemes, setSavedCustomThemes] = useState<SavedCustomTheme[]>(loadCustomThemes);
  const [activeThemeOptionId, setActiveThemeOptionId] = useState<string | null>(null);
  const lastFormThemeRef = useRef(form.theme);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const defaultColorKey: ThemeColorKey = DISPLAY_PALETTE_KEYS[0] ?? "ui.bg";
  const [activeColorKey, setActiveColorKey] = useState<ThemeColorKey | null>(
    null,
  );
  const [activeColorSession, setActiveColorSession] = useState<{
    key: ThemeColorKey;
    seedColor: string;
    seedPalette: string[];
  } | null>(null);
  const themeListRef = useRef<HTMLDivElement | null>(null);
  const layoutGroupsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveCustomThemes(savedCustomThemes);
  }, [savedCustomThemes]);

  const activeCustomTheme = savedCustomThemes.find((item) => item.id === activeThemeOptionId) ?? null;

  useEffect(() => {
    if (lastFormThemeRef.current === form.theme) return;
    lastFormThemeRef.current = form.theme;
    setActiveThemeOptionId(form.theme);
  }, [form.theme]);

  const availableThemeOptions = useMemo(
    () => [...themeOptions, ...savedCustomThemes],
    [savedCustomThemes, themeOptions],
  );

  const selectedThemeOption = useMemo(() => {
    const matchingOption = themeOptions.find((t) => t.id === form.theme);
    if (matchingOption) return matchingOption;
    return createFallbackThemeOption(form.theme, selectedTheme);
  }, [form.theme, selectedTheme, themeOptions]);

  const currentThemePalette = useMemo(
    () =>
      DISPLAY_PALETTE_KEYS.map((key) => {
        const themeColor =
          getThemeColorByPath(selectedTheme, key) || FALLBACK_COLOR;
        return customColors[key] ?? themeColor;
      }),
    [customColors, selectedTheme],
  );

  const summaryThemeOption = useMemo(() => {
    const customOption = savedCustomThemes.find((item) => item.id === activeThemeOptionId);
    return { ...(customOption ?? selectedThemeOption), palette: currentThemePalette };
  }, [activeThemeOptionId, currentThemePalette, savedCustomThemes, selectedThemeOption]);

  const resolvePreviewTheme = useCallback(
    (option: ThemeOption): ResolvedTheme => {
      const savedTheme = savedCustomThemes.find((item) => item.id === option.id);
      const baseThemeId = savedTheme?.baseThemeId ?? option.id;
      const overrides = savedTheme?.colors ??
        (activeThemeOptionId === option.id ? customColors : {});
      return applyThemeColorOverrides(getTheme(baseThemeId), overrides);
    },
    [activeThemeOptionId, customColors, savedCustomThemes],
  );

  const activeColorChoices = useMemo(() => {
    if (!activeColorKey) return { suggestedColors: [], moreColors: [] };

    const sessionColor =
      activeColorSession?.key === activeColorKey
        ? activeColorSession.seedColor
        : "";
    const sessionPalette =
      activeColorSession?.key === activeColorKey
        ? activeColorSession.seedPalette
        : currentThemePalette;

    return buildDynamicColorChoices(
      sessionColor ||
        customColors[activeColorKey] ||
        getThemeColorByPath(selectedTheme, activeColorKey) ||
        currentThemePalette[0] ||
        "",
      sessionPalette,
    );
  }, [
    activeColorKey,
    activeColorSession,
    customColors,
    currentThemePalette,
    selectedTheme,
  ]);

  const colorTargets = useMemo(
    () =>
      DISPLAY_PALETTE_KEYS.map((key) => {
        const baseColor =
          getThemeColorByPath(selectedTheme, key) || FALLBACK_COLOR;
        const currentColor = customColors[key] ?? baseColor;
        return {
          key,
          label: PALETTE_COLOR_LABELS[key] ?? key,
          color: currentColor,
          isActive: activeColorKey === key,
        };
      }),
    [activeColorKey, customColors, selectedTheme],
  );

  const layoutOptions = useMemo(
    () => layoutGroups.flatMap((g) => g.options),
    [layoutGroups],
  );

  const selectedLayoutOption = useMemo(() => {
    const match = layoutOptions.find((lo) => lo.id === form.layout);
    if (match) return match;
    if (!form.layout) {
      return {
        ...createCustomLayoutOption(Number(form.width), Number(form.height)),
        name: "No frame selected",
        description: "The map stays full-screen until you choose a layout.",
      };
    }
    return createCustomLayoutOption(Number(form.width), Number(form.height));
  }, [form.height, form.layout, form.width, layoutOptions]);
  const selectedLayoutDescription =
    selectedLayoutOption.id === "custom"
      ? "Your custom layout."
      : selectedLayoutOption.description?.trim() || "No description available.";

  function clearColorPickerState() {
    setActiveColorKey(null);
    setActiveColorSession(null);
  }

  function handleThemeSelect(themeId: string) {
    const customTheme = savedCustomThemes.find((item) => item.id === themeId);
    if (customTheme) {
      lastFormThemeRef.current = customTheme.baseThemeId;
      onThemeChange(customTheme.baseThemeId);
      for (const key of DISPLAY_PALETTE_KEYS) {
        const color = customTheme.colors[key];
        if (color) onColorChange(key, color);
      }
    } else {
      lastFormThemeRef.current = themeId;
      onThemeChange(themeId);
      onResetColors();
    }
    setActiveThemeOptionId(themeId);
    clearColorPickerState();
  }

  function handleThemeAction(group: "maparte" | "yours") {
    if (group === "yours") {
      handleCreateCustomTheme();
      return;
    }

    const selectedBuiltInId =
      activeThemeOptionId && !activeCustomTheme ? activeThemeOptionId : form.theme;
    if (activeCustomTheme) {
      lastFormThemeRef.current = activeCustomTheme.baseThemeId;
      onThemeChange(activeCustomTheme.baseThemeId);
      onResetColors();
    }
    setActiveThemeOptionId(selectedBuiltInId);
    setIsThemeEditing(true);
    clearColorPickerState();
  }

  function handleCreateCustomTheme() {
    const colors = Object.fromEntries(
      DISPLAY_PALETTE_KEYS.map((key, index) => [key, currentThemePalette[index] ?? FALLBACK_COLOR]),
    ) as SavedCustomTheme["colors"];
    const usedNumbers = savedCustomThemes
      .map((theme) => Number(theme.name.match(/^New Theme (\d+)$/)?.[1] ?? 0))
      .filter(Number.isFinite);
    const nextNumber = Math.max(0, ...usedNumbers) + 1;
    const customTheme: SavedCustomTheme = {
      id: `custom-theme-${Date.now()}`,
      name: `New Theme ${nextNumber}`,
      description: "Your saved map color palette.",
      baseThemeId: activeCustomTheme?.baseThemeId ?? form.theme,
      palette: [...currentThemePalette],
      colors,
      originalColors: { ...colors },
    };

    setSavedCustomThemes((current) => [...current, customTheme]);
    lastFormThemeRef.current = customTheme.baseThemeId;
    onThemeChange(customTheme.baseThemeId);
    for (const [key, color] of Object.entries(customTheme.colors)) {
      if (color) onColorChange(key, color);
    }
    setActiveThemeOptionId(customTheme.id);
    setIsThemeEditing(true);
    clearColorPickerState();
  }

  function handleDeleteCustomTheme(themeId: string) {
    const themeToDelete = savedCustomThemes.find((theme) => theme.id === themeId);
    if (!themeToDelete) return;
    setSavedCustomThemes((current) => current.filter((theme) => theme.id !== themeId));
    if (activeThemeOptionId === themeId) {
      lastFormThemeRef.current = themeToDelete.baseThemeId;
      onThemeChange(themeToDelete.baseThemeId);
      onResetColors();
      setActiveThemeOptionId(null);
      setIsThemeEditing(false);
      clearColorPickerState();
    }
  }

  function handleThemeColorChange(key: string, color: string) {
    onColorChange(key, color);
    if (!activeCustomTheme || !(key in activeCustomTheme.colors)) return;
    setSavedCustomThemes((current) => current.map((customTheme) =>
      customTheme.id === activeCustomTheme.id
        ? {
            ...customTheme,
            colors: { ...customTheme.colors, [key]: color },
            palette: DISPLAY_PALETTE_KEYS.map((paletteKey) =>
              paletteKey === key ? color : customTheme.colors[paletteKey] ?? FALLBACK_COLOR,
            ),
          }
        : customTheme,
    ));
  }

  function handleLayoutSelectInline(layoutId: string) {
    if (!framePaperLayoutIds.has(layoutId)) {
      onFrameLayoutChange?.("none");
    }
    onLayoutChange(form.layout === layoutId ? "" : layoutId);
    setIsLayoutEditing(false);
  }

  function handleFrameLayoutSelectInline(frameLayoutId: string) {
    const nextFrameLayout = form.frameLayout === frameLayoutId ? "none" : frameLayoutId;
    onFrameLayoutChange?.(nextFrameLayout);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(nextFrameLayout === "none"
        ? "maparte:disable-poster-layout"
        : "maparte:enable-poster-layout"));
    }
  }

  function handleSwatchClick(key: ThemeColorKey) {
    const themeColor = getThemeColorByPath(selectedTheme, key);
    const seedColor =
      customColors[key] ?? (themeColor || currentThemePalette[0] || "");
    setActiveColorKey(key);
    setActiveColorSession({
      key,
      seedColor,
      seedPalette: [...currentThemePalette],
    });
  }

  function handleDoneThemeEditor() {
    setIsThemeEditing(false);
    clearColorPickerState();
  }

  function handleOpenLayoutEditor() {
    setIsLayoutEditing(true);
    onLayoutChange("custom");
  }

  function handleDoneLayoutEditor() {
    setIsLayoutEditing(false);
  }

  function handleResetThemeColors() {
    const resetColors = activeCustomTheme?.originalColors;
    if (activeCustomTheme && resetColors) {
      for (const key of DISPLAY_PALETTE_KEYS) {
        const color = resetColors[key];
        if (color) onColorChange(key, color);
      }
    } else {
      onResetColors();
    }
    if (activeCustomTheme) {
      const colors = { ...activeCustomTheme.originalColors };
      setSavedCustomThemes((current) => current.map((customTheme) =>
        customTheme.id === activeCustomTheme.id
          ? { ...customTheme, colors, palette: DISPLAY_PALETTE_KEYS.map((key) => colors[key] ?? FALLBACK_COLOR) }
          : customTheme,
      ));
    }
    if (!isThemeEditing) {
      clearColorPickerState();
      return;
    }
    const activeKey = activeColorKey || defaultColorKey;
    const seedPalette = DISPLAY_PALETTE_KEYS.map((key) =>
      normalizeHexColor(activeCustomTheme?.originalColors[key]) ||
      normalizeHexColor(getThemeColorByPath(selectedTheme, key)) ||
      normalizeHexColor(currentThemePalette[0]) || "",
    );
    setActiveColorSession({
      key: activeKey,
      seedColor:
        seedPalette[DISPLAY_PALETTE_KEYS.indexOf(activeKey)] ||
        seedPalette[0] ||
        "",
      seedPalette,
    });
  }

  function handleResetSingleColor(key: ThemeColorKey) {
    const originalColor =
      normalizeHexColor(activeCustomTheme?.originalColors[key]) ||
      normalizeHexColor(getThemeColorByPath(selectedTheme, key)) ||
      normalizeHexColor(currentThemePalette[0]) ||
      "";
    if (!originalColor) return;
    handleThemeColorChange(key, originalColor);
  }

  const hasCustomColors = useMemo(
    () =>
      DISPLAY_PALETTE_KEYS.some((key) => {
        const override = normalizeHexColor(customColors[key]);
        if (!override) return false;
        const original = normalizeHexColor(activeCustomTheme?.originalColors[key]) || normalizeHexColor(getThemeColorByPath(selectedTheme, key));
        return override !== original;
      }),
    [activeCustomTheme, customColors, selectedTheme],
  );
  const activeColorLabel = activeColorKey
    ? (PALETTE_COLOR_LABELS[activeColorKey] ?? "Color")
    : "Color";

  useEffect(() => {
    onColorEditorActiveChange?.(false);
    return () => {
      onColorEditorActiveChange?.(false);
    };
  }, [onColorEditorActiveChange]);

  useEffect(() => {
    if (activeMobileTab !== "theme") {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      const selectedThemeCard = themeListRef.current?.querySelector<HTMLElement>(
        ".theme-card.is-selected",
      );
      selectedThemeCard?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "start",
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeMobileTab]);

  useEffect(() => {
    if (activeMobileTab !== "layout" || isLayoutEditing) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      const selectedLayoutCard =
        layoutGroupsRef.current?.querySelector<HTMLElement>(
          ".layout-card.is-selected",
        );
      selectedLayoutCard?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "start",
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeMobileTab, isLayoutEditing]);

  const editorKey = activeColorKey || defaultColorKey;
  const editorChoices = activeColorKey
    ? activeColorChoices
    : buildDynamicColorChoices(currentThemePalette[0] || "", currentThemePalette);
  const editorColor =
    customColors[editorKey] ??
    (getThemeColorByPath(selectedTheme, editorKey) || currentThemePalette[0] || "");
  const originalEditorColor =
    normalizeHexColor(activeCustomTheme?.originalColors[editorKey]) ||
    normalizeHexColor(getThemeColorByPath(selectedTheme, editorKey)) ||
    normalizeHexColor(currentThemePalette[0]) ||
    "";
  const normalizedEditorColor = normalizeHexColor(editorColor) || "";
  const canResetEditorColor = Boolean(
    originalEditorColor &&
      normalizedEditorColor &&
      originalEditorColor !== normalizedEditorColor,
  );
  const framePaperLayoutIds = useMemo(
    () =>
      new Set([
        "print_maparte_square_caption_a4_portrait",
        "print_maparte_square_caption_a4_top",
        "print_maparte_corner_caption_a4_portrait",
        "print_maparte_corner_caption_a4_bottom",
        "print_maparte_circle_caption_a4_portrait",
        "print_maparte_circle_caption_a4_top",
        "print_maparte_circle_poster_a4_portrait",
        "print_maparte_square_caption_a4_landscape",
        "print_maparte_square_caption_a4_landscape_left",
        "print_maparte_circle_caption_a4_landscape",
        "print_maparte_circle_caption_a4_landscape_left",
        "print_maparte_circle_poster_a4_landscape",
      ]),
    [],
  );

  const [activeLayoutTab, setActiveLayoutTab] = useState<"print" | "frame" | "wallpaper" | "social">(() => {
    if (framePaperLayoutIds.has(form.layout) || (form.frameLayout && form.frameLayout !== "none")) {
      return "frame";
    }
    if (form.layout?.startsWith("wallpaper") || form.layout?.startsWith("iphone")) {
      return "wallpaper";
    }
    if (form.layout?.startsWith("social") || form.layout?.startsWith("web")) {
      return "social";
    }
    return "print";
  });

  const lastFormLayoutRef = useRef(form.layout);
  useEffect(() => {
    if (lastFormLayoutRef.current === form.layout) return;
    lastFormLayoutRef.current = form.layout;
    if (framePaperLayoutIds.has(form.layout)) {
      setActiveLayoutTab("frame");
    } else if (form.layout?.startsWith("wallpaper") || form.layout?.startsWith("iphone")) {
      setActiveLayoutTab("wallpaper");
    } else if (form.layout?.startsWith("social") || form.layout?.startsWith("web")) {
      setActiveLayoutTab("social");
    } else if (form.layout) {
      setActiveLayoutTab("print");
    }
  }, [form.layout, framePaperLayoutIds]);

  const framePortraitLayouts = useMemo(
    () =>
      layoutGroups.flatMap((group) =>
        group.options.filter((l) => framePaperLayoutIds.has(l.id) && (l.heightCm ?? l.height) >= (l.widthCm ?? l.width)),
      ),
    [framePaperLayoutIds, layoutGroups],
  );

  const frameLandscapeLayouts = useMemo(
    () =>
      layoutGroups.flatMap((group) =>
        group.options.filter((l) => framePaperLayoutIds.has(l.id) && (l.widthCm ?? l.width) > (l.heightCm ?? l.height)),
      ),
    [framePaperLayoutIds, layoutGroups],
  );

  const printPortraitLayouts = useMemo(
    () =>
      layoutGroups
        .filter((group) => group.id === "print")
        .flatMap((group) =>
          group.options.filter((l) => !framePaperLayoutIds.has(l.id) && (l.heightCm ?? l.height) >= (l.widthCm ?? l.width)),
        )
        .sort((a, b) => ((a.widthCm ?? a.width) * (a.heightCm ?? a.height)) - ((b.widthCm ?? b.width) * (b.heightCm ?? b.height))),
    [framePaperLayoutIds, layoutGroups],
  );

  const printLandscapeLayouts = useMemo(
    () =>
      layoutGroups
        .filter((group) => group.id === "print")
        .flatMap((group) =>
          group.options.filter((l) => !framePaperLayoutIds.has(l.id) && (l.widthCm ?? l.width) > (l.heightCm ?? l.height)),
        )
        .sort((a, b) => ((a.widthCm ?? a.width) * (a.heightCm ?? a.height)) - ((b.widthCm ?? b.width) * (b.heightCm ?? b.height))),
    [framePaperLayoutIds, layoutGroups],
  );

  const wallpaperPortraitLayouts = useMemo(
    () =>
      layoutGroups
        .filter((group) => group.id === "wallpaper" || group.id === "iphone_wallpaper")
        .flatMap((group) => group.options.filter((l) => (l.heightCm ?? l.height) >= (l.widthCm ?? l.width)))
        .sort((a, b) => ((a.widthCm ?? a.width) * (a.heightCm ?? a.height)) - ((b.widthCm ?? b.width) * (b.heightCm ?? b.height))),
    [layoutGroups],
  );

  const wallpaperLandscapeLayouts = useMemo(
    () =>
      layoutGroups
        .filter((group) => group.id === "wallpaper" || group.id === "iphone_wallpaper")
        .flatMap((group) => group.options.filter((l) => (l.widthCm ?? l.width) > (l.heightCm ?? l.height)))
        .sort((a, b) => ((a.widthCm ?? a.width) * (a.heightCm ?? a.height)) - ((b.widthCm ?? b.width) * (b.heightCm ?? b.height))),
    [layoutGroups],
  );

  const socialLayouts = useMemo(
    () =>
      layoutGroups
        .filter((group) => group.id === "social_media" || group.id === "web")
        .flatMap((group) => group.options)
        .sort((a, b) => ((a.widthCm ?? a.width) * (a.heightCm ?? a.height)) - ((b.widthCm ?? b.width) * (b.heightCm ?? b.height))),
    [layoutGroups],
  );

  return (
    <section className="panel-block">
      <div className="map-settings-theme-part">
        <h2>Theme</h2>

        {isThemeEditing ? (
          activeColorKey ? (
            <section className="panel-block color-editor-screen">
              <h2>Color Editor</h2>
              <div className="color-editor-header">
                <p className="theme-active-label">Editing: {activeColorLabel}</p>
                <div className="theme-edit-actions">
                  <button
                    type="button"
                    className="theme-edit-done-btn"
                    onClick={clearColorPickerState}
                  >
                    Done
                  </button>
                </div>
              </div>

              <ColorPicker
                currentColor={editorColor}
                suggestedColors={editorChoices.suggestedColors}
                moreColors={editorChoices.moreColors}
                onChange={(color: string) => handleThemeColorChange(editorKey, color)}
                onResetColor={() => handleResetSingleColor(editorKey)}
                canResetColor={canResetEditorColor}
              />
            </section>
          ) : (
            <ThemeColorEditor
              activeColorLabel={activeColorLabel}
              hasCustomColors={hasCustomColors}
              onResetAllColors={handleResetThemeColors}
              onDone={handleDoneThemeEditor}
              colorTargets={colorTargets}
              onTargetSelect={handleSwatchClick}
            />
          )
        ) : (
          <ThemeSummarySection
            listRef={themeListRef}
            themeOptions={availableThemeOptions}
            selectedThemeId={activeThemeOptionId ?? ""}
            selectedThemeOption={summaryThemeOption}
            onThemeSelect={handleThemeSelect}
            onThemeAction={handleThemeAction}
            onDeleteCustomTheme={handleDeleteCustomTheme}
            resolvePreviewTheme={resolvePreviewTheme}
            onSelectDesign={(design) => {
              if (onFontChange) {
                onFontChange(design.fontFamily);
              }
            }}
          />
        )}
      </div>

      <div className="map-settings-layout-part">
        <div className="layout-summary-head">
          <div className="layout-summary-copy">
            <p className="layout-summary-label">
              LAYOUT:{" "}
              <span className="layout-summary-label-name">
                {selectedLayoutOption.name}
              </span>
            </p>
            <p className="layout-summary-description">
              {selectedLayoutDescription}
            </p>
          </div>
          {isLayoutEditing ? (
            <button
              type="button"
              className="theme-customize-btn"
              onClick={handleDoneLayoutEditor}
              aria-label="Done editing layout"
            >
              <span className="theme-customize-icon" aria-hidden="true">
                <CheckIcon />
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="theme-customize-btn"
              onClick={handleOpenLayoutEditor}
              aria-label="Customize layout size"
            >
              <span className="theme-customize-icon" aria-hidden="true">
                <EditIcon />
              </span>
            </button>
          )}
        </div>


        {isLayoutEditing ? (
          <div className="layout-custom-editor">
            <MapDimensionFields
              form={form}
              minPosterCm={minPosterCm}
              maxPosterCm={maxPosterCm}
              onChange={onChange}
              onNumericFieldBlur={onNumericFieldBlur}
              showDistanceField={false}
            />
          </div>
        ) : (
          <div className="layout-inline-groups" ref={layoutGroupsRef}>
            <div className="layout-category-tabs" role="tablist" aria-label="Layout Categories">
              <button
                type="button"
                role="tab"
                aria-selected={activeLayoutTab === "print"}
                className={`layout-category-tab${activeLayoutTab === "print" ? " is-active" : ""}`}
                onClick={() => setActiveLayoutTab("print")}
              >
                Print
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLayoutTab === "frame"}
                className={`layout-category-tab${activeLayoutTab === "frame" ? " is-active" : ""}`}
                onClick={() => setActiveLayoutTab("frame")}
              >
                Frame
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLayoutTab === "wallpaper"}
                className={`layout-category-tab${activeLayoutTab === "wallpaper" ? " is-active" : ""}`}
                onClick={() => setActiveLayoutTab("wallpaper")}
              >
                Wallpaper
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLayoutTab === "social"}
                className={`layout-category-tab${activeLayoutTab === "social" ? " is-active" : ""}`}
                onClick={() => setActiveLayoutTab("social")}
              >
                Social
              </button>
            </div>

            {activeLayoutTab === "print" && (
              <section className="layout-inline-group" data-layout-group="print">
                <div className="layout-subhead-row">
                  <h3>Portrait Formats (Small to Large)</h3>
                </div>
                <div className="layout-inline-list card-scroll-list">
                  {printPortraitLayouts.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
                <div className="layout-subhead-row" style={{ marginTop: "14px" }}>
                  <h3>Landscape Formats (Small to Large)</h3>
                </div>
                <div className="layout-inline-list card-scroll-list">
                  {printLandscapeLayouts.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {activeLayoutTab === "frame" && (
              <section className="layout-inline-group frame-layout-group" aria-label="Frame layouts">
                <div className="layout-subhead-row">
                  <h3>Portrait Compositions</h3>
                </div>
                <div className="layout-inline-list card-scroll-list frame-paper-layout-list">
                  {framePortraitLayouts.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
                <div className="layout-subhead-row" style={{ marginTop: "14px" }}>
                  <h3>Landscape Compositions</h3>
                </div>
                <div className="layout-inline-list card-scroll-list frame-paper-layout-list">
                  {frameLandscapeLayouts.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
                <div className="frame-layout-style-section">
                  <h4 className="frame-layout-subheading">Frame Styles</h4>
                  <p className="frame-layout-help">Choose a frame style for your poster.</p>
                  <div className="frame-layout-grid">
                    {[
                      ["classic", "Classic"], ["left", "Left"], ["right", "Right"], ["center", "Center"],
                      ["dark", "Dark"], ["box", "Box"], ["full-map", "Full Map"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`frame-layout-option${(form.frameLayout ?? "none") === id ? " is-selected" : ""}`}
                        aria-pressed={(form.frameLayout ?? "none") === id}
                        onClick={() => handleFrameLayoutSelectInline(id)}
                      >
                        <span className={`frame-layout-swatch frame-layout-swatch--${id}`} aria-hidden="true">
                          <i /><b /><em />
                        </span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <MinimapControls />
              </section>
            )}

            {activeLayoutTab === "wallpaper" && (
              <section className="layout-inline-group" data-layout-group="wallpaper">
                <div className="layout-subhead-row">
                  <h3>Phone & Tablet (Portrait)</h3>
                </div>
                <div className="layout-inline-list card-scroll-list">
                  {wallpaperPortraitLayouts.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
                <div className="layout-subhead-row" style={{ marginTop: "14px" }}>
                  <h3>Desktop & Ultrawide (Landscape)</h3>
                </div>
                <div className="layout-inline-list card-scroll-list">
                  {wallpaperLandscapeLayouts.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {activeLayoutTab === "social" && (
              <section className="layout-inline-group" data-layout-group="social">
                <div className="layout-subhead-row">
                  <h3>Social Media & Web (Small to Large)</h3>
                </div>
                <div className="layout-inline-list card-scroll-list">
                  {socialLayouts.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


