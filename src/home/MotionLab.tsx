"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import "./motionLab.css";

/**
 * The gallery reel: every photo treatment saved from 21st.dev, rebuilt on motion
 * + CSS, and pinned on screen until its own scroll is spent. A part does not hand
 * over to the next one until its last poster has gone by, which is what makes the
 * page read as one continuous piece rather than a grid of demos.
 *
 * Posters are real MapArte output — a different city, theme and typeface in each
 * frame — rendered by scripts/generate_motion_posters.mjs.
 */

type Poster = { src: string; city: string; theme: string };

const POSTERS: Poster[] = [
  { src: "/assets/motion/01-lisbon-carrara.png", city: "Lisbon", theme: "Carrara" },
  { src: "/assets/motion/02-new-york-midnight_blue.png", city: "New York", theme: "Midnight Blue" },
  { src: "/assets/motion/03-rome-carrara.png", city: "Rome", theme: "Carrara" },
  { src: "/assets/motion/04-paris-noir.png", city: "Paris", theme: "Noir" },
  { src: "/assets/motion/05-venice-blue_water.png", city: "Venice", theme: "Blue Water" },
  { src: "/assets/motion/06-london-pencil_sketch.png", city: "London", theme: "Pencil Sketch" },
  { src: "/assets/motion/07-amsterdam-crayon_art.png", city: "Amsterdam", theme: "Crayon Art" },
  { src: "/assets/motion/08-tokyo-comic_pop.png", city: "Tokyo", theme: "Comic Pop" },
  { src: "/assets/motion/09-kyoto-watercolor_wash.png", city: "Kyoto", theme: "Watercolor Wash" },
  { src: "/assets/motion/10-berlin-chalkboard.png", city: "Berlin", theme: "Chalkboard" },
  { src: "/assets/motion/11-zurich-sage.png", city: "Zurich", theme: "Sage" },
  { src: "/assets/motion/12-jaipur-terracotta.png", city: "Jaipur", theme: "Terracotta" },
  { src: "/assets/motion/13-cairo-sandstone.png", city: "Cairo", theme: "Sandstone" },
  { src: "/assets/motion/14-san-francisco-blueprint.png", city: "San Francisco", theme: "Blueprint" },
  { src: "/assets/motion/15-barcelona-ruby.png", city: "Barcelona", theme: "Ruby" },
  { src: "/assets/motion/16-sydney-sunset.png", city: "Sydney", theme: "Sunset" },
  { src: "/assets/motion/17-vienna-blush.png", city: "Vienna", theme: "Blush" },
  { src: "/assets/motion/18-rio-de-janeiro-ocean.png", city: "Rio de Janeiro", theme: "Ocean" },
  { src: "/assets/motion/19-dubai-neon.png", city: "Dubai", theme: "Neon" },
  { src: "/assets/motion/20-seoul-japanese_ink.png", city: "Seoul", theme: "Japanese Ink" },
  { src: "/assets/motion/21-mumbai-retro_vintage.png", city: "Mumbai", theme: "Retro Vintage" },
];

/** A different run of posters for every part, so no treatment repeats its art. */
function art(start: number, count: number): Poster[] {
  return Array.from({ length: count }, (_, k) => POSTERS[(start + k * 3) % POSTERS.length]);
}

function PosterArt({ poster, className = "" }: { poster: Poster; className?: string }) {
  return (
    <img
      className={`ml-photo ${className}`}
      src={poster.src}
      alt={`${poster.city} print in ${poster.theme}`}
      draggable={false}
      loading="lazy"
    />
  );
}

function useCard(ref: React.RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return scrollYProgress;
}

/** Turns a 0–1 scroll window into the poster the part is currently showing. */
function useScrollIndex(progress: MotionValue<number>, count: number) {
  const [index, setIndex] = useState(0);
  useMotionValueEvent(progress, "change", (value) => {
    const next = Math.min(count - 1, Math.max(0, Math.round(value * (count - 1))));
    setIndex((current) => (current === next ? current : next));
  });
  return index;
}

type PartProps = { progress: MotionValue<number> };

/* ------------------------------------------------------------------ parts */

function Staircase({ progress }: PartProps) {
  const posters = art(0, 5);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-staircase">
      {posters.map((poster, index) => {
        const step = (index - active + posters.length) % posters.length;
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--stair"
            animate={{
              x: step * 22 - 34,
              y: step * 20 - 26,
              scale: 1 - step * 0.06,
              zIndex: 10 - step,
              opacity: step > 3 ? 0 : 1,
            }}
            transition={{ type: "spring", stiffness: 170, damping: 22 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        );
      })}
    </div>
  );
}

function CardDeck({ progress }: PartProps) {
  const posters = art(1, 5);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-deck">
      {posters.map((poster, index) => {
        const slot = (index - active + posters.length) % posters.length;
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--deck"
            animate={{
              y: slot * -9,
              scale: 1 - slot * 0.055,
              rotate: slot === 0 ? 0 : slot % 2 === 0 ? 2.2 : -2.2,
              zIndex: 10 - slot,
            }}
            transition={{ type: "spring", stiffness: 210, damping: 24 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        );
      })}
    </div>
  );
}

function TiltCascade({ progress }: PartProps) {
  const posters = art(2, 4);
  const active = useScrollIndex(progress, posters.length);
  const node = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(mx, { stiffness: 180, damping: 18 });
  const rotateX = useSpring(my, { stiffness: 180, damping: 18 });

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = node.current?.getBoundingClientRect();
    if (!box || reduced) return;
    mx.set(((event.clientX - box.left) / box.width - 0.5) * 22);
    my.set(((event.clientY - box.top) / box.height - 0.5) * -18);
  };

  return (
    <div
      className="ml-stage ml-cascade"
      ref={node}
      onPointerMove={move}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      {posters.map((poster, index) => {
        const offset = index - active;
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--cascade"
            style={{ rotateX, rotateY }}
            animate={{
              x: offset * 26,
              y: offset * 20,
              rotate: offset * 1.8,
              scale: 1 - Math.abs(offset) * 0.05,
              zIndex: 10 - Math.abs(offset),
            }}
            transition={{ type: "spring", stiffness: 160, damping: 21 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        );
      })}
    </div>
  );
}

function ViewfinderFlip({ progress }: PartProps) {
  const posters = art(3, 3);
  const active = useScrollIndex(progress, posters.length);
  const reduced = useReducedMotion();
  return (
    <div className="ml-stage ml-viewfinder">
      <div className="ml-viewfinder__frame">
        {posters.map((poster, index) => (
          <motion.div
            key={poster.src}
            className="ml-viewfinder__face"
            animate={{
              rotateY: reduced ? 0 : index === active ? 0 : index < active ? -92 : 92,
              opacity: index === active ? 1 : 0,
              zIndex: index === active ? 2 : 1,
            }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        ))}
      </div>
      <i className="ml-viewfinder__corner ml-viewfinder__corner--tl" />
      <i className="ml-viewfinder__corner ml-viewfinder__corner--tr" />
      <i className="ml-viewfinder__corner ml-viewfinder__corner--bl" />
      <i className="ml-viewfinder__corner ml-viewfinder__corner--br" />
    </div>
  );
}

function CoverFlow({ progress }: PartProps) {
  const posters = art(4, 6);
  const active = useScrollIndex(progress, posters.length);
  const reduced = useReducedMotion();
  return (
    <div className="ml-stage ml-coverflow">
      {posters.map((poster, index) => {
        let offset = index - active;
        if (offset > posters.length / 2) offset -= posters.length;
        if (offset < -posters.length / 2) offset += posters.length;
        const depth = Math.abs(offset);
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--flow"
            animate={{
              x: offset * 58,
              z: reduced ? 0 : -depth * 90,
              rotateY: reduced ? 0 : offset * -26,
              scale: 1 - depth * 0.1,
              opacity: depth > 2 ? 0 : 1,
              zIndex: 10 - Math.round(depth),
            }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        );
      })}
    </div>
  );
}

function ElasticGallery({ progress }: PartProps) {
  const columns = [art(5, 3), art(8, 3), art(11, 3)];
  const active = useScrollIndex(progress, 3);
  const [hovered, setHovered] = useState<number | null>(null);
  const open = hovered ?? active;
  return (
    <div className="ml-stage ml-elastic">
      {columns.map((column, index) => (
        <motion.div
          key={index}
          className="ml-elastic__column"
          onPointerEnter={() => setHovered(index)}
          onPointerLeave={() => setHovered(null)}
          animate={{ flexGrow: index === open ? 2.1 : 1, opacity: index === open ? 1 : 0.68 }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
        >
          {column.map((poster) => (
            <PosterArt key={poster.src} poster={poster} />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

function WheelCarousel({ progress }: PartProps) {
  const posters = art(6, 6);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-wheel">
      {posters.map((poster, index) => {
        const angle = (index - active) * 16;
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--wheel"
            animate={{ rotate: angle, zIndex: index === active ? 9 : 5 - Math.abs(index - active) }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        );
      })}
    </div>
  );
}

function PictureRail({ progress }: PartProps) {
  const posters = art(7, 4);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-rail">
      <span className="ml-rail__bar" />
      {posters.map((poster, index) => (
        <motion.div
          key={poster.src}
          className="ml-rail__hang"
          animate={{
            rotate: index === active ? 0 : index % 2 === 0 ? -2.6 : 2.6,
            y: index === active ? 6 : 0,
            zIndex: index === active ? 4 : 1,
          }}
          transition={{ type: "spring", stiffness: 90, damping: 12 }}
        >
          <span className="ml-rail__wire" />
          <div className="ml-frame">
            <PosterArt poster={poster} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CurvedArc({ progress }: PartProps) {
  const posters = art(9, 5);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-arc">
      {posters.map((poster, index) => {
        const offset = index - active;
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--arc"
            animate={{
              rotate: offset * 10,
              x: offset * 40,
              y: Math.abs(offset) * 9,
              scale: 1 - Math.abs(offset) * 0.07,
              zIndex: 10 - Math.abs(offset),
            }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        );
      })}
    </div>
  );
}

function TiltedGrid({ progress }: PartProps) {
  const posters = art(10, 4);
  const node = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(mx, { stiffness: 150, damping: 18 });
  const rotateX = useSpring(my, { stiffness: 150, damping: 18 });
  const drift = useTransform(progress, [0, 1], [-5, 5]);

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = node.current?.getBoundingClientRect();
    if (!box || reduced) return;
    mx.set(((event.clientX - box.left) / box.width - 0.5) * 26);
    my.set(((event.clientY - box.top) / box.height - 0.5) * -20);
  };

  return (
    <div
      className="ml-stage ml-grid"
      ref={node}
      onPointerMove={move}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      <motion.div className="ml-grid__inner" style={{ rotateX, rotateY, rotateZ: drift }}>
        {posters.map((poster, index) => (
          <motion.div
            key={poster.src}
            className="ml-grid__cell"
            animate={reduced ? undefined : { rotate: index % 2 === 0 ? -4 : 4 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function Endless({ progress }: PartProps) {
  const posters = art(11, 4);
  const reduced = useReducedMotion();
  const duration = useTransform(progress, [0, 1], [26, 9]);
  const [seconds, setSeconds] = useState(26);
  useMotionValueEvent(duration, "change", (value) => setSeconds(Number(value.toFixed(2))));
  return (
    <div className={`ml-stage ml-endless${reduced ? " is-still" : ""}`}>
      <div className="ml-endless__track" style={{ animationDuration: `${seconds}s` }}>
        {[0, 1].map((copy) => (
          <div className="ml-endless__set" key={copy} aria-hidden={copy === 1}>
            {posters.map((poster) => (
              <div className="ml-card ml-card--endless" key={`${copy}-${poster.src}`}>
                <PosterArt poster={poster} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrbitCard({ poster, spin }: { poster: Poster; spin: MotionValue<number> }) {
  const counter = useTransform(spin, (value) => -value);
  return (
    <motion.div className="ml-card ml-card--orbit" style={{ rotate: counter }}>
      <PosterArt poster={poster} />
    </motion.div>
  );
}

function WorksWheel({ progress }: PartProps) {
  const posters = art(12, 5);
  const spin = useTransform(progress, [0, 1], [0, 300]);
  return (
    <div className="ml-stage ml-orbit">
      <motion.div className="ml-orbit__ring" style={{ rotate: spin }}>
        {posters.map((poster, index) => (
          <div
            key={poster.src}
            className="ml-orbit__slot"
            style={{ transform: `rotate(${(360 / posters.length) * index}deg) translateY(-96px)` }}
          >
            <OrbitCard poster={poster} spin={spin} />
          </div>
        ))}
      </motion.div>
      <span className="ml-orbit__glow" />
    </div>
  );
}

/** louisstudios/warp-carousel — posters pull apart along a curve as you scroll. */
function WarpCarousel({ progress }: PartProps) {
  const posters = art(13, 4);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-warp">
      {posters.map((poster, index) => {
        const offset = index - active;
        const distance = Math.abs(offset);
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--warp"
            animate={{
              x: offset * 34,
              y: offset * -18,
              rotate: offset * -6,
              skewY: offset * -3,
              scale: 1 - distance * 0.1,
              opacity: distance > 2 ? 0 : 1,
              zIndex: 10 - distance,
            }}
            transition={{ type: "spring", stiffness: 130, damping: 19 }}
          >
            <PosterArt poster={poster} />
          </motion.div>
        );
      })}
    </div>
  );
}

/** crafterui/dither-helix-carousel — a helix that turns with the scroll. */
function DitherHelix({ progress }: PartProps) {
  const posters = art(14, 6);
  const angle = useTransform(progress, [0, 1], [-24, 190]);
  return (
    <div className="ml-stage ml-helix">
      {posters.map((poster, index) => (
        <motion.div key={poster.src} className="ml-helix__card" style={{ rotateY: angle }}>
          <span className="ml-helix__slot" style={{ "--slot": index } as React.CSSProperties}>
            <PosterArt poster={poster} />
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/** automateflows/glassy-coverflow-carousel — cover flow behind a glass pane. */
function GlassyCoverflow({ progress }: PartProps) {
  const posters = art(15, 5);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-glassy">
      {posters.map((poster, index) => {
        let offset = index - active;
        if (offset > posters.length / 2) offset -= posters.length;
        if (offset < -posters.length / 2) offset += posters.length;
        const depth = Math.abs(offset);
        return (
          <motion.div
            key={poster.src}
            className="ml-card ml-card--glassy"
            animate={{
              x: offset * 52,
              z: -depth * 70,
              rotateY: offset * -22,
              scale: 1 - depth * 0.08,
              opacity: depth > 2 ? 0 : 1,
              zIndex: 10 - Math.round(depth),
            }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          >
            <PosterArt poster={poster} />
            <span className="ml-glassy__sheen" />
          </motion.div>
        );
      })}
      <span className="ml-glassy__pane" />
    </div>
  );
}

/** aloksivastava1025/cue-3d-book-carousel-reading-mode — an open book that turns. */
function BookPage({
  poster,
  turn,
  index,
}: {
  poster: Poster;
  turn: MotionValue<number>;
  index: number;
}) {
  const rotateY = useTransform(turn, (value) => -Math.min(180, Math.max(0, value - index * 180)));
  return (
    <motion.div className="ml-book__page" style={{ rotateY, zIndex: 20 - index }}>
      <PosterArt poster={poster} />
      <span className="ml-book__fold" />
    </motion.div>
  );
}

function BookCarousel({ progress }: PartProps) {
  const posters = art(16, 4);
  const turn = useTransform(progress, [0, 1], [0, (posters.length - 1) * 180]);
  return (
    <div className="ml-stage ml-book">
      <div className="ml-book__shell">
        <span className="ml-book__turned ml-book__turned--1" aria-hidden />
        <span className="ml-book__turned ml-book__turned--2" aria-hidden />
        {posters.map((poster, index) => (
          <BookPage key={poster.src} poster={poster} turn={turn} index={index} />
        ))}
        <span className="ml-book__spine" />
      </div>
      <span className="ml-book__shadow" />
    </div>
  );
}

/** kedhareswer/journal-spread-carousel — two facing pages, gutter in the middle. */
function JournalSpread({ progress }: PartProps) {
  const spreads = [art(17, 2), art(1, 2), art(9, 2)];
  const active = useScrollIndex(progress, spreads.length);
  return (
    <div className="ml-stage ml-journal">
      {spreads.map((spread, index) => (
        <motion.div
          key={index}
          className="ml-journal__spread"
          animate={{
            opacity: index === active ? 1 : 0,
            rotateY: index === active ? 0 : index < active ? 24 : -24,
            x: index === active ? 0 : index < active ? -60 : 60,
            zIndex: index === active ? 2 : 1,
          }}
          transition={{ type: "spring", stiffness: 110, damping: 20 }}
        >
          {spread.map((poster, leaf) => (
            <div className={`ml-journal__leaf ml-journal__leaf--${leaf === 0 ? "left" : "right"}`} key={poster.src}>
              <PosterArt poster={poster} />
            </div>
          ))}
          <span className="ml-journal__gutter" />
        </motion.div>
      ))}
    </div>
  );
}

/** kedhareswer/glass-folder-cards — folder tabs that open as the reel advances. */
function GlassFolderCards({ progress }: PartProps) {
  const posters = art(18, 4);
  const active = useScrollIndex(progress, posters.length);
  return (
    <div className="ml-stage ml-folders">
      {posters.map((poster, index) => {
        const lift = index === active ? 0 : index < active ? -1 : 1;
        return (
          <motion.div
            key={poster.src}
            className="ml-folder"
            animate={{
              y: index * -9 + (index === active ? -18 : 0),
              scale: index === active ? 1 : 0.95,
              rotate: lift * 1.4,
              zIndex: index === active ? 9 : 4 - index,
              opacity: index === active ? 1 : 0.88,
            }}
            transition={{ type: "spring", stiffness: 150, damping: 22 }}
          >
            <span className="ml-folder__tab" />
            <div className="ml-folder__body">
              <PosterArt poster={poster} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/** felipemenezes098/hero-04 — an editorial collage with layered parallax. */
function CollageTile({
  poster,
  index,
  progress,
}: {
  poster: Poster;
  index: number;
  progress: MotionValue<number>;
}) {
  const depth = index % 2 === 0 ? -34 : 34;
  const y = useTransform(progress, [0, 1], [depth, -depth]);
  return (
    <motion.div className={`ml-collage__tile ml-collage__tile--${index}`} style={{ y }}>
      <PosterArt poster={poster} />
    </motion.div>
  );
}

function EditorialCollage({ progress }: PartProps) {
  const posters = art(19, 4);
  return (
    <div className="ml-stage ml-collage">
      {posters.map((poster, index) => (
        <CollageTile key={poster.src} poster={poster} index={index} progress={progress} />
      ))}
      <span className="ml-collage__rule" />
    </div>
  );
}

/** cult-ui/3d-carousel — a drum of posters turning around the viewer. */
function DrumCarousel({ progress }: PartProps) {
  const posters = art(2, 6);
  const angle = useTransform(progress, [0, 1], [0, 360]);
  return (
    <div className="ml-stage ml-drum">
      <motion.div className="ml-drum__ring" style={{ rotateY: angle }}>
        {posters.map((poster, index) => (
          <span
            key={poster.src}
            className="ml-drum__slot"
            style={{ transform: `rotateY(${index * (360 / posters.length)}deg) translateZ(148px)` }}
          >
            <PosterArt poster={poster} />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------- the reel */

type Part = {
  id: string;
  name: string;
  origin: string;
  note: string;
  render: (props: PartProps) => ReactNode;
};

const PARTS: Part[] = [
  {
    id: "staircase",
    name: "Staircase image carousel",
    origin: "kedhareswer",
    note: "Five prints fan back in a stepped stack; each scroll step walks the front print to the back.",
    render: (props) => <Staircase {...props} />,
  },
  {
    id: "deck",
    name: "Stacked card carousel",
    origin: "kedhareswer",
    note: "A tight deck where the top card lifts, tilts and drops to the bottom of the pile.",
    render: (props) => <CardDeck {...props} />,
  },
  {
    id: "cascade",
    name: "Tilted card carousel",
    origin: "kedhareswer",
    note: "Pointer tilt on the stack, the cards stepping back as the part is scrolled.",
    render: (props) => <TiltCascade {...props} />,
  },
  {
    id: "viewfinder",
    name: "3D flip carousel",
    origin: "kedhareswer",
    note: "A camera frame that flips its print over on the horizontal axis.",
    render: (props) => <ViewfinderFlip {...props} />,
  },
  {
    id: "coverflow",
    name: "Cover flow",
    origin: "louisstudios",
    note: "The classic shelf: side prints rotate away in perspective as the middle one takes the light.",
    render: (props) => <CoverFlow {...props} />,
  },
  {
    id: "elastic",
    name: "Elastic gallery",
    origin: "daiwiikharihar",
    note: "Three columns of prints share the width, one breathing open at a time.",
    render: (props) => <ElasticGallery {...props} />,
  },
  {
    id: "wheel",
    name: "Wheel carousel",
    origin: "harshjadhavconnect",
    note: "Prints pinned at the bottom edge and swung around like a hand of cards.",
    render: (props) => <WheelCarousel {...props} />,
  },
  {
    id: "rail",
    name: "Picture rail gallery",
    origin: "dhxwhy",
    note: "Framed prints hung from a rail; the active one straightens and settles.",
    render: (props) => <PictureRail {...props} />,
  },
  {
    id: "arc",
    name: "Curved arc carousel",
    origin: "kedhareswer",
    note: "A wide arc where the outermost prints fall away in rotation and scale.",
    render: (props) => <CurvedArc {...props} />,
  },
  {
    id: "grid",
    name: "Tilted grid hero",
    origin: "ruixen.ui",
    note: "A 2 × 2 grid on a tilted plane, reacting to the pointer and drifting with the scroll.",
    render: (props) => <TiltedGrid {...props} />,
  },
  {
    id: "endless",
    name: "Endless",
    origin: "helloweblisy",
    note: "A seamless marquee of prints; scrolling the part speeds the band up instead of stopping it.",
    render: (props) => <Endless {...props} />,
  },
  {
    id: "orbit",
    name: "Works wheel",
    origin: "crafterui",
    note: "Prints orbit a centre and stay upright while the ring turns with the page.",
    render: (props) => <WorksWheel {...props} />,
  },
  {
    id: "warp",
    name: "Warp carousel",
    origin: "louisstudios",
    note: "Prints shear and trail off along a curve, as if the stack were being pulled by the scroll.",
    render: (props) => <WarpCarousel {...props} />,
  },
  {
    id: "helix",
    name: "Dither helix carousel",
    origin: "crafterui",
    note: "A helix of six prints turning around a vertical axis — a scroll-driven spiral.",
    render: (props) => <DitherHelix {...props} />,
  },
  {
    id: "glassy",
    name: "Glassy cover flow",
    origin: "automateflows",
    note: "Cover flow behind a glass pane: side prints fall away in depth, a sheen across each print.",
    render: (props) => <GlassyCoverflow {...props} />,
  },
  {
    id: "book",
    name: "3D book carousel",
    origin: "aloksivastava1025",
    note: "An open book whose right-hand pages turn one after another with the scroll.",
    render: (props) => <BookCarousel {...props} />,
  },
  {
    id: "journal",
    name: "Journal spread carousel",
    origin: "kedhareswer",
    note: "A two-page spread with a printed gutter, swapping to the next spread as the part advances.",
    render: (props) => <JournalSpread {...props} />,
  },
  {
    id: "folders",
    name: "Glass folder cards",
    origin: "kedhareswer",
    note: "Tabbed folder cards stacked in glass; the open one lifts clear of the pile.",
    render: (props) => <GlassFolderCards {...props} />,
  },
  {
    id: "collage",
    name: "Editorial collage hero",
    origin: "felipemenezes098",
    note: "Four prints pinned like a magazine layout, sliding against each other in layers.",
    render: (props) => <EditorialCollage {...props} />,
  },
  {
    id: "drum",
    name: "3D carousel",
    origin: "cult-ui",
    note: "A drum of six prints turning around the viewer, one face always square to the front.",
    render: (props) => <DrumCarousel {...props} />,
  },
];

const ORDER_KEY = "maparte-motion-order";

function readOrder(id: string): string {
  try {
    const all = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "{}");
    return typeof all?.[id] === "number" ? String(all[id]) : "";
  } catch {
    return "";
  }
}

function OrderBox({ id, name }: { id: string; name: string }) {
  const [order, setOrder] = useState("");
  useEffect(() => setOrder(readOrder(id)), [id]);

  const update = (value: string) => {
    setOrder(value);
    try {
      const all = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "{}");
      all[id] = value === "" ? undefined : Number(value);
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(all));
    } catch {
      /* private mode: the number just does not survive the reload */
    }
  };

  return (
    <label className="rl-order">
      <span>Order</span>
      <input
        type="number"
        min={1}
        max={99}
        inputMode="numeric"
        value={order}
        onChange={(event) => update(event.target.value)}
        aria-label={`Running order for ${name}`}
        placeholder="–"
      />
    </label>
  );
}

function PartSection({ part, index, total }: { part: Part; index: number; total: number }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useCard(ref);
  const reduced = useReducedMotion();
  const number = String(index + 1).padStart(2, "0");

  return (
    <section className="rl-part" ref={ref} id={`part-${part.id}`} aria-label={part.name}>
      <div className="rl-pin">
        <header className="rl-head">
          <span className="rl-count">
            {number} <i>/ {total}</i>
          </span>
          <div className="rl-title">
            <h2>{part.name}</h2>
            <p>{part.note}</p>
          </div>
          <OrderBox id={part.id} name={part.name} />
        </header>

        <div className={`rl-stage${reduced ? " is-still" : ""}`}>{part.render({ progress })}</div>

        <footer className="rl-foot">
          <span className="rl-origin">@{part.origin}</span>
          <span className="rl-cities">{POSTERS.length} cities · {new Set(POSTERS.map((p) => p.theme)).size} themes</span>
        </footer>

        <motion.span className="rl-rail" style={{ scaleY: progress }} aria-hidden />
      </div>
    </section>
  );
}

export default function MotionLab() {
  const [jumpOpen, setJumpOpen] = useState(false);

  const goTo = useCallback((id: string) => {
    const target = document.getElementById(`part-${id}`);
    if (!target) return;
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top, behavior: "smooth" });
    setJumpOpen(false);
  }, []);

  const skip = useCallback(() => {
    const parts = Array.from(document.querySelectorAll<HTMLElement>(".rl-part"));
    const current = parts.findIndex((node) => {
      const box = node.getBoundingClientRect();
      return box.top <= window.innerHeight * 0.5 && box.bottom > window.innerHeight * 0.5;
    });
    const next = parts[current + 1] ?? parts[parts.length - 1];
    if (next) window.scrollTo({ top: window.scrollY + next.getBoundingClientRect().top, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setJumpOpen(false);
      if (event.key === "ArrowDown" && event.shiftKey) skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  return (
    <main className="rl-page">
      <header className="rl-intro">
        <a className="rl-back" href="/">
          ← MAPARTE
        </a>
        <p className="rl-kicker">21st.dev bookmarks · rebuilt for MAPARTE</p>
        <h1>
          The gallery reel, <em>one treatment at a time.</em>
        </h1>
        <p className="rl-lede">
          Twenty gallery treatments from the bookmarks, rebuilt with motion + CSS and shown on real prints — a different
          city, theme and typeface in every frame. Each part stays pinned until its last print has gone by, then the next
          one opens. Type a number in the box to set the running order; a part you skip still keeps its place.
        </p>
        <div className="rl-actions">
          <button type="button" className="rl-btn rl-btn--solid" onClick={() => goTo(PARTS[0].id)}>
            Start the reel
          </button>
          <button type="button" className="rl-btn" onClick={() => setJumpOpen((v) => !v)} aria-expanded={jumpOpen}>
            {jumpOpen ? "Close index" : `Index · ${PARTS.length} parts`}
          </button>
        </div>
        {jumpOpen && (
          <ol className="rl-index">
            {PARTS.map((part, index) => (
              <li key={part.id}>
                <button type="button" onClick={() => goTo(part.id)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {part.name}
                  <i>@{part.origin}</i>
                </button>
              </li>
            ))}
          </ol>
        )}
      </header>

      {PARTS.map((part, index) => (
        <PartSection key={part.id} part={part} index={index} total={PARTS.length} />
      ))}

      <footer className="rl-outro">
        <p>That is all twenty. Numbers are kept in this browser.</p>
        <a href="/">← Back to Maparte</a>
      </footer>

      <button type="button" className="rl-skip" onClick={skip} title="Skip to the next component (Shift + ↓)">
        Skip to next <span aria-hidden>↓</span>
      </button>
    </main>
  );
}
