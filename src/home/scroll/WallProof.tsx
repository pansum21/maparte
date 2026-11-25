import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import "./proof.css";

type Frame = {
  id: string;
  src: string;
  alt: string;
  label: string;
  note: string;
  rate: number;
};

const FRAMES: Frame[] = [
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
    id: "wall-of-three",
    src: "/landing/studio-wall.jpg",
    alt: "Three framed city map posters in different palettes hung in a row on a bright studio wall.",
    label: "Three plates, one wall",
    note: "Same streets, three palettes — hung as a set.",
    rate: 30,
  },
];

function ProofFrame({
  frame,
  index,
  progress,
  reduced,
}: {
  frame: Frame;
  index: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const y = useTransform(progress, [0, 1], [frame.rate, -frame.rate]);

  return (
    <motion.figure
      className={`proof__frame proof__frame--${frame.id}`}
      initial={reduced ? undefined : { opacity: 0, y: 44 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay: index * 0.09, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={reduced ? undefined : { y: -8 }}
    >
      <span className="proof__mat">
        <motion.img
          src={frame.src}
          alt={frame.alt}
          loading="lazy"
          decoding="async"
          style={reduced ? undefined : { y }}
        />
      </span>
      <figcaption className="proof__cap">
        <b>{frame.label}</b>
        <span>{frame.note}</span>
      </figcaption>
    </motion.figure>
  );
}

/**
 * The page has shown renders; this is the part where it shows prints. Each
 * frame drifts at its own rate and lifts on hover, so the section reads as
 * depth instead of a grid of thumbnails.
 */
export default function WallProof() {
  const ref = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });

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
          {FRAMES.map((frame, index) => (
            <ProofFrame
              key={frame.id}
              frame={frame}
              index={index}
              progress={eased}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
