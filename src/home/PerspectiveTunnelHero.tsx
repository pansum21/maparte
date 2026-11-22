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

const cards = slides.map((item, index) => {
	const angle = index * 137.5 * (Math.PI / 180);
	return {
		...item,
		index,
		x: Math.cos(angle) * (0.3 + (index % 3) * 0.08),
		y: Math.sin(angle) * (0.24 + (index % 2) * 0.08),
		rotation: (index % 2 === 0 ? 1 : -1) * (2 + (index % 5) * 1.6),
	};
});

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

export default function PerspectiveTunnelHero() {
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const cardElements = Array.from(section.querySelectorAll<HTMLElement>(".maparte-tunnel__card"));
		const title = section.querySelector<HTMLElement>(".maparte-tunnel__title");
		const heading = section.querySelector<HTMLElement>(".maparte-tunnel__title h2");
		const headingInto = section.querySelector<HTMLElement>(".maparte-tunnel__heading-into");
		const headingEarth = section.querySelector<HTMLElement>(".maparte-tunnel__heading-earth");
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

				cardElements.forEach((element, index) => {
					const card = cards[index];
					if (reduceMotion.matches) return;
					// Every card starts part-way down the tunnel so posters are already visible
					// when the page loads, then all of them fly past as the visitor scrolls.
					const local = smooth(clamp(card.offset + (1 - card.offset) * progress));
					const farZ = window.innerWidth < 768 ? -1050 : -1550;
					const nearZ = window.innerWidth < 768 ? 260 : 390;
					const z = farZ + (nearZ - farZ) * local;
					const fadeIn = clamp(local / 0.12);
					const fadeOut = clamp((1 - local) / 0.12);
					const opacity = Math.min(fadeIn, fadeOut);
					const pan = window.innerWidth < 768 ? 16 : 34;
					const heroOffset = window.innerWidth < 768 ? 0 : section.clientWidth * 0.23;
					const offsetX = heroOffset + card.x * section.clientWidth * (window.innerWidth < 768 ? 0.62 : 0.55) - pointerX * pan;
					const mobileView = window.innerWidth < 768;
					// On phones the copy sits in the upper half, so the posters live in the lower half instead of behind the text.
					const offsetY = (mobileView ? window.innerHeight * (0.32 + (1 - progress) * 0.05) + card.y * window.innerHeight * 0.42 : card.y * window.innerHeight) - pointerY * pan;
					element.style.transform = `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${z}px) rotateZ(${card.rotation}deg)`;
					element.style.opacity = String(opacity);
				});

				if (title) {
					const opacity = reduceMotion.matches ? 1 : 1 - smooth(clamp((progress - 0.58) / 0.18));
					title.style.opacity = String(opacity);
					const titlePosition = window.innerWidth < 768 ? "translate(-50%, calc(-50% - 3cm))" : "translateY(-50%)";
					title.style.transform = titlePosition;
				}
				if (heading && headingInto && headingEarth) {
					const flight = reduceMotion.matches ? 0 : smooth(clamp(progress / 0.78));
					const scale = 1 + flight * 0.52;
					const mobile = window.innerWidth < 768;
					heading.style.transform = `scale(${scale})`;
					heading.style.transformOrigin = mobile ? "center center" : "left center";
					headingInto.style.transform = `translate3d(${flight * (mobile ? 8 : 17)}vw, 0, 0)`;
					headingInto.style.opacity = String(reduceMotion.matches ? 1 : 1 - smooth(clamp((progress - 0.64) / 0.2)));
					headingEarth.style.transform = `translate3d(${flight * (mobile ? -4 : -8)}vw, 0, 0)`;
					headingEarth.style.opacity = String(reduceMotion.matches ? 1 : 1 - smooth(clamp((progress - 0.48) / 0.22)));
				}
				if (prompt) prompt.style.opacity = String(reduceMotion.matches ? 0 : clamp(1 - progress * 9));
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
