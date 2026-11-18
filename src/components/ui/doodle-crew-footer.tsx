import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowUpRight, MoveUpRight } from "lucide-react";

type ParticleKind = "star" | "ring" | "spark" | "route" | "dot";

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
			{ label: "Map gallery", href: "#map-stories" },
			{ label: "How it works", href: "#start" },
			{ label: "Help & answers", href: "#help" },
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
			{ label: "Privacy", href: "/privacy" },
			{ label: "Terms", href: "/terms" },
			{ label: "Refunds", href: "/refund" },
		],
	},
];

export function DoodleCrewFooter() {
	const artRef = useRef<HTMLDivElement>(null);
	const [buddyMessage, setBuddyMessage] = useState("");
	const messageIndex = useRef(0);
	const messages = ["Your favourite place called.", "Every good story has a somewhere.", "Pick a place. Make it yours."];

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

	const speak = () => {
		setBuddyMessage(messages[messageIndex.current % messages.length]);
		messageIndex.current += 1;
	};

	return (
		<footer className="journey-footer doodle-footer">
			<div className="doodle-footer__top">
				<div className="doodle-footer__intro">
					<a className="doodle-footer__brand" href="#start" aria-label="MAPARTE home">
						<img src="/assets/logo.svg" alt="" />
						<span>MAPARTE</span>
					</a>
					<p>We turn the places you love into maps you can make your own.</p>
					<a className="doodle-footer__email" href="mailto:support@maparte.com">
						Support is one note away <ArrowUpRight aria-hidden="true" />
					</a>
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
				<button className="doodle-footer__buddy" type="button" onClick={speak} aria-label="Hear a note from the MAPARTE map buddy" aria-expanded={Boolean(buddyMessage)}>
					<MapBuddy />
					{buddyMessage && <span className="doodle-footer__speech" role="status">{buddyMessage}</span>}
				</button>
				<svg className="doodle-footer__ground" viewBox="0 0 1400 46" preserveAspectRatio="none" aria-hidden="true">
					<path d="M7 19 C180 10 300 26 440 18 S690 21 810 16 1050 24 1393 14" />
					<path d="M35 27c25-4 41 4 67 0m115 3c12-3 21-3 31 0m283-4c8-4 17-4 25 0m158 5c16-3 25-2 39 0m187-4c10-3 19-2 27 0m126 3c7-3 14-3 20-1" />
					<circle cx="188" cy="34" r="3" /><circle cx="728" cy="34" r="4" /><circle cx="1196" cy="31" r="3" />
				</svg>
			</div>

			<div className="doodle-footer__bottom">
				<span>© {new Date().getFullYear()} MAPARTE. Made for places that stay with you.</span>
				<div className="doodle-footer__bottom-links">
					<a href="/privacy">Privacy</a>
					<a href="/terms">Terms</a>
					<a href="/refund">Refunds</a>
					<a className="doodle-footer__back" href="#start">Back to top <MoveUpRight aria-hidden="true" /></a>
				</div>
			</div>
		</footer>
	);
}

function MaparteWordmark() {
	return (
		<svg className="doodle-footer__wordmark" viewBox="0 0 1400 300" role="img" aria-labelledby="maparte-wordmark-title">
			<title id="maparte-wordmark-title">MAPARTE</title>
			<defs>
				<linearGradient id="maparte-wordmark-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
					<stop offset="0%" stopColor="#e85e55" />
					<stop offset="19%" stopColor="#e7a43b" />
					<stop offset="38%" stopColor="#23a88d" />
					<stop offset="58%" stopColor="#3387cb" />
					<stop offset="77%" stopColor="#596ed0" />
					<stop offset="100%" stopColor="#a057b7" />
				</linearGradient>
				<mask id="maparte-wordmark-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1400" height="300">
					<rect width="1400" height="300" fill="black" />
					<text x="55" y="235" fill="white" fontFamily="Arial Black, Impact, sans-serif" fontSize="238" fontWeight="900" letterSpacing="-6">MAPARTE</text>
					<g stroke="black" strokeWidth="4" opacity=".88">
						<path d="M95 72h48m116 44h34m71-56h72m102 92h56m66-67h38m92 40h72m93-65h53m31 109h42m66-57h60m39 84h38m55-114h51m29 33h33m51 98h40" />
						<path d="M162 168h27m153 41h24m122-75h32m133 99h36m95-124h25m72 80h49m132-88h27m42 93h31m69-43h44m26 72h26" />
						<path d="M87 219h18m236-112h24m270 72h24m168-115h18m180 96h24m154-59h28m51 121h18" />
					</g>
				</mask>
				<filter id="maparte-wordmark-rough" x="-2%" y="-10%" width="104%" height="125%">
					<feTurbulence type="fractalNoise" baseFrequency=".015 .16" numOctaves="2" seed="12" result="grain" />
					<feDisplacementMap in="SourceGraphic" in2="grain" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
				</filter>
			</defs>
			<text x="55" y="235" fill="url(#maparte-wordmark-gradient)" fontFamily="Arial Black, Impact, sans-serif" fontSize="238" fontWeight="900" letterSpacing="-6" mask="url(#maparte-wordmark-mask)" filter="url(#maparte-wordmark-rough)">MAPARTE</text>
		</svg>
	);
}

function MapBuddy() {
	return (
		<svg viewBox="0 0 150 190" fill="none" xmlns="http://www.w3.org/2000/svg">
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
