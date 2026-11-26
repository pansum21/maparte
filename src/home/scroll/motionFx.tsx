/**
 * The three little motions the landing borrows from motion.dev:
 *
 *   Spotlight    a pool of light that trails the cursor across a card
 *   Magnetic     a button that leans toward the pointer and springs back
 *   RevealMask   a print that is wiped open by the scroll
 *
 * All three are driven by motion values, so the work happens on the compositor
 * instead of React state. Everything disappears under `prefers-reduced-motion:
 * reduce`: the spotlight is not rendered, the magnet does not move and the mask
 * is cleared, leaving the page in its plain, static state.
 */

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import "./motionFx.css";

/* -------------------------------------------------------------- spotlight */

type SpotlightProps = {
  /** How wide the pool of light is, in pixels. */
  radius?: number;
  /** The colour at the centre of the pool; it fades to transparent. */
  tint?: string;
  className?: string;
};

/**
 * Sits inside the card it lights up and listens on that card, so the card
 * itself needs no wrapper and no handler of its own — only `position:
 * relative`. The glow lags the pointer by a spring and fades out on leave.
 */
export function Spotlight({
  radius = 320,
  tint = "rgba(228, 85, 42, 0.2)",
  className = "",
}: SpotlightProps) {
  const reduced = useReducedMotion();
  const node = useRef<HTMLSpanElement>(null);

  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const softX = useSpring(x, { stiffness: 190, damping: 26, mass: 0.36 });
  const softY = useSpring(y, { stiffness: 190, damping: 26, mass: 0.36 });
  const glow = useMotionTemplate`radial-gradient(${radius}px circle at ${softX}px ${softY}px, ${tint}, transparent 72%)`;

  const lit = useMotionValue(0);
  const fade = useSpring(lit, { stiffness: 150, damping: 24 });

  useEffect(() => {
    const host = node.current?.parentElement;
    if (!host || reduced) return;

    // The first touch lands the pool where the pointer is; only the moves
    // after it are eased, so the light never glides in from off the card.
    let landed = false;
    const move = (event: PointerEvent) => {
      const box = host.getBoundingClientRect();
      const px = event.clientX - box.left;
      const py = event.clientY - box.top;
      if (landed) {
        x.set(px);
        y.set(py);
      } else {
        softX.jump(px);
        softY.jump(py);
        landed = true;
      }
      lit.set(1);
    };
    const leave = () => {
      landed = false;
      lit.set(0);
    };

    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    host.addEventListener("pointercancel", leave);

    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointercancel", leave);
    };
  }, [reduced, x, y, softX, softY, lit]);

  if (reduced) return null;

  return (
    <motion.span
      ref={node}
      aria-hidden="true"
      className={`fx-spot${className ? ` ${className}` : ""}`}
      style={{ background: glow, opacity: fade }}
    />
  );
}

/* --------------------------------------------------------------- magnetic */

type MagneticProps = {
  children: ReactNode;
  /** How far the child travels per pixel of pointer offset. */
  strength?: number;
  /** The most the child may travel, in pixels. */
  pull?: number;
  className?: string;
};

/** A thin inline wrapper: the anchor keeps its own styles, this only moves it. */
export function Magnetic({ children, strength = 0.22, pull = 12, className = "" }: MagneticProps) {
  const reduced = useReducedMotion();
  const node = useRef<HTMLSpanElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const softX = useSpring(x, { stiffness: 260, damping: 17, mass: 0.4 });
  const softY = useSpring(y, { stiffness: 260, damping: 17, mass: 0.4 });

  const clamp = (v: number) => Math.max(-pull, Math.min(pull, v));

  const move = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const el = node.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    x.set(clamp((event.clientX - (box.left + box.width / 2)) * strength));
    y.set(clamp((event.clientY - (box.top + box.height / 2)) * strength));
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={node}
      className={`fx-magnet${className ? ` ${className}` : ""}`}
      style={reduced ? undefined : { x: softX, y: softY }}
      onPointerMove={reduced ? undefined : move}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </motion.span>
  );
}

/* ------------------------------------------------------------- reveal mask */

/**
 * Turns a scroll value into a top-down wipe: 100% of the sheet is hidden when
 * the progress is at `from`, none of it at `to`. Reversing the scroll closes
 * the mask again, which is what makes it feel pinned to the page.
 */
export function useScrollMask(
  target: RefObject<HTMLElement | null>,
  from = 0.02,
  to = 0.44
) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start end", "center center"],
  });
  const inset = useTransform(scrollYProgress, [from, to], [100, 0]);
  const clipPath = useMotionTemplate`inset(${inset}% 0 0 0)`;
  return reduced ? undefined : clipPath;
}

type RevealMaskProps = {
  children: ReactNode;
  className?: string;
  from?: number;
  to?: number;
};

/**
 * A block that masks its own contents as it scrolls in. It keeps the class of
 * the element it replaces, so grids and sheets do not move while it opens.
 */
export function RevealMask({ children, className, from, to }: RevealMaskProps) {
  const host = useRef<HTMLDivElement>(null);
  const clipPath = useScrollMask(host, from, to);

  return (
    <motion.div ref={host} className={className} style={{ clipPath }}>
      {children}
    </motion.div>
  );
}
