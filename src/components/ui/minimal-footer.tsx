import { ArrowUpRight, Mail, MapPinned } from "lucide-react";

const resources = [
	{ label: "Map gallery", href: "#map-stories" },
	{ label: "Help & answers", href: "#help" },
	{ label: "Create your map", href: "/" },
];

const company = [
	{ label: "Privacy policy", href: "/privacy" },
	{ label: "Terms of service", href: "/terms" },
	{ label: "Refund policy", href: "/refund" },
];

export function MinimalFooter() {
	return (
		<footer className="journey-footer minimal-footer">
			<div className="minimal-footer__main">
				<div className="minimal-footer__brand">
					<a className="minimal-footer__mark" href="/" aria-label="MAPARTE home">
						<MapPinned aria-hidden="true" />
						<span>MAPARTE</span>
					</a>
					<p>Make a map of a place that means something.</p>
					<a className="minimal-footer__contact" href="mailto:support@maparte.com">
						<Mail aria-hidden="true" />
						<span>support@maparte.com</span>
						<ArrowUpRight aria-hidden="true" />
					</a>
				</div>
				<FooterLinks title="Explore" links={resources} />
				<FooterLinks title="MAPARTE" links={company} />
			</div>
			<div className="minimal-footer__bottom">
				<span>© {new Date().getFullYear()} MAPARTE. All rights reserved.</span>
				<a href="mailto:support@maparte.com?subject=MAPARTE%20support">Contact support</a>
			</div>
		</footer>
	);
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) {
	return (
		<nav className="minimal-footer__links" aria-label={title}>
			<h2>{title}</h2>
			{links.map(({ label, href }) => (
				<a key={href} href={href}>
					{label}
					<ArrowUpRight aria-hidden="true" />
				</a>
			))}
		</nav>
	);
}
