import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import "./motionStudy.css";

const palettes = [
  ["#e8e2d5", "#212d34", "#a68b62"], ["#17212d", "#d8c18e", "#748ba0"],
  ["#e9e3d8", "#53473d", "#b6804c"], ["#25342e", "#e5d2aa", "#6c9a7b"],
  ["#efe8db", "#394552", "#9e6d62"], ["#1c2835", "#d9c9a8", "#627e93"],
  ["#e7e1d7", "#4b403b", "#8c9d87"], ["#302b35", "#e7d8bd", "#b48177"],
  ["#ece5d9", "#3b4a48", "#b58d5c"], ["#202c39", "#e8d8b4", "#8292a2"],
] as const;

const cards = Array.from({ length: 10 }, (_, index) => ({ index, label: `MAP STUDY / ${String(index + 1).padStart(2, "0")}` }));
const repeatCards = [...cards, ...cards];

function MapArtwork({ index }: { index: number }) {
  const [paper, ink, accent] = palettes[index % palettes.length];
  const shift = index * 13;
  const roads = Array.from({ length: 12 }, (_, road) => {
    const x = (road * 23 + shift * 3) % 260 - 10;
    const y = (road * 37 + shift * 2) % 340 - 10;
    const bend = 26 + ((road * 17 + index * 7) % 54);
    return `M ${x} -20 C ${x + bend} ${y + 45}, ${x - bend} ${y + 125}, ${x + 35} 340`;
  });
  return (
    <svg className="motion-art" viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Generated map artwork study ${index + 1}`}>
      <rect width="240" height="320" fill={paper} />
      <path d={`M 0 ${75 + index * 7} C 70 ${25 + index * 5}, 144 ${155 - index * 4}, 240 ${85 + index * 6} L 240 142 C 155 ${197 - index * 3}, 90 ${72 + index * 6}, 0 138 Z`} fill={accent} opacity=".32" />
      <g fill="none" stroke={ink} strokeLinecap="round" opacity=".75">
        {roads.map((d, road) => <path key={road} d={d} strokeWidth={road % 4 === 0 ? 1.6 : .7} opacity={road % 3 === 0 ? .8 : .48} />)}
        {Array.from({ length: 8 }, (_, line) => <path key={`h${line}`} d={`M -10 ${line * 43 + (index % 3) * 9} C 65 ${line * 38 + 20}, 150 ${line * 52 - 10}, 250 ${line * 40 + 12}`} strokeWidth=".6" opacity=".45" />)}
      </g>
      <path d={`M 38 ${255 - index * 3} C 74 ${220 + index * 2}, 112 ${246 - index * 4}, 176 ${178 + index * 5}`} fill="none" stroke={accent} strokeWidth="2" strokeDasharray="3 4" />
      <circle cx={38 + index * 15} cy={255 - index * 6} r="3.5" fill={accent} />
      <circle cx={176 - index * 8} cy={178 + index * 4} r="3.5" fill={accent} />
      <rect x="12" y="12" width="216" height="296" fill="none" stroke={ink} opacity=".22" />
      <text x="19" y="287" fill={ink} fontSize="7" letterSpacing="1.8" fontFamily="monospace">MAPARTE · STUDY {String(index + 1).padStart(2, "0")}</text>
    </svg>
  );
}

function ArtCard({ index, className = "", onOpen }: { index: number; className?: string; onOpen: (index: number) => void }) {
  return <button type="button" className={`motion-card ${className}`} onClick={(event) => { event.stopPropagation(); onOpen(index); }} aria-label={`Open ${cards[index].label}`}><MapArtwork index={index} /><span>{cards[index].label}</span></button>;
}

function SectionHeading({ number, title, subtitle, collection }: { number: string; title: string; subtitle: string; collection: string }) {
  return <div className="motion-section__heading"><span>{number} / {collection}</span><h2>{title}</h2><p>{subtitle}</p></div>;
}

function AutoCarousel({ onOpen }: { onOpen: (index: number) => void }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setActive((value) => (value + 1) % cards.length), 2000);
    return () => window.clearInterval(timer.current);
  }, [paused]);
  const move = (direction: number) => setActive((value) => (value + direction + cards.length) % cards.length);
  const onPointerDown = (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== "mouse") setPaused(true); };
  return (
    <div className="motion-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onPointerDown={onPointerDown} onPointerUp={() => setPaused(false)}>
      <div className="motion-carousel__stage">
        {[-1, 0, 1].map((offset) => {
          const index = (active + offset + cards.length) % cards.length;
          return <div key={offset} className={`motion-carousel__slide is-${offset === 0 ? "active" : offset < 0 ? "left" : "right"}`}><ArtCard index={index} onOpen={onOpen} /></div>;
        })}
      </div>
      <div className="motion-controls"><button onClick={() => move(-1)} aria-label="Previous map">←</button><span>{String(active + 1).padStart(2, "0")} <i>/</i> 10</span><button onClick={() => move(1)} aria-label="Next map">→</button><span className="motion-controls__state">{paused ? "PAUSED" : "AUTO · PAUSES ON HOVER"}</span></div>
    </div>
  );
}

function ScrollRail({ onOpen }: { onOpen: (index: number) => void }) {
  const section = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = section.current;
        if (!node) return;
        const range = Math.max(1, node.offsetHeight - window.innerHeight);
        setProgress(Math.max(0, Math.min(1, -node.getBoundingClientRect().top / range)));
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return <section ref={section} className="motion-section motion-section--scroll" id="scroll-rail" style={{ "--rail-progress": progress } as CSSProperties}>
    <div className="motion-sticky"><SectionHeading number="04" collection="OPTIONAL · LAYOUT STUDY" title="Scroll-linked gallery" subtitle="An optional layout idea: the row follows page scroll instead of auto-running. Tap a map to bring it forward." /><div className="motion-rail__window"><div className="motion-rail__track" style={{ transform: `translate3d(-${progress * (window.innerWidth <= 700 ? 82 : 61)}%,0,0)` }}>{cards.map(({ index }) => <ArtCard key={index} index={index} onOpen={onOpen} />)}</div></div><div className="motion-rail__caption"><span>PAGE SCROLL</span><span>{Math.round(progress * 100)}%</span></div></div>
  </section>;
}

function Coverflow({ onOpen }: { onOpen: (index: number) => void }) {
  const [active, setActive] = useState(4);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % cards.length), 2000);
    return () => window.clearInterval(timer);
  }, [paused]);
  return <div className="motion-coverflow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div className="motion-coverflow__stage">{cards.map(({ index }) => {
      let offset = index - active;
      if (offset > cards.length / 2) offset -= cards.length;
      if (offset < -cards.length / 2) offset += cards.length;
      const spread = Math.min(Math.abs(offset), 4);
      const slideStyle: CSSProperties = { transform: `translateX(${offset * 58}%) rotateY(${offset * -18}deg) scale(${1 - spread * .105})`, zIndex: 10 - spread, opacity: 1 - spread * .19 };
      return <div key={index} className="motion-coverflow__slide" style={slideStyle}><ArtCard index={index} onOpen={(selected) => { setActive(selected); onOpen(selected); }} /></div>;
    })}</div>
    <div className="motion-controls"><button onClick={() => setActive((value) => (value - 1 + cards.length) % cards.length)} aria-label="Previous map">←</button><span>3D COVERFLOW <i>·</i> {paused ? "PAUSED" : "AUTO"}</span><button onClick={() => setActive((value) => (value + 1) % cards.length)} aria-label="Next map">→</button></div>
  </div>;
}

export default function MotionStudy() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openArtwork = (index: number) => setOpenIndex(index);
  const closeArtwork = () => setOpenIndex(null);
  useEffect(() => {
    document.title = "Gallery motion studies — MAPARTE";
    return () => { document.title = "MAPARTE | Create Digital Map Art & Phone Wallpapers"; };
  }, []);
  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeArtwork(); };
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [openIndex]);
  return <main className="motion-study">
    <header className="motion-study__top"><a href="/" className="motion-study__logo">MAPARTE <small>DESIGN LAB</small></a><a className="motion-study__exit" href="/">Exit study ↗</a></header>
    <section className="motion-study__hero"><span>GALLERY MOTION / PRIVATE STUDY</span><h1>Let the maps<br /><em>find their rhythm.</em></h1><p>Five ways to move a large collection. These are generated map-art sketches, made to compare motion—not final gallery artwork.</p><nav>{[["double-flow", "01 Map gallery"], ["drift", "02 Theme drift"], ["carousel", "03 Borders"], ["coverflow", "04 Theme orbit"], ["scroll-rail", "05 Scroll idea"]].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav></section>
    <section className="motion-section" id="double-flow"><SectionHeading number="01" collection="MAP GALLERY" title="Two opposite flows" subtitle="For the map gallery: portrait and landscape maps travel in opposite directions. Tap any map to bring it into the main frame." /><div className="motion-double"><div className="motion-marquee" tabIndex={0}><div className="motion-marquee__track">{repeatCards.map(({ index }, i) => <ArtCard key={i} index={index} onOpen={openArtwork} />)}</div></div><div className="motion-marquee motion-marquee--reverse motion-marquee--landscape" tabIndex={0}><div className="motion-marquee__track">{repeatCards.map(({ index }, i) => <ArtCard key={i} index={(index + 5) % 10} onOpen={openArtwork} />)}</div></div></div></section>
    <section className="motion-section" id="drift"><SectionHeading number="02" collection="THEME GALLERY" title="Slow drift" subtitle="For themes: one relaxed, continuous row. Hover to pause; tap a map to see it full size." /><div className="motion-marquee" tabIndex={0}><div className="motion-marquee__track">{repeatCards.map(({ index }, i) => <ArtCard key={i} index={index} onOpen={openArtwork} />)}</div></div></section>
    <section className="motion-section" id="carousel"><SectionHeading number="03" collection="BORDER GALLERY" title="Featured carousel" subtitle="One border leads while the next frames wait behind it. It changes every two seconds; hover or focus to pause. Tap to enlarge." /><AutoCarousel onOpen={openArtwork} /></section>
    <section className="motion-section motion-section--cover" id="coverflow"><SectionHeading number="04" collection="THEME GALLERY · 3D OPTION" title="Orbiting covers" subtitle="A shallow 3D fan gives one theme the front seat. It advances every two seconds; hover pauses it. Tap the main frame to enlarge." /><Coverflow onOpen={openArtwork} /></section>
    <ScrollRail onOpen={openArtwork} />
    <footer className="motion-study__footer"><span>MAPARTE / MOTION STUDIES</span><a href="/">Back to the journey ↑</a></footer>
    {openIndex !== null && <div className="motion-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeArtwork(); }}><section className="motion-lightbox__panel" role="dialog" aria-modal="true" aria-label={`Map artwork ${openIndex + 1}`}><button className="motion-lightbox__back" onClick={closeArtwork} autoFocus>← Back to gallery</button><div className="motion-lightbox__art"><MapArtwork index={openIndex} /></div><div className="motion-lightbox__caption"><span>{cards[openIndex].label}</span><span>MAPARTE / PREVIEW ARTWORK</span></div></section></div>}
  </main>;
}

