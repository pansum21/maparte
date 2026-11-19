import { useEffect, useMemo, useRef, useState } from "react";
import { themeOptions } from "@/features/theme/infrastructure/themeRepository";
import { layoutGroups } from "@/features/layout/infrastructure/layoutRepository";
import { lineStyles } from "@/features/layout/ui/NeatlinePicker";
import { OCCASION_TEMPLATES } from "@/features/poster/domain/occasionTemplates";
import "./galleryLanding.css";

const mapArt = [
  { title: "Where We Met", place: "Paris · France", file: "where-we-met.png" },
  { title: "Hometown Roots", place: "Dehradun · India", file: "hometown-roots.png" },
  { title: "Travel Memories", place: "Tokyo · Japan", file: "travel-memories.png" },
  { title: "She Said Yes", place: "Amalfi Coast · Italy", file: "she-said-yes.png" },
  { title: "Our First Home", place: "Brooklyn · New York", file: "first-home.png" },
  { title: "The Day You Were Born", place: "London · United Kingdom", file: "baby-arrival.png" },
  { title: "Wedding Day", place: "A place to remember", file: "wedding-day.png" },
  { title: "Marathon Finish", place: "A route worth keeping", file: "marathon-race.png" },
  { title: "Mountain Summit", place: "The view from the top", file: "mountain-summit.png" },
];

const presetArtById: Record<string, string> = {
  where_we_met: "where-we-met.png",
  she_said_yes: "she-said-yes.png",
  our_wedding_day: "wedding-day.png",
  our_first_home: "first-home.png",
  travel_memories: "travel-memories.png",
  marathon_race: "marathon-race.png",
  baby_arrival: "baby-arrival.png",
  hometown_roots: "hometown-roots.png",
  mountain_summit: "mountain-summit.png",
};

const collectionInfo = {
  maps: { number: "01", label: "MAP ART", title: "Map gallery", italic: "Real places, kept close.", description: "A few real MAPARTE designs, each made around a place and the story attached to it." },
  borders: { number: "02", label: "FRAME THE VIEW", title: "Border gallery", italic: "A finer edge for your map.", description: "Compare the border styles available in the editor, from a single line to a wider gallery frame." },
  themes: { number: "03", label: "COLOUR THE MAP", title: "Theme gallery", italic: "Same streets, a different mood.", description: "Browse the colour palettes already in MAPARTE. Choose one to open the editor with that theme selected." },
  layouts: { number: "04", label: "FIND YOUR FORMAT", title: "Layout gallery", italic: "Give the map room to breathe.", description: "See the print and screen formats available in the editor, grouped by their intended use." },
  presets: { number: "05", label: "START WITH A STORY", title: "Preset gallery", italic: "A thoughtful place to begin.", description: "Begin with an occasion, then change the location, words and details to make the design yours." },
} as const;

type GalleryKey = keyof typeof collectionInfo;

type GalleryPreviewItem = { title: string; subtitle: string; image: string; href: string };

function GalleryShowcase({ items, label }: { items: GalleryPreviewItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const reducedMotion = useRef(false);
  const inView = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => { inView.current = entry.isIntersecting; }, { threshold: 0.25 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => {
      if (!reducedMotion.current && inView.current && document.visibilityState === "visible") {
        setActive((current) => (current + 1) % items.length);
      }
    }, 4600);
    return () => window.clearInterval(timer);
  }, [paused, items.length]);

  if (!items.length) return null;
  const selected = items[active % items.length];
  return <section className="gallery-showcase" ref={stageRef} aria-label={`${label} image preview`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
    <a className="gallery-showcase__image" href={selected.href} aria-label={`Open ${selected.title} in the MAPARTE editor`}>
      <img src={selected.image} alt={`${selected.title} — MAPARTE ${label.toLowerCase()} example`} loading="eager" fetchPriority="high" />
      <span className="gallery-showcase__image-caption"><small>{selected.subtitle}</small><strong>{selected.title}</strong><i aria-hidden="true">↗</i></span>
    </a>
    <div className="gallery-showcase__controls" aria-label="Choose a preview image">
      <button type="button" aria-label="Previous preview" onClick={() => setActive((active + items.length - 1) % items.length)}>←</button>
      <div className="gallery-showcase__dots">{items.map((item, index) => <button key={`${item.title}-${index}`} className={index === active ? "is-active" : ""} aria-label={`Show ${item.title}`} aria-pressed={index === active} type="button" onClick={() => setActive(index)} />)}</div>
      <button type="button" aria-label="Next preview" onClick={() => setActive((active + 1) % items.length)}>→</button>
      <span>{String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
    </div>
    <p className="gallery-showcase__note">Images rotate while this preview is in view. Hover, focus or tap to explore at your pace.</p>
  </section>;
}

function editorUrl(params: Record<string, string>) {
  const query = new URLSearchParams({ dist: "5235000", ...params });
  return `/?${query.toString()}`;
}

function GalleryCards({ category }: { category: GalleryKey }) {
  if (category === "maps") return <div className="gallery-landing__grid gallery-landing__grid--maps">
    {mapArt.map((item) => <a className="gallery-landing__card gallery-landing__card--map" href={editorUrl({ city: item.place.split(" · ")[0], title: item.title })} key={item.file}>
      <img src={`/assets/map-posters/${item.file}`} alt={`${item.title} MAPARTE map artwork`} loading="lazy" />
      <span>{item.place}</span><h2>{item.title}</h2><small>Open this idea in the editor</small>
    </a>)}
  </div>;

  if (category === "themes") return <div className="gallery-landing__grid gallery-landing__grid--themes">
    {themeOptions.map((theme) => <a className="gallery-landing__card gallery-landing__card--theme" href={editorUrl({ theme: theme.id })} key={theme.id}>
      <img className="gallery-landing__theme-art" src={`/theme-previews/${theme.id}.webp`} alt={`${theme.name} city-map theme preview`} loading="lazy" />
      <span className="gallery-landing__palette" aria-hidden="true">{theme.palette.slice(0, 6).map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}</span>
      <h2>{theme.name}</h2><p>{theme.description}</p><small>Try this theme</small>
    </a>)}
  </div>;

  if (category === "layouts") return <div className="gallery-landing__layout-groups">
    {layoutGroups.map((group) => <section className="gallery-landing__layout-group" key={group.id}>
      <h2>{group.name}</h2><div className="gallery-landing__grid gallery-landing__grid--layouts">
        {group.options.map((layout) => <a className="gallery-landing__card gallery-landing__card--layout" href={editorUrl({ layout: layout.id })} key={layout.id}>
          <span className="gallery-landing__layout-shape" style={{ aspectRatio: `${layout.widthCm} / ${layout.heightCm}` }} aria-hidden="true"><img src={`/assets/map-posters/${mapArt[group.options.indexOf(layout) % mapArt.length].file}`} alt="" loading="lazy" /><i /></span>
          <h3>{layout.name}</h3><p>{layout.description || `${layout.widthCm} × ${layout.heightCm} cm`}</p><small>Use this layout</small>
        </a>)}
      </div>
    </section>)}
  </div>;

  if (category === "borders") return <div className="gallery-landing__grid gallery-landing__grid--borders">
    {lineStyles.map((style, index) => <a className="gallery-landing__card gallery-landing__card--border" href={editorUrl({ border: style.id })} key={style.id}>
      <span className={`gallery-landing__border-sample gallery-landing__border-sample--${style.pattern}`} aria-hidden="true" style={{ backgroundImage: `url(/assets/map-posters/${mapArt[index % mapArt.length].file})` }}><i /></span>
      <h2>{style.name}</h2><p>Preview this frame around your map in the editor.</p><small>Try this border</small>
    </a>)}
  </div>;

  return <div className="gallery-landing__grid gallery-landing__grid--maps">
    {OCCASION_TEMPLATES.map((preset) => <a className="gallery-landing__card gallery-landing__card--map" href={editorUrl({ title: preset.cityText, tagline: preset.countryText, theme: preset.themeId })} key={preset.id}>
      <img src={`/assets/map-posters/${presetArtById[preset.id] || "hometown-roots.png"}`} alt={`${preset.title} MAPARTE map example`} loading="lazy" />
      <span>{preset.badge.replace(/[^\p{L}\p{N} ·&]/gu, "").trim()}</span><h2>{preset.title}</h2><p>{preset.tagline}</p><small>Start with this idea</small>
    </a>)}
  </div>;
}

export default function GalleryLanding() {
  const search = new URLSearchParams(window.location.search);
  const requested = search.get("gallery") as GalleryKey | null;
  const category: GalleryKey = requested && requested in collectionInfo ? requested : "maps";
  const info = collectionInfo[category];

  const showcaseItems = useMemo<GalleryPreviewItem[]>(() => {
    if (category === "maps") return mapArt.slice(0, 6).map((item) => ({ title: item.title, subtitle: item.place, image: `/assets/map-posters/${item.file}`, href: editorUrl({ city: item.place.split(" · ")[0], title: item.title }) }));
    if (category === "themes") return themeOptions.map((theme) => ({ title: theme.name, subtitle: "MAP THEME", image: `/theme-previews/${theme.id}.webp`, href: editorUrl({ theme: theme.id }) }));
    if (category === "layouts") return layoutGroups.flatMap((group) => group.options).slice(0, 12).map((layout, index) => ({ title: layout.name, subtitle: `${layout.widthCm} × ${layout.heightCm} CM`, image: `/assets/map-posters/${mapArt[index % mapArt.length].file}`, href: editorUrl({ layout: layout.id }) }));
    if (category === "borders") return lineStyles.map((style, index) => ({ title: style.name, subtitle: "BORDER STYLE", image: `/assets/map-posters/${mapArt[index % mapArt.length].file}`, href: editorUrl({ border: style.id }) }));
    return OCCASION_TEMPLATES.map((preset) => ({ title: preset.title, subtitle: preset.badge.replace(/[^\p{L}\p{N} ·&]/gu, "").trim(), image: `/assets/map-posters/${presetArtById[preset.id] || "hometown-roots.png"}`, href: editorUrl({ title: preset.cityText, tagline: preset.countryText, theme: preset.themeId }) }));
  }, [category]);

  useEffect(() => {
    document.title = `${info.title} — MAPARTE`;
    return () => { document.title = "MAPARTE | Create Digital Map Art & Phone Wallpapers"; };
  }, [info.title]);

  return <main className="gallery-landing">
    <header className="gallery-landing__header">
      <a className="gallery-landing__brand" href="/">MAPARTE</a>
      <a className="gallery-landing__back" href="/">Back to the journey</a>
    </header>
    <section className="gallery-landing__content" aria-labelledby="gallery-title">
      <div className="gallery-landing__intro">
        <span className="gallery-landing__eyebrow">{info.number} / {info.label}</span>
        <h1 id="gallery-title">{info.title}<br /><em>{info.italic}</em></h1>
        <p className="gallery-landing__description">{info.description}</p>
      </div>
      <nav className="gallery-landing__switcher" aria-label="Browse MAPARTE galleries">
        {(Object.keys(collectionInfo) as GalleryKey[]).map((key) => <a className={key === category ? "is-active" : ""} aria-current={key === category ? "page" : undefined} href={`/?gallery=${key}`} key={key}>{collectionInfo[key].title}</a>)}
      </nav>
      <GalleryShowcase items={showcaseItems} label={info.title} />
      <GalleryCards category={category} />
      <a className="gallery-landing__make" href={editorUrl({})}>Start with a place</a>
    </section>
    <footer className="gallery-landing__footer"><a href="/">MAPARTE.COM</a><span>Map it. Make it yours.</span></footer>
  </main>;
}

