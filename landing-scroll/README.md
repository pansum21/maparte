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

## Deploy on Vercel

This folder is a complete static site, so it gets its own Vercel project. The
existing Maparte project keeps building the app from the repository root and
ignores this folder completely.

`vercel.json` already pins everything, so the import screen only needs the
root directory changed:

1. Open <https://vercel.com/new/import?s=https://github.com/pansum21/maparte>
   and pick the `maparte` repository.
2. On the configure screen, set **Root Directory** to `landing-scroll`.
3. Leave the detected settings alone — they come from `vercel.json`:
   framework **Vite**, install `npm ci`, build `npm run build`, output `dist`.
   There are no environment variables to add.
4. Press **Deploy**. The project gets its own `*.vercel.app` URL.
5. Optional: add a domain such as `landing.maparte.com` in the project's
   Domains tab.

Every later push to `main` that touches `landing-scroll/` rebuilds only this
project.

### Any other static host

Build command `npm run build`, output directory `dist`. Nothing else is needed:
the fonts are bundled and the map data is committed, so the build never calls
the network.

`package-lock.json` is committed so `npm ci` resolves exactly these versions.

## Notes

- The editor is not part of this folder; "Open editor" points at the main app.
- The galleries are data-driven — see `src/landing/galleryData.ts` for places,
  palettes, frames, layouts and presets.
