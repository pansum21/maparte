import type { RefObject } from "react";
import ThemeCard from "./ThemeCard";
import { EditIcon } from "@/shared/ui/Icons";
import type { ThemeOption } from "../domain/types";
import PopularDesignsGrid from "./PopularDesignsGrid";
import type { PopularDesign } from "../domain/popularDesigns";

interface ThemeSummarySectionProps {
  listRef?: RefObject<HTMLDivElement>;
  themeOptions: ThemeOption[];
  selectedThemeId: string;
  selectedThemeOption: ThemeOption;
  onThemeSelect: (themeId: string) => void;
  onCustomize: () => void;
  onSelectDesign?: (design: PopularDesign) => void;
}

export default function ThemeSummarySection({
  listRef,
  themeOptions,
  selectedThemeId,
  selectedThemeOption,
  onThemeSelect,
  onCustomize,
  onSelectDesign,
}: ThemeSummarySectionProps) {
  const description =
    selectedThemeOption.description?.trim() || "No description available.";

  const handlePopularDesignSelect = (design: PopularDesign) => {
    onThemeSelect(design.themeId);
    onSelectDesign?.(design);
  };

  return (
    <div className="theme-summary-view">
      {/* 1. Most Popular Designs (1-Click Curated Style Combos) */}
      <PopularDesignsGrid
        selectedThemeId={selectedThemeId}
        onSelectDesign={handlePopularDesignSelect}
        onOpenColorPalette={onCustomize}
      />

      {/* 2. All Color Themes Section */}
      <div className="theme-summary-head">
        <div className="theme-summary-copy">
          <p className="theme-summary-label">
            Palette: <span className="theme-summary-label-name">{selectedThemeOption.name}</span>
          </p>
          <p className="theme-card-description">{description}</p>
        </div>
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
      </div>

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
