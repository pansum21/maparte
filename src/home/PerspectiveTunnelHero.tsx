import { useEffect, useRef } from "react";
import "./perspectiveTunnelHero.css";

const images = [
	{ src: "https://cdn.21st.dev/assets/mirror/c3/c3fbd2afa140223999a441b32ed986f61d473930002708df805a81532a326aac.jpg", title: "A place that stays" },
	{ src: "https://cdn.21st.dev/assets/mirror/9d/9d8b2f675a5814476ada3736ce439bcda23c5c389e0ebf9b25d8a0c09f3bbcfe.jpg", title: "Your city, your view" },
	{ src: "https://cdn.21st.dev/assets/mirror/8b/8bb738bf2f00d7f7ed3c3ec034adb9938ad38f4be4ac191d632a6a11ad525574.jpg", title: "Made around a memory" },
	{ src: "https://cdn.21st.dev/assets/mirror/ac/ac5ac700b188d7ef16ee9dab868098b59f15c440db3f71d4e8c03262a3287577.jpg", title: "From earth to street" },
	{ src: "https://cdn.21st.dev/assets/mirror/ef/ef25eff6ce655fba459b3b7e7711524dc92499aa18f6c7dbea9a0fcc56a8f908.jpg", title: "A map with meaning" },
	{ src: "https://cdn.21st.dev/assets/mirror/f2/f28b370a5dcbf76240f1504579c4b05fc0ff0bb990a42aff8dc2f73a5dc46072.jpg", title: "One city, your style" },
	{ src: "https://cdn.21st.dev/assets/mirror/f2/f26a1eac85704dda924820392dedfb72d51d8261d35354f83b35d683617295f3.jpg", title: "Keep your coordinates" },
	{ src: "https://cdn.21st.dev/assets/mirror/77/7755d23eaaa0aa5b403343f44afa7a29b2d06d3065fe54c602b14ba01d00f2aa.jpg", title: "A story in every street" },
	{ src: "https://cdn.21st.dev/assets/mirror/65/657317761fe9058a1d43711b13c543a71eb5199b7a5d9abf4c28479674e39cf7.jpg", title: "Your place on the map" },
];

const cards = images.map((item, index) => {
	const angle = index * 137.5 * (Math.PI / 180);
	return {
		...item,
		index,
		x: Math.cos(angle) * (0.28 + (index % 3) * 0.08),
		y: Math.sin(angle) * (0.26 + (index % 2) * 0.09),
		rotation: (index % 2 === 0 ? 1 : -1) * (3 + (index % 5) * 2),
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
					const stagger = 0.55;
					const start = (card.index / cards.length) * (1 - stagger);
					const local = smooth(clamp((progress - start) / stagger));
					const farZ = window.innerWidth < 768 ? -1050 : -1550;
					const nearZ = window.innerWidth < 768 ? 260 : 390;
					const z = farZ + (nearZ - farZ) * local;
					const fadeIn = clamp(local / 0.18);
					const fadeOut = clamp((1 - local) / 0.12);
					const opacity = Math.min(fadeIn, fadeOut);
					const pan = window.innerWidth < 768 ? 16 : 34;
					const heroOffset = window.innerWidth < 768 ? 0 : section.clientWidth * 0.23;
					const offsetX = heroOffset + card.x * section.clientWidth * (window.innerWidth < 768 ? 0.62 : 0.55) - pointerX * pan;
					const offsetY = card.y * window.innerHeight - pointerY * pan;
					element.style.transform = `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${z}px) rotateZ(${card.rotation}deg)`;
					element.style.opacity = String(opacity);
				});

				if (title) {
					const opacity = reduceMotion.matches ? 1 : 1 - smooth(clamp((progress - 0.58) / 0.18));
					title.style.opacity = String(opacity);
					const titlePosition = window.innerWidth < 768 ? "translate(-50%, -50%)" : "translateY(-50%)";
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
							<img src={card.src} alt="" loading="lazy" draggable={false} />
							<figcaption>{card.title}</figcaption>
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
