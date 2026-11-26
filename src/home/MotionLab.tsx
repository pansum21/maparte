"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import "./motionLab.css";

/**
 * A shelf of gallery motions collected from 21st.dev, rebuilt on the pieces the
 * site already has (motion + CSS). Each tile keeps the photo's portrait ratio so
 * a treatment can be lifted into the landing at the size it was judged at.
 *
 * The small number beside each tile is the running order — two tiles sharing a
 * number are meant to sit in one slot and take turns with the photos.
 */

type Photo = { src: string; alt: string };

const PHOTOS: Photo[] = [
  { src: "/assets/where-we-met-paris-real.png", alt: "Paris city print" },
  { src: "/assets/space_journey_poster.jpg", alt: "Space journey print" },
  { src: "/assets/where-we-met-newyork-real.png", alt: "New York city print" },
  { src: "/assets/maparte-cinematic-poster.jpg", alt: "Cinematic city print" },
  { src: "/assets/where-we-met-paris-carrara.png", alt: "Paris marble print" },
  { src: "/assets/where-we-met-newyork-carrara.png", alt: "New York marble print" },
];

function slice(start: number, count = 5): Photo[] {
  return Array.from({ length: count }, (_, k) => PHOTOS[(start + k) % PHOTOS.length]);
}

/** Steps an index on a timer, and stands still when the reader asks for less motion. */
function useCycle(length: number, ms: number) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced || length < 2) return;
    const timer = window.setInterval(() => setIndex((v) => (v + 1) % length), ms);
    return () => window.clearInterval(timer);
  }, [length, ms, reduced]);
  return index;
}

function Photo({ src, alt, className = "" }: Photo & { className?: string }) {
  return <img className={`ml-photo ${className}`} src={src} alt={alt} draggable={false} loading="lazy" />;
}

/* ------------------------------------------------------------------ tiles */

function Staircase() {
  const photos = slice(0, 5);
  const active = useCycle(photos.length, 2300);
  return (
    <div className="ml-stage ml-staircase">
      {photos.map((photo, index) => {
        const step = (index - active + photos.length) % photos.length;
        return (
          <motion.div
            key={photo.src}
            className="ml-card ml-card--stair"
            animate={{ x: step * 22 - 34, y: step * 20 - 26, scale: 1 - step * 0.06, zIndex: 10 - step, opacity: step > 3 ? 0 : 1 }}
            transition={{ type: "spring", stiffness: 170, damping: 22 }}
          >
            <Photo {...photo} />
          </motion.div>
        );
      })}
    </div>
  );
}

function CardDeck() {
  const photos = slice(1, 5);
  const [order, setOrder] = useState(photos.map((_, index) => index));
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setOrder((current) => [...current.slice(1), current[0]]);
    }, 2100);
    return () => window.clearInterval(timer);
  }, [reduced]);
  return (
    <div className="ml-stage ml-deck">
      {order.map((photoIndex, slot) => (
        <motion.div
          key={photos[photoIndex].src}
          className="ml-card ml-card--deck"
          animate={{
            y: slot * -9,
            scale: 1 - slot * 0.055,
            rotate: slot === 0 ? 0 : slot % 2 === 0 ? 2.2 : -2.2,
            zIndex: 10 - slot,
          }}
          whileHover={slot === 0 && !reduced ? { y: -16, rotate: -4 } : undefined}
          transition={{ type: "spring", stiffness: 210, damping: 24 }}
        >
          <Photo {...photos[photoIndex]} />
        </motion.div>
      ))}
    </div>
  );
}

function TiltCascade() {
  const photos = slice(2, 4);
  const reduced = useReducedMotion();
  const node = useRef<HTMLDivElement>(null);
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
    <div className="ml-stage ml-cascade" ref={node} onPointerMove={move} onPointerLeave={() => { mx.set(0); my.set(0); }}>
      {photos.map((photo, index) => (
        <motion.div
          key={photo.src}
          className="ml-card ml-card--cascade"
          style={{ rotateX, rotateY, zIndex: 10 - index }}
          animate={{
            x: (index - (photos.length - 1) / 2) * 30,
            y: (index - (photos.length - 1) / 2) * 26,
            scale: 1 - index * 0.05,
          }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
        >
          <Photo {...photo} />
        </motion.div>
      ))}
    </div>
  );
}

function ViewfinderFlip() {
  const photos = slice(3, 2);
  const active = useCycle(photos.length, 2800);
  const reduced = useReducedMotion();
  return (
    <div className="ml-stage ml-viewfinder">
      <div className="ml-viewfinder__frame">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.src}
            className="ml-viewfinder__face"
            animate={{
              rotateY: reduced ? 0 : index === active ? 0 : index < active ? -92 : 92,
              opacity: index === active ? 1 : 0,
              zIndex: index === active ? 2 : 1,
            }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <Photo {...photo} />
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

function CoverFlow() {
  const photos = slice(4, 5);
  const active = useCycle(photos.length, 2400);
  const reduced = useReducedMotion();
  return (
    <div className="ml-stage ml-coverflow">
      {photos.map((photo, index) => {
        let offset = index - active;
        if (offset > photos.length / 2) offset -= photos.length;
        if (offset < -photos.length / 2) offset += photos.length;
        const depth = Math.abs(offset);
        return (
          <motion.div
            key={photo.src}
            className="ml-card ml-card--flow"
            animate={{
              x: offset * 62,
              z: reduced ? 0 : -depth * 90,
              rotateY: reduced ? 0 : offset * -26,
              scale: 1 - depth * 0.12,
              opacity: depth > 2 ? 0 : 1,
              zIndex: 10 - depth,
            }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
          >
            <Photo {...photo} />
          </motion.div>
        );
      })}
    </div>
  );
}

function ElasticGallery() {
  const columns = [slice(0, 3), slice(2, 3), slice(4, 3)];
  const active = useCycle(3, 2500);
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
          animate={{ flexGrow: index === open ? 2.1 : 1, opacity: index === open ? 1 : 0.72 }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
        >
          {column.map((photo) => (
            <Photo key={photo.src} {...photo} />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

function WheelCarousel() {
  const photos = slice(1, 6);
  const active = useCycle(photos.length, 2000);
  return (
    <div className="ml-stage ml-wheel">
      {photos.map((photo, index) => {
        const angle = (index - active) * 16;
        return (
          <motion.div
            key={photo.src}
            className="ml-card ml-card--wheel"
            animate={{ rotate: angle, zIndex: index === active ? 9 : 5 - Math.abs(index - active) }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            <Photo {...photo} />
          </motion.div>
        );
      })}
    </div>
  );
}

function PictureRail() {
  const photos = slice(2, 4);
  const active = useCycle(photos.length, 2600);
  return (
    <div className="ml-stage ml-rail">
      <span className="ml-rail__bar" />
      {photos.map((photo, index) => (
        <motion.div
          key={photo.src}
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
            <Photo {...photo} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CurvedArc() {
  const photos = slice(3, 5);
  const active = useCycle(photos.length, 2200);
  return (
    <div className="ml-stage ml-arc">
      {photos.map((photo, index) => {
        const offset = index - active;
        return (
          <motion.div
            key={photo.src}
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
            <Photo {...photo} />
          </motion.div>
        );
      })}
    </div>
  );
}

function TiltedGrid() {
  const photos = slice(0, 4);
  const reduced = useReducedMotion();
  const node = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(mx, { stiffness: 150, damping: 18 });
  const rotateX = useSpring(my, { stiffness: 150, damping: 18 });

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
      <motion.div className="ml-grid__inner" style={{ rotateX, rotateY }}>
        {photos.map((photo, index) => (
          <motion.div
            key={photo.src}
            className="ml-grid__cell"
            animate={reduced ? undefined : { rotate: index % 2 === 0 ? -4 : 4 }}
          >
            <Photo {...photo} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function Endless() {
  const row = slice(1, 4);
  const reduced = useReducedMotion();
  return (
    <div className={`ml-stage ml-endless${reduced ? " is-still" : ""}`}>
      <div className="ml-endless__track">
        {[0, 1].map((copy) => (
          <div className="ml-endless__set" key={copy} aria-hidden={copy === 1}>
            {row.map((photo) => (
              <div className="ml-card ml-card--endless" key={`${copy}-${photo.src}`}>
                <Photo {...photo} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorksWheel() {
  const photos = slice(2, 5);
  const reduced = useReducedMotion();
  return (
    <div className="ml-stage ml-orbit">
      <motion.div
        className="ml-orbit__ring"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 26, ease: "linear", repeat: Infinity }}
      >
        {photos.map((photo, index) => (
          <div
            key={photo.src}
            className="ml-orbit__slot"
            style={{ transform: `rotate(${(360 / photos.length) * index}deg) translateY(-96px)` }}
          >
            <motion.div
              className="ml-card ml-card--orbit"
              animate={reduced ? undefined : { rotate: -360 }}
              transition={{ duration: 26, ease: "linear", repeat: Infinity }}
            >
              <Photo {...photo} />
            </motion.div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------- tile */

type TileProps = {
  id: string;
  name: string;
  origin: string;
  children: ReactNode;
};

const ORDER_KEY = "maparte-motion-order";

function readOrder(id: string): string {
  try {
    const all = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "{}");
    return typeof all?.[id] === "number" ? String(all[id]) : "";
  } catch {
    return "";
  }
}

function Tile({ id, name, origin, children }: TileProps) {
  const [order, setOrder] = useState("");

  useEffect(() => {
    setOrder(readOrder(id));
  }, [id]);

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
    <figure className="ml-tile">
      <div className="ml-tile__frame">{children}</div>
      <figcaption className="ml-tile__foot">
        <span className="ml-tile__name">{name}</span>
        <label className="ml-order">
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
      </figcaption>
      <span className="ml-tile__origin">{origin}</span>
    </figure>
  );
}

/* ------------------------------------------------------------------- page */

export default function MotionLab() {
  return (
    <main className="ml-page">
      <header className="ml-head">
        <a className="ml-head__back" href="/">
          ← MAPARTE
        </a>
        <p className="ml-head__kicker">21st.dev bookmarks · rebuilt for MAPARTE</p>
        <h1 className="ml-head__title">
          Gallery motions, <em>at photo size.</em>
        </h1>
        <p className="ml-head__note">
          Every tile is a gallery or photo treatment saved in the bookmarks, rebuilt with motion + CSS at the same
          portrait size as the landing photo. Type a number in the box under a tile to set its running order — two or
          three tiles sharing a number will sit in one slot and take turns with the photos. The numbers are kept in this
          browser.
        </p>
      </header>

      <section className="ml-shelf">
        <Tile id="staircase" name="Staircase image carousel" origin="kedhareswer">
          <Staircase />
        </Tile>
        <Tile id="deck" name="Stacked card carousel" origin="kedhareswer">
          <CardDeck />
        </Tile>
        <Tile id="cascade" name="Tilted card carousel" origin="kedhareswer">
          <TiltCascade />
        </Tile>
        <Tile id="viewfinder" name="3D flip carousel" origin="kedhareswer">
          <ViewfinderFlip />
        </Tile>
        <Tile id="coverflow" name="Cover flow" origin="louisstudios">
          <CoverFlow />
        </Tile>
        <Tile id="elastic" name="Elastic gallery" origin="daiwiikharihar">
          <ElasticGallery />
        </Tile>
        <Tile id="wheel" name="Wheel carousel" origin="harshjadhavconnect">
          <WheelCarousel />
        </Tile>
        <Tile id="rail" name="Picture rail gallery" origin="dhxwhy">
          <PictureRail />
        </Tile>
        <Tile id="arc" name="Curved arc carousel" origin="kedhareswer">
          <CurvedArc />
        </Tile>
        <Tile id="grid" name="Tilted grid hero" origin="ruixen.ui">
          <TiltedGrid />
        </Tile>
        <Tile id="endless" name="Endless" origin="helloweblisy">
          <Endless />
        </Tile>
        <Tile id="orbit" name="Works wheel" origin="crafterui">
          <WorksWheel />
        </Tile>
      </section>
    </main>
  );
}
