import type { OsmCity } from "./osmTypes";

export type Palette = {
  bg: string;
  minor: string;
  major: string;
  water: string;
  park: string;
  building: string;
};

export const PALETTES: Record<string, Palette> = {
  paper: {
    bg: "#f5efe2",
    minor: "rgba(20,17,13,0.22)",
    major: "rgba(20,17,13,0.46)",
    water: "#dde5dc",
    park: "#e5e8d5",
    building: "rgba(20,17,13,0.09)",
  },
  ink: {
    bg: "#f7f1e4",
    minor: "#9a9080",
    major: "#2b2620",
    water: "#c7d4d0",
    park: "#d7ddc2",
    building: "#dfd6c1",
  },
  blueprint: {
    bg: "#0c2743",
    minor: "#6f9fc6",
    major: "#d5ecff",
    water: "#123a5e",
    park: "#1b5a52",
    building: "#16334f",
  },
  terracotta: {
    bg: "#f2ddc9",
    minor: "#b0563a",
    major: "#7a2f1c",
    water: "#d8b49b",
    park: "#c3c79c",
    building: "#e3c3a8",
  },
  botanical: {
    bg: "#edf1e2",
    minor: "#7c9070",
    major: "#2f4a36",
    water: "#b3cbbb",
    park: "#c6dcb0",
    building: "#dbe4cd",
  },
  midnight: {
    bg: "#0f1622",
    minor: "#4a6082",
    major: "#a8c2e8",
    water: "#14273a",
    park: "#1e4a42",
    building: "#1a2436",
  },
  newsprint: {
    bg: "#f1efe9",
    minor: "#8a8a82",
    major: "#25251f",
    water: "#dcdcd4",
    park: "#e4e4d9",
    building: "#e4e2d9",
  },
};

type Props = {
  data: OsmCity;
  palette: Palette;
  className?: string;
};

/**
 * A real city, painted from OpenStreetMap geometry baked at build time:
 * water, parks, building footprints and then the street hierarchy on top.
 * Strokes are non-scaling, so a 300 px card and a full-bleed hero keep the
 * same hairline weight.
 */
export default function CityMap({ data, palette, className }: Props) {
  const s = data.size;

  return (
    <svg
      className={`cm${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${s} ${s}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={s} height={s} fill={palette.bg} />

      {data.park ? (
        <path className="cm__park" d={data.park} fill={palette.park} fillRule="evenodd" />
      ) : null}

      {data.building ? (
        <path
          className="cm__build"
          d={data.building}
          fill={palette.building}
          fillRule="evenodd"
        />
      ) : null}

      {data.water ? (
        <path
          className="cm__water"
          d={data.water}
          fill={palette.water}
          fillRule="evenodd"
        />
      ) : null}

      {data.waterline ? (
        <path
          className="cm__waterline"
          d={data.waterline}
          fill="none"
          stroke={palette.water}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {data.rail ? (
        <path
          className="cm__rail"
          d={data.rail}
          fill="none"
          stroke={palette.major}
          strokeWidth={0.8}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {data.minor ? (
        <path
          className="cm__minor-line"
          d={data.minor}
          fill="none"
          stroke={palette.minor}
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {data.major ? (
        <path
          className="cm__major-line"
          d={data.major}
          fill="none"
          stroke={palette.major}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {data.trunk ? (
        <path
          className="cm__trunk"
          d={data.trunk}
          fill="none"
          stroke={palette.major}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
