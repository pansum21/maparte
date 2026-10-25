import { useRef, useState } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { layoutGroups } from "@/features/layout/infrastructure/layoutRepository";
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
  const [layoutOpen, setLayoutOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleWallPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onWallPhotoChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="cinema-overlay-controls" role="region" aria-label="Fullscreen Wall Preview Controls">
      <div className="cinema-top-bar-center">
        <div className="cinema-center-view-badge">
          <span className="cinema-center-icon" aria-hidden="true">🖼️</span>
          <span className="cinema-center-title">Poster View</span>
          <span className="cinema-center-sep">•</span>
          <span className="cinema-center-city">{cityName}</span>
        </div>
      </div>

      <div className="cinema-top-bar-right">
        <button type="button" className="cinema-top-exit-btn" onClick={onExit} title="Exit Fullscreen Wall View & Back to Editor (Esc)" aria-label="Back to Editor">
          <span className="cinema-exit-icon" aria-hidden="true">←</span>
          <span className="cinema-exit-text">Back to Editor</span>
          <kbd className="cinema-esc-kbd">ESC</kbd>
        </button>
      </div>

      <div className="cinema-layout-control">
        {layoutOpen ? (
          <section id="cinema-layout-options" className="cinema-layout-popover" aria-label="Wall preview layout and placement">
            <div className="cinema-layout-popover__heading">
              <strong>Wall Preview Setup</strong>
              <button type="button" aria-label="Close layout options" onClick={() => setLayoutOpen(false)}>×</button>
            </div>
            <div className="cinema-wall-upload">
              <label htmlFor="cinema-wall-photo">Wall photo</label>
              <input id="cinema-wall-photo" ref={fileInputRef} type="file" accept="image/*" onChange={(event) => handleWallPhoto(event.currentTarget.files?.[0])} />
              {hasWallPhoto ? <button type="button" onClick={() => { onWallPhotoChange(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove photo</button> : null}
            </div>
            <div className="cinema-placement-controls">
              <label>Poster size <output>{placement.scale.toFixed(2)}×</output>
                <input type="range" min="0.55" max="1.35" step="0.01" value={placement.scale} onChange={(event) => onPlacementChange({ ...placement, scale: Number(event.currentTarget.value) })} />
              </label>
              <label>Horizontal position <output>{Math.round(placement.x)}%</output>
                <input type="range" min="-30" max="30" step="1" value={placement.x} onChange={(event) => onPlacementChange({ ...placement, x: Number(event.currentTarget.value) })} />
              </label>
              <label>Vertical position <output>{Math.round(placement.y)}%</output>
                <input type="range" min="-30" max="30" step="1" value={placement.y} onChange={(event) => onPlacementChange({ ...placement, y: Number(event.currentTarget.value) })} />
              </label>
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
                        onClick={() => dispatch({
                          type: "SET_LAYOUT",
                          layoutId: layout.id,
                          widthCm: formatLayoutCm(layout.widthCm),
                          heightCm: formatLayoutCm(layout.heightCm),
                        })}
                      >
                        {layout.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <button
          type="button"
          className="cinema-layout-trigger"
          onClick={() => setLayoutOpen((open) => !open)}
          aria-expanded={layoutOpen}
          aria-controls="cinema-layout-options"
        >
          <LayoutIcon aria-hidden="true" />
          <span>Layout</span>
        </button>
      </div>

    </div>
  );
}
