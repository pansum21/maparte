import {
  MAP_SHAPES,
  SHAPE_FINISHES,
  type MapShapeId,
  type ShapeFinishId,
} from "@/features/layout/domain/shapeTypes";
import "./mapShapes.css";

interface MapShapePickerProps {
  selectedShape?: MapShapeId;
  selectedFinish?: ShapeFinishId;
  onShapeChange: (shape: MapShapeId) => void;
  onFinishChange: (finish: ShapeFinishId) => void;
}

export default function MapShapePicker({
  selectedShape = "full",
  selectedFinish = "shadow",
  onShapeChange,
  onFinishChange,
}: MapShapePickerProps) {
  return (
    <div className="map-shapes-picker" role="region" aria-label="Map Shapes and Masking">
      <div className="map-shapes-grid">
        {MAP_SHAPES.map((shape) => {
          const isActive = selectedShape === shape.id;
          return (
            <button
              key={shape.id}
              type="button"
              className={`map-shape-card${isActive ? " is-active" : ""}`}
              onClick={() => onShapeChange(shape.id)}
              aria-pressed={isActive}
            >
              {shape.badge ? (
                <span
                  className={`map-shape-card-badge ${
                    shape.badge === "Best Seller"
                      ? "badge-best-seller"
                      : shape.badge === "Trending"
                      ? "badge-trending"
                      : "badge-popular"
                  }`}
                >
                  {shape.badge}
                </span>
              ) : null}

              <div className="map-shape-icon-wrap" aria-hidden="true">
                <svg
                  viewBox="0 0 100 100"
                  className="map-shape-svg-preview"
                  fill="currentColor"
                  fillOpacity={isActive ? "0.9" : "0.55"}
                >
                  <path d={shape.svgPath} />
                </svg>
              </div>

              <div className="map-shape-name">{shape.name}</div>
              <div className="map-shape-subtitle">{shape.subtitle}</div>
            </button>
          );
        })}
      </div>

      {selectedShape !== "full" ? (
        <div className="shape-finishes-section">
          <div className="shape-finishes-title">Edge Finish & Depth</div>
          <div className="shape-finishes-grid">
            {SHAPE_FINISHES.map((finish) => {
              const isActive = selectedFinish === finish.id;
              return (
                <button
                  key={finish.id}
                  type="button"
                  className={`shape-finish-card${isActive ? " is-active" : ""}`}
                  onClick={() => onFinishChange(finish.id)}
                  aria-pressed={isActive}
                >
                  <div className="shape-finish-card-head">
                    <span className="shape-finish-name">{finish.name}</span>
                    {finish.badge ? (
                      <span className="shape-finish-tag">{finish.badge}</span>
                    ) : null}
                  </div>
                  <span className="shape-finish-desc">{finish.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
