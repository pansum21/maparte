import { useEffect, useRef } from "react";

export interface MapStoryCoverflowItem {
  title: string;
  place: string;
  image: string;
  href: string;
}

export function MapStoryCoverflow({ items }: { items: MapStoryCoverflowItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !items.length) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = root.closest<HTMLElement>(".journey-chapter");
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const travel = Math.max(1, rect.height - window.innerHeight * 0.12);
        const progress = Math.max(0, Math.min(1, (window.innerHeight * 0.88 - rect.top) / travel));
        const active = progress * Math.max(0, items.length - 1);

        cardsRef.current.forEach((card, index) => {
          if (!card) return;
          const offset = index - active;
          const distance = Math.abs(offset);
          const x = offset * Math.min(154, Math.max(100, root.clientWidth * 0.34));
          const z = -Math.min(190, distance * 112);
          const rotate = reducedMotion ? 0 : -offset * 22;
          const scale = Math.max(0.76, 1 - distance * 0.14);
          const opacity = Math.max(0, 1 - Math.max(0, distance - 0.72) * 0.72);
          card.style.transform = `translate3d(calc(-50% + ${x}px), -50%, ${z}px) rotateY(${rotate}deg) scale(${scale})`;
          card.style.opacity = String(opacity);
          card.style.zIndex = String(100 - Math.round(distance * 10));
          card.style.pointerEvents = distance < 0.68 ? "auto" : "none";
          card.setAttribute("aria-current", distance < 0.5 ? "true" : "false");
        });
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  return (
    <div className="journey-coverflow" id="map-stories" ref={rootRef} aria-label="Scroll through MAPARTE city map examples">
      <div className="journey-coverflow__stage">
        {items.map((item, index) => (
          <a
            className="journey-coverflow__card"
            href={item.href}
            key={item.title}
            ref={(node) => { cardsRef.current[index] = node; }}
            aria-current="false"
            aria-label={`${item.title}, ${item.place}`}
          >
            <img src={`/assets/map-posters/${item.image}`} alt={`${item.title} map artwork for ${item.place}`} loading="lazy" />
            <div className="journey-coverflow__caption">
              <span>{item.place}</span>
              <strong>{item.title}</strong>
            </div>
          </a>
        ))}
      </div>
      <div className="journey-coverflow__hint"><i />SCROLL TO FOLLOW THE CITY</div>
    </div>
  );
}
