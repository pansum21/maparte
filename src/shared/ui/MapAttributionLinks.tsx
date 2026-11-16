/**
 * The tiles/data attribution links, shared by the inline mobile footer and the
 * desktop attribution modal so the text lives in one place.
 */
export default function MapAttributionLinks() {
  return (
    <>
      <a
        className="source-link"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        OpenStreetMap contributors
      </a>
      {" | "}Tiles &copy;{" "}
      <a
        className="source-link"
        href="https://openmaptiles.org/"
        target="_blank"
        rel="noreferrer"
      >
        OpenMapTiles
      </a>
      {" | "}Powered by{" "}
      <a
        className="source-link"
        href="https://openfreemap.org/"
        target="_blank"
        rel="noreferrer"
      >
        OpenFreeMap
      </a>
      {", "}
      <a
        className="source-link"
        href="https://nominatim.openstreetmap.org/"
        target="_blank"
        rel="noreferrer"
      >
        Nominatim
      </a>
      {" & "}
      <a
        className="source-link"
        href="https://maplibre.org/"
        target="_blank"
        rel="noreferrer"
      >
        MapLibre
      </a>
      .
    </>
  );
}
