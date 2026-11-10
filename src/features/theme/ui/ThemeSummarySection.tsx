import type { RefObject } from "react";
import ThemeCard from "./ThemeCard";
import { EditIcon } from "@/shared/ui/Icons";
import type { ThemeOption } from "../domain/types";

interface ThemeSummarySectionProps {
  listRef?: RefObject<HTMLDivElement>;
  themeOptions: ThemeOption[];
  selectedThemeId: string;
  selectedThemeOption: ThemeOption;
  onThemeSelect: (themeId: string) => void;
  onCustomize?: () => void;
  onCreateCustomTheme?: () => void;
  onSelectDesign?: (design: any) => void;
}

export default function ThemeSummarySection({
  listRef,
  themeOptions,
  selectedThemeId,
  selectedThemeOption,
  onThemeSelect,
  onCustomize,
  onCreateCustomTheme,
}: ThemeSummarySectionProps) {
  const description =
    selectedThemeOption.description?.trim() || "No description available.";

  return (
    <div className="theme-summary-view">
      {/* Clean Theme Summary Header with Customize Button */}
      <div className="theme-summary-head">
        <div className="theme-summary-copy">
          <p className="theme-summary-label">
            Palette: <span className="theme-summary-label-name">{selectedThemeOption.name}</span>
          </p>
          <p className="theme-card-description">{description}</p>
        </div>
        <div className="theme-summary-actions">
          {onCreateCustomTheme && (
            <button
              type="button"
              className="theme-customize-btn theme-customize-btn--pill theme-create-btn"
              onClick={onCreateCustomTheme}
              aria-label="Create a new custom map theme"
            >
              <span className="theme-customize-text">Create new</span>
            </button>
          )}
          {onCustomize && (
            <button
              type="button"
              className="theme-customize-btn theme-customize-btn--pill"
              onClick={onCustomize}
              aria-label={`Customize ${selectedThemeOption.name} colors`}
            >
              <span className="theme-customize-icon" aria-hidden="true">
                <EditIcon />
              </span>
              <span className="theme-customize-text">Customize Colors</span>
            </button>
          )}
        </div>
      </div>

      {/* Curated Theme Options with Top Popular Designs First */}
      <div
        className="theme-card-list card-scroll-list"
        role="list"
        aria-label="Theme options"
        ref={listRef}
      >
        {themeOptions.map((themeOption) => (
          <ThemeCard
            key={themeOption.id}
            themeOption={themeOption}
            isSelected={themeOption.id === selectedThemeId}
            onClick={() => onThemeSelect(themeOption.id)}
          />
        ))}
      </div>
    </div>
  );
}

