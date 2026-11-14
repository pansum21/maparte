import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, AttributionControl, NavigationControl, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import "./homepage.css";

setWorkerUrl(workerUrl);

type MapSample = {
  title: string;
  place: string;
  story: string;
  theme: string;
  category: string;
  image: string;
  landing: string;
  accent: string;
};

const samples: MapSample[] = [
  { title: "Where We Met", place: "Paris, France", story: "A favorite corner, made personal", theme: "Carrara", category: "Milestones", image: "where-we-met.png", landing: "/where-we-met", accent: "#c72c50" },
  { title: "Hometown Roots", place: "Dehradun to Mussoorie, India", story: "The roads that raised you", theme: "Carrara", category: "Places", image: "hometown-roots.png", landing: "/hometown-roots", accent: "#7b7a45" },
  { title: "Travel Memories", place: "Tokyo, Japan", story: "A journey worth keeping", theme: "Carrara", category: "Journeys", image: "travel-memories.png", landing: "/travel-memories", accent: "#c69a42" },
  { title: "Our Wedding Day", place: "Florence, Italy", story: "The place where your story changed", theme: "Carrara", category: "Milestones", image: "wedding-day.png", landing: "/our-wedding-day", accent: "#b87b55" },
  { title: "42.195 KM Finisher", place: "Boston, USA", story: "A route you earned, mile by mile", theme: "Carrara", category: "Journeys", image: "marathon-race.png", landing: "/marathon-race", accent: "#4c8e9a" },
  { title: "Peak & Trail Summit", place: "Mont Blanc, France", story: "A summit with a story behind it", theme: "Carrara", category: "Outdoors", image: "mountain-summit.png", landing: "/mountain-summit", accent: "#648b73" },
  { title: "Our First Home", place: "Brooklyn, New York", story: "The first place that felt like yours", theme: "Carrara", category: "Places", image: "first-home.png", landing: "/our-first-home", accent: "#547a8f" },
  { title: "The Day You Were Born", place: "London, United Kingdom", story: "A new beginning, marked on the map", theme: "Carrara", category: "Milestones", image: "baby-arrival.png", landing: "/baby-arrival", accent: "#9b718b" },
  { title: "She Said Yes", place: "Amalfi Coast, Italy", story: "Remember the exact place you asked", theme: "Carrara", category: "Milestones", image: "she-said-yes.png", landing: "/she-said-yes", accent: "#c28e3b" },
];

const filters = ["All maps", "Milestones", "Places", "Journeys", "Outdoors"];

function EditorLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <a className={className} href="/?dist=4491">{children}</a>;
}

const globeThemeOptions = ["Midnight Blue", "Carrara", "Blue Water", "Golden Dusk", "Pale Dawn", "Soft Gray", "Retro", "Commander"] as const;
type GlobeTheme = typeof globeThemeOptions[number];
const globePalettes = {
  Carrara: { sea: "#aebbb5", land: "#efe6d9", park: "#c5c2aa", road: "#687f75", label: "#273833", space: "#101a22", sky: "#667c80" },
  "Midnight Blue": { sea: "#101d3b", land: "#8191b5", park: "#55688f", road: "#dec9a7", label: "#fff6eb", space: "#070d1d", sky: "#1b2d57" },
  "Blue Water": { sea: "#46bcec", land: "#f2f2f2", park: "#dcece8", road: "#4a5568", label: "#222222", space: "#09213a", sky: "#168dc2" },
  "Golden Dusk": { sea: "#20313a", land: "#5a4b3b", park: "#59604c", road: "#e3b76c", label: "#fff0d7", space: "#10191e", sky: "#b8844e" },
  "Pale Dawn": { sea: "#b9d0d8", land: "#f2ebdf", park: "#d9ded2", road: "#887b75", label: "#32363a", space: "#152534", sky: "#829fad" },
  "Soft Gray": { sea: "#aeb8bc", land: "#dfe2e1", park: "#cbd2ce", road: "#626b70", label: "#283238", space: "#11191d", sky: "#718188" },
  Retro: { sea: "#8eaa9a", land: "#d8c9a5", park: "#aeb28d", road: "#a45c3c", label: "#443530", space: "#1b201d", sky: "#9c7954" },
  Commander: { sea: "#30473c", land: "#79836a", park: "#53674f", road: "#d0bb84", label: "#f5eedb", space: "#111a16", sky: "#607960" },
};
const homepageGlobeWidthsScaled = new WeakSet<MapLibreMap>();

function applyHomepageGlobeTheme(map: MapLibreMap, theme: GlobeTheme) {
  const palette = globePalettes[theme];
  const fogCapableMap = map as MapLibreMap & { setFog?: (options: Record<string, unknown>) => void };
  try { fogCapableMap.setFog?.({ color: palette.space, highColor: palette.sky, spaceColor: palette.space, starIntensity: theme === "Midnight Blue" ? 0.7 : 0.48 }); } catch { /* Keep the globe usable if fog is unavailable. */ }

  const styleLayers = map.getStyle().layers || [];
  const beforeRoads = styleLayers.find((layer) => layer.id.startsWith("road-"))?.id;
  if (!map.getLayer("homepage-country-boundary")) {
    map.addLayer({
      id: "homepage-country-boundary",
      type: "line",
      source: "openfreemap",
      "source-layer": "boundary",
      filter: ["==", "admin_level", 2],
      paint: {
        "line-color": "#c5d6ff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.58, 3, 0.82, 6, 0.98],
        "line-opacity": 0.86,
      },
    }, beforeRoads);
  }
  if (!map.getLayer("homepage-state-boundary")) {
    map.addLayer({
      id: "homepage-state-boundary",
      type: "line",
      source: "openfreemap",
      "source-layer": "boundary",
      minzoom: 4.5,
      filter: ["==", "admin_level", 4],
      paint: {
        "line-color": "#9fc0ff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4.5, 0.48, 6, 0.62, 9, 0.78],
        "line-opacity": 0.78,
      },
    }, beforeRoads);
  }

  if (!homepageGlobeWidthsScaled.has(map)) {
    for (const layer of map.getStyle().layers || []) {
      if (!layer.id.startsWith("road-") || layer.type !== "line") continue;
      const width = map.getPaintProperty(layer.id, "line-width");
      if (width !== undefined && width !== null) {
        // Scale each zoom stop in place. MapLibre requires the zoom expression to
        // stay at the top level, so wrapping this expression in multiplication fails.
        if (Array.isArray(width) && width[0] === "interpolate" && width[2]?.[0] === "zoom") {
          const scaledWidth = width.map((part, index) =>
            index >= 4 && index % 2 === 0 && typeof part === "number" ? part * 0.08 : part,
          );
          map.setPaintProperty(layer.id, "line-width", scaledWidth as any);
        }
      }
    }
    homepageGlobeWidthsScaled.add(map);
  }

  for (const layer of map.getStyle().layers || []) {
    try {
      const id = layer.id.toLowerCase();
      if (id === "homepage-country-boundary") {
        map.setPaintProperty(layer.id, "line-color", theme === "Midnight Blue" ? "#c5d6ff" : palette.road);
        continue;
      }
      if (id === "homepage-state-boundary") {
        map.setPaintProperty(layer.id, "line-color", theme === "Midnight Blue" ? "#9fc0ff" : palette.road);
        continue;
      }
      if (layer.type === "background" && layer.paint?.["background-color"] !== undefined) map.setPaintProperty(layer.id, "background-color", palette.space);
      if (layer.type === "fill" && layer.paint?.["fill-color"] !== undefined) {
        const water = /water|ocean|lake|river/.test(id);
        const park = /park|grass|wood|forest|landcover/.test(id);
        map.setPaintProperty(layer.id, "fill-color", water ? palette.sea : park ? palette.park : palette.land);
      }
      if (layer.type === "line" && layer.paint?.["line-color"] !== undefined) map.setPaintProperty(layer.id, "line-color", palette.road);
      if (layer.type === "symbol" && layer.paint?.["text-color"] !== undefined) {
        map.setPaintProperty(layer.id, "text-color", palette.label);
        if (layer.paint?.["text-halo-color"] !== undefined) map.setPaintProperty(layer.id, "text-halo-color", palette.space);
      }
    } catch { /* Some style layers do not allow color overrides. */ }
  }
}
function HomepageGlobe({ theme }: { theme: GlobeTheme }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
    if (mapRef.current) applyHomepageGlobeTheme(mapRef.current, theme);
  }, [theme]);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let map: MapLibreMap | null = null;
    let frame = 0;
    let disposed = false;
    let isVisible = false;
    let userTookControl = false;
    let previous = performance.now();
    const resizeObserver = new ResizeObserver(() => map?.resize());
    resizeObserver.observe(host);
    const observer = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (!isVisible || map || disposed) return;
      map = new MapLibreMap({
        container: host,
        style: generateMapStyle(getTheme(themeRef.current === "Carrara" ? "carrara" : themeRef.current === "Blue Water" ? "blue_water" : "midnight_blue")),
        center: [18, 18],
        zoom: 1.55,
        // The hero uses a circular globe mask; cap the close-up before it becomes
        // a tiny clipped patch and before the source tiles are heavily over-zoomed.
        maxZoom: 12.5,
        attributionControl: false,
        // Let the page keep native wheel scrolling while the pointer is over the globe.
        // Visitors can still zoom with the small explicit +/- control.
        scrollZoom: false,
        renderWorldCopies: false,
        dragRotate: true,
        touchPitch: false,
        maxPitch: 0,
        canvasContextAttributes: { antialias: true },
      });
      mapRef.current = map;
      map.addControl(new AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new NavigationControl({ showCompass: false }), "bottom-left");
      map.on("error", (event) => console.error("Homepage globe data error", event.error));
      map.on("style.load", () => { if (map) applyHomepageGlobeTheme(map, themeRef.current); });
      map.on("load", () => {
        if (!map) return;
        try { map.setProjection({ type: "globe" }); } catch { /* Keep the default projection if globe mode is unavailable. */ }
        applyHomepageGlobeTheme(map, themeRef.current);
      });
      // Once a visitor starts exploring, leave the globe under their control.
      // A timed resume can rotate the target away during a long zoom sequence.
      const pauseSpin = () => { userTookControl = true; };
      map.on("dragstart", pauseSpin);
      map.on("zoomstart", pauseSpin);
      map.on("rotatestart", pauseSpin);
      const spin = (now: number) => {
        if (disposed || !map) return;
        const delta = Math.min(48, now - previous);
        previous = now;
        if (isVisible && document.visibilityState === "visible" && !userTookControl) {
          const center = map.getCenter();
          map.setCenter([center.lng + delta * 0.0035, center.lat]);
        }
        frame = window.requestAnimationFrame(spin);
      };
      frame = window.requestAnimationFrame(spin);
    }, { rootMargin: "180px" });
    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
      map?.remove();
      mapRef.current = null;
    };
  }, []);
  return (
    <div className="home-globe-stage" aria-label="Interactive 3D globe">
      <div className="home-globe-shell">
        <div className="home-globe" ref={container} aria-label="Interactive 3D globe. Drag to explore." role="img" />
      </div>
    </div>
  );
}

function HomepageVideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let positionFrame = 0;
    const syncVideoPosition = () => {
      cancelAnimationFrame(positionFrame);
      positionFrame = requestAnimationFrame(() => {
        const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
        // Hold the clear upper sky through the opening, then ease the footage down
        // toward its horizon and people as the visitor moves through the story.
        const focus = progress * progress * (3 - 2 * progress);
        video.style.objectPosition = `center ${focus * 100}%`;
      });
    };
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (motionPreference.matches || document.visibilityState !== "visible") {
        video.pause();
        return;
      }
      void video.play().catch(() => { /* The poster remains visible if autoplay is unavailable. */ });
    };
    syncPlayback();
    syncVideoPosition();
    window.addEventListener("scroll", syncVideoPosition, { passive: true });
    window.addEventListener("resize", syncVideoPosition);
    document.addEventListener("visibilitychange", syncPlayback);
    motionPreference.addEventListener("change", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      motionPreference.removeEventListener("change", syncPlayback);
      window.removeEventListener("scroll", syncVideoPosition);
      window.removeEventListener("resize", syncVideoPosition);
      cancelAnimationFrame(positionFrame);
      video.pause();
    };
  }, []);

  return (
    <div className="home-video-backdrop" aria-hidden="true">
      <video ref={videoRef} className="home-video-backdrop__video" muted loop playsInline preload="none" poster="/assets/maparte-cinematic-poster.jpg">
        <source src="/assets/maparte-cinematic-story-60.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function MapCard({ sample }: { sample: MapSample }) {
  return (
    <article className="home-map-card">
      <a className="home-map-card__art" href={sample.landing} aria-label={"Explore " + sample.title + " map example"}>
        <img src={"/assets/map-posters/" + sample.image} alt={sample.title + " digital map design for " + sample.place + ", created with MAPARTE"} loading="lazy" />
        <span className="home-map-card__badge">{sample.theme} · Digital map</span>
      </a>
      <div className="home-map-card__copy">
        <span className="home-map-card__place">{sample.place}</span>
        <h3><a href={sample.landing}>{sample.title}</a></h3>
        <p>{sample.story}</p>
        <a className="home-text-link" href={sample.landing}>Explore this idea <span aria-hidden="true">↗</span></a>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState("All maps");
  const [styleChoice, setStyleChoice] = useState<"Carrara" | "Midnight Blue">("Carrara");
  const [globeTheme, setGlobeTheme] = useState<GlobeTheme>("Midnight Blue");
  const [query, setQuery] = useState("");

  const visibleSamples = useMemo(
    () => activeFilter === "All maps" ? samples : samples.filter((sample) => sample.category === activeFilter),
    [activeFilter],
  );

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    window.location.href = value ? "/?city=" + encodeURIComponent(value) : "/?dist=4491";
  };

  useEffect(() => {
    const root = document.querySelector(".maparte-home");
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>(
      ".home-trust-row, .home-gallery, .home-style-showcase, .home-features, .home-story-band, .home-how, .home-how .home-steps article, .home-globe-section, .home-faq, .home-final-cta",
    );
    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("home-motion-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("home-motion-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });
    targets.forEach((target) => {
      target.classList.add("home-motion");
      observer.observe(target);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="maparte-home">
      <HomepageVideoBackdrop />
      <header className="home-header">
        <a className="home-brand" href="/" aria-label="MAPARTE home">
          <img src="/assets/logo.svg" alt="" width="38" height="38" />
          <span><strong>MAPARTE</strong><small>MAP IT. MAKE IT YOURS.</small></span>
        </a>
        <nav className="home-nav" aria-label="Main navigation">
          <a href="#maps">Map gallery</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#stories">Map ideas</a>
          <a href="#faq">FAQ</a>
        </nav>
        <EditorLink className="home-header-cta">Create a map <span aria-hidden="true">↗</span></EditorLink>
      </header>

      <main>
        <section className="home-hero">
          <div className="home-hero__copy">
            <span className="home-eyebrow"><i /> CUSTOM DIGITAL MAP ART</span>
            <h1>Your place.<br /><em>Your map.<br />Your story.</em></h1>
            <p className="home-hero__lead">Turn a hometown, a shared moment, a journey or a finish line into a map design that feels like yours.</p>
            <form className="home-search" onSubmit={handleSearch}>
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a city or town" aria-label="Search for a place to map" />
              <button type="submit">Start with a place <span aria-hidden="true">→</span></button>
            </form>
            <div className="home-hero__actions">
              <a href="#maps" className="home-secondary-cta">Explore real map designs</a>
              <span>Design in your browser · Download a digital file</span>
            </div>
            <ul className="home-benefits">
              <li><span>✓</span> Poster and phone layouts</li>
              <li><span>✓</span> Themes, labels and borders</li>
              <li><span>✓</span> Markers and GPX routes</li>
            </ul>
          </div>
          <div className="home-hero__visual">
            <HomepageGlobe theme={globeTheme} />
            <div className="home-globe-theme-picker" role="group" aria-label="Choose globe color theme">
              <span>GLOBE THEMES</span>
              {globeThemeOptions.map((theme) => <button key={theme} type="button" aria-pressed={globeTheme === theme} onClick={() => setGlobeTheme(theme)}><i className={"home-globe-theme-swatch home-globe-theme-swatch--" + theme.toLowerCase().replace(/ /g, "-")} />{theme}</button>)}
            </div>
            <div className="home-globe-meta"><span>800 CITIES · LIVE MAP DATA</span><small>Real streets · changing themes · clean map borders</small></div>
          </div>
        </section>

        <section className="home-trust-row" aria-label="MAPARTE product overview">
          <div><b>01</b><span>Choose the place</span></div>
          <div><b>02</b><span>Make the design yours</span></div>
          <div><b>03</b><span>Download for your screen</span></div>
          <p>MAPARTE creates digital map designs. It does not print or ship physical posters.</p>
        </section>

        <section className="home-section home-gallery" id="maps">
          <div className="home-section__heading">
            <div><span className="home-kicker">MADE IN MAPARTE</span><h2>Real maps. Real places.<br /><em>So many ways to make them yours.</em></h2></div>
            <p>These are examples made with MAPARTE’s own map artwork—not stock poster mockups. Choose a story to see a closer look.</p>
          </div>
          <div className="home-gallery-toolbar">
            <div className="home-filter-list" role="group" aria-label="Filter map examples">
              {filters.map((filter) => <button key={filter} type="button" aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)}>{filter}</button>)}
            </div>
            <span>{visibleSamples.length} map designs</span>
          </div>
          <div className="home-map-grid">
            {visibleSamples.map((sample) => <MapCard key={sample.title} sample={sample} />)}
          </div>
          <div className="home-gallery-bottom">
            <span>Each sample opens its matching MAPARTE story page.</span>
            <EditorLink className="home-outline-cta">Make your own map <span aria-hidden="true">↗</span></EditorLink>
          </div>
        </section>

        <section className="home-style-showcase" id="styles">
          <div className="home-style-showcase__copy">
            <span className="home-kicker">ONE PLACE, DIFFERENT MOODS</span>
            <h2>Choose a style.<br /><em>Set the feeling.</em></h2>
            <p>See the same Hometown Roots map in two MAPARTE themes. Switch the sample to compare the real map artwork.</p>
            <div className="home-style-switch" role="group" aria-label="Choose a map theme">
              {(["Carrara", "Midnight Blue"] as const).map((style) => <button key={style} type="button" aria-pressed={styleChoice === style} onClick={() => setStyleChoice(style)}><i className={"swatch swatch--" + (style === "Carrara" ? "carrara" : "midnight")} />{style}</button>)}
            </div>
            <div className="home-style-note"><b>{styleChoice}</b><span>{styleChoice === "Carrara" ? "Warm stone, fine charcoal roads, pale water." : "Deep navy, gold roads, a quiet atlas mood."}</span></div>
            <EditorLink className="home-primary-cta">Explore map styles <span aria-hidden="true">↗</span></EditorLink>
          </div>
          <div className={"home-style-art home-style-art--" + (styleChoice === "Carrara" ? "light" : "dark")}>
            <img src={"/assets/presets/real-hometown-roots-" + (styleChoice === "Carrara" ? "carrara" : "midnight") + ".png"} alt={"Hometown Roots map created with the " + styleChoice + " theme in MAPARTE"} loading="lazy" />
          </div>
          <span className="home-style-index">MAP STYLE STUDY&nbsp;&nbsp; / &nbsp;&nbsp;02</span>
        </section>

        <section className="home-section home-features" id="features">
          <div className="home-section__heading home-section__heading--center">
            <span className="home-kicker">THE MAP IS YOUR CANVAS</span>
            <h2>Small details make<br /><em>a map feel personal.</em></h2>
            <p>MAPARTE’s tools are all part of the design. Start with a place, then shape the map around what matters to you.</p>
          </div>
          <div className="home-feature-grid">
            <article><div className="home-feature-grid__label"><small>01 / LOCATION</small><span className="home-feature-icon">⌕</span></div><h3>Find your place</h3><p>Search a city, town, village, address or coordinates. Pan, zoom and set the exact map area.</p></article>
            <article><div className="home-feature-grid__label"><small>02 / MAP STYLE</small><span className="home-feature-icon">◈</span></div><h3>Set the map mood</h3><p>Choose from the available color themes and map layers, then fine-tune the look.</p></article>
            <article><div className="home-feature-grid__label"><small>03 / LAYOUT</small><span className="home-feature-icon">▤</span></div><h3>Frame the view</h3><p>Choose poster or phone dimensions, then apply one of the available border styles and adjustments.</p></article>
            <article><div className="home-feature-grid__label"><small>04 / TYPE</small><span className="home-feature-icon">T</span></div><h3>Add the right words</h3><p>Show town or village, city, state and country. Add a date, title or tagline and tune the type.</p></article>
            <article><div className="home-feature-grid__label"><small>05 / MARKERS & ROUTES</small><span className="home-feature-icon">⌖</span></div><h3>Point to what matters</h3><p>Use built-in, emoji or custom markers. Add a GPX route with start and finish details.</p></article>
            <article><div className="home-feature-grid__label"><small>06 / PREVIEW</small><span className="home-feature-icon">▣</span></div><h3>Preview for your screen</h3><p>Make a poster-style design or phone wallpaper. Preview it against a wall photo in Special Full Screen.</p></article>
          </div>
          <div className="home-feature-foot"><span>Want to see every control in action?</span><EditorLink className="home-text-link home-outline-cta">Open the MAPARTE editor <span aria-hidden="true">↗</span></EditorLink></div>
        </section>

        <section className="home-story-band" id="stories">
          <div className="home-story-band__photo">
            <img src="https://images.unsplash.com/photo-1561370654-b14ce4696116?auto=format&fit=crop&w=1400&q=85" alt="Traveler holding a folded city map outside" loading="lazy" />
            <span>REAL PLACE. REAL MAP DATA.</span>
          </div>
          <div className="home-story-band__copy">
            <span className="home-kicker">GIVE A PLACE A STORY</span>
            <h2>For the place you met.<br />The road you took.<br /><em>The home you found.</em></h2>
            <p>One MAPARTE editor supports love stories, hometown routes, weddings, new homes, travel memories, marathon courses and mountain trails.</p>
            <div className="home-story-links">
              <a href="/where-we-met">Where we met <span>↗</span></a>
              <a href="/hometown-roots">Hometown roots <span>↗</span></a>
              <a href="/marathon-race">Race routes <span>↗</span></a>
              <a href="/mountain-summit">Mountain summits <span>↗</span></a>
            </div>
            <EditorLink className="home-primary-cta">Start with your place <span aria-hidden="true">↗</span></EditorLink>
          </div>
        </section>

        <section className="home-how home-section" id="how">
          <div className="home-section__heading home-section__heading--center">
            <span className="home-kicker">FROM PLACE TO PERSONAL MAP</span>
            <h2>Three steps. <em>Your design.</em></h2>
          </div>
          <div className="home-steps">
            <article data-step="01">
              <a className="home-step-art" href="/where-we-met" aria-label="See the Paris map example">
                <img src="/assets/map-posters/where-we-met.png" alt="MAPARTE map artwork for a memorable place in Paris" loading="lazy" />
                <span>PARIS · A PLACE TO BEGIN</span>
              </a>
              <div className="home-step-copy"><b>01</b><span>SEARCH</span><h3>Choose where it begins</h3><p>Find a place by name, address or coordinates, then settle on the view that holds the memory.</p></div>
            </article>
            <article data-step="02">
              <a className="home-step-art" href="/hometown-roots" aria-label="See the Hometown Roots map example">
                <img src="/assets/map-posters/hometown-roots.png" alt="MAPARTE Hometown Roots map artwork" loading="lazy" />
                <span>DEHRADUN TO MUSSOORIE · YOUR ROUTE</span>
              </a>
              <div className="home-step-copy"><b>02</b><span>MAKE IT YOURS</span><h3>Give the map its feeling</h3><p>Choose a theme and layout. Add your words, a border, markers or a route that belongs to the story.</p></div>
            </article>
            <article data-step="03">
              <a className="home-step-art" href="/she-said-yes" aria-label="See the She Said Yes map example">
                <img src="/assets/map-posters/she-said-yes.png" alt="MAPARTE She Said Yes map artwork" loading="lazy" />
                <span>AMALFI COAST · KEEP THE MOMENT</span>
              </a>
              <div className="home-step-copy"><b>03</b><span>PREVIEW & DOWNLOAD</span><h3>Keep it close</h3><p>Preview your digital design, choose a poster or phone layout, and download it for your screen.</p></div>
            </article>
          </div>
          <EditorLink className="home-primary-cta">Create a map in your browser <span aria-hidden="true">↗</span></EditorLink>
        </section>

        <section className="home-faq home-section" id="faq">
          <div className="home-section__heading home-section__heading--center">
            <span className="home-kicker">GOOD TO KNOW</span><h2>Before you start.</h2>
          </div>
          <div className="home-faq-list">
            <details><summary>What can I make with MAPARTE?</summary><p>Custom digital map artwork for places, journeys and milestones, with poster-style and phone wallpaper layouts.</p></details>
            <details><summary>Can I change the theme, border and text?</summary><p>Yes. Choose a supported map theme and layout, adjust borders, and add location labels, a title, date or tagline.</p></details>
            <details><summary>Can I add markers or a running route?</summary><p>Use built-in, emoji or custom markers. You can also import a GPX route and style its line and endpoints.</p></details>
            <details><summary>Can I preview my design on a wall?</summary><p>Use Special Full Screen to upload a wall photo. On supported phones, you can also request camera access for a live preview.</p></details>
            <details><summary>Do you print and ship posters?</summary><p>No. MAPARTE provides digital designs and download choices. You can use a downloaded file on your device or arrange a print yourself.</p></details>
          </div>
        </section>

        <section className="home-final-cta">
          <span className="home-kicker">MAP IT. MAKE IT YOURS.</span>
          <h2>Which place will you keep?</h2>
          <p>Start with a location. Make the map personal. Download your digital design.</p>
          <EditorLink className="home-primary-cta">Create your map <span aria-hidden="true">↗</span></EditorLink>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer__brand"><strong>MAPARTE</strong><span>Map it. Make it yours.</span></div>
        <nav aria-label="Footer navigation"><a href="#maps">Map gallery</a><a href="#features">Features</a><a href="#how">How it works</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refund">Refund</a></nav>
        <small>Digital map designs · Map data © OpenStreetMap contributors</small>
      </footer>
    </div>
  );
}
