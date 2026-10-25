import { useState, useMemo, useEffect, useRef } from "react";
import seoCitiesData from "@/data/seoCities.json";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useMapSync } from "@/features/map/application/useMapSync";
import { useFormHandlers } from "@/features/poster/application/useFormHandlers";
import type { SearchResult } from "@/features/location/domain/types";
import { CloseIcon, SearchIcon } from "@/shared/ui/Icons";

interface AllCitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SeoCityItem {
  slug: string;
  city: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  landmarks: string[];
  tagline: string;
  description?: string;
  rank?: number;
  annualSearches?: string;
}

const CONTINENTS = [
  "All",
  "Americas",
  "Europe",
  "Asia",
] as const;
type CityImage = {
  src: string;
  sourcePage: string;
  author: string;
  license: string;
  licenseUrl: string;
};
const cityImageCache = new Map<string, Promise<CityImage | null>>();
let cityImageManifestPromise: Promise<Record<string, CityImage>> | null = null;

function loadCityImage(slug: string): Promise<CityImage | null> {
  const existing = cityImageCache.get(slug);
  if (existing) return existing;

  cityImageManifestPromise ??= fetch("/assets/city-photos/manifest.json")
    .then((response) => response.ok ? response.json() : {})
    .catch(() => ({}));
  const request = cityImageManifestPromise.then((manifest) => manifest[slug] ?? null);
  cityImageCache.set(slug, request);
  return request;
}

function CityPhoto({ city, slug }: { city: string; slug: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);
  const [image, setImage] = useState<CityImage | null>(null);
  const [loadFinished, setLoadFinished] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || requestedRef.current) return;

    let active = true;
    const load = () => {
      if (!active || requestedRef.current) return;
      requestedRef.current = true;
      void loadCityImage(slug).then((result) => {
        if (active) {
          setImage(result);
          setLoadFinished(true);
        }
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => { active = false; };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "180px" },
    );
    observer.observe(host);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [slug]);

  return (
    <div ref={hostRef} className={`city-card-photo${image ? " has-image" : ""}`}>
      {image ? (
        <img
          src={image.src}
          alt={`${city} city photo`}
          title={`Photo by ${image.author}; ${image.license}. Source: ${image.sourcePage}${image.licenseUrl ? ` (${image.licenseUrl})` : ""}`}
          loading="lazy"
          decoding="async"
          onError={() => {
            setImage(null);
            setLoadFinished(true);
          }}
        />
      ) : (
        <span className={loadFinished ? "city-photo-unavailable" : "city-photo-loading"} aria-hidden="true" />
      )}
    </div>
  );
}



export default function AllCitiesModal({
  isOpen,
  onClose,
}: AllCitiesModalProps) {
  const { state, dispatch, mapRef } = usePosterContext();
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);
  const { handleLocationSelect } = useFormHandlers();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<string>("All");

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCities = useMemo(() => {
    const list = seoCitiesData as SeoCityItem[];
    const q = searchQuery.trim().toLowerCase();

    return list.filter((item) => {
      const matchesContinent =
        selectedContinent === "All" ||
        (selectedContinent === "Americas"
          ? item.continent === "North America" || item.continent === "South America"
          : item.continent === selectedContinent);
      if (!matchesContinent) return false;

      if (!q) return true;
      return (
        item.city.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q) ||
        item.landmarks.some((l) => l.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedContinent]);

  if (!isOpen) return null;

  const handleCityPick = (item: SeoCityItem) => {
    const fullLabel = `${item.city}, ${item.country}`;
    const result: SearchResult = {
      id: `seo:${item.slug}`,
      label: fullLabel,
      city: item.city,
      country: item.country,
      continent: item.continent,
      lat: item.lat,
      lon: item.lon,
    };
    handleLocationSelect(result);
    dispatch({
      type: "SET_FORM_FIELDS",
      resetDisplayNameOverrides: true,
      fields: {
        location: fullLabel,
        latitude: item.lat.toFixed(6),
        longitude: item.lon.toFixed(6),
        displayCity: item.city,
        displayCountry: item.country,
        displayContinent: item.continent,
      },
    });
    flyToLocation(item.lat, item.lon);
    onClose();
  };

  return (
    <section
      className="all-cities-modal"
      role="dialog"
      aria-label="100+ World Cities"
    >
        <div className="all-cities-modal-header">
          <div className="all-cities-title-group">
            <span className="all-cities-badge">Explore by place</span>
            <h2>100+ World Cities</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="all-cities-search-bar">
          <span className="all-cities-search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="all-cities-search-input"
            placeholder="Search a city, country, or landmark"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery ? (
            <button
              type="button"
              className="location-clear-btn"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Continent Filter Pills */}
        <div className="all-cities-continents" role="tablist">
          {CONTINENTS.map((cont) => {
            const count =
              cont === "All"
                ? (seoCitiesData as SeoCityItem[]).length
                : (seoCitiesData as SeoCityItem[]).filter(
                    (c) => c.continent === cont,
                  ).length;
            return (
              <button
                key={cont}
                type="button"
                className={`all-cities-continent-pill${selectedContinent === cont ? " is-active" : ""}`}
                onClick={() => setSelectedContinent(cont)}
              >
                <span>{cont}</span>
                <span className="continent-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Cities Grid */}
        <div className="all-cities-grid">
          {filteredCities.map((item) => {
            const isCurrent =
              state.form.displayCity?.toLowerCase() === item.city.toLowerCase();
            return (
              <button
                key={item.slug}
                type="button"
                className={`all-cities-card${isCurrent ? " is-active" : ""}`}
                onClick={() => handleCityPick(item)}
              >
                <CityPhoto city={item.city} slug={item.slug} />
                <span className="city-card-name">{item.city}</span>
              </button>
            );
          })}

          {filteredCities.length === 0 ? (
            <div className="all-cities-empty">
              <span>No cities found matching "{searchQuery}"</span>
            </div>
          ) : null}
        </div>
    </section>
  );
}
