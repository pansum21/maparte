import { useEffect, useState, type RefObject } from "react";
import ThemeCard from "./ThemeCard";
import { EditIcon, TrashIcon } from "@/shared/ui/Icons";
import type { ThemeOption } from "../domain/types";

interface ThemeSummarySectionProps {
  listRef?: RefObject<HTMLDivElement>;
  themeOptions: ThemeOption[];
  selectedThemeId: string;
  selectedThemeOption: ThemeOption;
  onThemeSelect: (themeId: string) => void;
  onThemeAction?: () => void;
  actionLabel: "Create New Theme" | "Customize Colors";
  onDeleteCustomTheme?: (themeId: string) => void;
}

export default function ThemeSummarySection({
  listRef,
  themeOptions,
  selectedThemeId,
  selectedThemeOption,
  onThemeSelect,
  onThemeAction,
  actionLabel,
  onDeleteCustomTheme,
}: ThemeSummarySectionProps) {
  const [activeGroup, setActiveGroup] = useState<"maparte" | "yours">("maparte");
  const description =
    selectedThemeOption.description?.trim() || "No description available.";
  const builtInThemes = themeOptions.filter((theme) => !theme.id.startsWith("custom-theme-"));
  const customThemes = themeOptions.filter((theme) => theme.id.startsWith("custom-theme-"));
  const visibleThemes = activeGroup === "maparte" ? builtInThemes : customThemes;

  useEffect(() => {
    if (selectedThemeId.startsWith("custom-theme-")) setActiveGroup("yours");
  }, [selectedThemeId]);

  return (
    <div className="theme-summary-view">
      <div className="theme-summary-head">
        <div className="theme-summary-copy">
          <p className="theme-summary-label">
            Palette: <span className="theme-summary-label-name">{selectedThemeOption.name}</span>
          </p>
          <p className="theme-card-description">{description}</p>
        </div>
        <div className="theme-summary-actions">
          {onThemeAction && (
            <button
              type="button"
              className="theme-customize-btn theme-customize-btn--pill theme-create-btn"
              onClick={onThemeAction}
              aria-label={actionLabel}
            >
              <span className="theme-customize-icon" aria-hidden="true"><EditIcon /></span>
              <span className="theme-customize-text">{actionLabel}</span>
            </button>
          )}
        </div>
      </div>

      <div className="theme-group-tabs" role="tablist" aria-label="Theme collections">
        <button
          type="button"
          role="tab"
          aria-selected={activeGroup === "maparte"}
          className={activeGroup === "maparte" ? "is-active" : ""}
          onClick={() => setActiveGroup("maparte")}
        >
          MAPARTE THEME
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeGroup === "yours"}
          className={activeGroup === "yours" ? "is-active" : ""}
          onClick={() => setActiveGroup("yours")}
        >
          YOUR THEME <span>{customThemes.length}</span>
        </button>
      </div>

      {visibleThemes.length ? (
        <div
          className="theme-card-list card-scroll-list"
          role="list"
          aria-label={activeGroup === "maparte" ? "MAPARTE themes" : "Your themes"}
          ref={listRef}
        >
          {visibleThemes.map((themeOption) => (
            <div
              key={themeOption.id}
              className={`theme-card-item${activeGroup === "yours" ? " theme-card-item--custom" : ""}`}
              role="listitem"
            >
              <ThemeCard
                themeOption={themeOption}
                isSelected={themeOption.id === selectedThemeId}
                onClick={() => onThemeSelect(themeOption.id)}
              />
              {activeGroup === "yours" && onDeleteCustomTheme && (
                <button
                  type="button"
                  className="theme-card-delete-btn"
                  aria-label={`Delete ${themeOption.name}`}
                  title={`Delete ${themeOption.name}`}
                  onClick={() => onDeleteCustomTheme(themeOption.id)}
                >
                  <TrashIcon aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="theme-empty-state">No themes saved yet. Create a theme to add it here.</p>
      )}
    </div>
  );
}

