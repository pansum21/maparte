import { useEffect } from "react";
import AboutTabContent from "@/shared/ui/AboutTabContent";
import "./aboutPage.css";

export default function AboutPage() {
  useEffect(() => {
    document.title = "About MAPARTE";
  }, []);

  return (
    <div className="about-page">
      <header className="about-page__header">
        <a className="about-page__brand" href="/" aria-label="MAPARTE home">
          <img src="/assets/logo.svg" alt="" />
          <span>MAPARTE</span>
        </a>
        <nav className="about-page__nav" aria-label="Page links">
          <a href="/?editor=true&guide=1">Guide</a>
          <a href="/?editor=true">Make your map</a>
        </nav>
      </header>
      <main className="about-page__main">
        <AboutTabContent />
      </main>
      <footer className="about-page__footer">
        <span>© {new Date().getFullYear()} MAPARTE. Made for places that stay with you.</span>
        <a href="/">Back to home</a>
      </footer>
    </div>
  );
}
