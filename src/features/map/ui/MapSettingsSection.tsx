import { useEffect, useMemo, useRef, useState } from "react";
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

const FALLBACK_COLOR = "#000000";

interface MapSettingsForm {
  theme: string;
  layout: string;
  width: string;
  height: string;
  distance: string;
  includeBuildings: boolean;
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
  const [activeThemeOptionId, setActiveThemeOptionId] = useState(form.theme);
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
    if (activeCustomTheme && activeCustomTheme.baseThemeId === form.theme) return;
    if (!activeCustomTheme && activeThemeOptionId === form.theme) return;
    setActiveThemeOptionId(form.theme);
  }, [activeCustomTheme, activeThemeOptionId, form.theme]);

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
      onThemeChange(customTheme.baseThemeId);
      for (const key of DISPLAY_PALETTE_KEYS) {
        const color = customTheme.colors[key];
        if (color) onColorChange(key, color);
      }
    } else {
      onThemeChange(themeId);
    }
    setActiveThemeOptionId(themeId);
    clearColorPickerState();
  }

  function handleCreateCustomTheme() {
    const colors = Object.fromEntries(
      DISPLAY_PALETTE_KEYS.map((key, index) => [key, currentThemePalette[index] ?? FALLBACK_COLOR]),
    ) as SavedCustomTheme["colors"];
    const customTheme: SavedCustomTheme = {
      id: `custom-theme-${Date.now()}`,
      name: `My Custom Theme ${savedCustomThemes.length + 1}`,
      description: "Your saved map color palette.",
      baseThemeId: activeCustomTheme?.baseThemeId ?? form.theme,
      palette: [...currentThemePalette],
      colors,
    };

    setSavedCustomThemes((current) => [...current, customTheme]);
    onThemeChange(customTheme.baseThemeId);
    for (const [key, color] of Object.entries(customTheme.colors)) {
      if (color) onColorChange(key, color);
    }
    setActiveThemeOptionId(customTheme.id);
    setIsThemeEditing(true);
    clearColorPickerState();
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
    onLayoutChange(form.layout === layoutId ? "print_a4_portrait" : layoutId);
    setIsLayoutEditing(false);
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

  function handleOpenThemeEditor() {
    setIsThemeEditing(true);
    clearColorPickerState();
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
    onResetColors();
    if (activeCustomTheme) {
      const colors = Object.fromEntries(DISPLAY_PALETTE_KEYS.map((key) => [
        key,
        normalizeHexColor(getThemeColorByPath(selectedTheme, key)) || FALLBACK_COLOR,
      ])) as SavedCustomTheme["colors"];
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
    const seedPalette = DISPLAY_PALETTE_KEYS.map(
      (key) =>
        normalizeHexColor(getThemeColorByPath(selectedTheme, key)) ||
        normalizeHexColor(currentThemePalette[0]) ||
        "",
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
        const original = normalizeHexColor(getThemeColorByPath(selectedTheme, key));
        return override !== original;
      }),
    [customColors, selectedTheme],
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
    normalizeHexColor(getThemeColorByPath(selectedTheme, editorKey)) ||
    normalizeHexColor(currentThemePalette[0]) ||
    "";
  const normalizedEditorColor = normalizeHexColor(editorColor) || "";
  const canResetEditorColor = Boolean(
    originalEditorColor &&
      normalizedEditorColor &&
      originalEditorColor !== normalizedEditorColor,
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
            selectedThemeId={activeThemeOptionId}
            selectedThemeOption={summaryThemeOption}
            onThemeSelect={handleThemeSelect}
            onCustomize={handleOpenThemeEditor}
            onCreateCustomTheme={handleCreateCustomTheme}
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
            {layoutGroups.map((group) => (
              <section key={group.id} className="layout-inline-group" data-layout-group={group.id}>
                <h3>{group.name}</h3>
                <div className="layout-inline-list card-scroll-list">
                  {group.options.map((layoutOption) => (
                    <LayoutCard
                      key={layoutOption.id}
                      layoutOption={layoutOption}
                      isSelected={layoutOption.id === form.layout}
                      onClick={() => handleLayoutSelectInline(layoutOption.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
