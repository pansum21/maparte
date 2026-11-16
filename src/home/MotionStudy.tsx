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
    <svg className="motion-art" viewBox="0 0 240 320" role="img" aria-label={`Generated map artwork study ${index + 1}`}>
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

function ArtCard({ index, className = "" }: { index: number; className?: string }) {
  return <article className={`motion-card ${className}`}><MapArtwork index={index} /><span>{cards[index].label}</span></article>;
}

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <div className="motion-section__heading"><span>{number} / MOTION STUDY</span><h2>{title}</h2><p>{subtitle}</p></div>;
}

function AutoCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setActive((value) => (value + 1) % cards.length), 3600);
    return () => window.clearInterval(timer.current);
  }, [paused]);
  const move = (direction: number) => setActive((value) => (value + direction + cards.length) % cards.length);
  const onPointerDown = (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== "mouse") setPaused(true); };
  return (
    <div className="motion-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onPointerDown={onPointerDown} onPointerUp={() => setPaused(false)}>
      <div className="motion-carousel__stage">
        {[-1, 0, 1].map((offset) => {
          const index = (active + offset + cards.length) % cards.length;
          return <button key={offset} className={`motion-carousel__slide is-${offset === 0 ? "active" : offset < 0 ? "left" : "right"}`} onClick={() => offset && move(offset)} aria-label={`Show map study ${index + 1}`}><ArtCard index={index} /></button>;
        })}
      </div>
      <div className="motion-controls"><button onClick={() => move(-1)} aria-label="Previous map">←</button><span>{String(active + 1).padStart(2, "0")} <i>/</i> 10</span><button onClick={() => move(1)} aria-label="Next map">→</button><span className="motion-controls__state">{paused ? "PAUSED" : "AUTO · PAUSES ON HOVER"}</span></div>
    </div>
  );
}

function ScrollRail() {
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
    <div className="motion-sticky"><SectionHeading number="04" title="Scroll-linked gallery" subtitle="The strip follows your page scroll; it does not run by itself." /><div className="motion-rail__window"><div className="motion-rail__track" style={{ transform: `translate3d(-${progress * (window.innerWidth <= 700 ? 82 : 61)}%,0,0)` }}>{cards.map(({ index }) => <ArtCard key={index} index={index} />)}</div></div><div className="motion-rail__caption"><span>PAGE SCROLL</span><span>{Math.round(progress * 100)}%</span></div></div>
  </section>;
}

function Coverflow() {
  const [active, setActive] = useState(4);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % cards.length), 4200);
    return () => window.clearInterval(timer);
  }, [paused]);
  return <div className="motion-coverflow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div className="motion-coverflow__stage">{cards.map(({ index }) => {
      let offset = index - active;
      if (offset > cards.length / 2) offset -= cards.length;
      if (offset < -cards.length / 2) offset += cards.length;
      const spread = Math.min(Math.abs(offset), 4);
      const slideStyle: CSSProperties = { transform: `translateX(${offset * 58}%) rotateY(${offset * -18}deg) scale(${1 - spread * .105})`, zIndex: 10 - spread, opacity: 1 - spread * .19 };
      return <button key={index} className="motion-coverflow__slide" style={slideStyle} onClick={() => setActive(index)} aria-label={`Focus map study ${index + 1}`}><ArtCard index={index} /></button>;
    })}</div>
    <div className="motion-controls"><button onClick={() => setActive((value) => (value - 1 + cards.length) % cards.length)} aria-label="Previous map">←</button><span>3D COVERFLOW <i>·</i> {paused ? "PAUSED" : "AUTO"}</span><button onClick={() => setActive((value) => (value + 1) % cards.length)} aria-label="Next map">→</button></div>
  </div>;
}

export default function MotionStudy() {
  useEffect(() => {
    document.title = "Gallery motion studies — MAPARTE";
    return () => { document.title = "MAPARTE | Create Digital Map Art & Phone Wallpapers"; };
  }, []);
  return <main className="motion-study">
    <header className="motion-study__top"><a href="/" className="motion-study__logo">MAPARTE <small>DESIGN LAB</small></a><a className="motion-study__exit" href="/">Exit study ↗</a></header>
    <section className="motion-study__hero"><span>GALLERY MOTION / PRIVATE STUDY</span><h1>Let the maps<br /><em>find their rhythm.</em></h1><p>Five ways to move a large collection. These are generated map-art sketches, made to compare motion—not final gallery artwork.</p><nav>{[["drift", "01 Drift"], ["double-flow", "02 Two flows"], ["carousel", "03 Carousel"], ["scroll-rail", "04 Scroll"], ["coverflow", "05 Coverflow"]].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav></section>
    <section className="motion-section" id="drift"><SectionHeading number="01" title="Slow drift" subtitle="Ten map studies pass in one calm, continuous ribbon. Hover or focus it to pause." /><div className="motion-marquee" tabIndex={0}><div className="motion-marquee__track">{repeatCards.map(({ index }, i) => <ArtCard key={i} index={index} />)}</div></div></section>
    <section className="motion-section" id="double-flow"><SectionHeading number="02" title="Two opposite flows" subtitle="Portrait and landscape rows travel in opposite directions. Hover either row to stop that row." /><div className="motion-double"><div className="motion-marquee" tabIndex={0}><div className="motion-marquee__track">{repeatCards.map(({ index }, i) => <ArtCard key={i} index={index} />)}</div></div><div className="motion-marquee motion-marquee--reverse" tabIndex={0}><div className="motion-marquee__track">{repeatCards.map(({ index }, i) => <ArtCard key={i} index={(index + 5) % 10} />)}</div></div></div></section>
    <section className="motion-section" id="carousel"><SectionHeading number="03" title="Featured carousel" subtitle="One map leads, the next ones peek in. It advances by itself; hover, focus, swipe or arrows pause and take control." /><AutoCarousel /></section>
    <ScrollRail />
    <section className="motion-section motion-section--cover" id="coverflow"><SectionHeading number="05" title="Orbiting covers" subtitle="A shallow 3D fan gives the selected map the front seat. Hover pauses it; tap a map or use arrows to focus it." /><Coverflow /></section>
    <footer className="motion-study__footer"><span>MAPARTE / MOTION STUDIES</span><a href="/">Back to the journey ↑</a></footer>
  </main>;
}

