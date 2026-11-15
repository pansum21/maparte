interface LayerForm {
  includeLandcover: boolean;
  includeForests?: boolean;
  includeParks: boolean;
  includeMountains?: boolean;
  includeBuildings: boolean;
  includeWater: boolean;
  includeAeroway?: boolean;
  includeRail: boolean;
  includeBoundaries?: boolean;
  includeRoads: boolean;
  includeRoadPath?: boolean;
  includeRoadMinorLow?: boolean;
  includeRoadOutline?: boolean;
  includeRoadNames?: boolean;
  includePlaceLabels?: boolean;
  includeNeighborhoodLabels?: boolean;
  includeWaterLabels?: boolean;
  includePoiLabels?: boolean;
}

interface LayersSectionProps {
  form: LayerForm;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function LayersSection({
  form,
  onChange,
}: LayersSectionProps) {
  return (
    <section className="panel-block">
      <p className="section-summary-label">MAP GEOMETRY & LAYERS</p>

      {/* 1. Landcover */}
      <label className="toggle-field">
        <span>Landcover (Ground & Terrain)</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeLandcover"
            checked={Boolean(form.includeLandcover ?? true)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 2. Water Bodies */}
      <label className="toggle-field">
        <span>Water (Oceans, Lakes & Rivers)</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeWater"
            checked={Boolean(form.includeWater ?? true)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 3. Forests */}
      <label className="toggle-field">
        <span>Forests & Dense Woods</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeForests"
            checked={Boolean(form.includeForests ?? false)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 4. Parks */}
      <label className="toggle-field">
        <span>City Parks & Gardens (Human-made)</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeParks"
            checked={Boolean(form.includeParks ?? false)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 5. Mountains */}
      <label className="toggle-field">
        <span>Mountains & Hill Ranges</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeMountains"
            checked={Boolean(form.includeMountains ?? false)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 6. Roads & Highways */}
      <label className="toggle-field">
        <span>Roads & Highways</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeRoads"
            checked={Boolean(form.includeRoads ?? true)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 7. Railways */}
      <label className="toggle-field">
        <span>Railways & Tracks</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeRail"
            checked={Boolean(form.includeRail ?? true)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 8. Country & State Borders */}
      <label className="toggle-field">
        <span>Country & State Borders</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeBoundaries"
            checked={Boolean(form.includeBoundaries ?? true)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>

      {/* 8. Buildings */}
      <label className="toggle-field">
        <span>Buildings</span>
        <span className="theme-switch">
          <input
            type="checkbox"
            name="includeBuildings"
            checked={Boolean(form.includeBuildings)}
            onChange={onChange}
          />
          <span className="theme-switch-track" aria-hidden="true" />
        </span>
      </label>
      {/* ── SEPARATE NAMES & LABELS SECTION ── */}
      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <p
          className="section-summary-label"
          style={{ color: "#38bdf8", marginBottom: "12px" }}
        >
          NAMES & LABELS
        </p>

        {/* Street & Road Names */}
        <label className="toggle-field">
          <span>Street & Road Names</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="includeRoadNames"
              checked={Boolean(form.includeRoadNames ?? false)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>

        {/* City Names */}
        <label className="toggle-field">
          <span>City Names</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="includePlaceLabels"
              checked={Boolean(form.includePlaceLabels ?? false)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>

        {/* Water & River Names */}
        <label className="toggle-field">
          <span>Water & River Names</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="includeWaterLabels"
              checked={Boolean(form.includeWaterLabels ?? false)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>

        {/* Landmarks & POIs */}
        <label className="toggle-field">
          <span>Landmarks & POIs</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="includePoiLabels"
              checked={Boolean(form.includePoiLabels ?? false)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>

        {/* Neighborhood & Suburb Names */}
        <label className="toggle-field">
          <span>Neighborhood & Suburb Names</span>
          <span className="theme-switch">
            <input
              type="checkbox"
              name="includeNeighborhoodLabels"
              checked={Boolean(form.includeNeighborhoodLabels ?? false)}
              onChange={onChange}
            />
            <span className="theme-switch-track" aria-hidden="true" />
          </span>
        </label>
      </div>

      <div className="map-details-section">
        <h3 className="map-details-subtitle">Map Details</h3>
        <div className="map-details-card">
          <MapDimensionFields
            form={form}
            minPosterCm={minPosterCm}
            maxPosterCm={maxPosterCm}
            onChange={onChange}
          />
        </div>
      </div>

    </section>
  );
}
