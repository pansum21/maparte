import { useEffect, useRef, type RefObject } from "react";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Maps a scroll position into 0..1 between start and end offsets. */
export const ramp = (p: number, start: number, end: number) =>
  clamp01((p - start) / Math.max(0.0001, end - start));

type Apply<T> = (progress: number, el: T) => void;

/**
 * Calls `apply` with the element's scroll progress (0 at the top of the section,
 * 1 when its bottom reaches the viewport bottom). Pinned sections use tall heights
 * so the sticky child stays locked while it plays.
 *
 * Updates run on every animation frame while the tab is visible, and also on
 * scroll/resize so the scene stays honest when frames are throttled.
 */
export function useScrollScene<T extends HTMLElement>(
  ref: RefObject<T>,
  apply: Apply<T>
) {
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyRef.current(1, el);
      return;
    }

    let raf = 0;
    let last = -2;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Tall sections are pinned: progress runs from their top to their bottom.
      // Short ones travel through the viewport: progress runs from entering to leaving.
      const p =
        rect.height > vh + 4
          ? clamp01(-rect.top / (rect.height - vh))
          : clamp01((vh - rect.top) / (vh + rect.height));
      if (Math.abs(p - last) <= 0.0004) return;
      last = p;
      applyRef.current(p, el);
    };

    const tick = () => {
      update();
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => update();
    const onResize = () => {
      last = -2;
      update();
    };

    update();
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [ref]);
}
