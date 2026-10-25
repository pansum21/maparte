import type { IFontLoader } from "./ports";

/**
 * Self-hosted font loader.
 *
 * Poster fonts ship with the bundle via @fontsource instead of being fetched
 * from Google's CDN at runtime, so selecting a font no longer transmits the
 * visitor's IP address to a third party.
 *
 * Each entry is a literal dynamic import so Vite can statically analyse it and
 * emit one chunk per family — a visitor only downloads the font they pick.
 * Keys are lowercased family names; look-ups normalise before matching because
 * FONT_OPTIONS spells some values inconsistently (e.g. "Bebas neue").
 *
 * Only the regular and bold faces are fetched for the live preview. The browser
 * synthesizes the lighter/medium weights used by the poster, and exports wait
 * for the same two real faces before rasterizing.
 */
const FONT_LOADERS: Record<string, () => Promise<unknown>> = {
  "instrument sans": () =>
    import("@fontsource/instrument-sans/latin-700.css"),
  inter: () =>
    Promise.all([
      import("@fontsource/inter/latin-400.css"),
      import("@fontsource/inter/latin-700.css"),
    ]),
  "dm sans": () =>
    Promise.all([
      import("@fontsource/dm-sans/latin-400.css"),
      import("@fontsource/dm-sans/latin-700.css"),
    ]),
  outfit: () =>
    Promise.all([
      import("@fontsource/outfit/latin-400.css"),
      import("@fontsource/outfit/latin-700.css"),
    ]),
  "cormorant garamond": () =>
    Promise.all([
      import("@fontsource/cormorant-garamond/latin-400.css"),
      import("@fontsource/cormorant-garamond/latin-700.css"),
    ]),
  "dm serif display": () => import("@fontsource/dm-serif-display/latin-400.css"),
  "libre baskerville": () =>
    Promise.all([
      import("@fontsource/libre-baskerville/latin-400.css"),
      import("@fontsource/libre-baskerville/latin-700.css"),
    ]),
  lora: () =>
    Promise.all([
      import("@fontsource/lora/latin-400.css"),
      import("@fontsource/lora/latin-700.css"),
    ]),
  cinzel: () =>
    Promise.all([
      import("@fontsource/cinzel/latin-400.css"),
      import("@fontsource/cinzel/latin-700.css"),
    ]),
  "josefin sans": () =>
    Promise.all([
      import("@fontsource/josefin-sans/latin-400.css"),
      import("@fontsource/josefin-sans/latin-700.css"),
    ]),
  poppins: () =>
    Promise.all([
      import("@fontsource/poppins/latin-400.css"),
      import("@fontsource/poppins/latin-700.css"),
    ]),
  anton: () => import("@fontsource/anton/latin-400.css"),
  "ibm plex mono": () =>
    import("@fontsource/ibm-plex-mono/latin-700.css"),
  "spline sans mono": () => import("@fontsource/spline-sans-mono/latin-700.css"),
  montserrat: () =>
    Promise.all([
      import("@fontsource/montserrat/latin-400.css"),
      import("@fontsource/montserrat/latin-700.css"),
    ]),
  "playfair display": () =>
    Promise.all([
      import("@fontsource/playfair-display/latin-400.css"),
      import("@fontsource/playfair-display/latin-700.css"),
    ]),
  oswald: () =>
    Promise.all([
      import("@fontsource/oswald/latin-400.css"),
      import("@fontsource/oswald/latin-700.css"),
    ]),
  "noto sans jp": () =>
    Promise.all([
      import("@fontsource/noto-sans-jp/400.css"),
      import("@fontsource/noto-sans-jp/700.css"),
    ]),
  "source sans pro": () =>
    Promise.all([
      import("@fontsource/source-sans-pro/latin-400.css"),
      import("@fontsource/source-sans-pro/latin-700.css"),
    ]),
  raleway: () =>
    Promise.all([
      import("@fontsource/raleway/latin-400.css"),
      import("@fontsource/raleway/latin-700.css"),
    ]),
  lato: () =>
    Promise.all([
      import("@fontsource/lato/latin-400.css"),
      import("@fontsource/lato/latin-700.css"),
    ]),
  merriweather: () =>
    Promise.all([
      import("@fontsource/merriweather/latin-400.css"),
      import("@fontsource/merriweather/latin-700.css"),
    ]),
  // Bebas Neue is already bundled as a UI font in main.tsx.
  "bebas neue": () => Promise.resolve(),
};

export const localFontsAdapter: IFontLoader = {
  async ensureFont(fontFamily: string): Promise<void> {
    const family = String(fontFamily ?? "").trim();
    if (!family) {
      return;
    }

    const load = FONT_LOADERS[family.toLowerCase()];
    if (!load) {
      // Unknown family: the CSS fallback stack stays in place.
      return;
    }

    await load();

    // Wait for the faces to be usable before callers rasterise to canvas.
    if (document.fonts?.load) {
      await Promise.allSettled([
        document.fonts.load(`400 16px "${family}"`),
        document.fonts.load(`700 16px "${family}"`),
      ]);
    }
  },
};
