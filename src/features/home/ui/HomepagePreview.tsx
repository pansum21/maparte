import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import * as maplibregl from "maplibre-gl";
import "@/features/map/infrastructure/maplibreWorker";
import "maplibre-gl/dist/maplibre-gl.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import { generateMapStyle } from "@/features/map/infrastructure/maplibreStyle";
import { getTheme } from "@/features/theme/infrastructure/themeRepository";
import { themeOptions } from "@/features/theme/infrastructure/themeRepository";
import type { ResolvedTheme } from "@/features/theme/domain/types";
import {
  NeatlineArtwork,
  lineStyles,
  type NeatlineSelection,
} from "@/features/layout/ui/NeatlinePicker";
import layoutsManifest from "@/data/layouts.json";
import type { Map as MaplibreMap } from "maplibre-gl";
import "./homepagePreview.css";

type CitySample = {
  id: string;
  city: string;
  country: string;
  center: [number, number];
  themeId: string;
  borderId: string;
  shape: "portrait" | "landscape";
};

const featuredThemeIds = [
  "midnight_blue",
  "carrara",
  "subtle_grayscale",
  "blue_water",
  "midnight_commander",
  "retro_vintage",
  "golden_dusk",
  "pale_dawn",
];

const cities: Omit<CitySample, "themeId" | "borderId" | "shape">[] = [
  { id: "new-york", city: "New York", country: "United States", center: [-74.006, 40.7128] },
  { id: "paris", city: "Paris", country: "France", center: [2.3522, 48.8566] },
  { id: "dubai", city: "Dubai", country: "United Arab Emirates", center: [55.2708, 25.2048] },
  { id: "tokyo", city: "Tokyo", country: "Japan", center: [139.6917, 35.6895] },
  { id: "london", city: "London", country: "United Kingdom", center: [-0.1276, 51.5072] },
  { id: "amsterdam", city: "Amsterdam", country: "Netherlands", center: [4.9041, 52.3676] },
  { id: "rome", city: "Rome", country: "Italy", center: [12.4964, 41.9028] },
  { id: "barcelona", city: "Barcelona", country: "Spain", center: [2.1734, 41.3851] },
  { id: "jaipur", city: "Jaipur", country: "India", center: [75.7873, 26.9124] },
  { id: "mumbai", city: "Mumbai", country: "India", center: [72.8777, 19.076] },
  { id: "delhi", city: "Delhi", country: "India", center: [77.209, 28.6139] },
  { id: "kyoto", city: "Kyoto", country: "Japan", center: [135.7681, 35.0116] },
  { id: "lisbon", city: "Lisbon", country: "Portugal", center: [-9.1393, 38.7223] },
  { id: "berlin", city: "Berlin", country: "Germany", center: [13.405, 52.52] },
  { id: "istanbul", city: "Istanbul", country: "Türkiye", center: [28.9784, 41.0082] },
  { id: "singapore", city: "Singapore", country: "Singapore", center: [103.8198, 1.3521] },
  { id: "sydney", city: "Sydney", country: "Australia", center: [151.2093, -33.8688] },
  { id: "san-francisco", city: "San Francisco", country: "United States", center: [-122.4194, 37.7749] },
  { id: "seoul", city: "Seoul", country: "South Korea", center: [126.978, 37.5665] },
  { id: "venice", city: "Venice", country: "Italy", center: [12.3155, 45.4408] },
];

const borderNames = lineStyles.map((style) => style.id);
const citySamples: CitySample[] = cities.map((city, index) => ({
  ...city,
  themeId: featuredThemeIds[index % featuredThemeIds.length],
  borderId: borderNames[index % borderNames.length],
  shape: index % 2 === 1 ? "landscape" : "portrait",
}));

let activeThumbnailMaps = 0;
const thumbnailMapQueue: Array<() => void> = [];

function scheduleThumbnailMap(start: (release: () => void) => void): () => void {
  let cancelled = false;
  let started = false;
  const launch = () => {
    if (cancelled) return;
    started = true;
    activeThumbnailMaps += 1;
    let released = false;
    start(() => {
      if (released) return;
      released = true;
      activeThumbnailMaps = Math.max(0, activeThumbnailMaps - 1);
      while (activeThumbnailMaps < 4 && thumbnailMapQueue.length) thumbnailMapQueue.shift()?.();
    });
  };
  if (activeThumbnailMaps < 4) launch();
  else thumbnailMapQueue.push(launch);
  return () => {
    cancelled = true;
    if (!started) {
      const queuedIndex = thumbnailMapQueue.indexOf(launch);
      if (queuedIndex >= 0) thumbnailMapQueue.splice(queuedIndex, 1);
    }
  };
}

const allLayouts = layoutsManifest.categories.flatMap((category) =>
  category.layouts.map((layout) => ({ ...layout, category: category.name })),
);

function buildNeatlineSelection(lineId: string, color: string): NeatlineSelection {
  return {
    lineId,
    cornerId: "none",
    frameId: "none",
    cornerPosition: "all",
    thicknesses: {},
    lineVariant: "plain",
    cornerVariant: "plain",
    mapGapCm: 0.1,
    colorMode: "single",
    singleColor: color,
    designScale: 1,
    showWhiteMat: false,
  };
}

function createHomepageMapStyle(theme: ResolvedTheme) {
  const style = generateMapStyle(theme);
  for (const layer of style.layers) {
    if (theme.name === "Carrara" && layer.id === "water" && layer.type === "fill" && layer.paint) {
      layer.paint["fill-color"] = "#B5C5CC";
      layer.paint["fill-outline-color"] = "#92A9B3";
    }
    if (theme.name === "Retro Vintage" && layer.type === "line" && layer.paint) {
      const color = layer.paint["line-color"];
      if (color === theme.map.roads.major) layer.paint["line-color"] = "#B78C4D";
      if ([theme.map.roads.minor_high, theme.map.roads.minor_mid, theme.map.roads.minor_low].includes(color as string)) layer.paint["line-color"] = "#9B8062";
    }
    if (layer.type !== "line" || !layer.paint || !("line-width" in layer.paint)) continue;
    const width = layer.paint["line-width"];
    if (typeof width === "number") {
      layer.paint["line-width"] = width * 0.62;
    } else if (Array.isArray(width) && (width[0] === "interpolate" || width[0] === "step")) {
      const scaled: unknown[] = [...width];
      // Interpolate has three header items; its first stop output is index 4.
      // Step starts with its default output at index 3.
      const firstOutput = width[0] === "interpolate" ? 4 : 3;
      for (let index = firstOutput; index < scaled.length; index += 2) {
        const outputWidth = scaled[index];
        if (typeof outputWidth === "number") scaled[index] = outputWidth * 0.62;
      }
      layer.paint["line-width"] = scaled as never;
    }
  }
  return style;
}

function MapGlobe({
  theme,
  layerVisibility,
  onMapReady,
}: {
  theme: ResolvedTheme;
  layerVisibility: { roads: boolean; water: boolean; landDetail: boolean };
  onMapReady: (map: MaplibreMap | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const style = useMemo(() => generateMapStyle(theme), [theme]);

  useEffect(() => {
    if (!hostRef.current) return;
    const countryMarkers: maplibregl.Marker[] = [];
    const globeOptions: maplibregl.MapOptions & { projection?: { type: "globe" } } = {
      container: hostRef.current,
      style,
      center: [78.0322, 24],
      zoom: 2.15,
      projection: { type: "globe" },
      cooperativeGestures: window.matchMedia("(max-width: 720px)").matches,
      scrollZoom: false,
      attributionControl: false,
      renderWorldCopies: false,
      maxPitch: 0,
      canvasContextAttributes: { antialias: true },
    };
    const map = new maplibregl.Map(globeOptions);
    mapRef.current = map;
    map.on("load", () => {
      map.setProjection({ type: "globe" });
      const countries = [
        { name: "India", center: [78, 22] as [number, number] },
        { name: "China", center: [103.8, 35.8] as [number, number] },
        { name: "Japan", center: [138.2, 36.2] as [number, number] },
        { name: "Australia", center: [134, -25] as [number, number] },
        { name: "United States", center: [-98, 39] as [number, number] },
        { name: "Brazil", center: [-52, -10] as [number, number] },
        { name: "France", center: [2.2, 46] as [number, number] },
      ];
      for (const country of countries) {
        const label = document.createElement("span");
        label.className = "home-globe-country-label";
        const pin = document.createElement("i");
        pin.className = "home-globe-country-label__pin";
        pin.setAttribute("aria-hidden", "true");
        label.append(pin, document.createTextNode(country.name));
        label.setAttribute("aria-label", country.name);
        countryMarkers.push(new maplibregl.Marker({ element: label, anchor: "center" }).setLngLat(country.center).addTo(map));
      }
      onMapReady(map);
    });
    return () => {
      onMapReady(null);
      countryMarkers.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(style);
    map.once("style.load", () => map.setProjection({ type: "globe" }));
  }, [style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const syncCountryOutline = () => {
      if (!map.isStyleLoaded() || !map.getSource("openfreemap")) return;
      if (!map.getLayer("homepage-country-outline")) {
        map.addLayer({
          id: "homepage-country-outline",
          type: "line",
          source: "openfreemap",
          "source-layer": "boundary",
          minzoom: 0,
          filter: ["==", ["to-number", ["get", "admin_level"]], 2],
          paint: {
            "line-color": theme.name === "Midnight Blue" ? "#D6B352" : theme.map.roads.major,
            "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 3, 1.1, 6, 1.45],
            "line-opacity": 0.96,
          },
        });
      } else {
        map.setPaintProperty("homepage-country-outline", "line-color", theme.name === "Midnight Blue" ? "#D6B352" : theme.map.roads.major);
      }
    };
    map.on("style.load", syncCountryOutline);
    map.once("idle", syncCountryOutline);
    syncCountryOutline();
    return () => { map.off("style.load", syncCountryOutline); map.off("idle", syncCountryOutline); };
  }, [style, theme.map.roads.major]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyLayerVisibility = () => {
      if (!map.isStyleLoaded()) return;
      for (const layer of map.getStyle().layers) {
        const group = layer.id.startsWith("road-") || layer.id === "rail"
          ? "roads"
          : layer.id === "water" || layer.id === "waterway"
            ? "water"
            : ["landcover", "park", "building", "aeroway"].includes(layer.id)
              ? "landDetail"
              : null;
        if (group) map.setLayoutProperty(layer.id, "visibility", layerVisibility[group] ? "visible" : "none");
      }
    };
    map.on("style.load", applyLayerVisibility);
    applyLayerVisibility();
    return () => { map.off("style.load", applyLayerVisibility); };
  }, [layerVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = 0;
    let pausedUntil = 0;
    let globeVisible = true;
    const visibilityObserver = hostRef.current ? new IntersectionObserver(([entry]) => { globeVisible = entry.isIntersecting; }, { threshold: 0.08 }) : null;
    if (hostRef.current) visibilityObserver?.observe(hostRef.current);
    const pause = () => { pausedUntil = Date.now() + 6000; };
    map.on("dragstart", pause);
    map.on("zoomstart", pause);
    map.on("rotatestart", pause);
    map.on("touchstart", pause);
    map.on("wheel", pause);
    const spin = (time: number) => {
      if (time - last > 32 && Date.now() > pausedUntil && globeVisible && !document.hidden && map.loaded()) {
        const center = map.getCenter();
        map.jumpTo({ center: [center.lng + 0.018, center.lat] });
        last = time;
      }
      frame = requestAnimationFrame(spin);
    };
    frame = requestAnimationFrame(spin);
    return () => {
      cancelAnimationFrame(frame);
      visibilityObserver?.disconnect();
      map.off("dragstart", pause);
      map.off("zoomstart", pause);
      map.off("rotatestart", pause);
      map.off("touchstart", pause);
      map.off("wheel", pause);
    };
  }, []);

  return <div className="home-globe-map" ref={hostRef} aria-label="Interactive 3D globe" />;
}

function CityMapThumbnail({
  sample,
  onOpen,
  showCaption = true,
  showBorder = true,
  artStyle,
  className = "",
}: {
  sample: CitySample;
  onOpen: () => void;
  showCaption?: boolean;
  showBorder?: boolean;
  artStyle?: CSSProperties;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState("");
  const style = useMemo(() => createHomepageMapStyle(getTheme(sample.themeId)), [sample.themeId]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || image) return;
    let map: MaplibreMap | null = null;
    let releaseMap: (() => void) | null = null;
    let cancelQueuedMap: (() => void) | null = null;
    let cancelled = false;
    let completed = false;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || map || cancelled) return;
      observer.disconnect();
      cancelQueuedMap = scheduleThumbnailMap((release) => {
        releaseMap = release;
        if (cancelled) { release(); return; }
        map = new maplibregl.Map({
          container: node,
          style,
          center: sample.center,
          zoom: sample.id === "dubai" ? 10.05 : 9.55,
          interactive: false,
          attributionControl: false,
          pixelRatio: Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5),
          canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
        });
        map.once("idle", () => {
          const renderedMap = map;
          if (completed || !renderedMap) return;
          window.setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => {
            if (completed) return;
            completed = true;
            if (!cancelled) {
              try {
                setImage(renderedMap.getCanvas().toDataURL("image/png"));
              } catch {
                // Keep the live canvas visible if the browser does not permit a snapshot.
              }
            }
            renderedMap.remove();
            map = null;
            releaseMap?.();
            releaseMap = null;
          })), 320);
        });
      });
    }, { rootMargin: "160px" });
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelQueuedMap?.();
      map?.remove();
      releaseMap?.();
    };
  }, [image, sample.center, style]);

  return (
    <button className={`home-map-card ${className}`} type="button" onClick={onOpen} aria-label={`Open ${sample.city} map in ${getTheme(sample.themeId).name}`}>
      <span className={`home-map-card__art home-map-card__art--${sample.shape}`} style={artStyle}>
        <span className="home-map-card__map" ref={frameRef} style={{ backgroundColor: getTheme(sample.themeId).map.land }}>
          {image ? <img src={image} alt={`${sample.city} street map`} loading="lazy" /> : <span className="home-map-card__loading">Loading city map…</span>}
        </span>
        {showBorder ? <span className="home-map-card__border"><NeatlineArtwork selection={buildNeatlineSelection(sample.borderId, getTheme(sample.themeId).ui.text)} /></span> : null}
        <span className="home-map-card__pin" aria-hidden="true">●</span>
      </span>
      {showCaption ? <span className="home-map-card__copy"><strong>{sample.city}</strong><span>{sample.country} · {getTheme(sample.themeId).name}</span></span> : null}
    </button>
  );
}

function ScrollZoomMotion({ onOpen }: { onOpen: (sample: CitySample) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const samples = [citySamples[0], citySamples[3], citySamples[4]];
  const copy = [
    ["Choose a place", "Start with a real city map", "The roads and coastlines here come from MAPARTE’s live map renderer."],
    ["Zoom into the streets", "See the details come closer", "The map itself stays crisp while the story moves from city to neighborhood."],
    ["Make it yours", "A place becomes your map", "Themes, layout, text and borders are adjusted in the separate editor."],
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    if (!section) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = section.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, section.offsetHeight - window.innerHeight)));
      section.style.setProperty("--zoom-progress", progress.toFixed(3));
      const next = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
      if (next !== phaseRef.current) {
        phaseRef.current = next;
        setPhase(next);
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="home-zoom-story" ref={sectionRef} aria-label="Scroll-through map art preview">
      <div className="home-zoom-sticky">
        <div className="home-zoom-copy" key={phase}>
          <span className="home-eyebrow">A SMALL MOTION STUDY · TEST PAGE</span>
          <span className="home-zoom-step">0{phase + 1} / 03</span>
          <h2>{copy[phase][0]}<br /><em>{copy[phase][1]}</em></h2>
          <p>{copy[phase][2]}</p>
          <span className="home-zoom-hint">SCROLL A LITTLE TO EXPLORE <b aria-hidden="true">↓</b></span>
        </div>
        <div className="home-zoom-stack" aria-label="Floating real city map previews">
          {samples.map((sample, index) => (
            <div className={`home-zoom-card home-zoom-card--${index + 1}`} key={sample.id}>
              <CityMapThumbnail sample={sample} onOpen={() => onOpen(sample)} showCaption={false} artStyle={{ height: "100%" }} />
              {index === 0 ? <svg className="home-zoom-route" viewBox="0 0 100 160" aria-hidden="true"><path pathLength="1" d="M18 128 C38 108 26 96 52 84 S72 60 61 48 S78 28 84 20" /></svg> : null}
            </div>
          ))}
          <span className="home-zoom-disclaimer">The route stroke is a motion sample, not recorded GPS data.</span>
        </div>
      </div>
    </section>
  );
}

function CityMapDialog({
  sample,
  onClose,
}: {
  sample: CitySample;
  onClose: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [themeId, setThemeId] = useState(sample.themeId);
  const [borderId, setBorderId] = useState(sample.borderId);
  const [layoutShape, setLayoutShape] = useState<"portrait" | "landscape" | "square">(sample.shape);
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const style = useMemo(() => createHomepageMapStyle(theme), [theme]);

  useEffect(() => {
    if (!hostRef.current) return;
    const map = new maplibregl.Map({
      container: hostRef.current,
      style,
      center: sample.center,
      zoom: 9.65,
      scrollZoom: true,
      dragPan: true,
      attributionControl: false,
      canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
    });
    map.scrollZoom.setWheelZoomRate(1 / 460);
    map.scrollZoom.setZoomRate(1 / 90);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [sample.center]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.setStyle(style);
  }, [style]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="home-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="home-dialog" role="dialog" aria-modal="true" aria-labelledby="home-dialog-title">
        <div className="home-dialog__head"><div><span className="home-eyebrow">LIVE MAP PREVIEW</span><h2 id="home-dialog-title">{sample.city}, {sample.country}</h2></div><button className="home-icon-button" onClick={onClose} type="button" aria-label="Close map preview">×</button></div>
        <div className="home-dialog__grid">
          <div className="home-dialog__visual"><div className={`home-dialog__poster home-dialog__poster--${layoutShape}`} style={{ "--home-map-land": theme.map.land } as CSSProperties}><div className="home-dialog__map" ref={hostRef} /><div className="home-dialog__border"><NeatlineArtwork selection={buildNeatlineSelection(borderId, theme.ui.text)} /></div><span className="home-dialog__city">{sample.city.toUpperCase()}</span></div><p>Drag or use the mouse wheel to adjust the live map preview.</p></div>
          <div className="home-dialog__controls">
            <label>Map theme<select value={themeId} onChange={(event) => setThemeId(event.target.value)}>{[...new Set([...featuredThemeIds, ...posterThemeIds])].map((id) => <option key={id} value={id}>{getTheme(id).name}</option>)}</select></label>
            <label>Layout<select value={layoutShape} onChange={(event) => setLayoutShape(event.target.value as typeof layoutShape)}><option value="portrait">Vertical</option><option value="landscape">Horizontal</option><option value="square">Square</option></select></label>
            <label>Border<select value={borderId} onChange={(event) => setBorderId(event.target.value)}>{lineStyles.map((border) => <option value={border.id} key={border.id}>{border.name}</option>)}</select></label>
            <button className="home-primary home-primary--wide" type="button" disabled>Editor connection is off for this test page</button>
            <p className="home-dialog__note">This is a separate testing page. It does not open or change the main website.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const howSteps = [
  { n: "01", title: "Find a place", text: "Search for a city, neighborhood, or meaningful location in the MAPARTE editor." },
  { n: "02", title: "Make it yours", text: "Choose a theme, one of 38 layouts, map details, text, and a border." },
  { n: "03", title: "Download the file", text: "Open Download in the editor and choose a high-resolution PNG or another available format." },
];

const mapStories = [
  { id: "where-we-met", cityId: "paris", image: "poster-paris-midnight.webp", number: "01", title: "Where We Met", category: "Love & milestones", text: "Keep the streets around a place that became part of your story." },
  { id: "she-said-yes", cityId: "london", image: "poster-wedding-carrara.webp", number: "02", title: "She Said Yes", category: "Love & milestones", text: "Mark the place where one question changed everything." },
  { id: "our-wedding-day", cityId: "rome", image: "poster-wedding-carrara.webp", number: "03", title: "Our Wedding Day", category: "Love & milestones", text: "Save the map around the day and place you celebrate." },
  { id: "our-first-home", cityId: "new-york", image: "poster-new-york-blueprint.webp", number: "04", title: "Our First Home", category: "Places that matter", text: "Make a map of the neighborhood where a new chapter began." },
  { id: "baby-arrival", cityId: "london", image: "poster-paris-midnight.webp", number: "05", title: "The Day You Were Born", category: "Places that matter", text: "Remember the place and date that welcomed someone new." },
  { id: "travel-memories", cityId: "tokyo", image: "poster-rome-terracotta.webp", number: "06", title: "Travel Memories", category: "Journeys", text: "Trace the cities and routes that made a trip unforgettable." },
  { id: "hometown-roots", cityId: "jaipur", image: "poster-dehradun-emerald.webp", number: "07", title: "Hometown Roots", category: "Places that matter", text: "Bring home streets, nearby towns and familiar roads together." },
  { id: "marathon-race", cityId: "paris", image: "poster-boston-route.webp", number: "08", title: "Marathon Race", category: "Routes & outdoors", text: "Show the course, start, finish and route that you conquered." },
  { id: "mountain-summit", cityId: "mumbai", image: "poster-london-vintage.webp", number: "09", title: "Peak & Trail Summit", category: "Routes & outdoors", text: "Mark a trail, summit or outdoor achievement on the map." },
];

const posterStyles = [
  { id: "dubai-emerald", cityId: "dubai", themeId: "emerald" },
  { id: "paris-midnight", cityId: "paris", themeId: "midnight_blue" },
  { id: "tokyo-noir", cityId: "tokyo", themeId: "noir" },
  { id: "new-york-blueprint", cityId: "new-york", themeId: "blueprint" },
  { id: "rome-terracotta", cityId: "rome", themeId: "terracotta" },
  { id: "london-vintage", cityId: "london", themeId: "retro_vintage" },
  { id: "singapore-pale-dawn", cityId: "singapore", themeId: "pale_dawn" },
  { id: "florence-carrara", cityId: "rome", themeId: "carrara" },
];

const posterThemeIds = ["emerald", "noir", "blueprint", "terracotta"];

export default function HomepagePreview() {
  const [themeId, setThemeId] = useState("midnight_blue");
  const [cityQuery, setCityQuery] = useState("");
  const [searchFeedback, setSearchFeedback] = useState("");
  const [headline, setHeadline] = useState("made into map art.");
  const [galleryView, setGalleryView] = useState<"maps" | "posters" | "layouts" | "borders">("maps");
  const [selectedSample, setSelectedSample] = useState<CitySample | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [globeLayersOpen, setGlobeLayersOpen] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState({ roads: true, water: true, landDetail: true });
  const globeRef = useRef<MaplibreMap | null>(null);
  const activeTheme = useMemo(() => getTheme(themeId), [themeId]);
  const selectedOption = themeOptions.find((option) => option.id === themeId);

  useEffect(() => {
    const phrases = ["made into map art.", "Map it. Make it yours.", "Mapping your visuals."];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % phrases.length;
      setHeadline(phrases[index]);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".maparte-home");
    const progressBar = root?.querySelector<HTMLElement>(".home-scroll-progress span");
    if (!root || !progressBar) return;
    const update = () => {
      const page = document.documentElement;
      const max = Math.max(1, page.scrollHeight - window.innerHeight);
      progressBar.style.transform = `scaleX(${Math.max(0, Math.min(1, window.scrollY / max))})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const root = document.querySelector<HTMLElement>(".maparte-home");
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-motion-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    const targets = root.querySelectorAll<HTMLElement>(".home-section-heading, .home-map-card, .home-poster-card, .home-layout-card, .home-border-card, .home-story-card, .home-step, .home-lifestyle-card, .home-feature-list article, .home-faq details");
    targets.forEach((target) => observer.observe(target));
    root.classList.add("home-motion-ready");
    return () => {
      observer.disconnect();
      root.classList.remove("home-motion-ready");
    };
  }, []);

  const goToPlace = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = cityQuery.trim().toLowerCase();
    const city = citySamples.find((sample) => sample.city.toLowerCase() === term || sample.id === term.split(" ").join("-"));
    if (city && globeRef.current) {
      setSearchFeedback("");
      globeRef.current.flyTo({ center: city.center, zoom: 2.5, duration: 1800 });
    } else if (term) {
      setSearchFeedback("This preview keeps you here. Try one of the featured cities above.");
    }
  }, [cityQuery]);

  const openSample = useCallback((sample: CitySample) => setSelectedSample(sample), []);
  const closeDialog = useCallback(() => setSelectedSample(null), []);
  const switchGallery = useCallback((view: "maps" | "posters" | "layouts" | "borders") => {
    setGalleryView(view);
    setExploreOpen(false);
    window.requestAnimationFrame(() => document.getElementById("map-gallery")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "MAPARTE | Digital Map Art Studio";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("homepage-preview-active");
    return () => document.documentElement.classList.remove("homepage-preview-active");
  }, []);

  return (
    <main className="maparte-home" data-theme={themeId} style={{ "--home-accent": activeTheme.ui.text, "--home-map-land": activeTheme.map.land } as CSSProperties}>
      <div className="home-scroll-progress" aria-hidden="true"><span /></div>
      <header className="home-header"><a className="home-brand" href="#top" aria-label="MAPARTE home"><img src="/assets/logo.svg" alt="" /><span className="home-brand-copy"><strong>MAPARTE</strong><small>Mapping your visuals</small></span></a><nav className="home-nav" aria-label="Main navigation"><a href="#map-gallery">Map Gallery</a><div className="home-explore-wrap"><button type="button" className="home-nav-menu" aria-expanded={exploreOpen} onClick={() => setExploreOpen((open) => !open)}>Explore <span aria-hidden="true">⌄</span></button>{exploreOpen ? <div className="home-explore-menu"><a href="#theme-preview" onClick={() => setExploreOpen(false)}>Themes</a><a href="#map-gallery" onClick={(event) => { event.preventDefault(); switchGallery("posters"); }}>Poster styles</a><a href="#map-gallery" onClick={(event) => { event.preventDefault(); switchGallery("layouts"); }}>Layouts</a><a href="#map-gallery" onClick={(event) => { event.preventDefault(); switchGallery("borders"); }}>Borders</a><a href="#map-features" onClick={() => setExploreOpen(false)}>Features</a><a href="#map-stories" onClick={() => setExploreOpen(false)}>Map stories</a></div> : null}</div><a href="#map-stories">Stories</a><a href="#how-it-works">How it works</a></nav><a className="home-primary home-header-cta" href="#map-gallery">Explore maps <span aria-hidden="true">↓</span></a></header>

      <section className="home-hero" id="top">
        <div className="home-hero__ambient" aria-hidden="true" />
        <div className="home-hero__inner">
          <div className="home-hero__globe-column">
          <div className="home-globe-stage"><div className="home-globe-frame"><MapGlobe theme={activeTheme} layerVisibility={layerVisibility} onMapReady={(map) => { globeRef.current = map; }} /></div><div className={`home-globe-layers${globeLayersOpen ? " is-open" : ""}`}><button className="home-globe-layers__toggle" type="button" aria-expanded={globeLayersOpen} onClick={() => setGlobeLayersOpen((open) => !open)}><span aria-hidden="true">▤</span> Map layers <span aria-hidden="true">{globeLayersOpen ? "−" : "+"}</span></button>{globeLayersOpen ? <div className="home-globe-layers__panel"><div className="home-globe-layers__heading"><strong>MAP LAYERS</strong><span>LIVE</span></div><label><input type="checkbox" checked={layerVisibility.roads} onChange={(event) => setLayerVisibility((current) => ({ ...current, roads: event.target.checked }))} />Roads & transit</label><label><input type="checkbox" checked={layerVisibility.water} onChange={(event) => setLayerVisibility((current) => ({ ...current, water: event.target.checked }))} />Waterways</label><label><input type="checkbox" checked={layerVisibility.landDetail} onChange={(event) => setLayerVisibility((current) => ({ ...current, landDetail: event.target.checked }))} />Terrain details</label><div className="home-globe-camera"><span>CAMERA ALTITUDE</span><div><button type="button" onClick={() => globeRef.current?.flyTo({ center: [78.0322, 24], zoom: 2.15, duration: 1000 })}>🌍 Globe</button><button type="button" onClick={() => globeRef.current?.flyTo({ center: [79, 22], zoom: 2.45, duration: 1000 })}>📍 India</button></div></div></div> : null}</div><span className="home-globe-caption"><i /> A real, interactive 3D globe</span></div>
            <div className="home-theme-picker" id="theme-preview">
              <div className="home-theme-picker__heading"><strong>Pick a map mood</strong><span>Tap a theme to recolor the globe</span></div>
              <div className="home-theme-swatches">
                {featuredThemeIds.map((id) => {
                  const item = themeOptions.find((option) => option.id === id);
                  const theme = getTheme(id);
                  const colors = [...new Set(item?.palette ?? [theme.ui.text, theme.map.land, theme.map.roads.major, theme.map.water])].slice(0, 5);
                  return (
                    <button key={id} type="button" className={`home-theme-chip${themeId === id ? " is-active" : ""}`} onClick={() => setThemeId(id)} aria-pressed={themeId === id} title={item?.name}>
                      <span className="home-theme-chip__palette" aria-hidden="true">{colors.map((color, index) => <i key={`${id}-${index}`} style={{ backgroundColor: color }} />)}</span>
                      <span className="home-theme-chip__label">{item?.name ?? theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="home-hero__copy"><span className="home-eyebrow"><i /> MAPARTE · YOUR PLACE, YOUR MAP</span><h1>A place you love,<br /><em className="home-hero-headline" aria-live="polite" key={headline}>{headline}</em></h1><p>Explore the globe, choose a map style, and create a digital map you can make your own.</p><form className="home-place-search" onSubmit={goToPlace}><span className="home-search-pin" aria-hidden="true">⌖</span><input aria-label="Search a city or place" list="home-city-list" placeholder="Try Paris, Tokyo, or London" value={cityQuery} onChange={(event) => { setCityQuery(event.target.value); setSearchFeedback(""); }} /><datalist id="home-city-list">{citySamples.map((city) => <option key={city.id} value={city.city} />)}</datalist><button type="submit" aria-label="Find place">→</button></form>{searchFeedback ? <p className="home-search-feedback" role="status">{searchFeedback}</p> : null}<div className="home-hero__actions"><a className="home-primary" href="#map-gallery">Explore city maps <span aria-hidden="true">↓</span></a><a className="home-text-link" href="#map-gallery">See map styles <span aria-hidden="true">↓</span></a></div><div className="home-hero__facts"><span><b>20</b> featured cities</span><span><b>8</b> hand-picked themes</span><span><b>PNG</b> high-resolution download</span></div><p className="home-hero__current-theme">Globe theme: <strong>{selectedOption?.name ?? activeTheme.name}</strong></p></div>
        </div>
        <div className="home-hero__bottom-note"><span>MOVE THE GLOBE</span><span className="home-scroll-mark" aria-hidden="true">↓</span><span>FIND YOUR PLACE</span></div>
      </section>

      <ScrollZoomMotion onOpen={openSample} />

      <section className="home-section home-gallery-section" id="map-gallery">
        <div className="home-section-heading"><div><span className="home-eyebrow">A MAP FOR EVERY KIND OF MEMORY</span><h2>Explore the map gallery</h2><p>Twenty city-map previews rendered from real street data in the MAPARTE editor. Open a map to change its theme or border; choose high-resolution PNG in the editor’s Download panel.</p></div><span className="home-section-count">20 <small>CITY MAPS</small></span></div>
        <div className="home-gallery-tabs" role="tablist" aria-label="Map gallery categories">{([ ["maps", "City maps"], ["posters", "Poster styles"], ["layouts", "Layouts"], ["borders", "Borders"] ] as const).map(([id, label]) => <button type="button" role="tab" aria-selected={galleryView === id} className={galleryView === id ? "is-active" : ""} key={id} onClick={() => setGalleryView(id)}>{label}{id === "maps" ? <span>20</span> : id === "posters" ? <span>8</span> : id === "borders" ? <span>9</span> : <span>{allLayouts.length}</span>}</button>)}</div>
        {galleryView === "maps" ? <div className="home-map-grid">{citySamples.map((sample) => <CityMapThumbnail key={sample.id} sample={sample} onOpen={() => openSample(sample)} />)}</div> : null}
        {galleryView === "posters" ? <div className="home-poster-grid">{posterStyles.map((poster) => {
          const baseSample = citySamples.find((city) => city.id === poster.cityId) ?? citySamples[0];
          const place = poster.id === "florence-carrara"
            ? { city: "Florence", country: "Italy", center: [11.2558, 43.7696] as [number, number], id: "florence" }
            : { city: baseSample.city, country: baseSample.country, center: baseSample.center, id: baseSample.id };
          const sample = { ...baseSample, ...place, themeId: poster.themeId, shape: "portrait" as const };
          const themeName = getTheme(poster.themeId).name;
          return <article className="home-poster-card" key={poster.id}><CityMapThumbnail sample={sample} onOpen={() => openSample(sample)} /><span className="home-poster-card__badge">PORTRAIT MAP · {themeName}</span></article>;
        })}</div> : null}
        {galleryView === "layouts" ? <div className="home-layout-grid" id="layout-gallery">{layoutsManifest.categories.map((category) => <section className="home-layout-category" key={category.id}><h3>{category.name}</h3><div className="home-layout-cards">{category.layouts.map((layout, index) => { const fit = Math.min(340 / layout.width, 360 / layout.height); const width = Math.max(92, layout.width * fit); const height = Math.max(92, layout.height * fit); const city = citySamples[(allLayouts.findIndex((item) => item.id === layout.id) + index) % citySamples.length]; const sample = { ...city, shape: layout.width >= layout.height ? "landscape" as const : "portrait" as const }; return <article className="home-layout-card" key={layout.id}><div className="home-layout-shape" style={{ width, height, aspectRatio: `${layout.width} / ${layout.height}` }}><CityMapThumbnail sample={sample} onOpen={() => openSample(sample)} showCaption={false} showBorder={false} artStyle={{ height: "100%" }} className="home-map-card--layout" /></div><strong>{layout.name}</strong><small>{layout.width} × {layout.height} {layout.unit}</small></article>; })}</div></section>)}</div> : null}
        {galleryView === "borders" ? <div className="home-border-grid" id="border-gallery">{citySamples.slice(0, lineStyles.length).map((sample, index) => <article className="home-border-card" key={sample.id}><CityMapThumbnail sample={sample} onOpen={() => openSample(sample)} /><strong>{lineStyles[index].name}</strong></article>)}</div> : null}
        <p className="home-gallery-credit">Each preview is a PNG captured from MAPARTE’s live map renderer. Map data © OpenStreetMap contributors.</p>
      </section>

      <section className="home-section home-room-section" id="room-preview"><div className="home-room-copy"><span className="home-eyebrow">SEE HOW MAP ART FITS A SPACE</span><h2>A place you love,<br />on your wall.</h2><p>Explore portrait, landscape and square map layouts in room and gift examples. These lifestyle images are illustrative mockups; MAPARTE provides the digital map file, not printing or framing.</p><a className="home-text-link" href="#map-gallery">Browse the map gallery <span aria-hidden="true">↗</span></a></div><div className="home-lifestyle-grid"><figure className="home-lifestyle-card home-lifestyle-card--room"><img src="/assets/homepage-room-mockup.webp" alt="Illustrative room mockup with a framed city map" loading="lazy" /><figcaption><strong>Room inspiration</strong><span>Illustrative map-art mockup</span></figcaption></figure><figure className="home-lifestyle-card"><img src="/assets/homepage-gift-mockup.webp" alt="Illustrative gift moment with framed map artwork" loading="lazy" /><figcaption><strong>A thoughtful place-based gift</strong><span>Illustrative map-art mockup</span></figcaption></figure></div></section>

      <section className="home-section home-stories" id="map-stories"><div className="home-section-heading"><div><span className="home-eyebrow">GIVE A PLACE A STORY</span><h2>For the place you met, the road you took, the home you found.</h2><p>Open a sample map preview here; editor links are intentionally disabled for this test.</p></div><a className="home-story-all" href="#map-gallery">Explore examples <span aria-hidden="true">↗</span></a></div><div className="home-story-grid">{mapStories.map((story) => <a className="home-story-card" href="#map-gallery" onClick={(event) => { event.preventDefault(); const sample = citySamples.find((city) => city.id === story.cityId); if (sample) openSample(sample); }} key={story.id}><span className="home-story-card__map"><img src={`/assets/homepage-antigravity/${story.image}`} alt="" loading="lazy" /></span><span className="home-story-card__top"><span>{story.number}</span><span>{story.category}</span></span><strong>{story.title}</strong><p>{story.text}</p><span className="home-story-card__link">Explore this idea <span aria-hidden="true">↗</span></span></a>)}</div><p className="home-stories-note">Choose an idea to open a sample map preview here. This test page is not connected to the main editor.</p></section>

      <section className="home-section home-how" id="how-it-works"><div className="home-section-heading"><div><span className="home-eyebrow">SIMPLE TO MAKE</span><h2>From place to map file in three steps</h2><p>Use the MAPARTE editor to shape the map and download a digital design.</p></div></div><div className="home-steps">{howSteps.map((step) => <article className="home-step" key={step.n}><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>

      <section className="home-feature-band" id="map-features"><div><span className="home-eyebrow">THE MAP IS YOUR CANVAS</span><h2>Choose the details.<br /><em>Keep the place.</em></h2><p className="home-feature-intro">Start with a real location, then shape the map around the details that matter to you.</p><a className="home-primary" href="#map-gallery">Browse map previews <span aria-hidden="true">↗</span></a></div><div className="home-feature-list"><article><span>01</span><div><strong>Find a place</strong><p>Search for a city, town, village, address or coordinates, then pan and zoom to set the map area.</p></div></article><article><span>02</span><div><strong>Choose a theme and map</strong><p>Change the map palette and refine the visible roads, water, parks and terrain details.</p></div></article><article><span>03</span><div><strong>Set your layout and border</strong><p>Pick from 38 print, social, web and wallpaper dimensions, then tune the border treatment.</p></div></article><article><span>04</span><div><strong>Add text and markers</strong><p>Show location details, title and subtitle. Add an icon, emoji or a custom marker.</p></div></article><article><span>05</span><div><strong>Download a high-resolution map</strong><p>Choose PNG in the real editor’s Download panel for a full-resolution digital image. Other formats are available there too.</p></div></article></div></section>

      <section className="home-section home-faq" id="faq"><span className="home-eyebrow">GOOD TO KNOW</span><h2>Questions, answered.</h2><details><summary>What do I get when I download a map?</summary><p>A digital map file. The available export formats and options are shown in the MAPARTE editor.</p></details><details><summary>Can I change the map after choosing a theme?</summary><p>Yes. Open a sample preview or start creating to choose a place, theme, layout, text, and border.</p></details><details><summary>Can I add markers or a running route?</summary><p>Yes. The editor includes marker options and GPX route tools for journeys, races and outdoor achievements.</p></details><details><summary>Can I preview my design on a wall?</summary><p>Yes. In Special Full Screen you can preview your map against a wall photo or use the available camera preview on a supported device.</p></details><details><summary>Does MAPARTE print or ship posters?</summary><p>No. MAPARTE provides digital map artwork for download. Printing or framing is up to you.</p></details></section>

      <footer className="home-footer"><a className="home-brand" href="#top"><img src="/assets/logo.svg" alt="" /><span className="home-brand-copy"><strong>MAPARTE</strong><small>Mapping your visuals</small></span></a><p>Map it. Make it yours.</p><nav><a href="#map-gallery">Map Gallery</a><a href="#theme-preview">Themes</a><a href="#map-stories">Stories</a><a href="#map-features">Features</a><a href="#map-gallery" onClick={(event) => { event.preventDefault(); switchGallery("layouts"); }}>Layouts</a><a href="#map-gallery" onClick={(event) => { event.preventDefault(); switchGallery("borders"); }}>Borders</a><a href="#top">Back to top</a></nav><small>Digital map creation and downloads · Map data © OpenStreetMap contributors</small></footer>
      {selectedSample ? <CityMapDialog key={selectedSample.id} sample={selectedSample} onClose={closeDialog} /> : null}
    </main>
  );
}
