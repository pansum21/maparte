import { useState, useMemo, useEffect } from "react";
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
}

const CONTINENTS = [
  "All",
  "North America",
  "Europe",
  "Asia",
  "South America",
  "Oceania",
  "Africa",
] as const;

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
        selectedContinent === "All" || item.continent === selectedContinent;
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
    <div
      className="export-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="export-modal all-cities-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="all-cities-modal-header">
          <div className="all-cities-title-group">
            <span className="all-cities-badge">🌍 81 Curated World Cities</span>
            <h2>Select a Destination City</h2>
            <p>
              Instantly create iconic street grid posters for 81 legendary cities
              across 6 continents.
            </p>
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
            placeholder="Search by city, country or landmark (e.g. Tokyo, Eiffel Tower, Manhattan)..."
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
                <div className="city-card-top">
                  <span className="city-card-name">{item.city}</span>
                  <span className="city-card-country">{item.country}</span>
                </div>
                <div className="city-card-tagline">{item.tagline}</div>
                {item.landmarks.length > 0 ? (
                  <div className="city-card-landmarks">
                    {item.landmarks.slice(0, 3).map((lm) => (
                      <span key={lm} className="city-landmark-chip">
                        {lm}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}

          {filteredCities.length === 0 ? (
            <div className="all-cities-empty">
              <span>No cities found matching "{searchQuery}"</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
