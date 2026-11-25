/**
 * Real OpenStreetMap geometry, baked by `scripts/fetch-osm.mjs`.
 * Every field is SVG path data in a square viewBox (see `size`), ready to
 * paint — one path per layer keeps a poster cheap to render.
 */
export type OsmCity = {
  slug: string;
  name: string;
  /** [latitude, longitude] of the poster centre. */
  center: [number, number];
  /** Metres covered by the short side of the crop. */
  span: number;
  /** viewBox edge length. */
  size: number;
  credit: string;
  water?: string;
  waterline?: string;
  park?: string;
  building?: string;
  minor?: string;
  major?: string;
  trunk?: string;
  rail?: string;
};
