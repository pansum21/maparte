import { useRef, type CSSProperties } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import "./proof.css";
import { Spotlight, useScrollMask } from "./motionFx";

type Frame = {
  id: string;
  src: string;
  alt: string;
  label: string;
  note: string;
  rate: number;
};

const PRINTED: Frame[] = [
  {
    id: "wall",
    src: "/landing/wall-print.jpg",
    alt: "A framed map poster of a city hanging on a plaster wall above a wooden console.",
    label: "Framed, not floated",
    note: "One plate, a thin black frame and a white mat.",
    rate: 60,
  },
  {
    id: "detail",
    src: "/landing/paper-closeup.jpg",
    alt: "Close-up of printed map poster paper showing fine street lines and paper texture.",
    label: "Detail at 1:1",
    note: "Hairline streets and building footprints, held on paper.",
    rate: -40,
  },
  {
    id: "corner",
    src: "/landing/frame-corner.jpg",
    alt: "Macro of a black frame corner, white mat and the printed map running into it.",
    label: "The mat does the framing",
    note: "Bevelled mat, black profile, print sitting flush inside.",
    rate: 26,
  },
];

const SETS: Frame[] = [
  {
    id: "living",
    src: "/landing/living-room.jpg",
    alt: "A large framed map poster above a linen sofa in a warm minimal living room.",
    label: "Above the sofa",
    note: "One city, read from across the room.",
    rate: 44,
  },
  {
    id: "pair",
    src: "/landing/framed-pair.jpg",
    alt: "Two framed city map posters hung side by side in matching black frames.",
    label: "Two cities, one pair",
    note: "Where you met, and where you landed.",
    rate: -52,
  },
  {
    id: "grid",
    src: "/landing/gallery-grid.jpg",
    alt: "Six framed city map posters in different palettes arranged in a grid on a green wall.",
    label: "Six plates, one grid",
    note: "A wall of places you have actually been.",
    rate: 32,
  },
  {
    id: "studio",
    src: "/landing/studio-wall.jpg",
    alt: "Three framed city map posters in different palettes hung in a row on a bright studio wall.",
    label: "Three plates, one wall",
    note: "Same streets, three palettes — hung as a set.",
    rate: -34,
  },
];

function PhotoFrame({
  frame,
  index,
  progress,
  reduced,
  variant,
}: {
  frame: Frame;
  index: number;
  progress: MotionValue<number>;
  reduced: boolean;
  variant: "proof" | "walls";
}) {
  const y = useTransform(progress, [0, 1], [frame.rate, -frame.rate]);
  // The photo is over-scanned by its own drift (plus a hair of slack), so the
  // frame stays filled edge to edge at every scroll position.
  const over = { "--over": `${Math.abs(frame.rate) + 8}px` } as CSSProperties;
  const figure = useRef<HTMLElement>(null);
  // The print is wiped open as the frame travels up the page.
  const clipPath = useScrollMask(figure);

  return (
    <motion.figure
      ref={figure}
      className={`${variant}__frame ${variant}__frame--${frame.id}`}
      style={over}
      initial={reduced ? undefined : { opacity: 0, y: 44 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay: index * 0.09, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={reduced ? undefined : { y: -8 }}
    >
      <Spotlight
        radius={290}
        tint={variant === "walls" ? "rgba(255, 228, 190, 0.17)" : "rgba(228, 85, 42, 0.16)"}
        ring={variant === "walls" ? "rgba(255, 232, 197, 0.9)" : "rgba(228, 85, 42, 0.9)"}
      />
      <span className={`${variant}__mat`}>
        <motion.img
          src={frame.src}
          alt={frame.alt}
          loading="lazy"
          decoding="async"
          style={reduced ? undefined : { y, clipPath }}
        />
      </span>
      <figcaption className={`${variant}__cap`}>
        <b>{frame.label}</b>
        <span>{frame.note}</span>
      </figcaption>
    </motion.figure>
  );
}

/** One scroll value per section, spring-damped so the drift never snaps. */
function useSectionDrift(target: React.RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({ target, offset: ["start end", "end start"] });
  return useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
}

/**
 * The page has shown renders; this is the part where it shows prints: a framed
 * plate, the paper at 1:1, and the corner where the mat meets the sheet. Each
 * frame drifts at its own rate and lifts on hover.
 */
export function WallProof() {
  const ref = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;
  const eased = useSectionDrift(ref);

  return (
    <section className="proof" id="prints" ref={ref} aria-labelledby="proof-title">
      <div className="proof__inner">
        <div className="proof__head" data-reveal>
          <p className="kicker">
            <span className="dot" />
            09 — On a wall
          </p>
          <h2 className="proof__title" id="proof-title">
            Print is the point.
          </h2>
          <p className="proof__lead">
            A screen flatters everything. Paper does not — so the sheet is built
            for it: real geometry, hairlines that survive ink, and a bleed the
            cutter can follow.
          </p>
        </div>

        <div className="proof__stage">
          {PRINTED.map((frame, index) => (
            <PhotoFrame
              key={frame.id}
              frame={frame}
              index={index}
              progress={eased}
              reduced={reduced}
              variant="proof"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The same idea at room scale: how a single sheet, a pair and a grid behave on
 * a wall. Dark ground, so the paper reads as paper.
 */
export function WallSets() {
  const ref = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;
  const eased = useSectionDrift(ref);

  return (
    <section className="walls" id="wall-sets" ref={ref} aria-labelledby="walls-title">
      <div className="walls__inner">
        <div className="walls__head" data-reveal>
          <p className="kicker kicker--light">
            <span className="dot" />
            10 — Wall sets
          </p>
          <h2 className="walls__title" id="walls-title">
            One sheet, or a whole wall.
          </h2>
          <p className="walls__lead">
            A single city reads as a portrait. A pair reads as a story. A grid
            reads as a map of everywhere you have lived — same streets, different
            palettes.
          </p>
        </div>

        <div className="walls__stage">
          {SETS.map((frame, index) => (
            <PhotoFrame
              key={frame.id}
              frame={frame}
              index={index}
              progress={eased}
              reduced={reduced}
              variant="walls"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default WallProof;
