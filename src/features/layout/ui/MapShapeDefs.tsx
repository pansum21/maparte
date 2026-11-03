import { MAP_SHAPES } from "@/features/layout/domain/shapeTypes";

export default function MapShapeDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <defs>
        {MAP_SHAPES.map((shape) => {
          if (shape.id === "full" || !shape.normalizedPath) return null;
          return (
            <clipPath
              key={`clip-${shape.id}`}
              id={`maparte-shape-${shape.id}`}
              clipPathUnits="objectBoundingBox"
            >
              <path d={shape.normalizedPath} />
            </clipPath>
          );
        })}

        {/* 3D Embossed Fine-Art Drop Shadow */}
        <filter id="maparte-3d-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.28" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.14" />
        </filter>

        {/* Soft Vignette Feather Mask for Shapes */}
        <filter id="maparte-soft-feather" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
    </svg>
  );
}
