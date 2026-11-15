import type { ThemeOption, ResolvedTheme } from "../domain/types";
import "./themeMapPreview.css";

interface ThemeCardProps {
  themeOption: ThemeOption | null;
  onClick?: () => void;
  isSelected?: boolean;
  previewTheme: ResolvedTheme;
}

export default function ThemeCard({
  themeOption,
  onClick,
  isSelected = false,
  previewTheme,
}: ThemeCardProps) {
  if (!themeOption) return null;

  const isCustomTheme = themeOption.id.startsWith("custom-theme-");
  const className = [
    "theme-card",
    isSelected ? "is-selected" : "",
    isCustomTheme ? "theme-card--palette" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={themeOption.name}
    >
      {isCustomTheme ? (
        <div className="theme-card-palette-preview" aria-hidden="true">
          <span style={{ backgroundColor: previewTheme.map.land }} />
          <span style={{ backgroundColor: previewTheme.map.water }} />
          <span style={{ backgroundColor: previewTheme.map.parks }} />
          <span style={{ backgroundColor: previewTheme.map.roads.major }} />
          <span style={{ backgroundColor: previewTheme.map.roads.minor_mid }} />
        </div>
      ) : (
        <img
          className="theme-card-map-image"
          src={`/theme-previews/${themeOption.id}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
      <span className="theme-card-name-shadow" aria-hidden="true" />
      <p className="theme-card-name">{themeOption.name}</p>
    </button>
  );
}
