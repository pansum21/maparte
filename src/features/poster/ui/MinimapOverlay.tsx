import { memo, useMemo } from "react";
import {
  buildMinimapOverlaySvg,
  hasMinimapContent,
  type MinimapOverlayOptions,
} from "@/features/poster/domain/minimapOverlay";

interface MinimapOverlayProps {
  options: MinimapOverlayOptions;
}

/**
 * Ring, compass letters, route line and navigation arrow for the map window.
 * Uses the same SVG as the exports, so what is previewed is what gets downloaded.
 */
function MinimapOverlay({ options }: MinimapOverlayProps) {
  const src = useMemo(() => {
    if (!hasMinimapContent(options)) return null;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildMinimapOverlaySvg(options))}`;
  }, [options]);
  if (!src) return null;
  return (
    <img
      className="poster-minimap-overlay"
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export default memo(MinimapOverlay);
