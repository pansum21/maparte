import { useEffect } from "react";
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
      <span className="gallery-landing__palette" aria-hidden="true">{theme.palette.slice(0, 6).map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}</span>
      <h2>{theme.name}</h2><p>{theme.description}</p><small>Try this theme</small>
    </a>)}
  </div>;

  if (category === "layouts") return <div className="gallery-landing__layout-groups">
    {layoutGroups.map((group) => <section className="gallery-landing__layout-group" key={group.id}>
      <h2>{group.name}</h2><div className="gallery-landing__grid gallery-landing__grid--layouts">
        {group.options.map((layout) => <a className="gallery-landing__card gallery-landing__card--layout" href={editorUrl({ layout: layout.id })} key={layout.id}>
          <span className="gallery-landing__layout-shape" style={{ aspectRatio: `${layout.widthCm} / ${layout.heightCm}` }} aria-hidden="true"><i /></span>
          <h3>{layout.name}</h3><p>{layout.description || `${layout.widthCm} × ${layout.heightCm} cm`}</p><small>Use this layout</small>
        </a>)}
      </div>
    </section>)}
  </div>;

  if (category === "borders") return <div className="gallery-landing__grid gallery-landing__grid--borders">
    {lineStyles.map((style) => <a className="gallery-landing__card gallery-landing__card--border" href={editorUrl({ border: style.id })} key={style.id}>
      <span className={`gallery-landing__border-sample gallery-landing__border-sample--${style.pattern}`} aria-hidden="true"><i /></span>
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
      <GalleryCards category={category} />
      <a className="gallery-landing__make" href={editorUrl({})}>Start with a place</a>
    </section>
    <footer className="gallery-landing__footer"><a href="/">MAPARTE.COM</a><span>Map it. Make it yours.</span></footer>
  </main>;
}
