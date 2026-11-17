import type { Layout } from "../domain/types";
import { formatLayoutDimensions } from "../infrastructure/layoutRepository";

function getLayoutSymbolDataUri(layoutOption: Layout): string {
  const symbol = String(layoutOption?.symbol ?? "").trim();
  if (!symbol) return "";
  const normalizedSymbol = symbol.replace(
    /stroke-width=(['"])([\d.]+)\1/g,
    (_match, quote: string, value: string) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return `stroke-width=${quote}${value}${quote}`;
      }
      const thinner = Math.max(0.8, parsed * 0.5);
      return `stroke-width=${quote}${thinner}${quote}`;
    },
  );
  return `data:image/svg+xml;utf8,${encodeURIComponent(normalizedSymbol)}`;
}

interface LayoutCardProps {
  layoutOption: Layout | null;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function LayoutCard({
  layoutOption,
  onClick,
  isSelected = false,
}: LayoutCardProps) {
  if (!layoutOption) {
    return null;
  }
  const className = ["layout-card", isSelected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");
  const symbolDataUri = getLayoutSymbolDataUri(layoutOption);
  const sizeText = formatLayoutDimensions(layoutOption);
  const maparteFrame = layoutOption.id.includes("maparte_");
  const landscape = layoutOption.widthCm > layoutOption.heightCm;
  const caption = layoutOption.id.includes("corner_caption")
    ? "corner"
    : layoutOption.id.includes("left_caption")
      ? "left"
      : layoutOption.id.includes("right_caption")
        ? "right"
        : "center";

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="layout-card-copy">
        <p className="layout-card-name">{layoutOption.name}</p>
        <p className="layout-card-meta">{sizeText}</p>
      </div>
      {maparteFrame ? (
        <span
          className={`maparte-layout-thumb${landscape ? " is-landscape" : " is-portrait"} caption-${caption}`}
          aria-hidden="true"
        >
          <span className="maparte-layout-thumb__page">
            <span className="maparte-layout-thumb__map">
              <span className="maparte-layout-thumb__roads" />
              <span className="maparte-layout-thumb__map-border" />
            </span>
            <span className="maparte-layout-thumb__caption">
              <i />
              <i />
              <i />
            </span>
            <span className="maparte-layout-thumb__page-border" />
          </span>
        </span>
      ) : symbolDataUri ? (
        <img
          className="layout-card-symbol"
          src={symbolDataUri}
          alt={`${layoutOption.name} ratio symbol`}
        />
      ) : null}
    </button>
  );
}
