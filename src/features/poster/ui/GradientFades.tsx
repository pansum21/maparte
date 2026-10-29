import { withAlpha } from "@/shared/utils/color";

interface GradientFadesProps {
  color: string;
  top?: boolean;
  bottom?: boolean;
}

/**
 * CSS gradient overlays that fade the top and bottom of the poster frame.
 * Matches the canvas-based `applyFades()` behaviour but runs on the GPU.
 */
export default function GradientFades({ color, top = true, bottom = true }: GradientFadesProps) {
  const solid = withAlpha(color, 1);
  const transparent = withAlpha(color, 0);

  return (
    <>
      {top ? <div
        className="poster-fade poster-fade--top"
        style={{
          background: `linear-gradient(to bottom, ${solid}, ${transparent})`,
        }}
      /> : null}
      {bottom ? <div
        className="poster-fade poster-fade--bottom"
        style={{
          background: `linear-gradient(to top, ${solid}, ${transparent})`,
        }}
      /> : null}
    </>
  );
}
