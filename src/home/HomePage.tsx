import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, AttributionControl, setWorkerUrl } from "maplibre-gl";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import "./homepage.css";
import cityDirectory from "@/data/cityDirectory.json";

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
  { title: "Where We Met", place: "Paris, France", story: "A favorite corner, made personal", theme: "Carrara", category: "Milestones", image: "real-where-we-met-carrara.png", landing: "/where-we-met", accent: "#c72c50" },
  { title: "Hometown Roots", place: "Dehradun to Mussoorie, India", story: "The roads that raised you", theme: "Carrara", category: "Places", image: "real-hometown-roots-carrara.png", landing: "/hometown-roots", accent: "#7b7a45" },
  { title: "Travel Memories", place: "Tokyo, Japan", story: "A journey worth keeping", theme: "Midnight Blue", category: "Journeys", image: "real-travel-memories-midnight.png", landing: "/travel-memories", accent: "#c69a42" },
  { title: "Our Wedding Day", place: "Florence, Italy", story: "The place where your story changed", theme: "Carrara", category: "Milestones", image: "real-our-wedding-day-carrara.png", landing: "/our-wedding-day", accent: "#b87b55" },
  { title: "42.195 KM Finisher", place: "Boston, USA", story: "A route you earned, mile by mile", theme: "Midnight Blue", category: "Journeys", image: "real-marathon-race-midnight.png", landing: "/marathon-race", accent: "#4c8e9a" },
  { title: "Peak & Trail Summit", place: "Mont Blanc, France", story: "A summit with a story behind it", theme: "Carrara", category: "Outdoors", image: "real-mountain-summit-carrara.png", landing: "/mountain-summit", accent: "#648b73" },
  { title: "Our First Home", place: "Brooklyn, New York", story: "The first place that felt like yours", theme: "Carrara", category: "Places", image: "real-our-first-home-carrara.png", landing: "/our-first-home", accent: "#547a8f" },
  { title: "The Day You Were Born", place: "London, United Kingdom", story: "A new beginning, marked on the map", theme: "Midnight Blue", category: "Milestones", image: "real-baby-arrival-midnight.png", landing: "/baby-arrival", accent: "#9b718b" },
  { title: "She Said Yes", place: "Amalfi Coast, Italy", story: "Remember the exact place you asked", theme: "Carrara", category: "Milestones", image: "real-she-said-yes-carrara.png", landing: "/she-said-yes", accent: "#c28e3b" },
];

const filters = ["All maps", "Milestones", "Places", "Journeys", "Outdoors"];

function EditorLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <a className={className} href="/?dist=4491">{children}</a>;
}

type GlobeTheme = string;
type HomepageCity = { city: string; country: string; lat: number; lon: number; slug?: string };
const homepageCities = Object.values(cityDirectory) as HomepageCity[];
const featuredGlobeThemes = [
  { id: "midnight_blue", label: "Midnight Blue" },
  { id: "carrara", label: "Carrara" },
  { id: "blue_water", label: "Blue Water" },
  { id: "golden_dusk", label: "Golden Dusk" },
  { id: "pale_dawn", label: "Pale Dawn" },
  { id: "subtle_grayscale", label: "Soft Gray" },
  { id: "retro_vintage", label: "Retro" },
  { id: "midnight_commander", label: "Commander" },
];

function homepageGlobeStyle(theme: GlobeTheme) {
  return generateMapStyle(getTheme(theme));
}

function HomepageGlobe({ theme, city }: { theme: GlobeTheme; city: HomepageCity }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const themeRef = useRef(theme);
  const cityRef = useRef(city);
  const cityZoomTimer = useRef<number | null>(null);

  useEffect(() => {
    themeRef.current = theme;
    mapRef.current?.setStyle(homepageGlobeStyle(theme));
  }, [theme]);

  useEffect(() => {
    cityRef.current = city;
    const map = mapRef.current;
    if (!map) return;
    if (cityZoomTimer.current !== null) window.clearTimeout(cityZoomTimer.current);
    map.stop();
    map.flyTo({ center: [city.lon, city.lat], zoom: 3.35, duration: 2500, essential: true });
    cityZoomTimer.current = window.setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({ center: [15, 18], zoom: 1.25, duration: 2400, essential: true });
    }, 4300);
  }, [city.slug, city.city]);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let map: MapLibreMap | null = null;
    let frame = 0;
    let disposed = false;
    let isVisible = false;
    let pauseUntil = 0;
    let previous = performance.now();

    const observer = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (!isVisible || map || disposed) return;
      map = new MapLibreMap({
        container: host,
        style: homepageGlobeStyle(themeRef.current),
        center: [15, 18],
        zoom: 1.25,
        projection: { type: "globe" },
        attributionControl: false,
        renderWorldCopies: false,
        dragRotate: true,
        scrollZoom: false,
        touchPitch: false,
        maxPitch: 0,
        canvasContextAttributes: { antialias: true },
      });
      mapRef.current = map;
      map.addControl(new AttributionControl({ compact: true }), "bottom-right");

      const addCountryOutlines = () => {
        if (!map || !map.isStyleLoaded() || !map.getSource("openfreemap")) return;
        const outlineColor = themeRef.current === "midnight_blue" ? "#a8b5ff" : "#9de1ff";
        if (!map.getLayer("homepage-country-outline")) {
          const firstSymbol = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
          map.addLayer({
            id: "homepage-country-outline",
            type: "line",
            source: "openfreemap",
            "source-layer": "boundary",
            minzoom: 0,
            filter: ["==", ["to-number", ["get", "admin_level"]], 2],
            paint: {
              "line-color": outlineColor,
              "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 3, 1.1, 6, 1.45],
              "line-opacity": 0.94,
            },
          }, firstSymbol);
        } else {
          map.setPaintProperty("homepage-country-outline", "line-color", outlineColor);
        }
        try {
          map.setFog({
            color: "#080b1f",
            highColor: themeRef.current === "midnight_blue" ? "#24204b" : "#172b54",
            spaceColor: "#050817",
            starIntensity: 0.72,
          });
        } catch { /* Keep the globe visible where fog is unsupported. */ }
      };

      map.on("error", (event) => console.error("Homepage globe data error", event.error));
      map.on("style.load", () => {
        if (!map) return;
        try { map.setProjection({ type: "globe" }); } catch { /* The globe projection is already active. */ }
        addCountryOutlines();
      });
      map.once("load", () => {
        addCountryOutlines();
        const firstCity = cityRef.current;
        map?.flyTo({ center: [firstCity.lon, firstCity.lat], zoom: 3.35, duration: 2500, essential: true });
        cityZoomTimer.current = window.setTimeout(() => {
          if (!mapRef.current) return;
          mapRef.current.flyTo({ center: [15, 18], zoom: 1.25, duration: 2400, essential: true });
        }, 4300);
      });

      const pauseSpin = () => { pauseUntil = Date.now() + 4500; };
      map.on("dragstart", pauseSpin);
      map.on("zoomstart", pauseSpin);
      map.on("rotatestart", pauseSpin);
      const spin = (now: number) => {
        if (disposed || !map) return;
        const delta = Math.min(48, now - previous);
        previous = now;
        if (isVisible && document.visibilityState === "visible" && Date.now() > pauseUntil) {
          const center = map.getCenter();
          map.setCenter([center.lng + delta * 0.0012, center.lat]);
        }
        frame = window.requestAnimationFrame(spin);
      };
      frame = window.requestAnimationFrame(spin);
    }, { rootMargin: "220px" });
    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      if (cityZoomTimer.current !== null) window.clearTimeout(cityZoomTimer.current);
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="home-globe-stage" aria-label="Slowly rotating 3D world map with country borders">
      <div className="home-globe-shell">
        <span className="home-globe-halo" aria-hidden="true" />
        <div className="home-globe" ref={container} aria-label="Interactive world map globe with country borders. No pins or markers." role="img" />
      </div>
    </div>
  );
}

function CityMapSpotlight({ city, theme }: { city: HomepageCity; theme: GlobeTheme }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cityRef = useRef(city);
  const themeRef = useRef(theme);

  useEffect(() => {
    cityRef.current = city;
    mapRef.current?.flyTo({ center: [city.lon, city.lat], zoom: 9.2, duration: 1450, essential: true });
  }, [city.slug, city.city]);

  useEffect(() => {
    themeRef.current = theme;
    mapRef.current?.setStyle(homepageGlobeStyle(theme));
  }, [theme]);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const map = new MapLibreMap({
      container: host,
      style: homepageGlobeStyle(themeRef.current),
      center: [cityRef.current.lon, cityRef.current.lat],
      zoom: 9.2,
      interactive: false,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    map.on("error", (event) => console.error("Homepage city map data error", event.error));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div className="home-city-map-canvas" ref={container} role="img" aria-label={city.city + ", " + city.country + " street map preview"} />;
}

function MapCard({ sample }: { sample: MapSample }) {
  return (
    <article className="home-map-card">
      <a className="home-map-card__art" href={sample.landing} aria-label={"Explore " + sample.title + " map example"}>
        <img src={"/assets/presets/" + sample.image} alt={sample.title + " digital map design for " + sample.place + ", created with MAPARTE"} loading="lazy" />
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
  const [globeTheme, setGlobeTheme] = useState("midnight_blue");
  const [activeCityIndex, setActiveCityIndex] = useState(0);
  const [query, setQuery] = useState("");

  const activeCity = homepageCities[activeCityIndex % homepageCities.length] ?? homepageCities[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveCityIndex((index) => (index + 1) % homepageCities.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

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
      ".home-trust-row, .home-gallery, .home-style-showcase, .home-features, .home-story-band, .home-how, .home-faq, .home-final-cta",
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
      <video className="home-galaxy-video" autoPlay muted loop playsInline preload="metadata" poster="https://svs.gsfc.nasa.gov/vis/a010000/a013100/a013155/milky_way_still.png" aria-hidden="true">
        <source src="/assets/milky_way_nasa_loop.webm" type="video/webm" />
        <source src="/assets/milky_way_nasa_loop.mp4" type="video/mp4" />
      </video>
      <header className="home-header">
        <a className="home-brand" href="/" aria-label="MAPARTE home">
          <img src="/assets/icon-192.png" alt="" width="38" height="38" />
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
        <section className="home-hero" data-globe-theme={globeTheme}>
          <div className="home-hero__globe-bg" aria-hidden="true" />
          <div className="home-hero__copy">
            <span className="home-eyebrow"><i /> CUSTOM DIGITAL MAP ART</span>
            <h1>Your place.<br /><em>Your map.<br />Your story.</em></h1>
            <p className="home-hero__lead">Turn a hometown, a shared moment, a journey or a finish line into a map design that feels like yours.</p>
            <form className="home-search" onSubmit={handleSearch}>
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a city, town, village or place" aria-label="Search for a place to map" />
              <button type="submit">Start with a place <span aria-hidden="true">→</span></button>
            </form>
            <div className="home-globe-theme-picker" role="group" aria-label="Choose a globe map theme">
              <span>GLOBE THEMES</span>
              <div>{featuredGlobeThemes.map((theme) => <button key={theme.id} type="button" className={globeTheme === theme.id ? "is-active" : ""} aria-pressed={globeTheme === theme.id} onClick={() => setGlobeTheme(theme.id)}>{theme.label}</button>)}</div>
            </div>
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
            <div className="home-hero__note"><span className="home-note-dot" /> LIVE MAP PREVIEW <b>01 / {homepageCities.length}</b></div>
            <div className="home-city-globe-frame" key="home-city-globe">
              <HomepageGlobe theme={globeTheme} city={activeCity} />
              <div className="home-city-map-overlay" key={activeCity.slug ?? activeCityIndex}>
                <span>{featuredGlobeThemes.find((item) => item.id === globeTheme)?.label ?? "Maparte theme"}</span>
                <strong>{activeCity.city}</strong>
                <small>{activeCity.country} · Globe focus</small>
              </div>
            </div>
            <div className="home-hero__caption"><span>800 CITIES · LIVE MAP DATA</span><strong>{activeCity.city}, {activeCity.country}</strong><small>Real streets · changing themes · clean map borders</small></div>
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
              {(["Carrara", "Midnight Blue"] as const).map((style) => <button key={style} type="button" aria-pressed={styleChoice === style} onClick={() => { setStyleChoice(style); setGlobeTheme(style === "Carrara" ? "carrara" : "midnight_blue"); }}><i className={"swatch swatch--" + (style === "Carrara" ? "carrara" : "midnight")} />{style}</button>)}
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
            <article><span className="home-feature-icon">⌕</span><small>01 / LOCATION</small><h3>Find your place</h3><p>Search a city, town, village, address or coordinates. Pan, zoom and set the exact map area.</p></article>
            <article><span className="home-feature-icon">◈</span><small>02 / MAP STYLE</small><h3>Set the map mood</h3><p>Choose from the available color themes and map layers, then fine-tune the look.</p></article>
            <article><span className="home-feature-icon">▤</span><small>03 / LAYOUT</small><h3>Frame the view</h3><p>Choose poster or phone dimensions, then apply one of the available border styles and adjustments.</p></article>
            <article><span className="home-feature-icon">T</span><small>04 / TYPE</small><h3>Add the right words</h3><p>Show town or village, city, state and country. Add a date, title or tagline and tune the type.</p></article>
            <article><span className="home-feature-icon">⌖</span><small>05 / MARKERS & ROUTES</small><h3>Point to what matters</h3><p>Use built-in, emoji or custom markers. Add a GPX route with start and finish details.</p></article>
            <article><span className="home-feature-icon">▣</span><small>06 / PREVIEW</small><h3>Preview for your screen</h3><p>Make a poster-style design or phone wallpaper. Preview it against a wall photo in Special Full Screen.</p></article>
          </div>
          <div className="home-feature-foot"><span>Want to see every control in action?</span><EditorLink className="home-text-link">Open the MAPARTE editor <span aria-hidden="true">↗</span></EditorLink></div>
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
            <article><b>01</b><span>Search</span><h3>Choose where it begins</h3><p>Find a place by name, address or coordinates and set the view.</p></article>
            <article><b>02</b><span>Personalize</span><h3>Make the map your own</h3><p>Choose a theme and layout, add your words, borders, markers or route.</p></article>
            <article><b>03</b><span>Preview & download</span><h3>Take it to your screen</h3><p>Review the poster or wallpaper layout and see the available download choices.</p></article>
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
        <small>Digital map designs · Map data © OpenStreetMap contributors · Space visualization: <a href="https://svs.gsfc.nasa.gov/13155/" target="_blank" rel="noreferrer">NASA / Goddard Space Flight Center</a></small>
      </footer>
    </div>
  );
}
