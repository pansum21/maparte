import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, GitHubIcon, StarIcon, CheckIcon, LinkedInIcon, InstagramIcon, RedditIcon, ThreadsIcon, YouTubeIcon } from "./Icons";
import { useRepoStars } from "@/shared/hooks/useRepoStars";
import { trackEvent } from "@/shared/utils/analytics";
import {
  REPO_URL,
  REPO_API_URL,
  KOFI_URL,
  SOCIAL_LINKEDIN,
  SOCIAL_INSTAGRAM,
  SOCIAL_REDDIT,
  SOCIAL_THREADS,
  SOCIAL_YOUTUBE,
  APP_VERSION,
} from "@/core/config";

export interface AboutModalProps {
  onClose: () => void;
  initialTab?: "about" | "guide";
}

export default function AboutModal({ onClose, initialTab = "about" }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<"about" | "guide">(initialTab);

  const repoUrl = String(REPO_URL ?? "").trim();
  const kofiUrl = String(KOFI_URL ?? "").trim();
  const { repoStars, repoStarsLoading } = useRepoStars(REPO_API_URL);
  const starsText = repoStarsLoading
    ? "…"
    : repoStars !== null
      ? repoStars.toLocaleString()
      : null;

  const socialLinks = [
    { href: String(SOCIAL_LINKEDIN ?? "").trim(), Icon: LinkedInIcon, label: "LinkedIn" },
    { href: String(SOCIAL_INSTAGRAM ?? "").trim(), Icon: InstagramIcon, label: "Instagram" },
    { href: String(SOCIAL_REDDIT ?? "").trim(), Icon: RedditIcon, label: "Reddit" },
    { href: String(SOCIAL_THREADS ?? "").trim(), Icon: ThreadsIcon, label: "Threads" },
    { href: String(SOCIAL_YOUTUBE ?? "").trim(), Icon: YouTubeIcon, label: "YouTube" },
  ];

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="about-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="about-modal glassmorphic-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Maparte Studio Guide & About"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Glassmorphic Tabs */}
        <header className="about-modal-nav-header">
          <div className="about-modal-brand-badge">
            <img
              src="/assets/logo.svg"
              alt="MAPARTE"
              className="about-modal-brand-logo"
              width="28"
              height="28"
            />
            <span className="about-modal-brand-name">MAPARTE</span>
          </div>

          <nav className="about-modal-tabs-control" aria-label="Modal view selection">
            <button
              type="button"
              className={`about-modal-tab-btn ${activeTab === "about" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("about");
                trackEvent("tab_about_click");
              }}
              aria-selected={activeTab === "about"}
            >
              <span className="tab-emoji" aria-hidden="true">ℹ️</span>
              <span className="tab-label">About Maparte</span>
            </button>
            <button
              type="button"
              className={`about-modal-tab-btn ${activeTab === "guide" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("guide");
                trackEvent("tab_guide_click");
              }}
              aria-selected={activeTab === "guide"}
            >
              <span className="tab-emoji" aria-hidden="true">📖</span>
              <span className="tab-label">Guide &amp; How It Works</span>
            </button>
          </nav>

          <button
            type="button"
            className="about-modal-close"
            onClick={onClose}
            aria-label="Close dialog (Escape)"
            title="Close (ESC)"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Modal Content Body */}
        <div className="about-modal-body-scroll">
          {activeTab === "about" ? (
            <article className="about-tab-content">
              {/* Hero Banner */}
              <div className="guide-hero-banner">
                <span className="guide-pill-badge">MAPARTE · Custom map design studio</span>
                <h2 className="guide-hero-title">Turn a place that matters into map art</h2>
                <p className="guide-hero-desc">
                  Choose a location, shape the map, add your own typography and markers, then preview a poster or wallpaper design in the editor.
                </p>
              </div>

              {/* What is MAPARTE? */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHAT</span> What is MAPARTE?
                </h3>
                <div className="guide-feature-grid">
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">⚡</div>
                    <h4>Find a location</h4>
                    <p>Search for a city, town, village, address, or coordinates. Map search and map tiles use external OpenStreetMap-based services.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🗺️</div>
                    <h4>Shape the map</h4>
                    <p>Adjust the map area and dimensions, rotate and zoom the map, and choose which supported map layers appear.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🖼️</div>
                    <h4>Build your layout</h4>
                    <p>Choose a preset or enter custom dimensions, then frame the map with line and decorative border styles.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">📐</div>
                    <h4>Personalize the text</h4>
                    <p>Set the town or village, city, state, and country labels; add a date or tagline; and adjust font, size, and text color.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">💧</div>
                    <h4>Mark places and routes</h4>
                    <p>Add map markers, emoji or uploaded icons, and GPX tracks. Adjust the route appearance and start or finish markers.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🛋️</div>
                    <h4>Preview the design</h4>
                    <p>Review the poster on the canvas or use the room preview to compare background and frame treatments before exporting.</p>
                  </div>
                </div>
              </section>

              {/* About the editor */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHY</span> A clear, flexible map-making workflow
                </h3>
                <div className="guide-comparison-card">
                  <div className="comparison-col">
                    <span className="comparison-badge">1 · Find and frame</span>
                    <ul>
                      <li>Search by place name or coordinates</li>
                      <li>Choose a map extent and layout</li>
                      <li>Adjust map layers, colors, and borders</li>
                      <li>Set dimensions for a poster or wallpaper</li>
                    </ul>
                  </div>
                  <div className="comparison-divider" aria-hidden="true">→</div>
                  <div className="comparison-col comparison-col--good">
                    <span className="comparison-badge comparison-badge--gold">2 · Personalize and preview</span>
                    <ul>
                      <li>Add labels, a date, or a tagline</li>
                      <li>Place markers or import a GPX route</li>
                      <li>Review the canvas and optional room preview</li>
                      <li>Check current output choices in Download</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* When & Who: Milestones */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHEN</span> When &amp; Why Gift a Custom Map Poster?
                </h3>
                <p className="guide-section-intro">
                  A custom map can make a meaningful keepsake for a place, trip, event, or milestone that matters to you.
                </p>
                <div className="guide-milestone-grid">
                  <div className="guide-milestone-card">
                    <span className="milestone-icon">💌</span>
                    <h4>"Where We Met" First Date</h4>
                    <p>Pinpoint the exact cafe, street corner, or campus where your story began with custom anniversary dates.</p>
                  </div>
                  <div className="guide-milestone-card">
                    <span className="milestone-icon">💍</span>
                    <h4>Wedding &amp; Paper Anniversary</h4>
                    <p>A map of the venue can be a personal way to remember a wedding or anniversary.</p>
                  </div>
                  <div className="guide-milestone-card">
                    <span className="milestone-icon">🏡</span>
                    <h4>First Home &amp; Housewarming</h4>
                    <p>Commemorate the coordinates of buying your first house or apartment with modern minimalist cartography.</p>
                  </div>
                  <div className="guide-milestone-card">
                    <span className="milestone-icon">✈️</span>
                    <h4>Unforgettable Travel Memories</h4>
                    <p>Build a gallery wall celebrating iconic travel destinations across Paris, Tokyo, New York, and Venice.</p>
                  </div>
                  <div className="guide-milestone-card">
                    <span className="milestone-icon">🎓</span>
                    <h4>College Town &amp; Graduation</h4>
                    <p>Frame your university campus with your graduation year as an elegant desk or office centerpiece.</p>
                  </div>
                  <div className="guide-milestone-card">
                    <span className="milestone-icon">🏃</span>
                    <h4>Marathon &amp; Race Expeditions</h4>
                    <p>Trace 26.2 mile marathon routes or epic cycling rides using GPX route lines and custom finish-line pins.</p>
                  </div>
                </div>
              </section>

              {/* Who Created & Support */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHO</span> Who Created Maparte &amp; How Can You Support?
                </h3>
                <div className="guide-community-card">
                  <p>
                    MAPARTE is an independent map-art design project. Explore the public project or support its continued development using the links below.
                  </p>
                  <div className="guide-community-actions">
                    {repoUrl && (
                      <a
                        className="github-badge"
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackEvent("github_click")}
                      >
                        <GitHubIcon className="badge-icon" />
                        <span>GitHub Repo</span>
                      </a>
                    )}
                    {repoUrl && (
                      <a
                        className="github-badge stars-badge"
                        href={`${repoUrl}/stargazers`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackEvent("star_click")}
                      >
                        <StarIcon className="badge-icon" />
                        <span>{starsText !== null ? `${starsText} Stars` : "Star on GitHub"}</span>
                      </a>
                    )}
                    {kofiUrl && (
                      <a
                        className="github-badge donate-badge"
                        href={kofiUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackEvent("donate_click")}
                      >
                        <span>☕ Donate &amp; Support</span>
                      </a>
                    )}
                  </div>

                  <div className="guide-social-footer">
                    <span className="guide-social-label">Follow &amp; Share:</span>
                    <div className="social-links-row">
                      {socialLinks.map(({ href, Icon, label }) =>
                        href ? (
                          <a
                            key={label}
                            className="social-badge"
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Follow MAPARTE on ${label}`}
                            title={label}
                          >
                            <Icon className="social-icon" />
                          </a>
                        ) : null
                      )}
                    </div>
                  </div>

                  <div className="guide-version-footer">
                    <span>MAPARTE v{APP_VERSION} • Map data and services are credited in the editor</span>
                  </div>
                </div>
              </section>
            </article>
          ) : (
            <article className="guide-tab-content">
              {/* Guide Hero */}
              <div className="guide-hero-banner">
                <span className="guide-pill-badge">📖 Creator Walkthrough &amp; Print Handbook</span>
                <h2 className="guide-hero-title">How to Create, Frame &amp; Print Your Custom Map</h2>
                <p className="guide-hero-desc">
                  A practical walkthrough of the location, map, layout, text, marker, route, preview, and export controls in the MAPARTE editor.
                </p>
              </div>

              {/* How to Create in 3 Steps */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">HOW</span> How to Create Your Custom Map Art in 3 Simple Steps?
                </h3>
                <div className="guide-steps-grid">
                  <div className="guide-step-card">
                    <div className="step-badge">STEP 1</div>
                    <h4>Choose a location and map area</h4>
                    <p>Search for a place or enter coordinates. Set the map scale and dimensions, then pan, zoom, or rotate the map until the area is framed the way you want.</p>
                  </div>
                  <div className="guide-step-card">
                    <div className="step-badge">STEP 2</div>
                    <h4>Style the poster</h4>
                    <p>Choose a theme, control visible map layers, select a layout or custom size, and tune the border. Add town, city, state, country, or tagline text; then adjust its font, size, and color.</p>
                  </div>
                  <div className="guide-step-card">
                    <div className="step-badge">STEP 3</div>
                    <h4>Review and export</h4>
                    <p>Check the live map preview and optional room mockup. Open Download to see the file formats and settings currently available for your design.</p>
                  </div>
                </div>
              </section>

              {/* How to Use Studio Tools */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">HOW</span> How to Use Studio Tools Like a Pro?
                </h3>
                <div className="guide-feature-grid">
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🧭</div>
                    <h4>Location search and map movement</h4>
                    <p>Search places through the location field or provide coordinates. Pan, zoom, rotate, and recenter the map with the editor controls.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">📐</div>
                    <h4>Poster and wallpaper layouts</h4>
                    <p>Choose from the layout presets or enter custom width and height. The available presets depend on the selected layout group.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🖼️</div>
                    <h4>Border styles and spacing</h4>
                    <p>Choose among the nine line patterns, adjust line thickness and map gap, and use decorative frame options where available.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">💧</div>
                    <h4>Map themes and colors</h4>
                    <p>Pick a map theme, then edit supported palette colors. Theme controls affect the map appearance; poster text has its own color setting.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">📍</div>
                    <h4>Markers and GPX routes</h4>
                    <p>Place built-in or emoji markers, add supported custom icons, and upload a GPX track. Edit marker placement and route style in their panels.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🛋️</div>
                    <h4>Room preview</h4>
                    <p>Open the room preview to compare the artwork against the available wall colors and frame treatments.</p>
                  </div>
                </div>
              </section>

              {/* What Paper to Use */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHAT</span> How should I choose paper for a print?
                </h3>
                <div className="guide-paper-grid">
                  <div className="guide-paper-card">
                    <div className="paper-tag paper-tag--best">Common option</div>
                    <h4>Enhanced matte paper</h4>
                    <p>Matte paper can reduce glare. Ask your print provider which weight and finish suits the selected file and intended frame.</p>
                  </div>
                  <div className="guide-paper-card">
                    <div className="paper-tag">Satin Sheen</div>
                    <h4>Satin or luster paper</h4>
                    <p>A satin finish has a slight sheen. Compare a sample with your design and the room lighting.</p>
                  </div>
                  <div className="guide-paper-card">
                    <div className="paper-tag">Archival Fine Art</div>
                    <h4>Cotton rag or fine-art paper</h4>
                    <p>Fine-art papers vary by provider. Check the printer's permanence, color, and handling specifications before ordering.</p>
                  </div>
                </div>
              </section>

              {/* What Frame Sizes */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHAT</span> How do I choose a frame size?
                </h3>
                <p className="guide-section-intro">
                  Choose a layout whose aspect ratio and physical dimensions match the frame or print service you plan to use. Check the dimensions shown in the editor and with your printer:
                </p>
                <div className="guide-frames-grid">
                  <div className="guide-frame-pill">
                    <strong>50 x 70 cm (B2)</strong>
                    <span>Check the print provider's size chart</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>70 x 100 cm (B1)</strong>
                    <span>Check the print provider's size chart</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>18 x 24 inches</strong>
                    <span>Check the print provider's size chart</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>24 x 36 inches</strong>
                    <span>Check the print provider's size chart</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>A4 &amp; A3 Format</strong>
                    <span>Check the print provider's size chart</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>Phone Wallpaper</strong>
                    <span>Choose a wallpaper layout that suits your device</span>
                  </div>
                </div>
              </section>

              {/* Where to Print */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHERE</span> Where can I print my design?
                </h3>
                <div className="guide-print-locations-grid">
                  <div className="guide-print-card">
                    <span className="print-type-badge">🏪 Local print shop</span>
                    <h4>Ask your local print provider</h4>
                    <p>Confirm accepted file types, pixel dimensions, paper options, and turnaround with the provider before ordering.</p>
                  </div>
                  <div className="guide-print-card">
                    <span className="print-type-badge">🌐 Online print service</span>
                    <h4>Choose a provider that serves your region</h4>
                    <p>Review that provider's file requirements, paper and frame choices, shipping area, and return terms.</p>
                  </div>
                  <div className="guide-print-card">
                    <span className="print-type-badge">📺 Screen display</span>
                    <h4>Use a compatible wallpaper layout</h4>
                    <p>Check the selected output dimensions and your display's supported image format before transferring the file.</p>
                  </div>
                </div>
              </section>

              {/* Frequently Asked Questions */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">FAQ</span> Frequently Asked Questions
                </h3>
                <div className="guide-faq-accordion">
                  <details className="guide-faq-item" open>
                    <summary className="guide-faq-question">How do I start a map?</summary>
                    <p className="guide-faq-answer">Search for a place in the location field or enter coordinates, then adjust the map area and choose a layout. Place-name search and map tiles rely on external OpenStreetMap-based services.</p>
                  </details>
                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">Can I make a poster for a small town or village?</summary>
                    <p className="guide-faq-answer">You can search by place name or use coordinates to move the map to a specific area. Available map detail depends on the underlying map data at that location.</p>
                  </details>
                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">What can I customize?</summary>
                    <p className="guide-faq-answer">Use the editor to choose a theme and layout, change supported map layers, adjust borders, add location labels and a tagline, and tune text styling.</p>
                  </details>
                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">Can I add my own markers or a walking route?</summary>
                    <p className="guide-faq-answer">Yes. The Markers panel includes built-in and emoji choices and supports custom icon uploads. The Routes panel accepts GPX tracks and provides route and endpoint styling.</p>
                  </details>
                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">Which file formats can I download?</summary>
                    <p className="guide-faq-answer">Open the Download panel to see the formats and output settings currently available for your design. Resolution and file details depend on the selected output and poster dimensions.</p>
                  </details>
                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">Does MAPARTE use my device location automatically?</summary>
                    <p className="guide-faq-answer">No. Device location is requested only when you choose the location control. If you use place search or reverse geocoding, the relevant location query is sent to the map-search service. See the Privacy Policy for details.</p>
                  </details>
                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">Why is OpenStreetMap credited on the map?</summary>
                    <p className="guide-faq-answer">MAPARTE uses OpenStreetMap data and map services. The credit and license link need to remain visible with the map or exported artwork.</p>
                  </details>
                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">How do I prepare a design for printing?</summary>
                    <p className="guide-faq-answer">Choose the intended physical dimensions before exporting. Check the selected file's pixel dimensions and effective resolution with your print provider, and confirm their bleed, color, and paper requirements.</p>
                  </details>
                </div>
              </section>
            </article>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="about-modal-footer">
          <div className="about-modal-footer-info">
            <span>💡 Tip: Press <kbd className="guide-kbd">ESC</kbd> anytime to return to the editor</span>
          </div>
          <button
            type="button"
            className="about-modal-done-btn"
            onClick={onClose}
          >
            ✓ Done &amp; Back to Editor
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
