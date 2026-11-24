import { useEffect, useRef } from "react";
import { setHeroProgress } from "./heroProgress";
import "./perspectiveTunnelHero.css";

const slides = [
	{ title: "Where we met", src: "where-we-met" },
	{ title: "Paris, terracotta", src: "paris-terracotta" },
	{ title: "She said yes", src: "she-said-yes" },
	{ title: "Hometown roots", src: "hometown-roots" },
	{ title: "Wedding day", src: "wedding-day" },
	{ title: "New York, terracotta", src: "new-york-terracotta" },
	{ title: "Travel memories", src: "travel-memories" },
	{ title: "First home", src: "first-home" },
	{ title: "Paris, sandstone", src: "paris-sandstone" },
];

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

// Scroll timeline (0 = top of the hero, 1 = end of the pinned hero).
// Desktop: the posters hang as a stack on the right, open one by one into a circle like
// petals, the circle holds, then the heading lifts away while the circle moves to the middle.
// Phones: the stack hangs under the heading, the heading lifts away while the stack moves
// to the middle, then the petals open around it.
const TIMELINE = {
	desktop: { openStart: 0.06, openStep: 0.035, openLength: 0.15, moveStart: 0.58, moveEnd: 0.92 },
	mobile: { openStart: 0.26, openStep: 0.03, openLength: 0.12, moveStart: 0.04, moveEnd: 0.26 },
};

// Ring radius in poster widths. Desktop is wide enough that no two posters overlap;
// on phones the petals overlap a little at their inner ends, like real petals.
const RING_DESKTOP = 2.2;
const RING_MOBILE = 1.6;
const POSTER_RATIO = 734 / 520;
const MOBILE_TITLE_LIFT = 113.4; // 3 cm, matches the copy position in the stylesheet
const TILT_CLOSED = -32; // degrees the stacked posters lean back before they open

// Resting offsets of the stacked posters in pixels and degrees, so the pile looks hand placed.
const JITTER: [number, number, number][] = [
	[-6, -4, -4], [5, 3, 3], [-3, 6, -2], [4, -5, 5], [-5, 2, -5],
	[6, -2, 2], [-2, -6, -3], [3, 4, 4], [0, 0, -1],
];
// Petal angle per poster in degrees, clockwise from the top. Kept within -180..180 so an
// opening poster never spins the long way round.
const ANGLE = slides.map((_, index) => {
	const deg = index * (360 / slides.length);
	return deg > 180 ? deg - 360 : deg;
});

export default function PerspectiveTunnelHero() {
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const mobileQuery = window.matchMedia("(max-width: 767px)");
		const cardElements = Array.from(section.querySelectorAll<HTMLElement>(".maparte-tunnel__card"));
		const stage = section.querySelector<HTMLElement>(".maparte-tunnel__stage");
		const title = section.querySelector<HTMLElement>(".maparte-tunnel__title");
		const prompt = section.querySelector<HTMLElement>(".maparte-tunnel__prompt");

		// Layout numbers are measured on resize only, never on every scroll frame.
		const geo = {
			span: 1,
			mobile: false,
			baseW: 1,
			fit: 1,
			cardW: 1,
			ring: 1,
			travel: 1,
			fromX: 0,
			fromY: 0,
		};
		// Last value written to each element, so unchanged styles are not written again.
		const written = new Map<HTMLElement, Record<string, string>>();
		let pointerX = 0;
		let frame = 0;

		const setStyle = (element: HTMLElement, key: "transform" | "opacity", value: string) => {
			let memo = written.get(element);
			if (!memo) {
				memo = {};
				written.set(element, memo);
			}
			if (memo[key] === value) return;
			memo[key] = value;
			element.style[key] = value;
		};

		const refresh = () => {
			geo.mobile = mobileQuery.matches;
			const stageW = section.clientWidth;
			const stageH = stage ? stage.clientHeight : window.innerHeight;
			geo.span = Math.max(1, section.offsetHeight - window.innerHeight);
			geo.baseW = cardElements[0]?.offsetWidth || 1;
			const titleH = title ? title.offsetHeight : 0;
			// Bottom edge of the heading block when it sits in its resting place.
			const titleBottom = stageH / 2 + titleH / 2 - (geo.mobile ? MOBILE_TITLE_LIFT : 0);
			geo.travel = titleBottom + 40;

			let regionW: number;
			let regionH: number;
			let ring: number;
			if (geo.mobile) {
				// The flower opens in the middle of the screen, so it may use the whole width.
				regionW = stageW - 20;
				regionH = stageH - 40;
				ring = RING_MOBILE;
				// The stack rests in the space under the heading.
				const stackTop = titleBottom + 16;
				const stackBottom = stageH - 40;
				geo.fromX = 0;
				geo.fromY = (stackTop + stackBottom) / 2 - stageH / 2;
			} else {
				const left = stageW * 0.47;
				const right = stageW - 36;
				const top = 84;
				const bottom = stageH - 24;
				regionW = right - left;
				regionH = bottom - top;
				ring = RING_DESKTOP;
				geo.fromX = (left + right) / 2 - stageW / 2;
				geo.fromY = (top + bottom) / 2 - stageH / 2;
			}
			const diameter = 2 * Math.hypot(0.5, ring + POSTER_RATIO / 2);
			geo.fit = clamp(Math.min(regionW, regionH) / (diameter * geo.baseW), 0.35, 1);
			geo.cardW = geo.baseW * geo.fit;
			geo.ring = ring * geo.cardW;

			if (reduceMotion.matches) {
				// Reduced motion uses the static stylesheet layout; clear anything written earlier.
				cardElements.forEach((element) => { element.style.transform = ""; element.style.opacity = ""; });
				if (title) { title.style.transform = ""; title.style.opacity = ""; }
				if (prompt) prompt.style.opacity = "";
				written.clear();
			}
		};

		const render = () => {
			frame = 0;
			if (reduceMotion.matches) {
				setHeroProgress(0);
				return;
			}
			// One read per frame, before any style is written in this frame.
			const top = section.getBoundingClientRect().top;
			const progress = clamp(-top / geo.span);
			setHeroProgress(progress);

			const timing = geo.mobile ? TIMELINE.mobile : TIMELINE.desktop;
			const move = smooth(clamp((progress - timing.moveStart) / (timing.moveEnd - timing.moveStart)));
			// On desktop the flower drifts slightly with the mouse while it is on the right.
			const panX = geo.mobile ? 0 : pointerX * 12;
			const groupX = (geo.fromX + panX) * (1 - move);
			const groupY = geo.fromY * (1 - move);

			cardElements.forEach((element, index) => {
				const [jitterX, jitterY, jitterDeg] = JITTER[index];
				const local = clamp((progress - (timing.openStart + index * timing.openStep)) / timing.openLength);
				const open = easeOutCubic(local);
				const theta = (ANGLE[index] * Math.PI) / 180;
				const x = groupX + (1 - open) * jitterX + open * geo.ring * Math.sin(theta);
				const y = groupY + (1 - open) * jitterY - open * geo.ring * Math.cos(theta);
				const rotateZ = (1 - open) * jitterDeg + open * ANGLE[index];
				const rotateX = (1 - open) * TILT_CLOSED;
				const scale = geo.fit * (0.94 + 0.06 * open);
				setStyle(
					element,
					"transform",
					`translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
				);
				setStyle(element, "opacity", "1");
			});

			if (title) {
				const lift = move * geo.travel;
				setStyle(
					title,
					"transform",
					geo.mobile
						? `translate(-50%, calc(-50% - 3cm - ${lift.toFixed(1)}px))`
						: `translateY(calc(-50% - ${lift.toFixed(1)}px))`,
				);
				setStyle(title, "opacity", (1 - move).toFixed(3));
			}
			if (prompt) setStyle(prompt, "opacity", clamp(1 - Math.max(0, -top) / 90).toFixed(3));
		};

		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(render);
		};
		const refreshAndRender = () => {
			refresh();
			schedule();
		};
		const onPointerMove = (event: PointerEvent) => {
			if (event.pointerType !== "mouse" || reduceMotion.matches) return;
			pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
			schedule();
		};

		const resizeObserver = new ResizeObserver(refreshAndRender);
		resizeObserver.observe(section);
		if (title) resizeObserver.observe(title);
		refreshAndRender();
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", refreshAndRender);
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		reduceMotion.addEventListener("change", refreshAndRender);
		return () => {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", refreshAndRender);
			window.removeEventListener("pointermove", onPointerMove);
			reduceMotion.removeEventListener("change", refreshAndRender);
			setHeroProgress(0);
		};
	}, []);

	return (
		<section id="top" ref={sectionRef} className="maparte-tunnel" aria-labelledby="maparte-tunnel-title">
			<div className="maparte-tunnel__stage">
				<div className="maparte-tunnel__grid" aria-hidden="true" />
				<div className="maparte-tunnel__cards" aria-hidden="true">
					{slides.map((card) => (
						<figure className="maparte-tunnel__card" key={card.src}>
							<img className="maparte-tunnel__poster" src={`/assets/landing-posters/${card.src}.webp`} alt="" width={520} height={734} decoding="async" draggable={false} />
						</figure>
					))}
				</div>
				<div className="maparte-tunnel__title">
					<p className="maparte-tunnel__eyebrow">INTO THE EARTH · A PLACE IS A BEGINNING</p>
					<h2 id="maparte-tunnel-title"><span className="maparte-tunnel__heading-into">INTO THE</span><span className="maparte-tunnel__heading-earth">EARTH.</span></h2>
					<p className="maparte-tunnel__lead">The world is wide. Your place is here.</p>
					<p className="maparte-tunnel__body">Turn a hometown, a shared moment, a journey or a finish line into digital map art. Design it in your browser, download the file and print it yourself if you like. MAPARTE does not print or ship posters.</p>
					<p className="maparte-tunnel__facts"><span>800 CITY ENTRIES · SEARCH PLACES OR COORDINATES</span><span>DIGITAL DOWNLOAD · NO PRINTING OR SHIPPING</span></p>
					<div className="maparte-tunnel__actions">
						<a className="maparte-tunnel__cta" href="/?dist=5235000">Start with a place <span aria-hidden="true">↗</span></a>
						<a className="maparte-tunnel__gallery" href="/?gallery=maps">Explore the map gallery</a>
					</div>
				</div>
				<div className="maparte-tunnel__prompt" aria-hidden="true">SCROLL TO FIND YOUR PLACE <span>↓</span></div>
			</div>
		</section>
	);
}
