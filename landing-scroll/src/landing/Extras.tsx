import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import CityMap, { PALETTES } from "./CityMap";
import { getOsm } from "./osm";

/* ------------------------------------------------------------------ ticker */

/**
 * The thin band under the hero: one looping line of what the sheet is made of.
 * Two copies of the list, so the -50% keyframe lands on the same word.
 */
const TICKER = [
  "OpenStreetMap geometry",
  "20 cities",
  "7 palettes",
  "6 layouts",
  "6 borders",
  "4 paper sizes",
  "Vector PDF with bleed",
  "300 dpi PNG",
  "Layered SVG",
];

export function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        {[0, 1].map((copy) =>
          TICKER.map((item) => (
            <span className="ticker__item" key={`${copy}-${item}`}>
              <i />
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- bento */

const SWATCH_KEYS = [
  "paper",
  "ink",
  "blueprint",
  "terracotta",
  "botanical",
  "midnight",
  "newsprint",
];

const BENTO_CITY = getOsm("kyoto");

const LAYERS = ["water", "parks", "blocks", "roads", "type"];

/**
 * The box of dials, set as a bento: one tall plate for the data, then the
 * palettes, the print rules and the size ladder. Every tile catches a warm
 * pool of light under the cursor.
 */
export function ToolsBento() {
  const spotlight = (event: ReactPointerEvent<HTMLDivElement>) => {
    const tile = (event.target as HTMLElement).closest<HTMLElement>(".tile");
    if (!tile) return;
    const box = tile.getBoundingClientRect();
    tile.style.setProperty("--mx", `${event.clientX - box.left}px`);
    tile.style.setProperty("--my", `${event.clientY - box.top}px`);
  };

  return (
    <section className="tools" id="tools" aria-labelledby="tools-title">
      <div className="tools__inner">
        <div className="tools__head" data-reveal>
          <p className="kicker">
            <span className="dot" />
            07 — Everything in the box
          </p>
          <h2 className="tools__title" id="tools-title">
            One sheet. Every dial.
          </h2>
          <p className="tools__lead">
            Map data, palettes, borders and print rules all sit in the same
            editor. Nothing is flattened until you say so.
          </p>
        </div>

        <div className="bento" onPointerMove={spotlight}>
          <article className="tile tile--city" data-reveal style={{ "--n": 0 } as CSSProperties}>
            <div className="tile__map" aria-hidden="true">
              <CityMap data={BENTO_CITY} palette={PALETTES.ink} />
            </div>
            <div className="tile__copy">
              <p className="tile__label">Data</p>
              <h3 className="tile__head">
                Twenty cities,
                <br />
                every street kept.
              </h3>
              <p className="tile__body">
                Real streets, rivers, parks and building blocks, pulled from
                OpenStreetMap at build time and clipped to your frame.
              </p>
            </div>
          </article>

          <article className="tile tile--palettes" data-reveal style={{ "--n": 1 } as CSSProperties}>
            <p className="tile__label">Palettes</p>
            <h3 className="tile__head">Seven moods</h3>
            <p className="tile__body">
              Roads, water, parks and blocks recoloured independently, then
              saved as a palette you can lock.
            </p>
            <div className="swatches">
              {SWATCH_KEYS.map((key) => (
                <span
                  className="swatch"
                  key={key}
                  style={
                    {
                      "--sw": PALETTES[key].bg,
                      "--sw-ink": PALETTES[key].major,
                    } as CSSProperties
                  }
                >
                  <i aria-hidden="true" />
                  <em>{key}</em>
                </span>
              ))}
            </div>
          </article>

          <article className="tile tile--pdf" data-reveal style={{ "--n": 2 } as CSSProperties}>
            <p className="tile__label">Print</p>
            <h3 className="tile__head">Vector PDF</h3>
            <div className="trim" aria-hidden="true">
              <span />
            </div>
            <p className="tile__body">
              Type as outlines, 3 mm bleed, TrimBox and BleedBox set.
            </p>
          </article>

          <article className="tile tile--dpi" data-reveal style={{ "--n": 3 } as CSSProperties}>
            <p className="tile__label">Raster</p>
            <h3 className="tile__head">
              <b>300</b> dpi
            </h3>
            <p className="tile__body">PNG up to 24 × 36 in, at any size you pick.</p>
          </article>

          <article className="tile tile--svg" data-reveal style={{ "--n": 4 } as CSSProperties}>
            <p className="tile__label">Layers</p>
            <h3 className="tile__head">Layered SVG</h3>
            <ul className="layers">
              {LAYERS.map((layer) => (
                <li key={layer}>{layer}</li>
              ))}
            </ul>
          </article>

          <article className="tile tile--data" data-reveal style={{ "--n": 5 } as CSSProperties}>
            <p className="tile__label">Source</p>
            <h3 className="tile__head">OpenStreetMap</h3>
            <p className="tile__body">
              © contributors. Nothing traced, nothing redrawn.
            </p>
          </article>

          <article className="tile tile--sizes" data-reveal style={{ "--n": 6 } as CSSProperties}>
            <p className="tile__label">Paper</p>
            <h3 className="tile__head">Four stock sizes</h3>
            <div className="sheets" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <p className="tile__body">Studio · Gallery · Desk · Oversize</p>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- steps */

const STEPS = [
  {
    head: "Pick a place",
    body: "Search a city, drop a pin or paste coordinates. The map is cut to the frame you choose.",
  },
  {
    head: "Set the rules",
    body: "Palette, typeface, border, paper stock and margins — each one its own layer.",
  },
  {
    head: "Send to press",
    body: "Export a vector PDF with bleed, a 300 dpi PNG, or the layered SVG.",
  },
];

export function Steps() {
  return (
    <section className="steps" id="how" aria-labelledby="steps-title">
      <div className="steps__inner">
        <div className="steps__head" data-reveal>
          <p className="kicker">
            <span className="dot" />
            08 — The run
          </p>
          <h2 className="steps__title" id="steps-title">
            Three moves,
            <br />
            then it is paper.
          </h2>
        </div>

        <ol className="steps__list">
          {STEPS.map((step, i) => (
            <li key={step.head} data-reveal style={{ "--n": i } as CSSProperties}>
              <span className="steps__no" aria-hidden="true">
                0{i + 1}
              </span>
              <h3>{step.head}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
