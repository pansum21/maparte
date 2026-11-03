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
 * Precision alignment grid and center-finder overlay for the poster canvas.
 * Renders:
 *  - Corner-to-corner diagonal "X" lines intersecting at exact geometric center (50%, 50%)
 *  - Precision center bullseye reticle with coordinates indicator
 *  - Subtle vertical and horizontal center crosshairs
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
  const mainLineColor = isLight ? "rgba(15, 23, 42, 0.42)" : "rgba(255, 255, 255, 0.45)";
  const centerCrossColor = isLight ? "rgba(2, 132, 199, 0.75)" : "rgba(56, 189, 248, 0.75)";
  const thirdLineColor = isLight ? "rgba(15, 23, 42, 0.2)" : "rgba(255, 255, 255, 0.22)";
  const reticleColor = isLight ? "#0284c7" : "#38bdf8";
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
        <defs>
          {/* Subtle micro glow for center target */}
          <filter id="centerReticleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={reticleColor} floodOpacity="0.6" />
          </filter>
        </defs>

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

        {/* ── 4. CENTER TARGET RETICLE (Bullseye) ── */}
        <g filter="url(#centerReticleGlow)">
          {/* Outer Ring */}
          <circle cx="500" cy="500" r="15" fill="none" stroke={reticleColor} strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
          {/* Inner Ring */}
          <circle cx="500" cy="500" r="6" fill="none" stroke={reticleColor} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          {/* Center Dot */}
          <circle cx="500" cy="500" r="2" fill={reticleColor} />
        </g>
      </svg>

      {/* Floating Center Coordinates Badge */}
      <div
        className="poster-grid-center-badge"
        style={{
          position: "absolute",
          left: "50%",
          top: "calc(50% + 22px)",
          transform: "translateX(-50%)",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 7px",
          borderRadius: "4px",
          background: isLight ? "rgba(15, 23, 42, 0.78)" : "rgba(12, 26, 40, 0.85)",
          border: `1px solid ${isLight ? "rgba(255, 255, 255, 0.25)" : "rgba(56, 189, 248, 0.4)"}`,
          color: isLight ? "#f8fafc" : "#38bdf8",
          fontFamily: "'Space Grotesk', -apple-system, sans-serif",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          lineHeight: "1.2",
          whiteSpace: "nowrap",
          userSelect: "none",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span>CENTER (50%, 50%)</span>
      </div>
    </div>
  );
}
