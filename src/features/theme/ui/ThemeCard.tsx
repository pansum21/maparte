import {
  type ThemeOption,
  type ResolvedTheme,
} from "../domain/types";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import ThemeMapPreview from "./ThemeMapPreview";

interface ThemeCardProps {
  themeOption: ThemeOption | null;
  onClick?: () => void;
  isSelected?: boolean;
  previewTheme: ResolvedTheme;
  previewCenter: [lon: number, lat: number];
  previewZoom: number;
  mapOptions: Parameters<typeof generateMapStyle>[1];
}

export default function ThemeCard({
  themeOption,
  onClick,
  isSelected = false,
  previewTheme,
  previewCenter,
  previewZoom,
  mapOptions,
}: ThemeCardProps) {
  if (!themeOption) {
    return null;
  }

  const className = ["theme-card", isSelected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={themeOption.name}
    >
      <ThemeMapPreview
        theme={previewTheme}
        center={previewCenter}
        zoom={previewZoom}
        mapOptions={mapOptions}
      />
      <span className="theme-card-name-shadow" aria-hidden="true" />
      <p className="theme-card-name">{themeOption.name}</p>
    </button>
  );
}
