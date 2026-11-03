import type { RefObject } from "react";
import ThemeCard from "./ThemeCard";
import type { ThemeOption } from "../domain/types";

interface ThemeSummarySectionProps {
  listRef?: RefObject<HTMLDivElement>;
  themeOptions: ThemeOption[];
  selectedThemeId: string;
  selectedThemeOption: ThemeOption;
  onThemeSelect: (themeId: string) => void;
  onCustomize?: () => void;
  onSelectDesign?: (design: any) => void;
}

export default function ThemeSummarySection({
  listRef,
  themeOptions,
  selectedThemeId,
  selectedThemeOption,
  onThemeSelect,
}: ThemeSummarySectionProps) {
  const description =
    selectedThemeOption.description?.trim() || "No description available.";

  return (
    <div className="theme-summary-view">
      {/* Clean Theme Summary Header */}
      <div className="theme-summary-head">
        <div className="theme-summary-copy">
          <p className="theme-summary-label">
            Palette: <span className="theme-summary-label-name">{selectedThemeOption.name}</span>
          </p>
          <p className="theme-card-description">{description}</p>
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
