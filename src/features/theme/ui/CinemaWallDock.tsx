import { useEffect, useRef, useState } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { layoutGroups, getLayoutOption } from "@/features/layout/infrastructure/layoutRepository";
import { formatLayoutCm } from "@/features/layout/domain/layoutMatcher";
import { LayoutIcon } from "@/shared/ui/Icons";

interface Placement {
  x: number;
  y: number;
  scale: number;
}

interface CinemaWallDockProps {
  onExit: () => void;
  onWallPhotoChange: (photo: string | null) => void;
  hasWallPhoto: boolean;
  placement: Placement;
  onPlacementChange: (placement: Placement) => void;
}

type ActivePanel = "adjust" | "layout" | null;

function stepRangeValue(value: number, delta: number, min: number, max: number, step: number) {
  const stepsFromMin = Math.round((value - min) / step) + delta;
  return Math.min(max, Math.max(min, Number((min + stepsFromMin * step).toFixed(2))));
}

export default function CinemaWallDock({
  onExit,
  onWallPhotoChange,
  hasWallPhoto,
  placement,
  onPlacementChange,
}: CinemaWallDockProps) {
  const { state, dispatch } = usePosterContext();
  const { form } = state;
  const cityName = form.displayCity || form.location || "Custom City";
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close open panel on ESC key first before exiting cinema mode
  useEffect(() => {
    if (!activePanel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        setActivePanel(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [activePanel]);

  const handleWallPhoto = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    // Explicitly guarantee no panel is opened or remains open
    setActivePanel(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onWallPhotoChange(reader.result);
        setActivePanel(null);
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        // Auto re-engage browser fullscreen after file picker dialog closes
        if (
          typeof document !== "undefined" &&
          document.documentElement.requestFullscreen &&
          !document.fullscreenElement
        ) {
          void document.documentElement.requestFullscreen().catch(() => {});
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWallPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWallPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setActivePanel(null);
  };

  const adjustPlacement = (
    key: keyof Placement,
    delta: number,
    min: number,
    max: number,
    step: number,
  ) => {
    onPlacementChange({
      ...placement,
      [key]: stepRangeValue(placement[key], delta, min, max, step),
    });
  };

  const handleToggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      className="cinema-overlay-controls"
      role="region"
      aria-label="Fullscreen Wall Preview Controls"
    >
      {/* Click-outside backdrop scrim to dismiss any open popover (100% transparent, ZERO blur) */}
      {activePanel !== null && (
        <div
          className="cinema-backdrop-scrim"
          aria-hidden="true"
          onClick={(e) => {
            e.stopPropagation();
            setActivePanel(null);
          }}
        />
      )}

      {/* Top Bar - Center Title Badge */}
      <div className="cinema-top-bar-center">
        <div className="cinema-center-view-badge">
          <span className="cinema-center-icon" aria-hidden="true">
            🖼️
          </span>
          <span className="cinema-center-title">Room Wall View</span>
          <span className="cinema-center-sep">•</span>
          <span className="cinema-center-city">{cityName}</span>
        </div>
      </div>

      {/* Top Bar - Right Action Buttons */}
      <div className="cinema-top-bar-right">
        <button
          type="button"
          className="cinema-top-fs-btn"
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen without Browser Tabs (F11)"
          aria-label="Toggle Fullscreen"
        >
          <span className="cinema-fs-icon" aria-hidden="true">
            ⛶
          </span>
          <span className="cinema-fs-text">Fullscreen</span>
          <kbd className="cinema-esc-kbd">F11</kbd>
        </button>

        <button
          type="button"
          className="cinema-top-exit-btn"
          onClick={onExit}
          title="Exit Fullscreen Wall View & Back to Editor (Esc)"
          aria-label="Back to Editor"
        >
          <span className="cinema-exit-icon" aria-hidden="true">
            ↩
          </span>
          <span className="cinema-exit-text">Back to Editor</span>
          <kbd className="cinema-esc-kbd">ESC</kbd>
        </button>
      </div>

      {/* ── Popovers (Exact matching width, 20px rounded corners, NO cross) ── */}

      {/* 1. Adjust Poster Popover */}
      {activePanel === "adjust" && (
        <section
          id="cinema-adjust-options"
          className="cinema-panel-popover cinema-placement-popover"
          aria-label="Adjust poster size and position on wall"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cinema-panel-popover__heading">
            <div className="cinema-panel-popover__title">
              <span aria-hidden="true">🔍</span>
              <strong>Adjust Poster Size & Position</strong>
            </div>
          </div>

          <div className="cinema-placement-controls">
            <label>
              <span>Poster Size</span>
              <output>{placement.scale.toFixed(2)}×</output>
              <span className="cinema-range-control">
                <button
                  type="button"
                  className="cinema-range-step"
                  onClick={() => adjustPlacement("scale", -1, 0, 10, 0.1)}
                  disabled={placement.scale <= 0}
                  aria-label="Decrease poster size"
                >−</button>
                <input
                  type="range"
                  className="cinema-range-slider"
                  min="0.00"
                  max="10.00"
                  step="0.10"
                  value={placement.scale}
                  onChange={(event) =>
                    onPlacementChange({
                      ...placement,
                      scale: Number(event.currentTarget.value),
                    })
                  }
                  aria-label="Poster size"
                />
                <button
                  type="button"
                  className="cinema-range-step"
                  onClick={() => adjustPlacement("scale", 1, 0, 10, 0.1)}
                  disabled={placement.scale >= 10}
                  aria-label="Increase poster size"
                >+</button>
              </span>
            </label>
            <label>
              <span>Horizontal Position</span>
              <output>{Math.round(placement.x)}%</output>
              <span className="cinema-range-control">
                <button
                  type="button"
                  className="cinema-range-step"
                  onClick={() => adjustPlacement("x", -1, -50, 50, 1)}
                  disabled={placement.x <= -50}
                  aria-label="Move poster left"
                >−</button>
                <input
                  type="range"
                  className="cinema-range-slider"
                  min="-50"
                  max="50"
                  step="1"
                  value={placement.x}
                  onChange={(event) =>
                    onPlacementChange({
                      ...placement,
                      x: Number(event.currentTarget.value),
                    })
                  }
                  aria-label="Horizontal position"
                />
                <button
                  type="button"
                  className="cinema-range-step"
                  onClick={() => adjustPlacement("x", 1, -50, 50, 1)}
                  disabled={placement.x >= 50}
                  aria-label="Move poster right"
                >+</button>
              </span>
            </label>
            <label>
              <span>Vertical Position</span>
              <output>{Math.round(placement.y)}%</output>
              <span className="cinema-range-control">
                <button
                  type="button"
                  className="cinema-range-step"
                  onClick={() => adjustPlacement("y", -1, -50, 50, 1)}
                  disabled={placement.y <= -50}
                  aria-label="Move poster up"
                >−</button>
                <input
                  type="range"
                  className="cinema-range-slider"
                  min="-50"
                  max="50"
                  step="1"
                  value={placement.y}
                  onChange={(event) =>
                    onPlacementChange({
                      ...placement,
                      y: Number(event.currentTarget.value),
                    })
                  }
                  aria-label="Vertical position"
                />
                <button
                  type="button"
                  className="cinema-range-step"
                  onClick={() => adjustPlacement("y", 1, -50, 50, 1)}
                  disabled={placement.y >= 50}
                  aria-label="Move poster down"
                >+</button>
              </span>
            </label>
          </div>

          <div className="cinema-panel-popover__tip">
            💡 Tip: You can also drag the poster with your mouse or finger directly on the wall!
          </div>

          <div className="cinema-panel-popover__actions">
            <button
              type="button"
              className="cinema-btn-secondary"
              onClick={() => onPlacementChange({ x: 0, y: 0, scale: 1.0 })}
            >
              Reset (1.0× Center)
            </button>
            <button
              type="button"
              className="cinema-btn-primary"
              onClick={() => setActivePanel(null)}
            >
              Done
            </button>
          </div>
        </section>
      )}

      {/* 2. Layout Options Popover (Exact matching width, Touches top/bottom, NO cross) */}
      {activePanel === "layout" && (
        <section
          id="cinema-layout-options"
          className="cinema-panel-popover cinema-layout-popover"
          aria-label="Poster layouts catalog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cinema-panel-popover__heading">
            <div className="cinema-panel-popover__title">
              <LayoutIcon aria-hidden="true" />
              <strong>Select Poster Layout</strong>
            </div>
          </div>

          <div className="cinema-layout-list" aria-label="Poster layouts">
            {layoutGroups.map((group) => (
              <div className="cinema-layout-group" key={group.id}>
                <h3>{group.name}</h3>
                <div className="cinema-layout-options">
                  {group.options.map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      className={form.layout === layout.id ? "is-selected" : ""}
                      aria-pressed={form.layout === layout.id}
                      onClick={() =>
                        dispatch({
                          type: "SET_LAYOUT",
                          layoutId: form.layout === layout.id ? "print_a4_portrait" : layout.id,
                          widthCm: formatLayoutCm((form.layout === layout.id ? getLayoutOption("print_a4_portrait") : layout).widthCm),
                          heightCm: formatLayoutCm((form.layout === layout.id ? getLayoutOption("print_a4_portrait") : layout).heightCm),
                        })
                      }
                    >
                      <span className="cinema-layout-option-name">{layout.name}</span>
                      <span className="cinema-layout-option-size">
                        {layout.widthCm}×{layout.heightCm} cm
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="cinema-panel-popover__actions">
            <button
              type="button"
              className="cinema-btn-primary"
              onClick={() => setActivePanel(null)}
            >
              Done
            </button>
          </div>
        </section>
      )}

      {/* ── Bottom Floating Toolbar Dock (Fixed at bottom edge) ── */}
      <div className="cinema-floating-dock-wrap">
        <div
          className="cinema-floating-dock"
          role="toolbar"
          aria-label="Wall preview tools"
        >
          {/* Hidden File Input for Native File Chooser */}
          <input
            id="cinema-wall-photo-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            style={{ display: "none" }}
            onChange={(event) => {
              handleWallPhoto(event.currentTarget.files?.[0]);
              // Reset so selecting the same file again triggers onChange
              event.currentTarget.value = "";
            }}
          />

          {/* Dedicated Wall Photo Button */}
          <button
            type="button"
            className="cinema-dock-btn cinema-dock-upload-btn"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActivePanel(null); // Explicitly ensure NO panel can open or remain open
              fileInputRef.current?.click();
            }}
            title="Upload your room or wall photo to test framing"
          >
            <span className="cinema-dock-btn__icon" aria-hidden="true">
              📷
            </span>
            <span>{hasWallPhoto ? "Change Wall Photo" : "Upload Wall Photo"}</span>
          </button>

          {/* Remove Photo Button (Only shown when custom wall photo exists) */}
          {hasWallPhoto && (
            <button
              type="button"
              className="cinema-dock-btn cinema-dock-remove-photo-btn"
              onClick={handleRemoveWallPhoto}
              title="Remove wall photo and restore dark room backdrop"
            >
              <span className="cinema-dock-btn__icon" aria-hidden="true">
                ✕
              </span>
              <span>Remove Photo</span>
            </button>
          )}

          <div className="cinema-dock-divider" aria-hidden="true" />

          {/* Adjust Poster Button */}
          <button
            type="button"
            className={`cinema-dock-btn${activePanel === "adjust" ? " is-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActivePanel((curr) => (curr === "adjust" ? null : "adjust"));
            }}
            aria-expanded={activePanel === "adjust"}
            aria-controls="cinema-adjust-options"
            title="Adjust poster scale and placement"
          >
            <span className="cinema-dock-btn__icon" aria-hidden="true">
              🔍
            </span>
            <span>Adjust Poster</span>
          </button>

          {/* Layout Button */}
          <button
            type="button"
            className={`cinema-dock-btn${activePanel === "layout" ? " is-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActivePanel((curr) => (curr === "layout" ? null : "layout"));
            }}
            aria-expanded={activePanel === "layout"}
            aria-controls="cinema-layout-options"
            title="Change poster format / layout"
          >
            <LayoutIcon aria-hidden="true" />
            <span>Layout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
