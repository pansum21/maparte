import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, CheckIcon } from "@/shared/ui/Icons";
import {
  BACKDROP_PRESETS,
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

export default function BackdropThemeModal({
  isOpen,
  onClose,
  onEnterCinema,
}: BackdropThemeModalProps) {
  const {
    backdropState,
    presets,
    selectPreset,
    updateCustomGradient,
    resetToDefault,
  } = useBackdropTheme();

  const [activeTab, setActiveTab] = useState<"presets" | "custom">(
    backdropState.type === "custom" ? "custom" : "presets",
  );

  const [selectedCategory, setSelectedCategory] = useState<WallCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mixerMode, setMixerMode] = useState<"solid" | "gradient">("solid");

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

  // Filter presets by category and search
  const filteredPresets = useMemo(() => {
    return presets.filter((preset) => {
      const matchesCategory =
        selectedCategory === "all" || preset.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.hex.toLowerCase().includes(q)
      );
    });
  }, [presets, selectedCategory, searchQuery]);

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

  const isCustomActive = backdropState.type === "custom";

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
        aria-label="Room Wall Color & Preview Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="backdrop-modal-top-actions">
          <button
            type="button"
            className="backdrop-back-to-preview-btn"
            onClick={onClose}
            title="Back to Preview"
          >
            ← Back to Preview
          </button>
          <button
            type="button"
            className="export-modal-close"
            onClick={onClose}
            aria-label="Close wall color settings"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="backdrop-modal-header">
          <div className="backdrop-modal-badge-row">
            <div className="backdrop-modal-badge">
              <span>🏠 Room Wall Color Studio</span>
            </div>
          </div>
          <h2 className="backdrop-modal-title">Room Wall Color Preview</h2>
          <p className="backdrop-modal-sub">
            Preview your framed map poster against 64 authentic interior paint tones (Scandinavian neutrals, USA &amp; Europe designer palettes, timber slats) or mix your own custom wall paint with real-time auto-save.
          </p>
        </div>

        {/* Tab switch */}
        <div className="backdrop-tabs-row">
          <button
            type="button"
            className={`backdrop-tab-btn ${activeTab === "presets" ? "is-active" : ""}`}
            onClick={() => setActiveTab("presets")}
          >
            Curated Wall Colors (64)
          </button>
          <button
            type="button"
            className={`backdrop-tab-btn ${activeTab === "custom" ? "is-active" : ""}`}
            onClick={() => setActiveTab("custom")}
          >
            Custom Wall Paint Mixer
          </button>
        </div>

        {activeTab === "presets" ? (
          <div className="backdrop-presets-view">
            {/* Search and Category Filter */}
            <div className="backdrop-filter-section">
              <div className="backdrop-search-wrap">
                <input
                  type="text"
                  className="backdrop-search-input"
                  placeholder="Search 64 walls (e.g. Alabaster, Sage, Oak, Slate, Navy)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="backdrop-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Horizontal Category Filter Pills */}
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

            {/* Presets Grid */}
            {filteredPresets.length === 0 ? (
              <div className="backdrop-empty-state">
                <p>No wall colors found matching &ldquo;{searchQuery}&rdquo;</p>
                <button
                  type="button"
                  className="backdrop-reset-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="backdrop-presets-grid">
                {filteredPresets.map((preset) => {
                  const isSelected =
                    !isCustomActive && backdropState.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`backdrop-preset-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => selectPreset(preset.id)}
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
                        <div className="backdrop-card-title-row">
                          <span className="backdrop-preset-name">{preset.name}</span>
                          <span className={`backdrop-mode-badge mode--${preset.mode}`}>
                            {preset.mode === "light" ? "Light" : "Dark"}
                          </span>
                        </div>
                        <span className="backdrop-preset-desc">
                          {preset.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
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
                  background: `linear-gradient(${customDraft.angle}deg, ${customDraft.color1} 0%, ${customDraft.color2} 100%)`,
                }}
              />
            </div>

            {/* Mixer Sub-Mode (Solid vs Gradient) */}
            <div className="mixer-mode-toggle">
              <button
                type="button"
                className={`mixer-mode-btn ${mixerMode === "solid" ? "is-active" : ""}`}
                onClick={() => {
                  setMixerMode("solid");
                  handleSolidColorChange(customDraft.color1);
                }}
              >
                🎨 Solid Wall Paint
              </button>
              <button
                type="button"
                className={`mixer-mode-btn ${mixerMode === "gradient" ? "is-active" : ""}`}
                onClick={() => setMixerMode("gradient")}
              >
                🌈 Shaded Room Lighting
              </button>
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

            {/* Mixer Inputs */}
            {mixerMode === "solid" ? (
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
            ) : (
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
            )}

            <div className="mixer-actions-row">
              <button
                type="button"
                className="mixer-apply-btn"
                onClick={() => {
                  updateCustomGradient(customDraft);
                  onClose();
                }}
              >
                ✓ Set Wall Color &amp; Close
              </button>
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
