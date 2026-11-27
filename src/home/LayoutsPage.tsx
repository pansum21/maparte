import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { layoutGroups } from "@/features/layout/infrastructure/layoutRepository";
import "@/home/scroll/fonts";
import "./collections.css";

/** Five real street-map renders per layout, rotated so neighbouring cards differ. */
const POSTER_SLIDES = [
  { id: "blueprint", theme: "Blueprint" },
  { id: "terracotta", theme: "Terracotta" },
  { id: "noir", theme: "Noir" },
  { id: "sage", theme: "Sage" },
  { id: "neon", theme: "Neon" },
  { id: "watercolor_wash", theme: "Watercolour Wash" },
  { id: "retro_vintage", theme: "Retro Vintage" },
  { id: "carrara", theme: "Carrara" },
  { id: "blush", theme: "Blush" },
  { id: "japanese_ink", theme: "Japanese Ink" },
  { id: "midnight_blue", theme: "Midnight Blue" },
  { id: "sunset", theme: "Sunset" },
];

const slidesFor = (index: number) =>
  Array.from({ length: 5 }, (_, step) => POSTER_SLIDES[(index + step) % POSTER_SLIDES.length]);

/** One city per layout, in the same order scripts/generate_layout_previews.cjs
    renders them, so the alt text names the city that is actually in the image. */
const PREVIEW_CITIES = [
  "Paris",
  "Tokyo",
  "Lisbon",
  "New York",
  "Copenhagen",
  "Barcelona",
  "Istanbul",
  "Mexico City",
  "Cape Town",
  "Seoul",
  "Amsterdam",
  "Stockholm",
];

/** Must match the hash in scripts/generate_layout_previews.cjs: the city is a
    property of the layout id, so reordering the catalog cannot desync it. */
const hashId = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const cityFor = (layoutId: string) => PREVIEW_CITIES[hashId(layoutId) % PREVIEW_CITIES.length];

const shotSrc = (layoutId: string, step: number) => `/layout-previews/${layoutId}-${step}`;

/** Same frame at two widths: 360px for the cards, 720px once the sheet opens it. */
function Shot({
  layoutId,
  step,
  alt,
  sizes,
  eager,
}: {
  layoutId: string;
  step: number;
  alt: string;
  sizes: string;
  eager?: boolean;
}) {
  const base = shotSrc(layoutId, step);
  return (
    <picture>
      <source type="image/avif" srcSet={`${base}-360.avif 360w, ${base}.avif 720w`} sizes={sizes} />
      <img
        src={`${base}.webp`}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

const shapeLabel = (ratio: number) =>
  ratio >= 1 ? `${ratio.toFixed(2)} : 1` : `1 : ${(1 / ratio).toFixed(2)}`;

/** Frames are plain boxes, so every layout keeps its own shape (a photo would
    fall back to its own aspect ratio instead). */
const frameStyle = (ratio: number) =>
  ratio >= 1
    ? { width: "100%", aspectRatio: String(ratio) }
    : { height: "var(--cx-frame-h)", aspectRatio: String(ratio), maxWidth: "100%" };

const clampRatio = (width: number, height: number) =>
  Math.max(0.34, Math.min(2.8, width / Math.max(height, 0.01)));

export default function LayoutsPage() {
  const entries = useMemo(
    () => layoutGroups.flatMap((group) => group.options.map((layout) => ({ layout, group }))),
    [],
  );
  const indexById = useMemo(
    () => new Map(entries.map((entry, index) => [entry.layout.id, index])),
    [entries],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const backRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const needle = query.trim().toLowerCase();

  const sections = useMemo(
    () =>
      layoutGroups
        .filter((entry) => group === "all" || entry.id === group)
        .map((entry) => ({
          group: entry,
          options: needle
            ? entry.options.filter((layout) =>
                `${layout.name} ${layout.description} ${entry.name} ${layout.width} × ${layout.height} ${layout.unit}`
                  .toLowerCase()
                  .includes(needle),
              )
            : entry.options,
        }))
        .filter((section) => section.options.length > 0),
    [group, needle],
  );
  const shown = sections.reduce((count, section) => count + section.options.length, 0);
  const filtering = needle.length > 0 || group !== "all";

  const activeIndex = activeId ? (indexById.get(activeId) ?? -1) : -1;
  const active = activeIndex >= 0 ? entries[activeIndex] : null;
  const slides = active ? slidesFor(activeIndex) : [];

  const close = useCallback(() => setActiveId(null), []);
  const open = useCallback((id: string) => {
    setSlide(0);
    setActiveId(id);
  }, []);

  const step = useCallback(
    (direction: number) => {
      if (activeIndex < 0) return;
      const next = (activeIndex + direction + entries.length) % entries.length;
      setSlide(0);
      setActiveId(entries[next].layout.id);
    },
    [activeIndex, entries],
  );

  const reset = useCallback(() => {
    setQuery("");
    setGroup("all");
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    document.title = "Map poster, wallpaper and web layouts — MAPARTE";
    return () => {
      document.title = "MAPARTE | Create Digital Map Art & Phone Wallpapers";
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") setSlide((value) => (value + 1) % 5);
      if (event.key === "ArrowLeft") setSlide((value) => (value + 4) % 5);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    backRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [activeId, close]);

  useEffect(() => {
    if (!activeId) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % 5), 2800);
    return () => window.clearInterval(timer);
  }, [activeId]);

  const total = entries.length;

  return (
    <div className="cx">
      <header className="cx-head">
        <a className="cx-head__logo" href="/">
          <span className="cx-head__dot" aria-hidden="true" />
          Maparte
        </a>
        <nav className="cx-head__nav" aria-label="Collections">
          <a href="/layouts" aria-current="page">
            Layouts
          </a>
          <a href="/themes">Themes</a>
          <a href="/blog">Blog</a>
        </nav>
        <a className="cx-head__cta" href="/?editor=true">
          Create a map <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className="cx-hero">
          <p className="cx-kicker">
            <i aria-hidden="true" /> 04 — The layout gallery
          </p>
          <h1 className="cx-title">
            Every layout,
            <br />
            at real size.
          </h1>
          <p className="cx-lead">
            {total} formats across {layoutGroups.length} groups: print sheets, social crops, desktop and phone
            wallpapers, and web banners. Each one opens with five real map posters in its own
            shape, so you can see how much of a city actually fits before you choose.
          </p>
          <div className="cx-stats">
            <span>
              <b>{total}</b> layouts
            </span>
            <span>
              <b>{layoutGroups.length}</b> groups
            </span>
            <span>
              <b>5</b> maps per layout
            </span>
            <span>
              <b>300</b> dpi print export
            </span>
          </div>
        </section>

        <section className="cx-tools" aria-label="Find a layout">
          <div className="cx-tools__row">
            <div className="cx-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                id="layout-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a size, a shape or a name — A3, story, ultrawide…"
                aria-label="Search layouts"
                autoComplete="off"
              />
              {query && (
                <button type="button" className="cx-search__clear" onClick={() => setQuery("")}>
                  Clear<span aria-hidden="true"> ×</span>
                </button>
              )}
            </div>
            <p className="cx-tools__count" aria-live="polite">
              {filtering ? `${shown} of ${total} layouts` : `${total} layouts`}
            </p>
          </div>
          <div className="cx-chips" role="group" aria-label="Filter by group">
            <button
              type="button"
              className="cx-chip"
              aria-pressed={group === "all"}
              onClick={() => setGroup("all")}
            >
              All <span>{total}</span>
            </button>
            {layoutGroups.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className="cx-chip"
                aria-pressed={group === entry.id}
                onClick={() => setGroup(entry.id)}
              >
                {entry.name} <span>{entry.options.length}</span>
              </button>
            ))}
          </div>
        </section>

        {sections.length === 0 && (
          <section className="cx-sec cx-empty" aria-live="polite">
            <h2 className="cx-sec__title">Nothing matches “{query.trim()}”.</h2>
            <p>
              Try a paper size (A4, 24 × 36), a shape (square, story, circle) or a kind of screen
              (phone, desktop).
            </p>
            <button type="button" className="cx-btn cx-btn--ghost" onClick={reset}>
              Show all {total} layouts
            </button>
          </section>
        )}

        {sections.map(({ group: entry, options }) => (
          <section className="cx-sec" key={entry.id} aria-labelledby={`group-${entry.id}`}>
            <div className="cx-sec__head">
              <h2 className="cx-sec__title" id={`group-${entry.id}`}>
                {entry.name}
              </h2>
              <span className="cx-sec__count">
                {options.length} {options.length === 1 ? "layout" : "layouts"}
              </span>
            </div>
            <div className="cx-grid">
              {options.map((layout) => {
                const index = indexById.get(layout.id) ?? 0;
                const first = slidesFor(index)[0];
                const size =
                  layout.unit === "cm"
                    ? `${layout.width} × ${layout.height} cm`
                    : `${layout.width} × ${layout.height} px`;
                return (
                  <button
                    type="button"
                    className="cx-card"
                    key={layout.id}
                    onClick={() => open(layout.id)}
                    aria-label={`Preview ${layout.name}, ${size}`}
                  >
                    <span className="cx-card__shot">
                      <span
                        className="cx-card__frame"
                        style={frameStyle(clampRatio(layout.widthCm, layout.heightCm))}
                      >
                        <Shot
                          layoutId={layout.id}
                          step={0}
                          alt={`${cityFor(layout.id)} street map in the ${first.theme} theme, set in the ${layout.name} layout`}
                          sizes="(min-width: 1100px) 240px, (min-width: 620px) 30vw, 42vw"
                        />
                      </span>
                    </span>
                    <span className="cx-card__meta">
                      {entry.name} · {size}
                    </span>
                    <span className="cx-card__name">{layout.name}</span>
                    <span className="cx-card__note">{layout.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      <footer className="cx-foot">
        Maparte is digital only: you design in the browser and download a file.{" "}
        <a href="/themes">See all colour themes</a> · <a href="/blog">Read the guides</a>.
      </footer>

      {active && (
        <div
          className="cx-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.layout.name} preview`}
        >
          <div className="cx-sheet__bar">
            <button type="button" className="cx-back" onClick={close} ref={backRef}>
              <span aria-hidden="true">←</span> Back to all layouts
            </button>
            <span className="cx-sheet__name">
              {active.group.name} · {activeIndex + 1} / {total}
            </span>
          </div>
          <div className="cx-sheet__body">
            <div>
              <div className="cx-stage">
                <span
                  className="cx-stage__frame"
                  style={frameStyle(clampRatio(active.layout.widthCm, active.layout.heightCm))}
                >
                  <Shot
                    layoutId={active.layout.id}
                    step={slide}
                    eager
                    alt={`${cityFor(active.layout.id)} street map in the ${slides[slide].theme} theme, set in the ${active.layout.name} layout`}
                    sizes="(min-width: 880px) 55vw, 88vw"
                  />
                </span>
              </div>
              <div className="cx-dots" role="group" aria-label="Map previews">
                {slides.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-current={index === slide}
                    aria-label={`Show the ${item.theme} theme`}
                    onClick={() => setSlide(index)}
                  />
                ))}
                <span className="cx-dots__city">{slides[slide].theme}</span>
              </div>
            </div>

            <div className="cx-info">
              <h1>{active.layout.name}</h1>
              <p>{active.layout.description}</p>
              <div className="cx-specs">
                <div>
                  <span>Group</span>
                  <b>{active.group.name}</b>
                </div>
                <div>
                  <span>Size</span>
                  <b>
                    {active.layout.width} × {active.layout.height} {active.layout.unit}
                  </b>
                </div>
                <div>
                  <span>Shape</span>
                  <b>{shapeLabel(clampRatio(active.layout.widthCm, active.layout.heightCm))}</b>
                </div>
                <div>
                  <span>Export</span>
                  <b>PNG · PDF · SVG</b>
                </div>
              </div>
              <div className="cx-actions">
                <a className="cx-btn" href={`/?layout=${active.layout.id}`}>
                  Use this layout <span aria-hidden="true">↗</span>
                </a>
                <a className="cx-btn cx-btn--ghost" href="/themes">
                  Browse themes
                </a>
              </div>
              <div className="cx-pager">
                <button type="button" onClick={() => step(-1)}>
                  <span>← Previous</span>
                  {entries[(activeIndex - 1 + total) % total].layout.name}
                </button>
                <button type="button" onClick={() => step(1)}>
                  <span>Next →</span>
                  {entries[(activeIndex + 1) % total].layout.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
