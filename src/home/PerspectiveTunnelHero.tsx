import { useEffect, useRef } from "react";
import "./perspectiveTunnelHero.css";

const slides = [
	{ title: "Where we met", src: "where-we-met", offset: 0.5 },
	{ title: "Paris, terracotta", src: "paris-terracotta", offset: 0.22 },
	{ title: "She said yes", src: "she-said-yes", offset: 0.38 },
	{ title: "Hometown roots", src: "hometown-roots", offset: 0.12 },
	{ title: "Wedding day", src: "wedding-day", offset: 0.64 },
	{ title: "New York, terracotta", src: "new-york-terracotta", offset: 0.3 },
	{ title: "Travel memories", src: "travel-memories", offset: 0.08 },
	{ title: "First home", src: "first-home", offset: 0.56 },
	{ title: "Paris, sandstone", src: "paris-sandstone", offset: 0.44 },
];

const cards = slides.map((item, index) => ({
	...item,
	index,
	rotation: (index % 2 === 0 ? 1 : -1) * (2 + (index % 5) * 1.6),
}));

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

// Scroll timeline (0 = top of the hero, 1 = end of the pinned hero):
//   0.00 - 0.46  every poster flies in and settles fully inside the screen
//   0.46 - 0.56  hold: all posters in front, heading still in place
//   0.56 - 0.92  heading block scrolls up and away, posters stay fully visible
//   0.92 - 1.00  hold on the finished poster wall before the page moves on
const ARRIVE_END = 0.46;
const LEAVE_START = 0.56;
const LEAVE_END = 0.92;
// Which grid cell (3 columns x 3 rows, read left to right) each poster settles into.
const CELL = [4, 1, 6, 2, 8, 0, 5, 7, 3];
// Small fixed nudges so the settled posters look like a scattered pile, not a strict grid.
const NUDGE = [
	[0.04, -0.06], [-0.05, 0.05], [0.06, 0.03], [-0.03, -0.05], [0.02, 0.06],
	[-0.06, 0.02], [0.05, -0.03], [-0.02, 0.04], [0.03, -0.02],
];

export default function PerspectiveTunnelHero() {
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const cardElements = Array.from(section.querySelectorAll<HTMLElement>(".maparte-tunnel__card"));
		const stage = section.querySelector<HTMLElement>(".maparte-tunnel__stage");
		const title = section.querySelector<HTMLElement>(".maparte-tunnel__title");
		const prompt = section.querySelector<HTMLElement>(".maparte-tunnel__prompt");
		let frame = 0;
		let pointerX = 0;
		let pointerY = 0;

		const render = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const bounds = section.getBoundingClientRect();
				const scrollSpan = Math.max(1, section.offsetHeight - window.innerHeight);
				const progress = reduceMotion.matches ? 0 : clamp(-bounds.top / scrollSpan);
				section.style.setProperty("--tunnel-progress", String(progress));

				const mobileView = window.innerWidth < 768;
				const stageW = section.clientWidth;
				const stageH = stage ? stage.clientHeight : window.innerHeight;
				const titleH = title ? title.offsetHeight : 0;
				const mobileTitleLift = 113.4; // 3cm, matches the copy position set below
				const titleTop = stageH / 2 - titleH / 2 - (mobileView ? mobileTitleLift : 0);

				// Area the posters settle in: right side on desktop, below the copy on phones.
				const pointerPan = mobileView ? 0 : 34;
				const pad = mobileView ? 10 : 36 + pointerPan;
				const region = mobileView
					? { left: pad, right: stageW - pad, top: titleTop + titleH + 16, bottom: stageH - 30 }
					: { left: stageW * 0.47, right: stageW - pad, top: 84 + pointerPan, bottom: stageH - 24 - pointerPan };
				const rowPitch = mobileView ? 0.65 : 0.8;
				const farZ = mobileView ? -1050 : -1550;
				// Once the heading is almost gone, the finished poster wall glides to the middle of the screen.
				const leaveAmount = reduceMotion.matches ? 0 : clamp((progress - LEAVE_START) / (LEAVE_END - LEAVE_START));
				const centre = smooth(clamp((leaveAmount - 0.7) / 0.3));
				const centreX = mobileView ? 0 : (stageW / 2 - (region.left + region.right) / 2) * centre;
				const centreY = mobileView ? (stageH / 2 - (region.top + region.bottom) / 2) * centre : 0;

				cardElements.forEach((element, index) => {
					const card = cards[index];
					if (reduceMotion.matches) return;
					const cardW = element.offsetWidth;
					const cardH = element.offsetHeight;
					// Shrink the posters a little on short screens so the whole 3 x 3 pile always fits.
					const fit = clamp((region.bottom - region.top) / (cardH * (1 + 2 * rowPitch)), 0.5, 1);
					const w = cardW * fit;
					const h = cardH * fit;
					const cell = CELL[index];
					const col = cell % 3;
					const row = Math.floor(cell / 3);
					const spanX = Math.max(0, region.right - region.left - w);
					const spanY = Math.max(0, region.bottom - region.top - h);
					const nudge = NUDGE[index];
					const cx = region.left + w / 2 + (col / 2) * spanX + nudge[0] * w * 0.6;
					const cy = region.top + h / 2 + (row / 2) * spanY + nudge[1] * h * 0.6;
					const restX = Math.max(region.left + w / 2, Math.min(region.right - w / 2, cx)) - stageW / 2 + centreX;
					const restY = Math.max(region.top + h / 2, Math.min(region.bottom - h / 2, cy)) - stageH / 2 + centreY;

					// Posters start far down the tunnel and fly to z = 0, where they sit flat on the
					// screen with no perspective growth, so they can never be cut by the screen edge.
					const start = (card.offset / 0.64) * 0.14;
					const arrival = smooth(clamp((progress - start) / (ARRIVE_END - 0.14)));
					const local = 0.04 + 0.96 * arrival;
					const z = farZ * (1 - local);
					const opacity = clamp(arrival / 0.35);
					element.style.transform = `translate3d(calc(-50% + ${restX - pointerX * pointerPan * arrival}px), calc(-50% + ${restY - pointerY * pointerPan * arrival}px), ${z}px) rotateZ(${card.rotation}deg) scale(${fit})`;
					element.style.opacity = String(opacity);
				});

				if (title) {
					// The heading block stays put until every poster is in, then scrolls up out of view.
					const leave = leaveAmount;
					const travel = titleTop + titleH + 40;
					const lift = leave * travel;
					title.style.opacity = String(reduceMotion.matches ? 1 : 1 - smooth(clamp((leave - 0.55) / 0.45)));
					title.style.transform = mobileView
						? `translate(-50%, calc(-50% - 3cm - ${lift}px))`
						: `translateY(calc(-50% - ${lift}px))`;
				}
				if (prompt) prompt.style.opacity = String(reduceMotion.matches ? 0 : clamp(1 - Math.max(0, -bounds.top) / 90));
			});
		};

		const onPointerMove = (event: PointerEvent) => {
			if (event.pointerType !== "mouse" || reduceMotion.matches) return;
			pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
			pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
			render();
		};
		const onPreferenceChange = () => render();

		render();
		window.addEventListener("scroll", render, { passive: true });
		window.addEventListener("resize", render);
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		reduceMotion.addEventListener("change", onPreferenceChange);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", render);
			window.removeEventListener("resize", render);
			window.removeEventListener("pointermove", onPointerMove);
			reduceMotion.removeEventListener("change", onPreferenceChange);
		};
	}, []);

	return (
		<section id="top" ref={sectionRef} className="maparte-tunnel" aria-labelledby="maparte-tunnel-title">
			<div className="maparte-tunnel__stage">
				<div className="maparte-tunnel__grid" aria-hidden="true" />
				<div className="maparte-tunnel__cards" aria-hidden="true">
					{cards.map((card) => (
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
