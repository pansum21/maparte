/**
 * Scroll choreography for the galleries. Each gallery has its own move so the
 * page never repeats the same left-to-right travel:
 *
 *   01 map      shelf      one strip travelling sideways
 *   04 themes   coverflow  cards turn and recede in depth, centre card faces you
 *   05 layouts  columns    three vertical strips drifting at different speeds
 *   06 borders  fan        cards splay along an arc like a dealt hand
 *
 * Every move is a pure function of scroll progress, so scrubbing backwards
 * plays it in reverse. Below 900 px, or with reduced motion, the inline styles
 * are cleared and the galleries fall back to native horizontal scrolling.
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const animate = () =>
  window.innerWidth > 900 &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clear = (el: HTMLElement) => {
  el.style.transform = "";
  el.style.opacity = "";
  el.style.zIndex = "";
};

const cardsIn = (viewport: HTMLElement) =>
  Array.from(viewport.querySelectorAll<HTMLElement>(".card"));

/**
 * Distance past the knee shrinks, so the cards further out never land on the
 * exact same pixel. A hard clamp stacked three plates on one another and read
 * as a glitch; this keeps them as a thinning edge of the deck instead.
 */
const soft = (o: number, knee = 2.6, tail = 0.14) => {
  const a = Math.abs(o);
  if (a <= knee) return o;
  return Math.sign(o) * (knee + (a - knee) * tail);
};

/* ------------------------------------------------ 01 · the travelling shelf */

export function setRail(
  track: HTMLElement | null,
  viewport: HTMLElement | null,
  p: number,
  dir: 1 | -1 = 1
) {
  if (!track || !viewport) return;
  if (!animate()) {
    track.style.transform = "";
    return;
  }
  const travel = Math.max(0, track.scrollWidth - viewport.clientWidth + 80);
  const offset = dir > 0 ? -p * travel : -(1 - p) * travel;
  track.style.transform = `translate3d(${offset.toFixed(1)}px,0,0)`;
}

/* ----------------------------------------------------- 04 · the coverflow */

export function setCoverflow(viewport: HTMLElement | null, p: number) {
  if (!viewport) return;
  const cards = cardsIn(viewport);
  if (!animate()) {
    cards.forEach(clear);
    return;
  }

  // step follows the stage width, capped so the last plate stays on screen:
  // the deck spreads out on a wide monitor instead of stacking in the middle
  const step = Math.min(200, Math.max(104, (viewport.clientWidth / 2 - 96) / 3.04));
  const pos = p * Math.max(1, cards.length - 1);
  cards.forEach((card, i) => {
    const o = soft(i - pos);
    const abs = Math.abs(o);
    const x = o * step;
    const z = -abs * 226;
    const ry = -o * 20;
    const scale = 1 - abs * 0.022;

    card.style.transform =
      `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) ` +
      `rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    card.style.opacity = clamp(1 - abs * 0.24, 0.16, 1).toFixed(3);
    card.style.zIndex = String(200 - Math.round(abs * 10));
  });
}

/* ------------------------------------------------------- 05 · the columns */

const COL_RATES = [0.82, 1.16, 0.94];
const COL_START = [44, 96, 64];

export function setColumns(viewport: HTMLElement | null, p: number) {
  if (!viewport) return;
  const cols = Array.from(viewport.querySelectorAll<HTMLElement>(".gal__col"));
  if (!animate()) {
    cols.forEach(clear);
    return;
  }

  const stage = viewport.clientHeight;

  cols.forEach((col, j) => {
    const start = COL_START[j % COL_START.length];
    const last = col.lastElementChild as HTMLElement | null;
    if (!last) return;

    // the column is stretched to the stage height, so its real content is the
    // distance from its own top to the bottom of the last plate
    const content = last.getBoundingClientRect().bottom - col.getBoundingClientRect().top;
    const overflow = content - stage;
    const eased = Math.pow(p, COL_RATES[j % COL_RATES.length]);

    const y =
      overflow > 24
        ? // taller than the stage: travel past the top edge and finish inset
          start - eased * (overflow + 48 + start)
        : // shorter than the stage: the block starts low and rises into place
          start + Math.max(0, -overflow) * 0.42 * (1 - eased);

    col.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  });
}

/* ----------------------------------------------------- 05 · the staircase */

/** Plates step down to the right, so the paper sizes read as a flight of steps. */
export function setStaircase(viewport: HTMLElement | null, p: number) {
  if (!viewport) return;
  const cards = cardsIn(viewport);
  if (!animate()) {
    cards.forEach(clear);
    return;
  }

    const widest = cards.reduce((w, c) => Math.max(w, c.offsetWidth), 0) || 200;
  // one step clears the widest plate, capped so the last step still lands on screen
  const stepX = Math.max(
    120,
    Math.min(widest + 16, (viewport.clientWidth / 2 - widest / 2 - 10) / 2.4)
  );
  // the tallest plate sets the drop, or the big one falls off the stage
  const cardH = cards.reduce((tall, c) => Math.max(tall, c.offsetHeight), 0) || 340;
  const room = Math.max(0, viewport.clientHeight / 2 - cardH / 2 - 14);
  const stepY = Math.max(0, Math.min(58, room / 2.4));

  const pos = p * Math.max(1, cards.length - 1);
  cards.forEach((card, i) => {
    const o = soft(i - pos, 2.2, 0.2);
    const abs = Math.abs(o);

    card.style.transform =
      `translate(-50%, -50%) translate3d(${(o * stepX).toFixed(1)}px, ${(o * stepY).toFixed(
        1
      )}px, 0) rotate(${(o * 1.7).toFixed(2)}deg) scale(${(1 - abs * 0.045).toFixed(3)})`;
    card.style.opacity = clamp(1 - abs * 0.2, 0.2, 1).toFixed(3);
    card.style.zIndex = String(200 - Math.round(abs * 10));
  });
}

/* ----------------------------------------------------------- 06 · the fan */

export function setFan(viewport: HTMLElement | null, p: number) {
  if (!viewport) return;
  const cards = cardsIn(viewport);
  if (!animate()) {
    cards.forEach(clear);
    return;
  }

  const reach = Math.min(680, Math.max(380, viewport.clientWidth * 0.48));
  // the hand sags upward at the ends, and the stage is only as tall as what is
  // left under the heading: on a short screen that sag would push the outer
  // plates out of the frame, so it scales with the spare room instead
  const cardH = cards[0]?.offsetHeight || 320;
  const room = Math.max(0, viewport.clientHeight / 2 - cardH * 0.6 - 8);
  const sag = Math.max(0, Math.min(14, room / 8.8));

  const pos = p * Math.max(1, cards.length - 1);
  cards.forEach((card, i) => {
    const o = soft(i - pos, 2.4, 0.22);
    const abs = Math.abs(o);
    // a wide enough step that the plate in front never covers its neighbour's
    // caption, but still shallow enough to read as one dealt hand
    const a = (o * 15 * Math.PI) / 180;
    const x = Math.sin(a) * reach;
    const y = -(o * o) * sag;
    const rot = Math.sin(a) * 26;
    const scale = 1 - abs * 0.045;

    card.style.transform =
      `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ` +
      `rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    card.style.opacity = clamp(1 - abs * 0.2, 0.2, 1).toFixed(3);
    card.style.zIndex = String(200 - Math.round(abs * 10));
  });
}
