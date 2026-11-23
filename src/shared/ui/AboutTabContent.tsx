import { GitHubIcon, StarIcon, LinkedInIcon, InstagramIcon, RedditIcon, ThreadsIcon, YouTubeIcon } from "./Icons";
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

export default function AboutTabContent() {
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

  return (
    <>
      <article className="about-tab-content">
        {/* Hero Banner */}
        <div className="guide-hero-banner">
          <span className="guide-pill-badge">MAPARTE · Custom map design studio</span>
          <h2 className="guide-hero-title">Turn a place that matters into map art</h2>
          <p className="guide-hero-desc">
            Choose a place and map area, then design a poster or phone wallpaper with custom text, 13 border styles, markers, and routes. Preview the result in the editor or against a room wall photo.
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
              <p>Choose a poster or wallpaper size and one of 13 border styles. Adjust line thickness and map spacing, then choose a solid color or gradient.</p>
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
              <p>In Special Full Screen, upload a wall photo and use Adjust Poster and Layout to position the preview. On supported phones, Open Camera can show a live room view after you grant camera permission.</p>
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
                <li>Adjust map layers, 13 border styles, colors, gradients, and spacing</li>
                <li>Set dimensions for a poster or wallpaper</li>
              </ul>
            </div>
            <div className="comparison-divider" aria-hidden="true">→</div>
            <div className="comparison-col comparison-col--good">
              <span className="comparison-badge comparison-badge--gold">2 · Personalize and preview</span>
              <ul>
                <li>Add labels, a date, or a tagline</li>
                <li>Place markers or import a GPX route</li>
                <li>Upload a wall photo or use the supported mobile camera preview</li>
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
    </>
  );
}
