import type { CSSProperties } from "react";
import CityMap, { type Palette } from "./CityMap";
import { RevealMask, Spotlight } from "./motionFx";
import type { OsmCity as CityData } from "./osmTypes";
import type { FrameKind, LayoutKind } from "./galleryData";

type Props = {
  city: string;
  country: string;
  coords: string;
  data: CityData;
  data2?: CityData;
  palette: Palette;
  palette2?: Palette;
  frame?: FrameKind;
  layout?: LayoutKind;
  note?: string;
  index?: number;
  className?: string;
};

/**
 * One print: a map plate inside a frame, captioned like a museum card.
 * Frame and layout are data, not markup, so the galleries are pure lists.
 */
export default function Poster({
  city,
  country,
  coords,
  data,
  data2,
  palette,
  palette2,
  frame = "double",
  layout = "full",
  note,
  index = 0,
  className,
}: Props) {
  return (
    <figure
      className={`card card--${layout} card--f-${frame}${className ? ` ${className}` : ""}`}
      style={{ "--n": index } as CSSProperties}
    >
      <Spotlight radius={210} />
      <RevealMask className="card__sheet">
        <div className="card__map">
          <CityMap data={data} palette={palette} />
        </div>
        {data2 ? (
          <div className="card__map card__map--second">
            <CityMap data={data2} palette={palette2 ?? palette} />
          </div>
        ) : null}
        <span className="card__perf card__perf--l" aria-hidden="true" />
        <span className="card__perf card__perf--r" aria-hidden="true" />
      </RevealMask>

      <figcaption className="card__cap">
        <span className="card__name">{city}</span>
        <span className="card__meta">{country}</span>
        <span className="card__coords">{coords}</span>
        {note ? <span className="card__note">{note}</span> : null}
        <span className="card__no" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      </figcaption>
    </figure>
  );
}
