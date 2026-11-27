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

const shotSrc = (id: string) => `/theme-previews/${id}.webp`;

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
            {total} formats across five groups: print sheets, social crops, desktop and phone
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

        {layoutGroups.map((group) => (
          <section className="cx-sec" key={group.id} aria-labelledby={`group-${group.id}`}>
            <div className="cx-sec__head">
              <h2 className="cx-sec__title" id={`group-${group.id}`}>
                {group.name}
              </h2>
              <span className="cx-sec__count">
                {group.options.length} {group.options.length === 1 ? "layout" : "layouts"}
              </span>
            </div>
            <div className="cx-grid">
              {group.options.map((layout) => {
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
                        <img
                          src={shotSrc(first.id)}
                          alt={`City map in the ${first.theme} theme, set in the ${layout.name} layout`}
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                    </span>
                    <span className="cx-card__meta">
                      {group.name} · {size}
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
                  <img
                    key={slides[slide].id}
                    src={shotSrc(slides[slide].id)}
                    alt={`City map in the ${slides[slide].theme} theme, set in the ${active.layout.name} layout`}
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
