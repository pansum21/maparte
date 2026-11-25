import { useCallback, useEffect, useRef, useState } from "react";
import CityMap, { PALETTES } from "./CityMap";
import { getOsm } from "./osm";
import Poster from "./Poster";
import { Steps, Ticker, ToolsBento } from "./Extras";
import Globe from "./Globe";
import WallProof, { WallSets } from "./WallProof";
import "./fonts";
import "./landing.css";
import { setColumns, setCoverflow, setFan, setRail, setStaircase } from "./motion";
import { clamp01, ramp, useScrollScene } from "./useScrollScene";
import {
  FRAME_GALLERY,
  LAYOUT_GALLERY,
  MAP_COUNT,
  MAP_GALLERY,
  MOTION_LABEL,
  PRESET_GALLERY,
  THEME_GALLERY,
  type MotionId,
} from "./galleryData";

const PICK_KEY = "maparte:motions";

/* ------------------------------------------------------------------ data */

const HERO_CITY = getOsm("jaipur");
const EXPORT_CITY = getOsm("lisbon");

const STATEMENT = [
  {
    head: "Real geometry",
    body: "Streets, rivers, parks and blocks come straight from OpenStreetMap — clipped to the frame you choose, never redrawn by hand.",
  },
  {
    head: "Your rules",
    body: "Chase the typeface, the paper tone, the border width. Every layer is separate, so nothing is baked in.",
  },
  {
    head: "Print first",
    body: "Vector PDF with bleed and crop marks, a 300 dpi PNG, or the layered SVG if you want to keep editing.",
  },
];

const CITIES = [
  "Kyoto",
  "Lisbon",
  "Jaipur",
  "Portland",
  "Reykjavík",
  "Buenos Aires",
  "Nairobi",
  "Osaka",
  "Tbilisi",
  "Valparaíso",
  "Hanoi",
  "Marrakesh",
  "Montréal",
  "Seoul",
  "Bristol",
];

/* ---------------------------------------------------------------- pieces */

const Mark = () => (
  <svg className="mark" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M2 2h16v16H2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M2 8.5h16M2 14h16M8.5 2v16M14 2v16"
      stroke="currentColor"
      strokeWidth="0.85"
      opacity="0.55"
    />
  </svg>
);

/** The tick you leave on the motion you want to keep. */
const Pick = ({
  id,
  label,
  on,
  onToggle,
}: {
  id: MotionId;
  label: string;
  on: boolean;
  onToggle: (id: MotionId) => void;
}) => (
  <button
    type="button"
    className={`pick${on ? " is-on" : ""}`}
    aria-pressed={on}
    onClick={() => onToggle(id)}
    title={`Tick “${label}” to keep this motion`}
  >
    <span className="pick__box" aria-hidden="true">
      {on ? "✓" : ""}
    </span>
    <span className="pick__text">{on ? `Ticked · ${label}` : `Tick to keep · ${label}`}</span>
  </button>
);

const Corners = () => (
  <>
    <span className="poster__mark poster__mark--tl" aria-hidden="true" />
    <span className="poster__mark poster__mark--tr" aria-hidden="true" />
    <span className="poster__mark poster__mark--bl" aria-hidden="true" />
    <span className="poster__mark poster__mark--br" aria-hidden="true" />
  </>
);

/* ------------------------------------------------------------------ page */

export default function MaparteScrollLanding() {
  const heroRef = useRef<HTMLElement>(null);
  const coordsRef = useRef<HTMLSpanElement>(null);

  const mapRef = useRef<HTMLElement>(null);
  const mapView = useRef<HTMLDivElement>(null);
  const mapTrack = useRef<HTMLDivElement>(null);

  const statementRef = useRef<HTMLElement>(null);
  const tagRef = useRef<HTMLElement>(null);

  const themeRef = useRef<HTMLElement>(null);
  const themeView = useRef<HTMLDivElement>(null);

  const layoutRef = useRef<HTMLElement>(null);
  const layoutView = useRef<HTMLDivElement>(null);
  const layoutCols = useRef<HTMLDivElement>(null);

  const frameRef = useRef<HTMLElement>(null);
  const frameView = useRef<HTMLDivElement>(null);

  const presetRef = useRef<HTMLElement>(null);
  const presetView = useRef<HTMLDivElement>(null);

  /* the ticked motions, so a choice survives a reload while we tune it */
  const [picked, setPicked] = useState<Partial<Record<MotionId, boolean>>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PICK_KEY);
      if (raw) setPicked(JSON.parse(raw) as Partial<Record<MotionId, boolean>>);
    } catch {
      /* private mode: the ticks simply do not persist */
    }
  }, []);

  const togglePick = useCallback((id: MotionId) => {
    setPicked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(PICK_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const exportRef = useRef<HTMLElement>(null);

  /* hero: scroll-out + cursor crosshair with a live coordinate readout */
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = -2;

    const update = () => {
      const p = reduce.matches ? 0 : clamp01(window.scrollY / (window.innerHeight * 0.85));
      if (Math.abs(p - last) > 0.001) {
        last = p;
        el.style.setProperty("--hp", p.toFixed(4));
      }
    };

    const tick = () => {
      update();
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => update();

    update();
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });

    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      el.style.setProperty("--cx", `${((x / rect.width) * 100).toFixed(2)}%`);
      el.style.setProperty("--cy", `${((y / rect.height) * 100).toFixed(2)}%`);
      el.style.setProperty("--cxp", `${x.toFixed(0)}px`);
      el.style.setProperty("--cyp", `${y.toFixed(0)}px`);

      // the hero plate is a real crop of Jaipur, so the readout is the
      // coordinate under the cursor inside that crop
      const [cLat, cLon] = HERO_CITY.center;
      const spanLat = HERO_CITY.span / 111320;
      const spanLon = HERO_CITY.span / (111320 * Math.cos((cLat * Math.PI) / 180));
      const lat = cLat + (0.5 - y / rect.height) * spanLat;
      const lng = cLon + (x / rect.width - 0.5) * spanLon;
      if (coordsRef.current) {
        coordsRef.current.textContent = `${Math.abs(lat).toFixed(4)}° ${
          lat >= 0 ? "N" : "S"
        } · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
      }
    };
    el.addEventListener("pointermove", move);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointermove", move);
    };
  }, []);

  /* 01 — the map gallery: scroll drives one long shelf of twenty plates */
  useScrollScene(
    mapRef,
    useCallback((p, el) => {
      el.style.setProperty("--gp", p.toFixed(4));
      setRail(mapTrack.current, mapView.current, p, 1);
    }, [])
  );

  /* 02 — the statement: hairline grid drifts behind the copy */
  useScrollScene(
    statementRef,
    useCallback((p, el) => {
      el.style.setProperty("--sp", p.toFixed(4));
    }, [])
  );

  /* 03 — the tagline: three rows of type sliding against the scroll */
  useScrollScene(
    tagRef,
    useCallback((p, el) => {
      el.style.setProperty("--kp", p.toFixed(4));
    }, [])
  );

  /* 04 — themes: a coverflow that turns in depth */
  useScrollScene(
    themeRef,
    useCallback((p, el) => {
      el.style.setProperty("--tp", p.toFixed(4));
      setCoverflow(themeView.current, p);
    }, [])
  );

  /* 05 — layouts: three vertical strips drift at different speeds */
  useScrollScene(
    layoutRef,
    useCallback((p, el) => {
      el.style.setProperty("--lp", p.toFixed(4));
      setColumns(layoutView.current, p);
    }, [])
  );

  /* 06 — borders: the plates splay out along an arc */
  useScrollScene(
    frameRef,
    useCallback((p, el) => {
      el.style.setProperty("--fp", p.toFixed(4));
      setFan(frameView.current, p);
    }, [])
  );

  /* 05 — presets: the plates step down a staircase */
  useScrollScene(
    presetRef,
    useCallback((p, el) => {
      el.style.setProperty("--pp", p.toFixed(4));
      setStaircase(presetView.current, p);
    }, [])
  );

  /* 07 — export: poster turns to face you as the section arrives */
  useScrollScene(
    exportRef,
    useCallback((p, el) => {
      el.style.setProperty("--ep", ramp(p, 0.05, 0.85).toFixed(4));
    }, [])
  );

  /* small fade-ups for the static blocks */
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((n) => io.observe(n));

    // Some embedded browsers defer intersection callbacks; this sweep makes
    // sure no copy is left invisible when its block is already on screen.
    const sweep = () => {
      const limit = window.innerHeight * 0.94;
      nodes.forEach((n) => {
        if (n.classList.contains("is-in")) return;
        const rect = n.getBoundingClientRect();
        if (rect.top < limit && rect.bottom > 0) n.classList.add("is-in");
      });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    const timer = window.setTimeout(sweep, 600);

    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", sweep);
    };
  }, []);

  /* one number for the whole page: the nav rule fills as you travel, so no
     stretch of the scroll ever feels dead */
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--page", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : "0");
    };

    const tick = () => {
      update();
      raf = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="page" id="maparte-landing">
      <header className="nav">
        <a className="nav__logo" href="#top">
          <Mark />
          Maparte
        </a>
        <nav className="nav__links" aria-label="Sections">
          <a href="#maps">Map gallery</a>
          <a href="#themes">Themes</a>
          <a href="#layouts">Layouts</a>
          <a href="#borders">Borders</a>
          <a href="#presets">Presets</a>
        </nav>
        <a className="nav__cta" href="https://maparte.vercel.app">
          Open editor <span aria-hidden="true">↗</span>
        </a>
        <span className="nav__progress" aria-hidden="true" />
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="hero" id="top" ref={heroRef}>
        <div className="hero__map" aria-hidden="true">
          <CityMap data={HERO_CITY} palette={PALETTES.paper} />
        </div>
        <div className="hero__grid" aria-hidden="true" />
        <div className="hero__veil" aria-hidden="true" />
        <div className="hero__spot" aria-hidden="true" />
        <Globe />
        <div className="hero__corners" aria-hidden="true">
          <span>Plate 001 — Jaipur</span>
          <span>OpenStreetMap · vector only</span>
        </div>
        <div className="hero__cross" aria-hidden="true">
          <span className="hero__cross-x" />
          <span className="hero__cross-y" />
          <span className="hero__coords" ref={coordsRef}>
            26.9124° N · 75.7873° E
          </span>
        </div>

        <div className="hero__content">
          <p className="kicker">
            <span className="dot" />
            Custom city posters · real OpenStreetMap data
          </p>
          <h1 className="hero__title">
            <span>Your city,</span>
            <span>
              <em>drawn</em> line
            </span>
            <span>by line.</span>
          </h1>
          <p className="hero__lead">
            Every street, river and park of the place you love — plotted into a
            print-ready poster you style yourself.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#maps">
              See the gallery <span aria-hidden="true">↗</span>
            </a>
            <a className="btn btn--ghost" href="#themes">
              Browse themes
            </a>
          </div>
          <div className="hero__foot">
            <ul className="hero__facts">
              <li>60+ themes</li>
              <li>300 dpi</li>
              <li>PNG · PDF · SVG</li>
            </ul>
            <a className="hero__cue" href="#maps">
              Scroll to travel
              <i aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <Ticker />

      {/* ----------------------------------------------- 01 · map gallery */}
      <section className="gal gal--map" id="maps" ref={mapRef}>
        <div className="gal__pin">
          <div className="gal__head" data-reveal>
            <div>
              <p className="kicker">
                <span className="dot" />
                01 — The map gallery
              </p>
              <h2 className="gal__title">
                Twenty cities,
                <br />
                every street kept.
              </h2>
            </div>
            <div className="gal__meta">
              <p className="gal__note">
                One shelf, twenty plates, each framed with a double rule. Scroll
                and the whole gallery travels with you — no arrows, no clicking.
              </p>
              <Pick id="rail" label={MOTION_LABEL.rail} on={!!picked.rail} onToggle={togglePick} />
            </div>
          </div>

          <div className="gal__rows">
            <div className="gal__viewport" ref={mapView}>
              <div className="gal__track" ref={mapTrack}>
                {MAP_GALLERY.map((poster, i) => (
                  <Poster key={poster.id} {...poster} index={i} className="card--map" />
                ))}
              </div>
            </div>
          </div>

          <div className="gal__foot">
            <span className="gal__count">
              <b>{MAP_COUNT}</b> plates · double-rule frames
            </span>
            <div className="gal__bar" aria-hidden="true">
              <i />
            </div>
            <span className="gal__hint">scroll ↔ travel</span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------- 04 · theme gallery */}
      <section className="gal gal--themes" id="themes" ref={themeRef}>
        <div className="gal__pin">
          <div className="gal__head" data-reveal>
            <div>
              <p className="kicker kicker--light">
                <span className="dot" />
                02 — The theme gallery
              </p>
              <h2 className="gal__title">
                Same streets.
                <br />
                Seven moods.
              </h2>
            </div>
            <div className="gal__meta">
              <p className="gal__note">
                Ink, blueprint, terracotta, botanical, midnight, newsprint, paper.
                Roads, water, parks and blocks are recoloured independently, then
                saved as a palette you can lock.
              </p>
              <Pick
                id="coverflow"
                label={MOTION_LABEL.coverflow}
                on={!!picked.coverflow}
                onToggle={togglePick}
              />
            </div>
          </div>

          <div className="gal__rows">
                          <div className="gal__viewport" ref={themeView}>
                <div className="gal__track">
                {THEME_GALLERY.map((poster, i) => (
                  <Poster key={poster.id} {...poster} index={i} className="card--theme" />
                ))}
              </div>
            </div>
          </div>

          <div className="gal__foot">
            <span className="gal__count">
              <b>7</b> palettes · no extra cost
            </span>
            <div className="gal__bar" aria-hidden="true">
              <i />
            </div>
            <span className="gal__hint">scroll ↔ travel</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- 05 · layout gallery */}
      <section className="gal gal--layouts" id="layouts" ref={layoutRef}>
        <div className="gal__pin">
          <span className="gal__ghost" aria-hidden="true">
            LAYOUTS
          </span>
          <div className="gal__head" data-reveal>
            <div>
              <p className="kicker">
                <span className="dot" />
                03 — The layout gallery
              </p>
              <h2 className="gal__title">
                Six ways
                <br />
                to set a city.
              </h2>
            </div>
            <div className="gal__meta">
              <p className="gal__note">
                Full bleed, gallery margin, title stack, diptych, corner mark and a
                wide band crop. Same map, six completely different posters.
              </p>
              <Pick
                id="columns"
                label={MOTION_LABEL.columns}
                on={!!picked.columns}
                onToggle={togglePick}
              />
            </div>
          </div>

          <div className="gal__rows">
                          <div className="gal__viewport" ref={layoutView}>
                <div className="gal__cols" ref={layoutCols}>
                  {[0, 1, 2].map((col) => (
                    <div className="gal__col" key={`col-${col}`}>
                      {LAYOUT_GALLERY.slice(col * 2, col * 2 + 2).map((poster, i) => (
                        <Poster
                          key={poster.id}
                          {...poster}
                          index={col * 2 + i}
                          className="card--layout"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
          </div>

          <div className="gal__foot">
            <span className="gal__count">
              <b>6</b> layouts · one click each in the editor
            </span>
            <div className="gal__bar" aria-hidden="true">
              <i />
            </div>
            <span className="gal__hint">scroll ↔ travel</span>
          </div>
        </div>
      </section>

      {/* --------------------------------------- 06 · borders and presets */}
      <section className="gal gal--frames" id="borders" ref={frameRef}>
        <div className="gal__pin">
          <div className="gal__head" data-reveal>
            <div>
              <p className="kicker">
                <span className="dot" />
                04 — The border gallery
              </p>
              <h2 className="gal__title">
                The edges
                <br />
                do the framing.
              </h2>
            </div>
            <div className="gal__meta">
              <p className="gal__note">
                Double rules, hairlines, museum mats, perforated tickets, caption
                bars and arched heads — one rule per print, no extra sheet.
              </p>
              <Pick id="fan" label={MOTION_LABEL.fan} on={!!picked.fan} onToggle={togglePick} />
            </div>
          </div>

          <div className="gal__rows">
                          <div className="gal__viewport" ref={frameView}>
                <div className="gal__track">
                {FRAME_GALLERY.map((poster, i) => (
                  <Poster key={poster.id} {...poster} index={i} className="card--frame" />
                ))}
              </div>
            </div>
          </div>

          <div className="gal__foot">
            <span className="gal__count">
              <b>6</b> borders · mats, tickets, arches
            </span>
            <div className="gal__bar" aria-hidden="true">
              <i />
            </div>
            <span className="gal__hint">scroll ↔ travel</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- 05 · preset gallery */}
      <section className="gal gal--presets" id="presets" ref={presetRef}>
        <div className="gal__pin">
          <div className="gal__head" data-reveal>
            <div>
              <p className="kicker">
                <span className="dot" />
                05 — The preset gallery
              </p>
              <h2 className="gal__title">
                Four sizes,
                <br />
                one wall each.
              </h2>
            </div>
            <div className="gal__meta">
              <p className="gal__note">
                Studio, gallery, desk and oversize — each with its own stock and
                finish. Same plate, four different walls.
              </p>
              <Pick
                id="staircase"
                label={MOTION_LABEL.staircase}
                on={!!picked.staircase}
                onToggle={togglePick}
              />
            </div>
          </div>

          <div className="gal__rows">
            <div className="gal__viewport" ref={presetView}>
              <div className="gal__track">
                {PRESET_GALLERY.map((poster, i) => (
                  <Poster key={poster.id} {...poster} index={i} className="card--preset" />
                ))}
              </div>
            </div>
          </div>

          <div className="gal__foot">
            <span className="gal__count">
              <b>4</b> stock sizes · six paper stocks
            </span>
            <div className="gal__bar" aria-hidden="true">
              <i />
            </div>
            <span className="gal__hint">scroll ↔ staircase</span>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- 06 · features */}
      <section className="statement" id="features" ref={statementRef}>
        <div className="statement__grid" aria-hidden="true" />
        <div className="statement__inner">
          <p className="kicker">06 — Features</p>
          <p className="statement__big" data-reveal>
            A poster of the place you <em>actually</em> live in — not a skyline
            pulled off a stock site.
          </p>
          <div className="statement__cols">
            {STATEMENT.map((item) => (
              <div key={item.head} data-reveal>
                <h3>{item.head}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ToolsBento />
      <Steps />

      {/* ---------------------------------------------------- 07 · tagline */}
      <section className="tagline" ref={tagRef} aria-label="Any city. Any mood. One sheet.">
        <div className="tagline__row" data-dir="1">
          Any city
        </div>
        <div className="tagline__row" data-dir="-1">
          Any mood
        </div>
        <div className="tagline__row" data-dir="1">
          One sheet
        </div>
        <div className="tagline__marquee" aria-hidden="true">
          <div className="tagline__marquee-track">
            {[...CITIES, ...CITIES].map((city, i) => (
              <span key={`${city}-${i}`}>{city}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ export */}
      <section className="export" id="export" ref={exportRef}>
        <div className="export__grid">
          <div className="export__copy" data-reveal>
            <p className="kicker">Export</p>
            <h2 className="export__title">
              Print-ready,
              <br />
              not screen-ready.
            </h2>
            <p className="export__lead">
              Layered SVG, vector PDF and a 300 dpi PNG at any dimension you
              choose — from a postcard to a gallery wall.
            </p>
            <ul className="export__formats">
              <li>
                <b>PNG</b>
                <span>up to 24 × 36 in at 300 dpi</span>
              </li>
              <li>
                <b>PDF</b>
                <span>vector, with bleed and crop marks</span>
              </li>
              <li>
                <b>SVG</b>
                <span>every layer, still editable</span>
              </li>
            </ul>
            <a className="btn btn--primary" href="https://maparte.vercel.app">
              Design yours <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="export__stage" data-reveal>
            <div className="poster poster--export">
              <Corners />
              <div className="poster__sheet">
                <CityMap data={EXPORT_CITY} palette={PALETTES.terracotta} />
                <div className="poster__caption">
                  <span className="poster__city">Lisbon</span>
                  <span className="poster__meta">Portugal</span>
                  <span className="poster__meta">38.7130° N · 9.1380° W</span>
                </div>
              </div>
            </div>
            <span className="export__tag">Plate no. 006 · 50 × 70 cm</span>
          </div>
        </div>
      </section>

      <WallProof />
      <WallSets />

      {/* ------------------------------------------------------------ footer */}
      <footer className="footer">
        <div className="footer__row">
          <p className="footer__mark">MAPARTE</p>
          <nav className="footer__links" aria-label="Footer">
            <a href="#maps">Map gallery</a>
            <a href="#themes">Themes</a>
            <a href="#layouts">Layouts</a>
            <a href="#borders">Borders</a>
            <a href="#presets">Presets</a>
            <a href="#features">Features</a>
            <a href="#tools">Everything</a>
            <a href="#how">How it works</a>
            <a href="#export">Editor</a>
          </nav>
        </div>
        <div className="footer__bottom">
          <span>© 2026 Maparte — map data © OpenStreetMap contributors</span>
          <span>Vector tiles by OpenFreeMap · baked at build time</span>
        </div>
      </footer>
    </div>
  );
}
