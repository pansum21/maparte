import { ArrowUpRight, MoveUpRight } from "lucide-react";

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

			<div className="doodle-footer__art" aria-label="MAPARTE, map art for the places that matter">
				<MaparteWordmark />
				<div className="doodle-footer__buddy" aria-hidden="true"><MapBuddy /></div>
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
			<text x="55" y="235" fill="currentColor" fontFamily="Arial Black, Impact, sans-serif" fontSize="238" fontWeight="900" letterSpacing="-6" mask="url(#maparte-wordmark-mask)" filter="url(#maparte-wordmark-rough)">MAPARTE</text>
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
				<circle cx="65" cy="81" r="3" fill="currentColor" /><circle cx="103" cy="81" r="3" fill="currentColor" />
				<path d="M75 96c6 5 12 5 18 0m-15 10c5 4 10 4 14 0" />
				<path d="m57 127 18 24 24-24m-24 24v22" />
				<path d="m55 141 10-10 17 14 16-14 9 10-25 20-27-20Z" fill="#d5ece6" />
				<path d="m65 137 1 17m16-10v16" strokeDasharray="4 5" />
				<path d="m31 29 6-13m-19 29-13 3m116-26 9-11m-1 31 14 2" strokeWidth="3" />
			</g>
			<circle cx="89" cy="149" r="5" fill="#d6ff6b" stroke="currentColor" strokeWidth="2" />
		</svg>
	);
}
