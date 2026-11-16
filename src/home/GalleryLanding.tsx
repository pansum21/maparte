import { useEffect } from "react";
import "./galleryLanding.css";

const galleries = {
  maps: {
    eyebrow: "MAPARTE COLLECTION 01",
    title: "Map gallery",
    description: "Real MAPARTE map artwork, gathered by place and story.",
    note: "This page is reserved for your map designs. We’ll add the actual gallery content separately.",
  },
  themes: {
    eyebrow: "MAPARTE COLLECTION 02",
    title: "Theme gallery",
    description: "The same streets, seen in different colours and moods.",
    note: "This page is reserved for the themes from your themes folder. We’ll add the actual gallery content separately.",
  },
  layouts: {
    eyebrow: "MAPARTE COLLECTION 03",
    title: "Layout gallery",
    description: "Ways to arrange the map, its title and the details around it.",
    note: "This page is reserved for the layouts from your layouts folder. We’ll add the actual gallery content separately.",
  },
  borders: {
    eyebrow: "MAPARTE COLLECTION 04",
    title: "Border gallery",
    description: "A closer look at the frames and edges for your map.",
    note: "This page is reserved for the borders from your border folder. We’ll add the actual gallery content separately.",
  },
} as const;

type GalleryKey = keyof typeof galleries;

export default function GalleryLanding() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const pathKey = pathParts[pathParts.length - 1] as GalleryKey | undefined;
  const queryKey = new URLSearchParams(window.location.search).get("gallery") as GalleryKey | null;
  const key = queryKey || pathKey;
  const gallery = key && key in galleries ? galleries[key] : galleries.maps;

  useEffect(() => {
    document.title = `${gallery.title} — MAPARTE`;
    return () => { document.title = "MAPARTE | Create Digital Map Art & Phone Wallpapers"; };
  }, [gallery.title]);

  return (
    <main className="gallery-landing">
      <header className="gallery-landing__header">
        <a className="gallery-landing__brand" href="/">MAPARTE</a>
        <a className="journey-glass gallery-landing__back" href="/">Back to the journey</a>
      </header>
      <section className="gallery-landing__content" aria-labelledby="gallery-title">
        <span className="gallery-landing__eyebrow">{gallery.eyebrow}</span>
        <h1 id="gallery-title">{gallery.title.split(" ")[0]} <em>{gallery.title.split(" ").slice(1).join(" ")}</em></h1>
        <p className="gallery-landing__description">{gallery.description}</p>
        <div className="gallery-landing__note">
          <span>THE COLLECTION COMES NEXT</span>
          <p>{gallery.note}</p>
        </div>
        <a className="journey-glass gallery-landing__make" href="/?dist=5235000">Start with a place</a>
      </section>
      <footer className="gallery-landing__footer"><span>MAPARTE.COM</span><span>Map it. Make it yours.</span></footer>
    </main>
  );
}
