"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { themeOptions } from "@/features/theme/infrastructure/themeRepository";
import { layoutGroups } from "@/features/layout/infrastructure/layoutRepository";
import { lineStyles } from "@/features/layout/ui/NeatlinePicker";
import "./galleryLanding.css";
import { motion, useReducedMotion } from "motion/react";
import { Magnetic, Spotlight } from "./scroll/motionFx";

type GalleryKey = "maps" | "themes" | "layouts" | "borders";
type GalleryItem = { id: string; title: string; detail: string; href: string; colors?: string[]; ratio?: number; border?: string };

const collectionInfo: Record<GalleryKey, { number: string; label: string; title: string; italic: string; description: string; motion: string }> = {
  maps: { number: "01", label: "MAP ART", title: "Map gallery", italic: "Real places, kept close.", description: "Scroll or swipe to move through MAPARTE map stories.", motion: "coverflow" },
  borders: { number: "02", label: "FRAME THE VIEW", title: "Border gallery", italic: "A finer edge for your map.", description: "Scroll or swipe through the border styles in the editor.", motion: "helix" },
  themes: { number: "03", label: "COLOUR THE MAP", title: "Theme gallery", italic: "Same streets, a different mood.", description: "Scroll or swipe through the colour palettes in MAPARTE.", motion: "warp" },
  layouts: { number: "04", label: "FIND YOUR FORMAT", title: "Layout gallery", italic: "Give the map room to breathe.", description: "Scroll or swipe through print and screen formats.", motion: "curve" },
};

const mapItems: GalleryItem[] = [
  { id: "where-we-met", title: "Where We Met", detail: "PARIS · FRANCE", href: "/?dist=5235000&city=Paris&country=France&title=Where%20We%20Met" },
  { id: "hometown-roots", title: "Hometown Roots", detail: "DEHRADUN · INDIA", href: "/?dist=5235000&city=Dehradun&country=India&title=Hometown%20Roots" },
  { id: "travel-memories", title: "Travel Memories", detail: "TOKYO · JAPAN", href: "/?dist=5235000&city=Tokyo&country=Japan&title=Travel%20Memories" },
  { id: "she-said-yes", title: "She Said Yes", detail: "AMALFI COAST · ITALY", href: "/?dist=5235000&city=Amalfi%20Coast&title=She%20Said%20Yes" },
  { id: "first-home", title: "Our First Home", detail: "BROOKLYN · NEW YORK", href: "/?dist=5235000&city=Brooklyn&title=Our%20First%20Home" },
  { id: "baby-arrival", title: "The Day You Were Born", detail: "LONDON · UNITED KINGDOM", href: "/?dist=5235000&city=London&country=United%20Kingdom&title=The%20Day%20You%20Were%20Born" },
];

function editorUrl(params: Record<string, string>) {
  return `/?${new URLSearchParams({ dist: "5235000", ...params }).toString()}`;
}

function getItems(category: GalleryKey): GalleryItem[] {
  if (category === "maps") return mapItems;
  if (category === "themes") return themeOptions.map((theme) => ({
    id: theme.id, title: theme.name, detail: "MAP THEME", href: editorUrl({ theme: theme.id }), colors: theme.palette.slice(0, 6),
  }));
  if (category === "layouts") return layoutGroups.flatMap((group) => group.options.map((layout) => ({
    id: layout.id, title: layout.name, detail: `${group.name.toUpperCase()} · ${layout.widthCm} × ${layout.heightCm} CM`,
    href: editorUrl({ layout: layout.id }), ratio: layout.widthCm / layout.heightCm,
  })));
  return lineStyles.map((style) => ({
    id: style.id, title: style.name, detail: `${style.pattern.toUpperCase()} · BORDER STYLE`,
    href: editorUrl({ border: style.id }), border: style.pattern,
  }));
}

function SlideArtwork({ category, item }: { category: GalleryKey; item: GalleryItem }) {
  const reduced = useReducedMotion();
  return <motion.div
    className={`gallery-art gallery-art--${category}`}
    aria-hidden="true"
    initial={reduced ? undefined : { clipPath: "inset(100% 0 0 0)" }}
    animate={reduced ? undefined : { clipPath: "inset(0% 0 0 0)" }}
    transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
  >
    {category === "themes" && <div className="gallery-art__palette">{(item.colors || []).map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}</div>}
    {category === "layouts" && <div className="gallery-art__paper" style={{ aspectRatio: String(item.ratio || 1) }}><i /></div>}
    {category === "borders" && <div className={`gallery-art__frame gallery-art__frame--${item.border || "single"}`}><i /></div>}
    {category === "maps" && <div className="gallery-art__streets"><i /><i /><i /><i /><i /><i /></div>}
    <span className="gallery-art__index">{item.id.replace(/-/g, " ").toUpperCase()}</span>
  </motion.div>;
}

export default function GalleryLanding() {
  const search = new URLSearchParams(window.location.search);
  const requested = search.get("gallery") as GalleryKey | null;
  const category: GalleryKey = requested && requested in collectionInfo ? requested : "maps";
  const info = collectionInfo[category];
  const items = useMemo(() => getItems(category), [category]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastWheel = useRef(0);
  const current = items[active % Math.max(items.length, 1)];

  const advance = (direction: number) => setActive((index) => (index + direction + items.length) % items.length);

  useEffect(() => {
    document.title = `${info.title} — MAPARTE`;
    return () => { document.title = "MAPARTE | Create Digital Map Art & Phone Wallpapers"; };
  }, [info.title]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView || items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setActive((index) => (index + 1) % items.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused, inView, items.length]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 18) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel.current < 620) return;
      lastWheel.current = now;
      advance(event.deltaY > 0 ? 1 : -1);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [items.length]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => { pointerStart.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!pointerStart.current) return;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 34) return;
    advance(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : -1) : (dy < 0 ? 1 : -1));
  };

  return <main className={`gallery-page gallery-page--${category}`}>
    <header className="gallery-page__header">
      <a className="gallery-page__brand" href="/">MAPARTE</a>
      <Magnetic strength={0.16} pull={7}>
        <a className="gallery-page__back" href="/">← Back</a>
      </Magnetic>
    </header>
    <section className="gallery-page__content" aria-labelledby="gallery-title">
      <div className="gallery-page__intro">
        <span className="gallery-page__eyebrow">{info.number} / {info.label}</span>
        <h1 id="gallery-title">{info.title}<br /><em>{info.italic}</em></h1>
        <p>{info.description}</p>
      </div>
      {current && <section
        className={`gallery-stage gallery-stage--${info.motion}`}
        ref={stageRef}
        aria-label={`${info.title} slide ${active + 1} of ${items.length}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); advance(1); }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); advance(-1); }
        }}
        tabIndex={0}
      >
        <div className="gallery-stage__slide" key={current.id}>
          <Spotlight
            radius={420}
            tint="rgba(214, 255, 107, 0.14)"
            ring="rgba(214, 255, 107, 0.85)"
          />
          <SlideArtwork category={category} item={current} />
          <div className="gallery-stage__caption">
            <span>{current.detail}</span>
            <h2>{current.title}</h2>
            <Magnetic>
              <a href={current.href}>Open this in the editor <i aria-hidden="true">↗</i></a>
            </Magnetic>
          </div>
        </div>
        <div className="gallery-stage__progress" aria-hidden="true">
          {items.map((item, index) => <i key={item.id} className={index === active ? "is-active" : ""} />)}
        </div>
        <p className="gallery-stage__hint">{String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} <span>Scroll or swipe to explore</span></p>
      </section>}
    </section>
  </main>;
}
