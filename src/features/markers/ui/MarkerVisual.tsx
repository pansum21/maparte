import { memo, useEffect, useState, useId, type CSSProperties } from "react";
import type { MarkerIconDefinition } from "@/features/markers/domain/types";

interface MarkerVisualProps {
  icon: MarkerIconDefinition;
  size: number;
  color: string;
  className?: string;
}

const MarkerVisual = memo(function MarkerVisual({
  icon,
  size,
  color,
  className = "",
}: MarkerVisualProps) {
  const markerInstanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [emojiAssetFailed, setEmojiAssetFailed] = useState(false);
  useEffect(() => setEmojiAssetFailed(false), [icon.emojiAssetUrl]);

  const isThemeTintedMarkerSvg =
    icon.kind === "image" &&
    Boolean(icon.tintWithMarkerColor) &&
    Boolean(icon.dataUrl);

  return (
    <span
      className={`marker-visual ${className}`.trim()}
      style={
        {
          "--marker-size": `${size}px`,
          "--marker-color": color,
        } as CSSProperties
      }
    >
      {icon.kind === "emoji" && icon.emoji ? (
        icon.emojiAssetUrl && !emojiAssetFailed ? (
          <img
            className="marker-visual__emoji-image"
            src={icon.emojiAssetUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            onError={() => setEmojiAssetFailed(true)}
          />
        ) : (
          <span className="marker-visual__emoji" aria-hidden="true">
            {icon.emoji}
          </span>
        )
      ) : isThemeTintedMarkerSvg ? (
        <span
          className="marker-visual__image-mask"
          aria-hidden="true"
          style={
            {
              "--marker-mask-url": `url(${icon.dataUrl})`,
            } as CSSProperties
          }
        />
      ) : icon.kind === "image" && icon.dataUrl ? (
        <img
          className="marker-visual__image"
          src={icon.dataUrl}
          alt=""
          aria-hidden="true"
        />
      ) : (
        icon.component && !icon.svgMarkup ? (
          <span className="marker-visual__icon" aria-hidden="true">
            <icon.component size={size} color={color} />
          </span>
        ) : (
          <span
            className="marker-visual__icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: (icon.svgMarkup ?? "").replace(/marker-(relief|volume)-/g, `${markerInstanceId}-marker-$1-`) }}
          />
        )
      )}
    </span>
  );
});

export default MarkerVisual;
