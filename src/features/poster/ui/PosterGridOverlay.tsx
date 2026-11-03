import React from "react";

interface PosterGridOverlayProps {
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Calculates whether a given hex color is light (relative luminance > 0.55).
 */
function isLightColor(hex?: string): boolean {
  if (!hex) return false;
  const clean = hex.replace("#", "").trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16) / 255;
    g = parseInt(clean.slice(2, 4), 16) / 255;
    b = parseInt(clean.slice(4, 6), 16) / 255;
  } else {
    return false;
  }
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55;
}

/**
 * Clean precision alignment grid and center-finder overlay for the poster canvas.
 * Renders pure intersecting lines with NO circles/bullseyes:
 *  - Corner-to-corner diagonal "X" lines intersecting at exact geometric center (50%, 50%)
 *  - Subtle vertical and horizontal center crosshairs (50% axes)
 *  - Rule-of-thirds dashed guidelines
 *  - Adaptive high-contrast coloring for white/light themes (e.g. Carrara) vs dark themes
 */
export default function PosterGridOverlay({
  backgroundColor,
}: PosterGridOverlayProps) {
  const isLight = isLightColor(backgroundColor);

  // High-contrast adaptive palette:
  // On light/white themes (Carrara, Nordic White): deep slate/cyan lines with light shadow
  // On dark themes (Noir, Midnight): luminous cyan-white lines with dark shadow
  const mainLineColor = isLight ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.5)";
  const centerCrossColor = isLight ? "rgba(2, 132, 199, 0.75)" : "rgba(56, 189, 248, 0.75)";
  const thirdLineColor = isLight ? "rgba(15, 23, 42, 0.2)" : "rgba(255, 255, 255, 0.22)";
  const dropShadow = isLight
    ? "drop-shadow(0 0 1px rgba(255, 255, 255, 0.85))"
    : "drop-shadow(0 0 1px rgba(0, 0, 0, 0.9))";

  return (
    <div
      className="poster-grid-overlay"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 28,
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          filter: dropShadow,
        }}
      >
        {/* ── 1. RULE-OF-THIRDS GUIDELINES (Subtle Dashed) ── */}
        <line x1="333.33" y1="0" x2="333.33" y2="1000" stroke={thirdLineColor} strokeWidth="0.75" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        <line x1="666.67" y1="0" x2="666.67" y2="1000" stroke={thirdLineColor} strokeWidth="0.75" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="333.33" x2="1000" y2="333.33" stroke={thirdLineColor} strokeWidth="0.75" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="666.67" x2="1000" y2="666.67" stroke={thirdLineColor} strokeWidth="0.75" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />

        {/* ── 2. CENTER CROSSHAIRS (Vertical & Horizontal 50% Axes) ── */}
        <line x1="500" y1="0" x2="500" y2="1000" stroke={centerCrossColor} strokeWidth="0.8" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="500" x2="1000" y2="500" stroke={centerCrossColor} strokeWidth="0.8" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />

        {/* ── 3. CORNER-TO-CORNER DIAGONAL "X" (Exact Center Intersect) ── */}
        {/* Top-Left to Bottom-Right */}
        <line x1="0" y1="0" x2="1000" y2="1000" stroke={mainLineColor} strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        {/* Top-Right to Bottom-Left */}
        <line x1="1000" y1="0" x2="0" y2="1000" stroke={mainLineColor} strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
