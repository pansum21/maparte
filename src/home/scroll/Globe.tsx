import type { CSSProperties } from "react";

/**
 * A wireframe sphere, not a photograph: ink meridians turning in depth with a
 * few orange pins on the surface. It says "any place on earth" without a
 * third-party globe library, and it keeps the paper palette of the page.
 */
const MERIDIANS = [0, 20, 40, 60, 80, 100, 120, 140, 160];

const PINGS = [
  { left: "63%", top: "33%", delay: "0s" },
  { left: "37%", top: "56%", delay: "1.6s" },
  { left: "55%", top: "71%", delay: "3.1s" },
];

export default function Globe() {
  return (
    <div className="globe" aria-hidden="true">
      <span className="globe__halo" />
      <span className="globe__orbit" />

      <div className="globe__sphere">
        {MERIDIANS.map((deg) => (
          <span
            className="globe__meridian"
            key={deg}
            style={{ "--a": `${deg}deg` } as CSSProperties}
          />
        ))}
      </div>

      <span className="globe__parallel globe__parallel--p1" />
      <span className="globe__parallel globe__parallel--p2" />
      <span className="globe__parallel globe__parallel--p3" />
      <span className="globe__parallel globe__parallel--equator" />

      {PINGS.map((ping) => (
        <span
          className="globe__ping"
          key={`${ping.left}-${ping.top}`}
          style={
            {
              left: ping.left,
              top: ping.top,
              animationDelay: ping.delay,
            } as CSSProperties
          }
        />
      ))}

      <span className="globe__meta">20 plates · one sphere</span>
    </div>
  );
}
