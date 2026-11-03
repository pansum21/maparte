import { useState } from "react";
import { POPULAR_DESIGNS, type PopularDesign } from "../domain/popularDesigns";
import "./popularDesigns.css";

interface PopularDesignsGridProps {
  selectedThemeId: string;
  onSelectDesign: (design: PopularDesign) => void;
  onOpenColorPalette?: () => void;
}

export default function PopularDesignsGrid({
  selectedThemeId,
  onSelectDesign,
  onOpenColorPalette,
}: PopularDesignsGridProps) {
  const [activeDesignId, setActiveDesignId] = useState<string>(() => {
    const match = POPULAR_DESIGNS.find((d) => d.themeId === selectedThemeId);
    return match ? match.id : "modern";
  });

  const handleCardClick = (design: PopularDesign) => {
    setActiveDesignId(design.id);
    onSelectDesign(design);
  };

  return (
    <div className="popular-designs-section">
      <div className="popular-designs-header">
        <h3 className="popular-designs-title">MOST POPULAR DESIGNS</h3>
        <p className="popular-designs-subtitle">
          1-click curated combinations of palette, typography and layout.
        </p>
      </div>

      <div className="popular-designs-grid" role="radiogroup" aria-label="Most popular designs">
        {POPULAR_DESIGNS.map((design) => {
          const isSelected = activeDesignId === design.id;
          return (
            <button
              key={design.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`popular-design-card${isSelected ? " is-selected" : ""}`}
              onClick={() => handleCardClick(design)}
              title={`${design.name}: ${design.description}`}
            >
              {design.badge ? (
                <span className={`popular-design-badge badge-${design.badge.toLowerCase().replace(/\s+/g, "-")}`}>
                  {design.badge}
                </span>
              ) : null}

              {/* Visual Mini Map Art Poster Preview */}
              <div
                className="popular-design-preview"
                style={{ backgroundColor: design.bgPreview }}
              >
                <svg
                  className="popular-design-vector"
                  viewBox="0 0 100 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Subtle water area */}
                  <path
                    d="M 60 0 C 70 30, 65 60, 85 90 C 95 105, 100 120, 100 120 L 100 0 Z"
                    fill={design.accentPreview}
                    fillOpacity="0.22"
                  />
                  {/* Road network curves */}
                  <path
                    d="M 0 35 Q 45 40 100 25"
                    stroke={design.accentPreview}
                    strokeWidth="2.5"
                    strokeOpacity="0.85"
                  />
                  <path
                    d="M 0 85 Q 50 75 100 95"
                    stroke={design.accentPreview}
                    strokeWidth="2.2"
                    strokeOpacity="0.75"
                  />
                  <path
                    d="M 35 0 Q 40 60 25 120"
                    stroke={design.accentPreview}
                    strokeWidth="3.2"
                    strokeOpacity="0.9"
                  />
                  <path
                    d="M 68 0 Q 60 55 75 120"
                    stroke={design.accentPreview}
                    strokeWidth="2.4"
                    strokeOpacity="0.75"
                  />
                  {/* Secondary grid lines */}
                  <path
                    d="M 10 10 L 90 110 M 15 110 L 85 10 M 0 60 L 100 60"
                    stroke={design.accentPreview}
                    strokeWidth="1"
                    strokeOpacity="0.45"
                    strokeDasharray="3 3"
                  />
                  {/* Mini Poster Title Label */}
                  <rect x="20" y="98" width="60" height="14" rx="2" fill={design.bgPreview} fillOpacity="0.92" />
                  <text
                    x="50"
                    y="108"
                    textAnchor="middle"
                    fill={design.textColor}
                    fontSize="6"
                    fontWeight="700"
                    letterSpacing="1"
                    fontFamily="serif"
                  >
                    STOCKHOLM
                  </text>
                </svg>
              </div>

              <span className="popular-design-name" style={{ color: design.textColor }}>
                {design.name}
              </span>
            </button>
          );
        })}

        {/* 1-Click "Customize & All Colors" Card */}
        {onOpenColorPalette ? (
          <button
            type="button"
            className="popular-design-card popular-design-card--customize"
            onClick={onOpenColorPalette}
            title="Browse all 28+ custom color palettes"
          >
            <div className="popular-design-preview customize-preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24" aria-hidden="true">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </div>
            <span className="popular-design-name">Customize</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
