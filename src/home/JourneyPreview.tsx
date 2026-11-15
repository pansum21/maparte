import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { SEO_CITIES } from "@/features/location/domain/cityRouteResolver";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/dm-serif-display/400-italic.css";
import "./journeyPreview.css";

setWorkerUrl(workerUrl);

type View = { at: number; center: [number, number]; zoom: number; pitch: number; bearing: number };
type JourneyDestination = { id: string; city: string; country: string; center: [number, number] };
const journeyDestinations: JourneyDestination[] = SEO_CITIES
  .filter((city) => Number.isFinite(city.lat) && Number.isFinite(city.lon) && Math.abs(city.lat) < 84)
  .map((city) => ({ id: city.slug, city: city.city, country: city.country, center: [city.lon, city.lat] as [number, number] }));

function chooseJourneyDestination(excludeId?: string): JourneyDestination {
  const available = journeyDestinations.filter((destination) => destination.id !== excludeId);
  return available[Math.floor(Math.random() * available.length)] ?? journeyDestinations[0];
}

function longitudeDelta(from: number, to: number) {
  // Always travel eastward so the globe turns in one consistent, anti-clockwise direction.
  return (to - from + 360) % 360;
}

function clamp(n: number, min = 0, max = 1) { return Math.max(min, Math.min(max, n)); }
function smooth(t: number) { return t * t * (3 - 2 * t); }
function quietJourneyRoads(map: MapLibreMap) {
  for (const layer of map.getStyle().layers || []) {
    if (layer.type !== "line" || !layer.id.startsWith("road-")) continue;
    const id = layer.id;
    const casing = id.includes("casing");
    const major = id.includes("major");
    const path = id.includes("path");
    const widths = casing
      ? [[0, 0.035], [4, 0.055], [7, 0.075], [10, 0.1], [13, 0.14], [16, 0.19]]
      : major
        ? [[0, 0.05], [4, 0.075], [7, 0.1], [10, 0.135], [13, 0.18], [16, 0.24]]
        : path
          ? [[0, 0.04], [4, 0.06], [7, 0.08], [10, 0.11], [13, 0.15], [16, 0.2]]
          : [[0, 0.05], [4, 0.075], [7, 0.1], [10, 0.135], [13, 0.18], [16, 0.24]];
    try {
      map.setPaintProperty(id, "line-width", ["interpolate", ["linear"], ["zoom"], ...widths.flat()]);
      map.setPaintProperty(id, "line-color", casing ? "#193038" : major ? "#687975" : "#91a78f");
      map.setPaintProperty(id, "line-opacity", casing ? 0.22 : major ? 0.32 : 0.38);
    } catch { /* Keep the source map style if a layer cannot be adjusted. */ }
  }
}

function addJourneyDetailLayers(map: MapLibreMap, theme: "Midnight Blue" | "Carrara") {
  const dark = theme === "Midnight Blue";
  const text = dark ? "#e7efdb" : "#344943";
  const halo = dark ? "#10212b" : "#e8e6d7";
  const border = dark ? "#c6dda7" : "#667b6f";
  const source = "openfreemap";
  const add = (layer: Parameters<MapLibreMap["addLayer"]>[0]) => {
    try { map.addLayer(layer as never); } catch { /* Keep the base map if optional vector detail is unavailable. */ }
  };
  add({
    id: "journey-country-borders", type: "line", source, "source-layer": "boundary",
    minzoom: 1, filter: ["==", ["to-number", ["get", "admin_level"], 99], 2],
    paint: { "line-color": border, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.35, 5, 0.55, 9, 0.8], "line-opacity": 0.62 },
  });
  add({
    id: "journey-state-borders", type: "line", source, "source-layer": "boundary",
    minzoom: 4.5, filter: ["==", ["to-number", ["get", "admin_level"], 99], 4],
    paint: { "line-color": border, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.35, 8, 0.58, 12, 0.82], "line-opacity": 0.4 },
  });
  try {
    map.addLayer({
      id: "journey-building-heights", type: "fill-extrusion", source, "source-layer": "building", minzoom: 12.7,
      paint: {
        "fill-extrusion-color": dark ? "#42655f" : "#aab9a7",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 7],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
        "fill-extrusion-opacity": 0.82,
        "fill-extrusion-vertical-gradient": true,
      },
    } as never, "road-minor-overview-low");
  } catch { /* Buildings remain readable as footprints when 3D data is absent. */ }
  add({
    id: "journey-country-names", type: "symbol", source, "source-layer": "place", minzoom: 1.5, maxzoom: 5,
    filter: ["==", ["get", "class"], "country"],
    layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Open Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 2, 9, 5, 12], "text-letter-spacing": 0.08, "text-max-width": 8, "text-allow-overlap": false },
    paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.1, "text-opacity": 0.36 },
  });
  add({
    id: "journey-city-names", type: "symbol", source, "source-layer": "place", minzoom: 4, maxzoom: 13,
    filter: ["in", ["get", "class"], ["literal", ["city", "town", "village"]]],
    layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Open Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 9, 13, 13, 16], "text-max-width": 9, "text-allow-overlap": false },
    paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.4, "text-halo-blur": 0.2, "text-opacity": 0.36 },
  });
  add({
    id: "journey-water-names", type: "symbol", source, "source-layer": "water_name", minzoom: 4, maxzoom: 14,
    layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Open Sans Regular"], "text-size": 10, "text-letter-spacing": 0.06, "text-max-width": 8, "text-allow-overlap": false },
    paint: { "text-color": dark ? "#8ac6c2" : "#587d78", "text-halo-color": halo, "text-halo-width": 1.2, "text-opacity": 0.32 },
  });
  add({
    id: "journey-street-names", type: "symbol", source, "source-layer": "transportation_name", minzoom: 11,
    layout: { "symbol-placement": "line", "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Open Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 15, 11], "text-max-angle": 32, "text-allow-overlap": false, "symbol-spacing": 320 },
    paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.25, "text-opacity": 0.28 },
  });
}

function interpolateView(progress: number, destination: JourneyDestination): View {
  const [longitude, latitude] = destination.center;
  const delta = longitudeDelta(5, longitude);
  const arriveLongitude = 5 + delta;
  const views: View[] = [
    { at: 0, center: [5, 23], zoom: 1.2, pitch: 0, bearing: 0 },
    { at: 0.2, center: [5 + delta * 0.26, 23 + (latitude - 23) * 0.22], zoom: 1.65, pitch: 0, bearing: 0 },
    { at: 0.48, center: [5 + delta * 0.82, 23 + (latitude - 23) * 0.78], zoom: 2.25, pitch: 0, bearing: 0 },
    { at: 0.62, center: [arriveLongitude, latitude], zoom: 3.8, pitch: 0, bearing: 0 },
    { at: 0.76, center: [arriveLongitude, latitude], zoom: 6.5, pitch: 4, bearing: -2 },
    { at: 0.86, center: [arriveLongitude, latitude], zoom: 9.2, pitch: 13, bearing: -7 },
    { at: 0.94, center: [arriveLongitude, latitude], zoom: 12.1, pitch: 25, bearing: -13 },
    { at: 1, center: [arriveLongitude, latitude], zoom: 15.2, pitch: 38, bearing: -18 },
  ];
  let a = views[0];
  let b = views[views.length - 1];
  for (let i = 0; i < views.length - 1; i++) {
    if (progress >= views[i].at && progress <= views[i + 1].at) { a = views[i]; b = views[i + 1]; break; }
  }
  const t = smooth(clamp((progress - a.at) / Math.max(0.0001, b.at - a.at)));
  return {
    at: progress,
    center: [a.center[0] + (b.center[0] - a.center[0]) * t, a.center[1] + (b.center[1] - a.center[1]) * t],
    // MapLibre zoom is logarithmic: advancing it linearly gives a geometric
    // scale-up. Keep it tied to the full scroll range, not late chapter stops.
    zoom: 1.2 + (15.2 - 1.2) * Math.pow(progress, window.innerWidth <= 900 ? 1.22 : 1.34),
    pitch: a.pitch + (b.pitch - a.pitch) * t,
    bearing: a.bearing + (b.bearing - a.bearing) * t,
  };
}
function JourneyMap({ theme, progressRef, destinationRef }: { theme: "Midnight Blue" | "Carrara"; progressRef: MutableRefObject<number>; destinationRef: MutableRefObject<JourneyDestination> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const themeRef = useRef(theme);
  const appliedTheme = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let map: MapLibreMap;
    let animationFrame = 0;
    let last = performance.now();
    let lastAppliedProgress = -1;
    let renderedProgress = progressRef.current;
    let globeProjection = true;
    let lastScrollAt = performance.now();
    const noteScroll = () => { lastScrollAt = performance.now(); };
    window.addEventListener("scroll", noteScroll, { passive: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = new ResizeObserver(() => map?.resize());
    resize.observe(host);

    map = new MapLibreMap({
      container: host,
      style: generateMapStyle(getTheme(themeRef.current === "Carrara" ? "carrara" : "midnight_blue"), { includeBuildings: true, includeRoads: true }),
      center: [5, 23], zoom: 1.2, minZoom: 1, maxZoom: 17,
      attributionControl: { compact: true },
      scrollZoom: false, dragPan: false, dragRotate: false, touchZoomRotate: false,
      renderWorldCopies: false,
      canvasContextAttributes: { antialias: true, powerPreference: "high-performance" },
    });
    mapRef.current = map;
    map.on("error", (event) => console.warn("Journey map data could not load", event.error));
    map.on("style.load", () => {
      if (disposed) return;
      try { map.setProjection({ type: "globe" }); } catch { /* projection remains at MapLibre's supported default */ }
      quietJourneyRoads(map);
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type === "symbol" && layer.layout?.["text-field"]) {
          try { map.setPaintProperty(layer.id, "text-opacity", 0.28); } catch { /* Some source styles lock label paint properties. */ }
        }
      }
      for (const id of ["journey-country-borders", "journey-state-borders", "journey-building-heights", "journey-country-names", "journey-city-names", "journey-water-names", "journey-street-names"]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      addJourneyDetailLayers(map, themeRef.current);
      for (const id of ["journey-route-cursor-glow", "journey-route-cursor-pin", "journey-destination-glow", "journey-destination-pin", "journey-route-line", "journey-route-glow"]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of ["journey-route-cursor", "journey-destination", "journey-route"]) {
        if (map.getSource(id)) map.removeSource(id);
      }
    });
    map.on("load", () => {
      try { map.setProjection({ type: "globe" }); } catch { /* retain default */ }
    });

    const animate = (now: number) => {
      if (disposed) return;
      const dt = Math.min(50, now - last);
      if (dt < 16) { animationFrame = requestAnimationFrame(animate); return; }
      last = now;
      const requestedProgress = progressRef.current;
      const compactView = window.innerWidth <= 900;
      const follow = 1 - Math.exp(-dt / (compactView ? 52 : 76));
      renderedProgress += (requestedProgress - renderedProgress) * follow;
      if (Math.abs(requestedProgress - renderedProgress) < 0.00025) renderedProgress = requestedProgress;
      const progress = renderedProgress;
      const destination = destinationRef.current;
      const target = interpolateView(progress, destination);
      const heroAlign = 1 - smooth(clamp(progress / 0.28));
      const globeShiftX = Math.round(38 * 4 * heroAlign);
      const globeShiftY = Math.round(38 * 8 * heroAlign);
      const padding = window.innerWidth > 900
        ? { left: Math.round(window.innerWidth * 0.5) + globeShiftX, top: Math.round(window.innerHeight * 0.34 * heroAlign), bottom: globeShiftY }
        : { left: Math.round(window.innerWidth * 0.38) + globeShiftX, bottom: Math.round(window.innerHeight * (progress < 0.48 ? 0.04 + 0.31 * (1 - heroAlign) : 0.18)) + globeShiftY };
      const zoomStart = compactView ? 0.95 : 1.2;
      const zoomEnd = compactView ? 14.2 : 15.2;
      const zoomProgress = Math.pow(progress, compactView ? 1.22 : 1.34);
      const responsiveZoomBase = zoomStart + (zoomEnd - zoomStart) * zoomProgress;
      const globeRadius = Math.min(window.innerWidth, window.innerHeight) * 0.24;
      const globeScaleBoost = Math.log2((globeRadius + 19) / globeRadius) * (1 - smooth(clamp(progress / 0.34)));
      const heroGlobeZoomBoost = 0.46 * (1 - smooth(clamp(progress / 0.34)));
      const responsiveZoom = responsiveZoomBase + globeScaleBoost + heroGlobeZoomBoost;
      const idleMs = reduced ? 0 : Math.max(0, now - lastScrollAt - 3000);
      const idleSeconds = Math.max(0, idleMs / 1000 - 0.75);
      if (idleMs > 0 || Math.abs(progress - lastAppliedProgress) > 0.0005) {
        const closeZoom = smooth(clamp((responsiveZoom - 6.5) / 5.5));
        const brightness = 1.65 - closeZoom * 0.28;
        const contrast = 1 + closeZoom * 0.16;
        const saturation = 1.24 - closeZoom * 0.06;
        map.getCanvas().style.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
        // Keep one continuous globe projection through the zoom; swapping to Mercator mid-flight clears the scene on some desktop GPUs.
        const shouldUseGlobe = true;
        if (shouldUseGlobe !== globeProjection) {
          globeProjection = shouldUseGlobe;
          try { map.setProjection({ type: shouldUseGlobe ? "globe" : "mercator" }); } catch { /* Keep current projection if unsupported. */ }
        }
        // After scrolling settles, keep a slow one-way turn at the current zoom. No sinusoidal reversal or zoom reset.
        const longitudeDrift = idleSeconds * 0.42;
        const bearingDrift = idleSeconds * 0.025;
        const rawLongitude = target.center[0] + longitudeDrift;
        const cameraLongitude = ((rawLongitude + 180) % 360 + 360) % 360 - 180;
        map.jumpTo({ center: [cameraLongitude, target.center[1]], zoom: responsiveZoom, pitch: target.pitch, bearing: target.bearing + bearingDrift, padding });
        lastAppliedProgress = renderedProgress;
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      resize.disconnect();
      window.removeEventListener("scroll", noteScroll);
      cancelAnimationFrame(animationFrame);
      map.remove();
      mapRef.current = null;
    };
  }, [progressRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    map.setStyle(generateMapStyle(getTheme(theme === "Carrara" ? "carrara" : "midnight_blue"), { includeBuildings: true, includeRoads: true }));
  }, [theme]);
  return <div ref={hostRef} className="journey-map" aria-label="A 3D map that travels from the world to Manhattan" />;
}

const chapters = [
  { kicker: "A PLACE IS A BEGINNING", title: <>The world is wide.<br /><em>Your place is here.</em></>, body: <>Turn <em>a hometown</em>, <em>a shared moment</em>, a journey or a finish line into a map design that feels like yours.</>, side: "left", tag: "01 / FIND YOUR PLACE" },
  { kicker: "CROSS THE DISTANCE", title: <>Half a world away.<br /><em>One familiar city.</em></>, body: <>The view leaves the whole planet behind and follows <em>one place</em> across the map, narrowing in until its streets begin to appear.</>, side: "right", tag: "02 / FIND THE CITY" },
  { kicker: "LAND IN THE DETAILS", title: <>Your streets.<br /><em>Your own coordinates.</em></>, body: <>Country lines give way to <em>neighbourhoods</em>, waterways and street names. The map settles around the exact corner you want to keep.</>, side: "left", tag: "03 / SET THE VIEW" },
  { kicker: "FOLLOW WHAT MATTERS", title: <>One place at a time.<br /><em>Closer with every scroll.</em></>, body: <>The globe keeps turning as the view travels toward one chosen city. Its streets and buildings come into focus as you reach the end.</>, side: "right", tag: "04 / FOLLOW THE VIEW" },
  { kicker: "A DIFFERENT FEELING", title: <>Same streets.<br /><em>A new mood.</em></>, body: "See the same map in two MAPARTE themes. Carrara brings warm stone, fine charcoal roads and pale water. Midnight Blue gives the streets a deeper light.", side: "left", tag: "05 / CHOOSE A THEME" },
  { kicker: "MAKE IT YOURS", title: <>The map is the start.<br /><em>Your words finish it.</em></>, body: "Choose poster or phone dimensions. Add a title, date or tagline; shape the map with borders, location labels, markers or a GPX route.", side: "right", tag: "06 / MAKE IT PERSONAL" },
  { kicker: "TAKE THE PLACE WITH YOU", title: <>Made on screen.<br /><em>Kept for good.</em></>, body: "Preview your digital design, then download it for your screen. MAPARTE creates digital maps; it does not print or ship posters.", side: "left", tag: "07 / PREVIEW & DOWNLOAD" },
];

const mapStories = [
  { title: "Where We Met", place: "PARIS · FRANCE", image: "where-we-met.png", href: "/where-we-met" },
  { title: "Hometown Roots", place: "DEHRADUN · INDIA", image: "hometown-roots.png", href: "/hometown-roots" },
  { title: "Travel Memories", place: "TOKYO · JAPAN", image: "travel-memories.png", href: "/travel-memories" },
];

const journeyFaqs = [
  ["What can I make with MAPARTE?", "Custom digital map artwork for places, journeys and milestones, with poster-style and phone wallpaper layouts."],
  ["Can I change the theme, border and text?", "Choose a supported map theme and layout, adjust borders, and add location labels, a title, date or tagline."],
  ["Can I add markers or a running route?", "Use built-in, emoji or custom markers. You can also import a GPX route and style its line and endpoints."],
  ["Can I preview my design on a wall?", "Use Special Full Screen to upload a wall photo. On supported phones, you can also request camera access for a live preview."],
  ["Do you print and ship posters?", "No. MAPARTE provides digital designs and downloads. You can use the file on your device or arrange a print yourself."],
];

export default function JourneyPreview() {
  const storyRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const hasScrolledRef = useRef(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [destination, setDestination] = useState<JourneyDestination>(() => chooseJourneyDestination());
  const destinationRef = useRef(destination);
  destinationRef.current = destination;
  const [theme, setTheme] = useState<"Midnight Blue" | "Carrara">("Midnight Blue");

  useEffect(() => {
    document.title = "A place, made yours — MAPARTE";
    return () => { document.title = "MAPARTE | Create Digital Map Art & Phone Wallpapers"; };
  }, []);

  useEffect(() => {
    let previous = "";
    try { previous = sessionStorage.getItem("maparte-journey-city") || ""; } catch { /* Keep random city selection available when storage is blocked. */ }
    const next = chooseJourneyDestination(previous || undefined);
    setDestination(next);
    try { sessionStorage.setItem("maparte-journey-city", next.id); } catch { /* The story still works without storage. */ }
  }, []);

  useEffect(() => {
    const root = storyRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-active", entry.isIntersecting));
    }, { threshold: 0.16 });
    root.querySelectorAll(".journey-chapter").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let completedFullPass = false;
    let waitingForNextDescent = false;
    let lastPageProgress = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const story = storyRef.current;
        const page = story?.parentElement;
        if (!story || !page) return;
        const top = story.getBoundingClientRect().top + window.scrollY;
        const storySpan = Math.max(1, story.offsetHeight - window.innerHeight);
        const pageSpan = Math.max(storySpan, page.offsetHeight - window.innerHeight);
        const storyProgress = clamp((window.scrollY - top) / storySpan);
        const pageProgress = clamp((window.scrollY - top) / pageSpan);
        const mapProgress = pageProgress;
        if (mapProgress > 0.025 && !hasScrolledRef.current) {
          hasScrolledRef.current = true;
          setHasScrolled(true);
        }
        if (pageProgress >= 0.995) completedFullPass = true;
        if (completedFullPass && pageProgress <= 0.01 && lastPageProgress > 0.01) {
          waitingForNextDescent = true;
        }
        if (waitingForNextDescent && pageProgress > 0.015) {
          waitingForNextDescent = false;
          completedFullPass = false;
          setDestination((current) => {
            const next = chooseJourneyDestination(current.id);
            try { sessionStorage.setItem("maparte-journey-city", next.id); } catch { /* A fresh city is still selected without storage. */ }
            return next;
          });
        }
        lastPageProgress = pageProgress;
        progressRef.current = mapProgress;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  return (
    <div className="journey-page">
      <div className="journey-world" aria-hidden="true"><JourneyMap theme={theme} progressRef={progressRef} destinationRef={destinationRef} /></div>
      <header className="journey-header">
        <a className="journey-wordmark" href="#start" aria-label="MapArte home"><img src="/assets/logo.svg" alt="" /><span>MAPARTE</span></a>
        <div className="journey-header__right"><span>MAPS FOR THE PLACES THAT STAY</span><a className="journey-glass" href="/?dist=3810">Make your map</a></div>
      </header>
      <main id="start" ref={storyRef} className="journey-track">
        {chapters.map((chapter, index) => (
          <section id={index === 1 ? "chapter-2" : undefined} className={`journey-chapter journey-chapter--${chapter.side}`} key={chapter.tag} data-step={index + 1}>
            <div className={`journey-copy${index === 5 ? " journey-copy--plate" : ""}`}>
              <span className="journey-kicker"><i />{chapter.kicker}</span>
              <div className="journey-copy__tag">{index === chapters.length - 1 ? `07 / ${destination.city.toUpperCase()} · ${destination.country.toUpperCase()}` : chapter.tag}</div>
              {index === 0 ? <h1>{chapter.title}</h1> : <h2>{chapter.title}</h2>}
              <p>{chapter.body}</p>
              {index === 0 && <>
                <div className="journey-facts"><span>800 CITIES · LIVE MAP DATA</span><span>REAL STREETS · DIGITAL DOWNLOAD</span></div>
                <div className="journey-actions">
                  <a className="journey-action journey-action--glass" href="/?dist=3810">Start with a place</a>
                  <a className="journey-action journey-action--quiet" href="#map-stories">Explore real map designs</a>
                </div>
              </>}
              {index === 4 && <div className="journey-themes" aria-label="Choose a map theme">
                <button className="journey-glass" type="button" aria-pressed={theme === "Midnight Blue"} onClick={() => setTheme("Midnight Blue")}><i className="journey-swatch journey-swatch--blue" />Midnight Blue</button>
                <button className="journey-glass" type="button" aria-pressed={theme === "Carrara"} onClick={() => setTheme("Carrara")}><i className="journey-swatch journey-swatch--stone" />Carrara</button>
              </div>}
              {index === 5 && <div className="journey-samples" id="map-stories" aria-label="MAPARTE map ideas">
                {mapStories.map((story) => <a className="journey-sample" href={story.href} key={story.title}>
                  <img src={`/assets/map-posters/${story.image}`} alt={`${story.title} MAPARTE digital map design for ${story.place}`} loading="lazy" />
                  <span>{story.place}</span><b>{story.title}</b>
                </a>)}
              </div>}
              {index === 6 && <a className="journey-action journey-action--bright" href="/?dist=3810">Create your map</a>}
            </div>
          </section>
        ))}
      </main>
      <section className="journey-faq" aria-labelledby="journey-faq-title">
        <div className="journey-faq__intro"><span>GOOD TO KNOW</span><h2 id="journey-faq-title">Before you start.</h2></div>
        <div className="journey-faq__list">{journeyFaqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>
      <footer className="journey-footer">
        <a href="/?dist=3810">MAPARTE.COM <span>Map it. Make it yours.</span></a>
        <nav aria-label="Footer navigation"><a href="#map-stories">Map gallery</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refund">Refund</a></nav>
        <span>Digital map designs made for the places you love.</span>
      </footer>
      <div className="journey-scrollhint" aria-hidden="true" style={{ opacity: hasScrolled ? 0 : 1 }}>SCROLL TO TRAVEL <span>↓</span></div>
    </div>
  );
}

