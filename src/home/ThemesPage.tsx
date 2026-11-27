import { useEffect, useMemo, useState } from "react";
import { themeOptions } from "@/features/theme/infrastructure/themeRepository";
import type { ThemeOption } from "@/features/theme/domain/types";
import "@/home/scroll/fonts";
import "./collections.css";

const previewSrc = (id: string) => `/theme-previews/${id}.webp`;

/** Themes without a render yet still show their own palette, never a broken frame. */
const gradientFor = (palette: string[]) => {
  const base = palette[0] ?? "#14110d";
  const first = palette[1] ?? base;
  const second = palette[4] ?? palette[2] ?? base;
  return [
    `radial-gradient(circle at 26% 20%, color-mix(in srgb, ${first} 42%, transparent), transparent 62%)`,
    `radial-gradient(circle at 76% 78%, color-mix(in srgb, ${second} 38%, transparent), transparent 64%)`,
    `linear-gradient(145deg, ${base}, ${base})`,
  ].join(", ");
};

function ThemeShot({ id, palette, name }: { id: string; palette: string[]; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="cx-card__fallback"
        style={{ backgroundImage: gradientFor(palette) }}
        role="img"
        aria-label={`${name} palette`}
      />
    );
  }
  return (
    <img
      src={previewSrc(id)}
      alt={`Map of Tokyo in the ${name} theme`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function Head({ theme }: { theme?: string }) {
  return (
    <header className="cx-head">
      <a className="cx-head__logo" href="/">
        <span className="cx-head__dot" aria-hidden="true" />
        Maparte
      </a>
      <nav className="cx-head__nav" aria-label="Collections">
        <a href="/layouts">Layouts</a>
        <a href="/themes" aria-current={theme ? undefined : "page"}>
          Themes
        </a>
        <a href="/blog">Blog</a>
      </nav>
      <a className="cx-head__cta" href="/?editor=true">
        Create a map <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}

function ThemeDetail({ themeId }: { themeId: string }) {
  const index = useMemo(
    () => themeOptions.findIndex((theme) => theme.id === themeId),
    [themeId],
  );
  const theme = index >= 0 ? themeOptions[index] : null;

  useEffect(() => {
    if (!theme) return;
    const previous = document.title;
    document.title = `${theme.name} map theme — MAPARTE`;
    return () => {
      document.title = previous;
    };
  }, [theme]);

  if (!theme) {
    return (
      <div className="cx">
        <Head />
        <main className="cx-hero">
          <p className="cx-kicker">
            <i aria-hidden="true" /> 03 — The theme gallery
          </p>
          <h1 className="cx-title">Theme not found.</h1>
          <p className="cx-lead">
            That palette no longer exists. <a href="/themes">See all themes</a>.
          </p>
        </main>
      </div>
    );
  }

  const previous = themeOptions[(index - 1 + themeOptions.length) % themeOptions.length];
  const next = themeOptions[(index + 1) % themeOptions.length];

  return (
    <div className="cx">
      <Head theme={theme.id} />
      <main>
        <div className="cx-theme">
          <div className="cx-theme__shot">
            <ThemeImage theme={theme} />
          </div>
          <div>
            <p className="cx-kicker">
              <i aria-hidden="true" /> {String(index + 1).padStart(2, "0")} / {themeOptions.length} ·{" "}
              theme
            </p>
            <h1 className="cx-title" style={{ fontSize: "clamp(34px, 4.4vw, 56px)", marginTop: 14 }}>
              {theme.name}
            </h1>
            <p className="cx-lead" style={{ marginTop: 14 }}>
              {theme.description}
            </p>

            <div className="cx-specs" style={{ marginTop: 24 }}>
              <div>
                <span>Palette</span>
                <b>{theme.name}</b>
              </div>
              <div>
                <span>Colours</span>
                <b>{theme.palette.length} roles</b>
              </div>
              <div>
                <span>Cost</span>
                <b>Included</b>
              </div>
              <div>
                <span>Editable</span>
                <b>Any colour, any layer</b>
              </div>
            </div>

            <p className="cx-card__meta" style={{ marginTop: 4 }}>
              Palette roles
            </p>
            <div className="cx-palette">
              {theme.palette.map((color, colorIndex) => (
                <div key={`${color}-${colorIndex}`}>
                  <i style={{ background: color }} aria-hidden="true" />
                  {color}
                </div>
              ))}
            </div>

            <div className="cx-actions" style={{ marginTop: 26 }}>
              <a className="cx-btn" href={`/?theme=${theme.id}`}>
                Open editor with {theme.name} <span aria-hidden="true">↗</span>
              </a>
              <a className="cx-btn cx-btn--ghost" href="/themes">
                All themes
              </a>
            </div>

            <div className="cx-theme__pager">
              <a href={`/themes/${previous.id}`}>
                <span aria-hidden="true">←</span> {previous.name}
              </a>
              <a href={`/themes/${next.id}`}>
                {next.name} <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </main>
      <footer className="cx-foot">
        Maparte is digital only: you design in the browser and download a file.{" "}
        <a href="/layouts">See all 79 layouts</a> · <a href="/blog">Read the guides</a>.
      </footer>
    </div>
  );
}

function ThemeImage({ theme }: { theme: ThemeOption }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="cx-theme__fallback"
        style={{ backgroundImage: gradientFor(theme.palette) }}
        role="img"
        aria-label={`${theme.name} palette`}
      />
    );
  }
  return (
    <img
      src={previewSrc(theme.id)}
      alt={`Tokyo street map rendered in the ${theme.name} theme`}
      onError={() => setFailed(true)}
    />
  );
}

export default function ThemesPage({ themeId }: { themeId?: string }) {
  useEffect(() => {
    if (themeId) return;
    const previous = document.title;
    document.title = `Map colour themes — all ${themeOptions.length} palettes — MAPARTE`;
    return () => {
      document.title = previous;
    };
  }, [themeId]);

  if (themeId) return <ThemeDetail themeId={themeId} />;

  return (
    <div className="cx">
      <Head />
      <main>
        <section className="cx-hero">
          <p className="cx-kicker">
            <i aria-hidden="true" /> 03 — The theme gallery
          </p>
          <h1 className="cx-title">
            One city,
            <br />
            <em>{themeOptions.length}</em> moods.
          </h1>
          <p className="cx-lead">
            Every palette recolours roads, water, parks and blocks independently, so the same
            streets can read as a blueprint, a newsprint page, a neon night or a watercolour. Open
            any theme to see its full palette and start the editor with it already applied.
          </p>
          <div className="cx-stats">
            <span>
              <b>{themeOptions.length}</b> themes
            </span>
            <span>
              <b>13</b> colour roles each
            </span>
            <span>
              <b>0</b> extra cost
            </span>
            <span>
              <b>CMYK</b>-safe print exports
            </span>
          </div>
        </section>

        <section className="cx-sec" aria-labelledby="all-themes">
          <div className="cx-sec__head">
            <h2 className="cx-sec__title" id="all-themes">
              All themes
            </h2>
            <span className="cx-sec__count">{themeOptions.length} palettes</span>
          </div>
          <div className="cx-grid">
            {themeOptions.map((theme) => (
              <a className="cx-card" key={theme.id} href={`/themes/${theme.id}`}>
                <span className="cx-card__shot cx-card__shot--fill">
                  <ThemeShot id={theme.id} palette={theme.palette} name={theme.name} />
                </span>
                <span className="cx-card__meta">{theme.palette.length} colours</span>
                <span className="cx-card__name">{theme.name}</span>
                <span className="cx-card__note">{theme.description}</span>
              </a>
            ))}
          </div>
        </section>
      </main>
      <footer className="cx-foot">
        Maparte is digital only: you design in the browser and download a file.{" "}
        <a href="/layouts">See all layouts</a> · <a href="/blog">Read the guides</a>.
      </footer>
    </div>
  );
}
