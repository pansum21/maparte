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
        {/* Soft Blur Filter for feathering outward into the paper */}
        <filter id="maparte-blur-feather" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.035" />
        </filter>

        {MAP_SHAPES.map((shape) => {
          if (shape.id === "full" || !shape.normalizedPath) return null;
          return (
            <g key={"defs-" + shape.id}>
              {/* Clean razor cut & 3D shadow clip-path */}
              <clipPath
                id={"maparte-shape-" + shape.id}
                clipPathUnits="objectBoundingBox"
              >
                <path d={shape.normalizedPath} />
              </clipPath>

              {/* Soft blur mask: inner shape is 100% solid & prominent, outer edge feathers out into white mat */}
              <mask
                id={"maparte-blur-" + shape.id}
                maskContentUnits="objectBoundingBox"
              >
                <path d={shape.normalizedPath} fill="white" filter="url(#maparte-blur-feather)" />
                <path d={shape.normalizedPath} fill="white" />
              </mask>
            </g>
          );
        })}
      </defs>
    </svg>
  );
}
