import { useCallback, useEffect, useRef, useState } from "react";
import { RotateLeftIcon, RotateRightIcon } from "@/shared/ui/Icons";
import { usePosterContext } from "@/features/poster/ui/PosterContext";

const clampDegrees = (degrees: number) =>
  Math.round(Math.max(0, Math.min(360, degrees)));

function normalizedBearing(bearing: number) {
  return ((bearing % 360) + 360) % 360;
}

export default function MapRotationControl() {
  const { mapRef } = usePosterContext();
  const [degrees, setDegrees] = useState(() =>
    clampDegrees(normalizedBearing(mapRef.current?.getBearing() ?? 0)),
  );
  const [valueText, setValueText] = useState(String(degrees));
  const lastRequestedDegrees = useRef<number | null>(null);

  const applyRotation = useCallback(
    (rawDegrees: number) => {
      if (!Number.isFinite(rawDegrees)) return;
      const next = clampDegrees(rawDegrees);
      setDegrees(next);
      setValueText(String(next));
      lastRequestedDegrees.current = next;
      mapRef.current?.rotateTo(next, { duration: 0 });
    },
    [mapRef],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const syncRotation = () => {
      const bearing = normalizedBearing(map.getBearing());
      const next = bearing < 0.5 && lastRequestedDegrees.current === 360
        ? 360
        : clampDegrees(bearing);
      setDegrees(next);
      setValueText(String(next));
    };
    map.on("rotate", syncRotation);
    syncRotation();
    return () => {
      map.off("rotate", syncRotation);
    };
  }, [mapRef]);

  const commitTextValue = () => {
    const parsed = Number(valueText);
    if (valueText.trim() === "" || !Number.isFinite(parsed)) {
      setValueText(String(degrees));
      return;
    }
    applyRotation(parsed);
  };

  return (
    <section className="map-rotation-control" aria-label="Rotation">
      <div className="map-rotation-control__heading">
        <span>Rotation</span>
        <label className="map-rotation-control__number-label">
          <span className="sr-only">Rotation angle in degrees</span>
          <input
            aria-label="Rotation angle in degrees"
            className="map-rotation-control__number"
            type="number"
            inputMode="numeric"
            min={0}
            max={360}
            step={1}
            value={valueText}
            onChange={(event) => {
              const nextText = event.currentTarget.value;
              setValueText(nextText);
              if (nextText.trim() !== "") {
                const parsed = Number(nextText);
                if (Number.isFinite(parsed)) {
                  const next = clampDegrees(parsed);
                  setDegrees(next);
                  lastRequestedDegrees.current = next;
                  mapRef.current?.rotateTo(next, { duration: 0 });
                }
              }
            }}
            onBlur={commitTextValue}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <span aria-hidden="true">°</span>
        </label>
      </div>

      <div className="map-rotation-control__row">
        <button
          className="map-rotation-control__arrow"
          type="button"
          aria-label="Rotate map left by 15 degrees"
          onClick={() => applyRotation(degrees - 15)}
        >
          <RotateLeftIcon aria-hidden="true" />
        </button>
        <input
          aria-label="Map rotation from 0 to 360 degrees"
          className="map-rotation-control__slider"
          type="range"
          min={0}
          max={360}
          step={1}
          value={degrees}
          onChange={(event) => applyRotation(Number(event.currentTarget.value))}
        />
        <button
          className="map-rotation-control__arrow"
          type="button"
          aria-label="Rotate map right by 15 degrees"
          onClick={() => applyRotation(degrees + 15)}
        >
          <RotateRightIcon aria-hidden="true" />
        </button>
      </div>

      <div className="map-rotation-control__range-labels" aria-hidden="true">
        <span>0°</span>
        <span>180°</span>
        <span>360°</span>
      </div>
    </section>
  );
}
