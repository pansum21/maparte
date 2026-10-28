import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/shared/ui/Icons";
import {
  WALL_CATEGORIES,
  type WallCategory,
  type CustomGradientConfig,
} from "../domain/backdropThemes";
import { useBackdropTheme } from "../application/useBackdropTheme";

interface BackdropThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterCinema?: () => void;
}

const DESIGNER_SWATCHES = [
  { name: "Alabaster White", hex: "#edeae0" },
  { name: "Swiss Coffee", hex: "#f1ede2" },
  { name: "Evergreen Fog", hex: "#5c675b" },
  { name: "Nordic Slate", hex: "#2f3e46" },
  { name: "Hale Navy", hex: "#1b263b" },
  { name: "Tricorn Black", hex: "#09090b" },
  { name: "Terracotta Rust", hex: "#b85d43" },
  { name: "Pale Oak Greige", hex: "#dfdad1" },
  { name: "Warm Ochre", hex: "#c5a059" },
  { name: "Charcoal Loft", hex: "#334155" },
  { name: "Walnut Slat", hex: "#3d2314" },
  { name: "Natural Birch", hex: "#c9a87c" },
];

function sanitizeHex(val?: string): string {
  if (!val) return "#1e293b";
  const clean = val.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return "#1e293b";
}

type WallTone = "dark" | "mid-dark" | "mid-light" | "light";

const WALL_TONE_ORDER: WallTone[] = ["dark", "mid-dark", "mid-light", "light"];
const WALL_TONE_LABELS: Record<WallTone, string> = {
  dark: "Dark",
  "mid-dark": "Mid-Dark",
  "mid-light": "Mid-Light",
  light: "Light",
};

function getWallTone(hex: string): WallTone {
  const normalized = sanitizeHex(hex).slice(1);
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  if (luminance < 0.12) return "dark";
  if (luminance < 0.30) return "mid-dark";
  if (luminance < 0.60) return "mid-light";
  return "light";
}

const WALL_SEO_DESCRIPTION =
  "Preview your framed map poster against 64 interior paint tones inspired by Scandinavian neutrals, USA and Europe designer palettes, and timber walls, or customize a wall color with real-time preview.";

export default function BackdropThemeModal({
  isOpen,
  onClose,
}: BackdropThemeModalProps) {
  const {
    backdropState,
    presets,
    selectPreset,
    updateCustomGradient,
    resetToDefault,
  } = useBackdropTheme();

  // Tab 1: "solid" (Wall Color - DEFAULT)
  // Tab 2: "gradient" (Gradient Wall / Shaded Room Lighting)
  const [activeTab, setActiveTab] = useState<"solid" | "gradient">("solid");

  const [selectedCategory, setSelectedCategory] = useState<WallCategory>("all");
  const [showWallInfo, setShowWallInfo] = useState(false);

  // Keep a local draft for smooth slider dragging and text inputs
  const [customDraft, setCustomDraft] = useState<CustomGradientConfig>(
    backdropState.custom,
  );

  // Sync draft when backdropState changes externally
  useEffect(() => {
    setCustomDraft(backdropState.custom);
  }, [backdropState.custom]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Keep wall colors grouped from darkest to lightest within the selected category.
  const filteredPresets = useMemo(() => {
    return presets.filter((preset) => {
      const matchesCategory =
        selectedCategory === "all" || preset.category === selectedCategory;
      if (!matchesCategory) return false;

      return true;
    }).sort((a, b) => {
      const toneDifference = WALL_TONE_ORDER.indexOf(getWallTone(a.hex)) - WALL_TONE_ORDER.indexOf(getWallTone(b.hex));
      return toneDifference || presets.indexOf(a) - presets.indexOf(b);
    });
  }, [presets, selectedCategory]);

  const groupedPresets = useMemo(
    () => WALL_TONE_ORDER.map((tone) => ({
      tone,
      presets: filteredPresets.filter((preset) => getWallTone(preset.hex) === tone),
    })).filter((group) => group.presets.length > 0),
    [filteredPresets],
  );

  const selectedPreset = presets.find((preset) => preset.id === backdropState.presetId);

  // Real-time auto-saving custom updater
  const handleUpdateField = useCallback(
    (field: keyof CustomGradientConfig, value: string | number) => {
      setCustomDraft((prev) => {
        const next = { ...prev, [field]: value };
        // Immediately persist to DOM and localStorage
        updateCustomGradient({ [field]: value });
        return next;
      });
    },
    [updateCustomGradient],
  );

  // Solid paint handler: updates both colors with subtle natural room depth
  const handleSolidColorChange = useCallback(
    (hex: string) => {
      const next: CustomGradientConfig = {
        color1: hex,
        color2: hex,
        angle: 180,
      };
      setCustomDraft(next);
      updateCustomGradient(next);
    },
    [updateCustomGradient],
  );

  const handlePickDesignerSwatch = useCallback(
    (hex: string) => {
      handleSolidColorChange(hex);
    },
    [handleSolidColorChange],
  );

  if (!isOpen) return null;

  return createPortal(
    <div
      className="export-modal-backdrop backdrop-theme-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="export-modal backdrop-theme-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Wall Color"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="backdrop-modal-header">
          <div className="backdrop-modal-heading-row">
            <div className="backdrop-modal-heading-copy">
              <div className="backdrop-modal-title-wrap">
                <h2 className="backdrop-modal-title">Wall Mockup</h2>
                <div className="backdrop-nav-tabs" role="tablist" aria-label="Wall options">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "solid"}
                    className={`backdrop-nav-tab ${activeTab === "solid" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("solid")}
                  >
                    🎨 Wall Color
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "gradient"}
                    className={`backdrop-nav-tab ${activeTab === "gradient" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("gradient")}
                  >
                    🌈 Gradient Wall
                  </button>
                </div>
              </div>
              <span className="backdrop-selected-wall-name">
                {activeTab === "solid"
                  ? "Solid Wall Paint & Designer Swatches"
                  : selectedPreset?.name ?? "Shaded Room Lighting"}
              </span>
              <p className="backdrop-selected-wall-desc">
                {activeTab === "solid"
                  ? "Choose a curated designer swatch or pick any custom solid wall color with real-time preview."
                  : "Preview against 64 shaded room lighting presets or mix a custom lighting gradient."}
              </p>
            </div>
            <div className="backdrop-modal-actions">
              <button
                type="button"
                className="backdrop-info-button backdrop-wall-info-button"
                aria-label="About wall color preview"
                aria-expanded={showWallInfo}
                aria-controls="wall-color-seo-description"
                onClick={() => setShowWallInfo((visible) => !visible)}
              >
                i
              </button>
            </div>
          </div>
          <p className="backdrop-seo-description" id="wall-color-seo-description" hidden={!showWallInfo}>
            {WALL_SEO_DESCRIPTION}
          </p>
          <span className="backdrop-seo-copy">{WALL_SEO_DESCRIPTION}</span>
        </div>

        {activeTab === "solid" ? (
          <div className="backdrop-custom-mixer">
            {/* Live Backdrop Preview */}
            <div className="mixer-preview-box">
              <div className="mixer-preview-header">
                <span className="mixer-preview-label">Live Wall Color Preview</span>
                <span className="mixer-autosave-badge">
                  <span className="autosave-dot" /> Auto-saved in real time
                </span>
              </div>
              <div
                className="mixer-preview-swatch"
                style={{
                  background: customDraft.color1,
                }}
              />
            </div>

            {/* Quick Designer Swatches */}
            <div className="mixer-quick-swatches">
              <label className="mixer-label">Quick Designer Wall Paint Presets:</label>
              <div className="mixer-swatches-grid">
                {DESIGNER_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    type="button"
                    className="mixer-swatch-chip"
                    onClick={() => handlePickDesignerSwatch(swatch.hex)}
                    title={`${swatch.name} (${swatch.hex})`}
                  >
                    <span
                      className="swatch-color-dot"
                      style={{ background: swatch.hex }}
                    />
                    <span className="swatch-name">{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pick Solid Color */}
            <div className="mixer-controls-grid mixer-controls-solid">
              <div className="mixer-control-group">
                <label className="mixer-label">Pick Wall Paint Color</label>
                <div className="mixer-color-input-wrap">
                  <input
                    type="color"
                    className="mixer-color-picker"
                    value={sanitizeHex(customDraft.color1)}
                    onChange={(e) => handleSolidColorChange(e.target.value)}
                  />
                  <input
                    type="text"
                    className="mixer-hex-input"
                    value={customDraft.color1}
                    onChange={(e) => handleSolidColorChange(e.target.value)}
                    placeholder="#1e293b"
                  />
                </div>
                <span className="mixer-input-hint">
                  Choose any wall tone. Changes apply to the background instantly and stay saved permanently.
                </span>
              </div>
            </div>

            <div className="mixer-actions-row">
              <button
                type="button"
                className="mixer-apply-btn"
                onClick={() => {
                  handleSolidColorChange(customDraft.color1);
                  onClose();
                }}
              >
                ✓ Set Wall Color &amp; Close
              </button>
            </div>
          </div>
        ) : (
          <div className="backdrop-custom-mixer">
            {/* Live Backdrop Preview */}
            <div className="mixer-preview-box">
              <div className="mixer-preview-header">
                <span className="mixer-preview-label">Live Gradient &amp; Room Lighting Preview</span>
                <span className="mixer-autosave-badge">
                  <span className="autosave-dot" /> Auto-saved in real time
                </span>
              </div>
              <div
                className="mixer-preview-swatch"
                style={{
                  background:
                    backdropState.type === "preset" && selectedPreset
                      ? selectedPreset.previewGradient
                      : `linear-gradient(${customDraft.angle}deg, ${customDraft.color1} 0%, ${customDraft.color2} 100%)`,
                }}
              />
            </div>

            {/* Mixer Controls for 2-color lighting */}
            <div className="mixer-controls-grid">
              <div className="mixer-control-group">
                <label className="mixer-label">Top / Primary Color</label>
                <div className="mixer-color-input-wrap">
                  <input
                    type="color"
                    className="mixer-color-picker"
                    value={sanitizeHex(customDraft.color1)}
                    onChange={(e) =>
                      handleUpdateField("color1", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    className="mixer-hex-input"
                    value={customDraft.color1}
                    onChange={(e) =>
                      handleUpdateField("color1", e.target.value)
                    }
                    placeholder="#1e293b"
                  />
                </div>
              </div>

              <div className="mixer-control-group">
                <label className="mixer-label">Bottom / Accent Color</label>
                <div className="mixer-color-input-wrap">
                  <input
                    type="color"
                    className="mixer-color-picker"
                    value={sanitizeHex(customDraft.color2)}
                    onChange={(e) =>
                      handleUpdateField("color2", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    className="mixer-hex-input"
                    value={customDraft.color2}
                    onChange={(e) =>
                      handleUpdateField("color2", e.target.value)
                    }
                    placeholder="#0f172a"
                  />
                </div>
              </div>

              <div className="mixer-control-group mixer-angle-group">
                <div className="mixer-angle-header">
                  <label className="mixer-label">Light Source Angle</label>
                  <span className="mixer-angle-val">{customDraft.angle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  className="mixer-range-slider"
                  value={customDraft.angle}
                  onChange={(e) =>
                    handleUpdateField("angle", Number(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Presets section under Shaded Room Lighting */}
            <div className="backdrop-presets-section">
              <div className="backdrop-presets-section-header">
                <label className="mixer-label">Shaded Room Lighting Presets:</label>
              </div>
              <div className="backdrop-filter-section">
                <div className="backdrop-categories-scroll">
                  {WALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`backdrop-category-pill ${selectedCategory === cat.id ? "is-active" : ""}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <span className="cat-label">{cat.label}</span>
                      <span className="cat-count">{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredPresets.length === 0 ? (
                <div className="backdrop-empty-state">
                  <p>No wall colors found in this group.</p>
                  <button
                    type="button"
                    className="backdrop-reset-btn"
                    onClick={() => setSelectedCategory("all")}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="backdrop-tone-groups">
                  {groupedPresets.map(({ tone, presets: tonePresets }) => (
                    <section className="backdrop-tone-group" key={tone} aria-label={`${WALL_TONE_LABELS[tone]} wall colors`}>
                      <h3 className="backdrop-tone-heading">{WALL_TONE_LABELS[tone]}</h3>
                      <div className="backdrop-presets-grid">
                        {tonePresets.map((preset) => {
                          const isSelected =
                            backdropState.type === "preset" && backdropState.presetId === preset.id;
                          return (
                            <div
                              key={preset.id}
                              role="button"
                              tabIndex={0}
                              aria-pressed={isSelected}
                              className={`backdrop-preset-card ${isSelected ? "is-selected" : ""}`}
                              onClick={() => selectPreset(preset.id)}
                              onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  selectPreset(preset.id);
                                }
                              }}
                            >
                              <div
                                className="backdrop-swatch"
                                style={{ background: preset.previewGradient }}
                              >
                                {isSelected && (
                                  <span className="backdrop-selected-pill">
                                    <CheckIcon /> Active Wall
                                  </span>
                                )}
                                <span className="backdrop-swatch-hex">{preset.hex}</span>
                              </div>
                              <div className="backdrop-card-info">
                                <span className="backdrop-preset-name" title={preset.name}>
                                  {preset.name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="backdrop-modal-footer">
          <button
            type="button"
            className="backdrop-reset-btn"
            onClick={resetToDefault}
          >
            Reset to Default Wall Color
          </button>
          <button
            type="button"
            className="backdrop-done-preview-btn"
            onClick={onClose}
          >
            ✓ Done &amp; Back to Preview
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
