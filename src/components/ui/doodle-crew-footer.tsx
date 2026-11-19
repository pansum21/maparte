import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowUpRight, MoveUpRight } from "lucide-react";

type ParticleKind = "star" | "ring" | "spark" | "route" | "dot";
type CharacterKind = "yeti" | "kid" | "ghost" | "cat";

const particles: { kind: ParticleKind; x: number; y: number; color: string; duration: number; delay: number; drift: number; size: number }[] = [
	{ kind: "star", x: 5, y: 38, color: "#ef6a5b", duration: 7.4, delay: -5.2, drift: 28, size: 1 },
	{ kind: "route", x: 12, y: 14, color: "#3b72db", duration: 8.8, delay: -2.1, drift: -21, size: .9 },
	{ kind: "ring", x: 19, y: 78, color: "#19a895", duration: 6.9, delay: -4.5, drift: 18, size: .82 },
	{ kind: "spark", x: 26, y: 26, color: "#e6a532", duration: 8.1, delay: -1.4, drift: 23, size: 1.12 },
	{ kind: "dot", x: 33, y: 61, color: "#8b61d5", duration: 7.8, delay: -6, drift: -18, size: .88 },
	{ kind: "star", x: 39, y: 11, color: "#21a4c1", duration: 9.2, delay: -3.7, drift: 26, size: .76 },
	{ kind: "route", x: 46, y: 84, color: "#ee795b", duration: 7.1, delay: -.8, drift: -23, size: 1.04 },
	{ kind: "ring", x: 53, y: 34, color: "#4d78d1", duration: 8.5, delay: -5.5, drift: 20, size: .82 },
	{ kind: "spark", x: 60, y: 70, color: "#dfad3d", duration: 7.3, delay: -2.7, drift: -27, size: .92 },
	{ kind: "dot", x: 67, y: 17, color: "#2da986", duration: 9.1, delay: -4.1, drift: 16, size: 1.1 },
	{ kind: "star", x: 74, y: 57, color: "#a15fc5", duration: 7.7, delay: -6.4, drift: -20, size: .8 },
	{ kind: "route", x: 81, y: 29, color: "#e6656c", duration: 8.3, delay: -1.9, drift: 25, size: 1.05 },
	{ kind: "ring", x: 88, y: 76, color: "#248da8", duration: 7, delay: -3.3, drift: -16, size: .86 },
	{ kind: "spark", x: 95, y: 41, color: "#d19b31", duration: 8.9, delay: -5.8, drift: 19, size: .92 },
];

const footerGroups = [
	{
		title: "DISCOVER",
		links: [
			{ label: "Map Art", href: "/?gallery=maps" },
			{ label: "How it works", href: "#start" },
			{ label: "Help & answers", href: "#help" },
			{ label: "Maparte Blogs", href: "/blog" },
		],
	},
	{
		title: "MAKE",
		links: [
			{ label: "Create a map", href: "/?dist=5235000" },
			{ label: "Map themes", href: "/?dist=5235000" },
			{ label: "Digital downloads", href: "/?dist=5235000" },
		],
	},
	{
		title: "STUDIO",
		links: [
			{ label: "Contact support", href: "mailto:support@maparte.com" },
			{ label: "Privacy Policy", href: "/privacy" },
			{ label: "Terms of Service", href: "/terms" },
			{ label: "Refund Policy", href: "/refund" },
		],
	},
];

const crew: { id: CharacterKind; left: string; bottom: string; width: string; delay: string; color: string; note: string }[] = [
	{ id: "yeti", left: "1%", bottom: "6%", width: "10%", delay: "-.8s", color: "#174b70", note: "Your place is out there." },
	{ id: "kid", left: "26%", bottom: "16%", width: "7%", delay: "-.2s", color: "#c25e48", note: "Pick a city. Make it yours." },
	{ id: "ghost", left: "56%", bottom: "20%", width: "7%", delay: "-1.4s", color: "#297d83", note: "A little map magic." },
	{ id: "cat", left: "84%", bottom: "7%", width: "10%", delay: "-.5s", color: "#71458f", note: "Every good story has a somewhere." },
];

export function DoodleCrewFooter() {
	const artRef = useRef<HTMLDivElement>(null);
	const [activeCharacter, setActiveCharacter] = useState<CharacterKind | null>(null);

	const movePointer = (event: PointerEvent<HTMLDivElement>) => {
		if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const art = artRef.current;
		if (!art) return;
		const rect = art.getBoundingClientRect();
		const pointerX = event.clientX - rect.left;
		const pointerY = event.clientY - rect.top;
		const nodes = art.querySelectorAll<HTMLElement>(".doodle-footer__particle-origin");
		for (let index = 0; index < nodes.length; index += 1) {
			const node = nodes[index];
			const particleX = Number(node.dataset.x) / 100 * rect.width;
			const particleY = Number(node.dataset.y) / 100 * rect.height;
			const dx = particleX - pointerX;
			const dy = particleY - pointerY;
			const distance = Math.hypot(dx, dy);
			const range = 132;
			if (distance < range && distance > 0) {
				const strength = (1 - distance / range) * 42;
				node.style.setProperty("--repel-x", `${dx / distance * strength}px`);
				node.style.setProperty("--repel-y", `${dy / distance * strength}px`);
			} else {
				node.style.setProperty("--repel-x", "0px");
				node.style.setProperty("--repel-y", "0px");
			}
		}
		art.style.setProperty("--eye-x", `${Math.max(-3, Math.min(3, (pointerX / rect.width - .06) * 5))}px`);
		art.style.setProperty("--eye-y", `${Math.max(-2, Math.min(2, (pointerY / rect.height - .62) * 4))}px`);
	};

	const resetPointer = () => {
		const art = artRef.current;
		if (!art) return;
		art.style.removeProperty("--eye-x");
		art.style.removeProperty("--eye-y");
		art.querySelectorAll<HTMLElement>(".doodle-footer__particle-origin").forEach((node) => {
			node.style.setProperty("--repel-x", "0px");
			node.style.setProperty("--repel-y", "0px");
		});
	};

	const speak = (kind: CharacterKind) => setActiveCharacter((current) => current === kind ? null : kind);

	return (
		<footer className="journey-footer doodle-footer">
			<div className="doodle-footer__top">
				<div className="doodle-footer__intro">
					<a className="doodle-footer__brand" href="#top" aria-label="MAPARTE home">
						<img src="/assets/logo.svg" alt="" />
						<span>MAPARTE</span>
					</a>
					<p>We turn the places you love into maps you can make your own.</p>
				</div>
				{footerGroups.map((group) => (
					<nav className="doodle-footer__group" aria-label={group.title} key={group.title}>
						<h2>{group.title}</h2>
						{group.links.map(({ label, href }) => (
							<a href={href} key={`${label}-${href}`}>
								{label}<ArrowUpRight aria-hidden="true" />
							</a>
						))}
					</nav>
				))}
			</div>

			<div ref={artRef} className="doodle-footer__art" onPointerMove={movePointer} onPointerLeave={resetPointer}>
				<MaparteWordmark />
				{particles.map((particle, index) => (
					<span
						key={`${particle.kind}-${index}`}
						className="doodle-footer__particle-origin"
						data-x={particle.x}
						data-y={particle.y}
						aria-hidden="true"
						style={{
							left: `${particle.x}%`, top: `${particle.y}%`,
							"--particle-color": particle.color,
							"--particle-duration": `${particle.duration}s`,
							"--particle-delay": `${particle.delay}s`,
							"--particle-drift": `${particle.drift}px`,
							"--particle-size": particle.size,
						} as CSSProperties}
					>
						<span className="doodle-footer__particle"><ParticleGlyph kind={particle.kind} /></span>
					</span>
				))}
				{crew.map((member) => (
					<button
						key={member.id}
						className={`doodle-footer__character doodle-footer__character--${member.id}`}
						type="button"
						onClick={() => speak(member.id)}
						aria-label={`Show a note from the MAPARTE ${member.id}`}
						aria-expanded={activeCharacter === member.id}
						style={{ "--character-left": member.left, "--character-bottom": member.bottom, "--character-width": member.width, "--character-delay": member.delay, "--character-color": member.color } as CSSProperties}
					>
						<DoodleCharacter kind={member.id} />
						{activeCharacter === member.id && <span className="doodle-footer__speech" role="status">{member.note}</span>}
					</button>
				))}
				<svg className="doodle-footer__ground" viewBox="0 0 1400 46" preserveAspectRatio="none" aria-hidden="true">
					<path d="M7 19 C180 10 300 26 440 18 S690 21 810 16 1050 24 1393 14" />
					<path d="M35 27c25-4 41 4 67 0m115 3c12-3 21-3 31 0m283-4c8-4 17-4 25 0m158 5c16-3 25-2 39 0m187-4c10-3 19-2 27 0m126 3c7-3 14-3 20-1" />
					<circle cx="188" cy="34" r="3" /><circle cx="728" cy="34" r="4" /><circle cx="1196" cy="31" r="3" />
				</svg>
			</div>

			<div className="doodle-footer__bottom">
				<span>© {new Date().getFullYear()} MAPARTE. Made for places that stay with you.</span>
				<div className="doodle-footer__bottom-links">
					<a className="doodle-footer__back" href="#top">Back to top <MoveUpRight aria-hidden="true" /></a>
				</div>
			</div>
		</footer>
	);
}

function MaparteWordmark() {
	return (
		<span className="doodle-footer__typeword" role="img" aria-label="MAPARTE">
			<span className="doodle-footer__typeword-letters" aria-hidden="true">MAPARTE</span>
			<span className="doodle-footer__typeword-caret" aria-hidden="true" />
		</span>
	);
}

function DoodleCharacter({ kind }: { kind: CharacterKind }) {
	if (kind === "ghost") return (
		<svg viewBox="0 0 110 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<path d="M20 127V66C20 29 35 12 55 12s35 17 35 54v61l-13-9-12 13-12-12-13 12-10-13-10 9Z" fill="#fffdf6" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
			<g className="doodle-footer__eyes" fill="#173c58"><ellipse cx="43" cy="66" rx="3.8" ry="5.5" /><ellipse cx="67" cy="66" rx="3.8" ry="5.5" /></g>
			<path d="M47 82c5 5 11 5 16 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
			<path d="m23 39-11-6m78 6 11-6M18 86l-9 3m83-3 9 3" stroke="#45a8ad" strokeWidth="3" strokeLinecap="round" />
		</svg>
	);
	if (kind === "kid") return (
		<svg viewBox="0 0 110 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<path d="M22 59c0-27 14-43 33-43 21 0 34 16 34 43v20H22V59Z" fill="#f5c7a4" stroke="currentColor" strokeWidth="4" />
			<path d="m23 44 5-24 18 13 11-20 12 20 20-10-1 28c-14-8-24-17-32-27-8 13-19 21-33 27Z" fill="#4d3541" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
			<path d="M30 89c3-11 12-17 25-17s22 6 25 17l9 42H21l9-42Z" fill="#f08c5b" stroke="currentColor" strokeWidth="4" />
			<g className="doodle-footer__eyes" fill="#173c58"><circle cx="43" cy="60" r="3" /><circle cx="67" cy="60" r="3" /></g>
			<path d="M48 68c4 4 8 4 12 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
			<path d="M34 131v9m41-9v9" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
			<path d="m50 92 6 15 7-15" stroke="#fff3de" strokeWidth="3" strokeLinecap="round" />
		</svg>
	);
	if (kind === "cat") return (
		<svg viewBox="0 0 140 155" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<path d="M28 75 19 20l39 25c10-4 21-4 31 0l34-25-6 62c8 23-3 50-26 58-24 8-53-4-61-27-4-12-3-26-2-38Z" fill="#fffdf6" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
			<path d="m31 40 22 14-18 5Zm81 0L91 54l19 5Z" fill="#e58a7c" />
			<g className="doodle-footer__eyes" fill="#173c58"><ellipse cx="51" cy="77" rx="4" ry="5" /><ellipse cx="91" cy="77" rx="4" ry="5" /></g>
			<path d="m63 91 8 6 8-6m-8 6v7m-9 5c6 5 13 5 18 0m-54-6-20-5m21 14-21 2m100-12 20-5m-20 14 21 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
			<path d="M41 73c4-8 17-9 21-2" stroke="#202528" strokeWidth="8" strokeLinecap="round" />
			<path d="M41 71h20m-10-3v9" stroke="#fffdf6" strokeWidth="2" />
			<path d="M30 125c-15 12-11 23 2 18" stroke="#e18156" strokeWidth="5" strokeLinecap="round" />
		</svg>
	);
	return (
		<svg viewBox="0 0 150 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
				<path d="M35 84c-14 3-21 15-20 35l5 25c2 9 10 12 18 7l14-13" fill="#f6f4ed" />
				<path d="M106 87c18 0 27 13 25 33l-4 24c-2 10-10 12-18 7l-13-14" fill="#f6f4ed" />
				<path d="M48 122 42 160c-1 8 4 13 12 13h45c8 0 12-5 10-13l-7-39" fill="#f6f4ed" />
				<path d="M52 156c-9 5-14 14-12 20 2 5 14 6 25 2l9-8m25-14c9 5 15 14 12 20-3 5-14 6-26 2l-8-8" fill="#f6f4ed" />
				<path d="M41 61c0-27 17-45 39-45 23 0 39 18 39 45v27c0 27-16 43-39 43-22 0-39-16-39-43V61Z" fill="#fbfaf5" />
				<path d="M38 61c2-28 17-48 43-48 24 0 39 18 41 45-12-2-24-10-31-19-9 11-29 20-53 22Z" fill="#fbfaf5" />
				<path d="M54 74c5-6 12-6 17 0m22 0c5-6 12-6 17 0" />
				<g className="doodle-footer__eyes"><circle cx="65" cy="81" r="3" fill="currentColor" /><circle cx="103" cy="81" r="3" fill="currentColor" /></g>
				<path d="M75 96c6 5 12 5 18 0m-15 10c5 4 10 4 14 0" />
				<path d="m57 127 18 24 24-24m-24 24v22" />
				<path d="m55 141 10-10 17 14 16-14 9 10-25 20-27-20Z" fill="#88d9cc" />
				<path d="m65 137 1 17m16-10v16" strokeDasharray="4 5" />
				<path d="m31 29 6-13m-19 29-13 3m116-26 9-11m-1 31 14 2" strokeWidth="3" />
			</g>
			<path d="M46 31 35 15l-7 21m61-6 10-17 9 23" fill="#fbfaf5" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
			<circle cx="89" cy="149" r="5" fill="#f29b58" stroke="currentColor" strokeWidth="2" />
		</svg>
	);
}

function ParticleGlyph({ kind }: { kind: ParticleKind }) {
	if (kind === "star") return <svg viewBox="0 0 24 24"><path d="M12 2.5 14.2 9l6.6 3-6.6 2.1L12 21l-2.2-6.9L3 12l6.8-3L12 2.5Z" /></svg>;
	if (kind === "ring") return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.2" /><circle cx="17.5" cy="6" r="1.5" /></svg>;
	if (kind === "spark") return <svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" /></svg>;
	if (kind === "route") return <svg viewBox="0 0 30 24"><path d="M2 17c7-16 9 10 16-5s7-1 10-7" /><circle cx="3" cy="18" r="2" /><circle cx="27" cy="5" r="2" /></svg>;
	return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" strokeDasharray="1.5 4" /></svg>;
}

