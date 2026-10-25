import { useState, useEffect } from "react";
import { usePosterContext } from "@/features/poster/ui/PosterContext";
import { useFormHandlers } from "@/features/poster/application/useFormHandlers";
import { useLocationAutocomplete } from "@/features/location/application/useLocationAutocomplete";
import { useCurrentLocation } from "@/features/location/application/useCurrentLocation";
import { useMapSync } from "@/features/map/application/useMapSync";
import type { MobileTab } from "@/shared/ui/MobileNavBar";

import LocationSection from "@/features/location/ui/LocationSection";
import MapSettingsSection from "@/features/map/ui/MapSettingsSection";
import LayersSection from "@/features/map/ui/LayersSection";
import MarkersSection from "@/features/markers/ui/MarkersSection";
import RoutesSection from "@/features/routes/ui/RoutesSection";
import TypographySection from "@/features/poster/ui/TypographySection";
import TemplatesSection from "@/features/poster/ui/TemplatesSection";
import { NeatlinePicker } from "@/features/layout/ui/NeatlinePicker";
import {
  LocationIcon,
  ThemeIcon,
  LayoutIcon,
  FrameIcon,
  LayersIcon,
  MarkersIcon,
  RouteIcon,
  StyleIcon,
  ChevronDownIcon,
  SparklesIcon,
  ScissorsIcon,
} from "@/shared/ui/Icons";

import { themeOptions } from "@/features/theme/infrastructure/themeRepository";
import { layoutGroups } from "@/features/layout/infrastructure/layoutRepository";
import {
  MIN_POSTER_CM,
  MAX_POSTER_CM,
  FONT_OPTIONS,
} from "@/core/config";
import type { SearchResult } from "@/features/location/domain/types";

type SectionId =
  | "templates"
  | "location"
  | "edit-map"
  | "theme"
  | "layout"
  | "frames"
  | "layers"
  | "markers"
  | "routes"
  | "style";

const accordionSections: {
  id: SectionId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "templates", label: "Occasion Presets", Icon: SparklesIcon },
  { id: "location", label: "Location", Icon: LocationIcon },
  { id: "theme", label: "Theme", Icon: ThemeIcon },
  { id: "layout", label: "Layout", Icon: LayoutIcon },
  { id: "frames", label: "Border", Icon: FrameIcon },
  { id: "layers", label: "Layers", Icon: LayersIcon },
  { id: "markers", label: "Markers", Icon: MarkersIcon },
  { id: "routes", label: "Routes", Icon: RouteIcon },
  { id: "style", label: "Style", Icon: StyleIcon },
];

const sectionMap = Object.fromEntries(
  accordionSections.map((section) => [section.id, section]),
) as Record<SectionId, (typeof accordionSections)[number]>;

export default function SettingsPanel({
  mobileTab,
  isEditing = false,
  onToggleEditing,
}: {
  mobileTab?: MobileTab;
  isEditing?: boolean;
  onToggleEditing?: () => void;
}) {
  const { state, dispatch, mapRef, selectedTheme } = usePosterContext();
  const {
    handleChange,
    handleNumericFieldBlur,
    handleThemeChange,
    handleLayoutChange,
    handleColorChange,
    handleResetColors,
    handleLocationSelect,
    handleClearLocation,
    setLocationFocused,
    handleCreditsChange,
  } = useFormHandlers();
  const { locationSuggestions, isLocationSearching, searchNow } = useLocationAutocomplete(
    state.form.location,
    state.isLocationFocused,
  );
  const { flyToLocation } = useMapSync(state, dispatch, mapRef);
  const { handleUseCurrentLocation, isLocatingUser, locationPermissionMessage } =
    useCurrentLocation(flyToLocation);

  const [isColorEditorActive, setIsColorEditorActive] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set([((mobileTab as SectionId) || "location")]),
  );

  useEffect(() => {
    if (!mobileTab) return;
    setOpenSections(new Set([mobileTab as SectionId]));
  }, [mobileTab]);

  const isAuxEditorActive = isColorEditorActive;

  const toggleSection = (id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const onLocationSelect = (location: SearchResult) => {
    handleLocationSelect(location);
    flyToLocation(location.lat, location.lon);
  };

  if (mobileTab === "edit-map") {
    return (
      <div className="edit-map-action-panel" role="group" aria-label="Edit map actions">
        <button
          type="button"
          className={`edit-map-action${isEditing ? " is-active" : ""}`}
          onClick={onToggleEditing}
          aria-pressed={isEditing}
        >
          {isEditing ? <span aria-hidden="true">🔒</span> : <ScissorsIcon aria-hidden="true" />}
          <span>{isEditing ? "Lock Map" : "Edit Map"}</span>
        </button>
      </div>
    );
  }

  return (
    <form className="settings-panel" onSubmit={(e) => e.preventDefault()}>
      <div
        className={`mobile-section mobile-section--templates accordion-item${openSections.has("templates") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="templates"
          label={sectionMap["templates"].label}
          Icon={sectionMap["templates"].Icon}
          isOpen={openSections.has("templates")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("templates") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            <TemplatesSection />
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--location accordion-item${openSections.has("location") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="location"
          label={sectionMap["location"].label}
          Icon={sectionMap["location"].Icon}
          isOpen={openSections.has("location")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("location") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            {!isColorEditorActive ? (
              <LocationSection
                form={state.form}
                onChange={handleChange}
                onLocationFocus={() => setLocationFocused(true)}
                onLocationBlur={() => setLocationFocused(false)}
                searchNow={searchNow}
                isLocationFocused={state.isLocationFocused}
                locationSuggestions={locationSuggestions}
                isLocationSearching={isLocationSearching}
                onLocationSelect={onLocationSelect}
                onClearLocation={handleClearLocation}
                onUseCurrentLocation={handleUseCurrentLocation}
                isLocatingUser={isLocatingUser}
                locationPermissionMessage={locationPermissionMessage}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--theme-settings accordion-item${openSections.has("theme") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="theme"
          label={sectionMap["theme"].label}
          Icon={sectionMap["theme"].Icon}
          isOpen={openSections.has("theme")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("theme") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            {!isColorEditorActive ? (
              <>
              <MapSettingsSection
                activeMobileTab={mobileTab}
                form={state.form}
                onChange={handleChange}
                onNumericFieldBlur={handleNumericFieldBlur}
                onThemeChange={handleThemeChange}
                onLayoutChange={handleLayoutChange}
                selectedTheme={selectedTheme}
                themeOptions={themeOptions}
                layoutGroups={layoutGroups}
                minPosterCm={MIN_POSTER_CM}
                maxPosterCm={MAX_POSTER_CM}
                customColors={state.customColors}
                onColorChange={handleColorChange}
                onResetColors={handleResetColors}
                onColorEditorActiveChange={setIsColorEditorActive}
              />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--layout-settings accordion-item${openSections.has("layout") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="layout"
          label={sectionMap["layout"].label}
          Icon={sectionMap["layout"].Icon}
          isOpen={openSections.has("layout")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("layout") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            {!isColorEditorActive ? (
              <>
              <MapSettingsSection
                activeMobileTab={mobileTab}
                form={state.form}
                onChange={handleChange}
                onNumericFieldBlur={handleNumericFieldBlur}
                onThemeChange={handleThemeChange}
                onLayoutChange={handleLayoutChange}
                selectedTheme={selectedTheme}
                themeOptions={themeOptions}
                layoutGroups={layoutGroups}
                minPosterCm={MIN_POSTER_CM}
                maxPosterCm={MAX_POSTER_CM}
                customColors={state.customColors}
                onColorChange={handleColorChange}
                onResetColors={handleResetColors}
                onColorEditorActiveChange={setIsColorEditorActive}
              />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--frames accordion-item${openSections.has("frames") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="frames"
          label={sectionMap["frames"].label}
          Icon={sectionMap["frames"].Icon}
          isOpen={openSections.has("frames")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("frames") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            <NeatlinePicker width={state.form.width} height={state.form.height} />
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--layers accordion-item${openSections.has("layers") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="layers"
          label={sectionMap["layers"].label}
          Icon={sectionMap["layers"].Icon}
          isOpen={openSections.has("layers")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("layers") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            {!isAuxEditorActive ? (
              <LayersSection
                form={state.form}
                onChange={handleChange}
                minPosterCm={MIN_POSTER_CM}
                maxPosterCm={MAX_POSTER_CM}
                onNumericFieldBlur={handleNumericFieldBlur}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--markers accordion-item${openSections.has("markers") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="markers"
          label={sectionMap["markers"].label}
          Icon={sectionMap["markers"].Icon}
          isOpen={openSections.has("markers")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("markers") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            {!isColorEditorActive ? <MarkersSection /> : null}
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--routes accordion-item${openSections.has("routes") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="routes"
          label={sectionMap["routes"].label}
          Icon={sectionMap["routes"].Icon}
          isOpen={openSections.has("routes")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("routes") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            {!isColorEditorActive ? <RoutesSection /> : null}
          </div>
        </div>
      </div>

      <div
        className={`mobile-section mobile-section--style accordion-item${openSections.has("style") ? " accordion-item--open" : ""}`}
      >
        <AccordionHeader
          sectionId="style"
          label={sectionMap["style"].label}
          Icon={sectionMap["style"].Icon}
          isOpen={openSections.has("style")}
          onToggle={toggleSection}
        />
        <div
          className={`accordion-body${openSections.has("style") ? " is-open" : ""}`}
        >
          <div className="accordion-body-inner">
            {!isAuxEditorActive ? (
              <TypographySection
                form={state.form}
                onChange={handleChange}
                onFontChange={(fontFamily) =>
                  dispatch({ type: "SET_FIELD", name: "fontFamily", value: fontFamily })
                }
                fontOptions={FONT_OPTIONS}
              />
            ) : null}
          </div>
        </div>
      </div>

      {!isAuxEditorActive && state.error ? <p className="error">{state.error}</p> : null}
    </form>
  );
}

function AccordionHeader({
  sectionId,
  label,
  Icon,
  isOpen,
  onToggle,
}: {
  sectionId: SectionId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: (id: SectionId) => void;
}) {
  return (
    <button
      type="button"
      className={`accordion-header${isOpen ? " is-open" : ""}`}
      onClick={() => onToggle(sectionId)}
      aria-expanded={isOpen}
    >
      <Icon className="accordion-icon" />
      <span className="accordion-label">{label}</span>
      <ChevronDownIcon className="accordion-chevron" />
    </button>
  );
}
