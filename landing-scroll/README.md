# Maparte — scroll landing

The marketing page for Maparte, kept as its own small Vite app so it can be
styled and deployed without touching the main product build.

It is plain React + CSS: no component library, no CSS framework, no runtime
dependencies beyond React and the self-hosted `@fontsource` faces.

## Run

```bash
cd landing-scroll
npm install
npm run dev        # http://127.0.0.1:5199
npm run build      # static build in dist/
```

## What is on the page

| # | Section | What it shows |
|---|---------|---------------|
| — | Hero | dotted survey grid, pointer spotlight, wireframe globe, headline reveal |
| — | Ticker | looping band of what a sheet is made of |
| 01 | Map gallery | twenty cities, one travelling shelf |
| 02 | Theme gallery | one city, seven palettes, coverflow |
| 03 | Layout gallery | six poster layouts in drifting columns |
| 04 | Border gallery | six frames, dealt like a hand |
| 05 | Preset gallery | four stock sizes on a staircase |
| 06 | Features | the argument for real geometry |
| 07 | Everything in the box | bento of data, palettes, print rules, sizes |
| 08 | The run | three steps from a place to paper |
| — | Export | PNG / vector PDF / layered SVG |
| — | Footer | sections, credits |

Every scroll scene writes transforms from a single progress value, so
scrubbing upwards plays the page in reverse. `prefers-reduced-motion` turns the
scenes off and falls back to native horizontal scrolling.

## Map data

`src/landing/osm/*.ts` holds real OpenStreetMap geometry baked into compact SVG
paths (1200 × 1200 viewBox). It is committed, so the build needs no network.

To re-bake after a map change:

```bash
npm run osm            # all places
npm run osm lisbon     # one place
```

Source: OpenFreeMap vector tiles (Protomaps schema, OSM data, ODbL).
Map data © OpenStreetMap contributors.

## Deploy

Any static host works: build command `npm run build`, output directory `dist`.
On Vercel, use this folder as the project root.

## Notes

- The editor is not part of this folder; "Open editor" points at the main app.
- The galleries are data-driven — see `src/landing/galleryData.ts` for places,
  palettes, frames, layouts and presets.
