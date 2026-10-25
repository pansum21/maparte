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
                <span className="guide-pill-badge">✨ 100% Client-Side • Privacy-First • No Watermarks</span>
                <h2 className="guide-hero-title">Design Museum-Quality Custom Map Posters in Ultra-HD & Scalable Vector</h2>
                <p className="guide-hero-desc">
                  Celebrate your life milestones with bespoke cartographic artwork. Whether it is where you first met, where you exchanged vows, bought your first home, or your favorite travel retreat, MAPARTE turns your memories into timeless wall art.
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
                    <h4>100% Free &amp; Instant in Browser</h4>
                    <p>No mandatory sign-ups, subscriptions, or paywalls to design. Everything renders smoothly right inside your web browser in seconds.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🔒</div>
                    <h4>Private &amp; Client-Side</h4>
                    <p>Your coordinates, home addresses, dates, and love messages never leave your computer. 100% private and telemetry-respecting.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🖼️</div>
                    <h4>Zero Watermarks Always</h4>
                    <p>Every exported poster and mobile wallpaper is completely clean without annoying center watermarks or forced ads on your artwork, featuring a discreet gallery studio signature in the lower neatline.</p>
                  </div>
                </div>
              </section>

              {/* Why Ultra-HD? */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHY</span> Why Ultra-HD Resolution & Density Metadata Matter for Map Art?
                </h3>
                <div className="guide-comparison-card">
                  <div className="comparison-col comparison-col--bad">
                    <span className="comparison-badge">Generic Online Generators</span>
                    <ul>
                      <li>❌ Low 72 to 150 DPI resolution files</li>
                      <li>❌ Blurry street labels and pixelated road lines when printed</li>
                      <li>❌ Overpriced: charge $15 to $50 for digital files</li>
                      <li>❌ Large center watermarks on previews</li>
                    </ul>
                  </div>
                  <div className="comparison-divider" aria-hidden="true">VS</div>
                  <div className="comparison-col comparison-col--good">
                    <span className="comparison-badge comparison-badge--gold">MAPARTE Ultra-HD Studio</span>
                    <ul>
                      <li>✅ Up to 48 MP Ultra-HD &amp; Infinite Vector SVG</li>
                      <li>✅ Laser-sharp coastlines, canals, and alleyways up to 70x100 cm</li>
                      <li>✅ Accessible pricing with Buy One Get One (BOGO) Master Bundle</li>
                      <li>✅ Watermark-free downloads &amp; live room wall mockup</li>
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
                  Over 75% of our community creates custom maps as sentimental gifts for life milestones:
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
                    <p>The traditional 1st wedding anniversary gift is paper. A framed Ultra-HD map print of your venue is timeless.</p>
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
                    MAPARTE is an independent, open-source cartography project built with care in Dehradun, India. If you love using Maparte, you can support its development and keep it free:
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
                    <span>MAPARTE v{APP_VERSION} • OpenStreetMap Data © Contributors • Dehradun, India</span>
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
                  Everything you need to know about designing high-resolution cartography, picking the right paper stock, and framing standard gallery prints.
                </p>
              </div>

              {/* How to Create in 3 Steps */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">HOW</span> How to Create Your Custom Map in 3 Simple Steps?
                </h3>
                <div className="guide-steps-grid">
                  <div className="guide-step-card">
                    <div className="step-badge">STEP 1</div>
                    <h4>Search &amp; Frame Your Location</h4>
                    <p>Search any city, neighborhood, or GPS coordinate in the Location bar. Pan, zoom, and rotate the canvas to frame your favorite streets.</p>
                  </div>
                  <div className="guide-step-card">
                    <div className="step-badge">STEP 2</div>
                    <h4>Style, Themes &amp; Milestone Dates</h4>
                    <p>Choose from 12+ cartographic themes (Carrara, Asphalt, Terracotta, Midnight). Customize titles, add wedding dates or coordinates, and drop custom pins.</p>
                  </div>
                  <div className="guide-step-card">
                    <div className="step-badge">STEP 3</div>
                    <h4>Wall Preview &amp; Download</h4>
                    <p>Preview your poster framed against 64 real wall paint colors in Cinema Mode. Download instantly in Ultra-HD PNG, vector PDF, or scalable SVG.</p>
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
                    <div className="feature-card-icon">🎨</div>
                    <h4>Theme &amp; Layout Switcher</h4>
                    <p>Toggle between minimal monochrome, rich terracotta, and luxury midnight blue themes. Calibrate dimensions from standard A4 to 70x100 cm posters.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">🖼️</div>
                    <h4>Wall Color &amp; Frame Mockup</h4>
                    <p>Test how your poster looks inside Classic Black, Natural Scandinavian Oak, Modern White, or Gold frames with realistic glass reflections.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">📺</div>
                    <h4>Cinema Fullscreen Mode</h4>
                    <p>Click Cinema Mode (or press fullscreen) to hide all editing sidebars and view an immersive stage of your artwork on your monitor or TV.</p>
                  </div>
                  <div className="guide-feature-card">
                    <div className="feature-card-icon">📍</div>
                    <h4>Pin Markers &amp; GPX Routes</h4>
                    <p>Drop heart pins or custom icons on special meeting points, or upload GPX tracks to map your cycling or running milestones.</p>
                  </div>
                </div>
              </section>

              {/* What Paper to Use */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHAT</span> What Paper Stock is Best for Museum-Quality Prints?
                </h3>
                <div className="guide-paper-grid">
                  <div className="guide-paper-card">
                    <div className="paper-tag paper-tag--best">★ Recommended Choice</div>
                    <h4>Enhanced Matte Paper (210–250 gsm)</h4>
                    <p>The #1 industry recommendation for minimalist cartography. Absorbs light without glare, delivering deep rich blacks and subtle pastel hues.</p>
                  </div>
                  <div className="guide-paper-card">
                    <div className="paper-tag">Satin Sheen</div>
                    <h4>Satin / Luster Paper (240–260 gsm)</h4>
                    <p>Provides a gentle, premium sheen that makes coastlines, canals, and river contours shimmer without harsh mirror-like reflections.</p>
                  </div>
                  <div className="guide-paper-card">
                    <div className="paper-tag">Archival Fine Art</div>
                    <h4>100% Cotton Rag (300+ gsm)</h4>
                    <p>Heavyweight archival fine-art paper that lasts over 100 years without yellowing. The premier choice for wedding and anniversary gifts.</p>
                  </div>
                </div>
              </section>

              {/* What Frame Sizes */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHAT</span> What Frame Sizes Fit Standard Maparte Exports?
                </h3>
                <p className="guide-section-intro">
                  Maparte exports are mathematically calibrated for standard off-the-shelf frames from IKEA, Target, Amazon, and local framing studios:
                </p>
                <div className="guide-frames-grid">
                  <div className="guide-frame-pill">
                    <strong>50 x 70 cm (B2)</strong>
                    <span>#1 Most popular global gallery size</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>70 x 100 cm (B1)</strong>
                    <span>Statement living room centerpiece</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>18 x 24 inches</strong>
                    <span>Standard North American wall frame</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>24 x 36 inches</strong>
                    <span>Oversized living room &amp; lounge print</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>A4 &amp; A3 Format</strong>
                    <span>Compact desk, bookshelf &amp; bedroom art</span>
                  </div>
                  <div className="guide-frame-pill">
                    <strong>Phone Wallpaper</strong>
                    <span>Calibrated for iPhone 15/16 Pro OLED screens</span>
                  </div>
                </div>
              </section>

              {/* Where to Print */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">WHERE</span> Where Can You Print Your Downloaded File?
                </h3>
                <div className="guide-print-locations-grid">
                  <div className="guide-print-card">
                    <span className="print-type-badge">🏪 Same-Day Local Pickup</span>
                    <h4>Staples, Office Depot, Walgreens &amp; CVS</h4>
                    <p>Upload your Ultra-HD file to their photo portal for budget-friendly same-day printing on heavy matte cardstock in 18x24", 24x36", or 50x70 cm.</p>
                  </div>
                  <div className="guide-print-card">
                    <span className="print-type-badge">🌐 Fine-Art Delivered Prints</span>
                    <h4>WhiteWall, Mpix &amp; Shutterfly</h4>
                    <p>World-class master photo labs that offer genuine Hahnemühle fine-art paper, custom wood frames, and acrylic mounts shipped to your door.</p>
                  </div>
                  <div className="guide-print-card">
                    <span className="print-type-badge">📺 Ambient Smart Displays</span>
                    <h4>Samsung The Frame TV &amp; 4K Displays</h4>
                    <p>Export in wallpaper mode or high-res landscape and upload directly to your Smart TV to transform your living room screen into dynamic art.</p>
                  </div>
                </div>
              </section>

              {/* Frequently Asked Questions */}
              <section className="guide-content-section">
                <h3 className="guide-section-heading">
                  <span className="qa-indicator">FAQ</span> Frequently Asked Questions (FAQ)
                </h3>
                <div className="guide-faq-accordion">
                  <details className="guide-faq-item" open>
                    <summary className="guide-faq-question">
                      Can I print my map on my home printer?
                    </summary>
                    <p className="guide-faq-answer">
                      Yes! Our PNG and vector PDF files are calibrated for standard international paper sizes (A4, A3, Letter, 18x24", 50x70 cm). For best results on home inkjet printers, use heavyweight matte photo paper (200+ gsm).
                    </p>
                  </details>

                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">
                      Can I create a map of a small village or rural countryside?
                    </summary>
                    <p className="guide-faq-answer">
                      Yes! Maparte is powered by global OpenStreetMap cartography, which covers every road, lane, coast, river, and coordinate on planet Earth. Simply search the place name or zoom anywhere on the globe.
                    </p>
                  </details>

                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">
                      Are digital downloads watermark-free?
                    </summary>
                    <p className="guide-faq-answer">
                      Yes, 100%! All exported digital files (including free wallpapers and paid Ultra-HD prints) are completely clean without intrusive center watermarks. Every export includes a discreet studio signature in the lower neatline border, calibrated for gallery framing.
                    </p>
                  </details>

                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">
                      Can I customize the title, date, and subtitle text?
                    </summary>
                    <p className="guide-faq-answer">
                      Yes! Under the Typography and Layout settings, you can edit the primary city name, subtitle, country, coordinates, and add any special occasion date (e.g., '14.02.2024 • Where We First Met').
                    </p>
                  </details>

                  <details className="guide-faq-item">
                    <summary className="guide-faq-question">
                      How does the Buy One Get One (BOGO) guarantee work?
                    </summary>
                    <p className="guide-faq-answer">
                      Our 1-Time BOGO promo code (Buy One Get One Free) is exclusively included with our $9.99 All-in-One Master Bundle tier. Upon purchase, a unique coupon code is delivered directly to your email, unlocking a 100% free second Ultra-HD download for a matching pair or gift.
                    </p>
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
