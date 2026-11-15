import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/shared/ui/Icons";

interface GuidedOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  tip: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "globe-location",
    badge: "Step 1 of 4",
    title: "🌍 3D Globe & Location Search",
    description:
      "Explore a living 3D Earth Globe styled in your active theme. Search any city or country (e.g. Aleppo, Paris, Tokyo, Dehradun) or click to watch the globe spin in 3D and dive supersonic from orbit straight down to street level.",
    tip: "Use mouse wheel or pinch gesture to zoom between orbit and street level anytime.",
  },
  {
    id: "edit-zoom",
    badge: "Step 2 of 4",
    title: "🗺️ Smart Roads & Adaptive Zoom",
    description:
      "Zooming in automatically reveals roads with perfectly balanced thickness, neighborhood names, landmarks, and building labels. Streets never look too thin or bloated.",
    tip: "Click 'Edit Map' or drag to explore every street, alley, and highway with zero lag.",
  },
  {
    id: "themes",
    badge: "Step 3 of 4",
    title: "🎨 Real-time Cartographic Themes",
    description:
      "Choose from luxury styles like Carrara Marble, Noir Minimal, Midnight Blue, Ocean, and Cyber Neon. Every theme dynamically adapts both the 3D globe oceans and the street vectors.",
    tip: "Every color reacts instantly across water, land, highways, and typography.",
  },
  {
    id: "layout-wall",
    badge: "Step 4 of 4",
    title: "🖼️ Poster Layout & 3D Wall Mockup",
    description:
      "When you're ready to create wall art, click 'Poster Layout' to frame your map in the center. Customize your city title, coordinates, and aspect ratio, then test it hanging on a real living room wall with Cinema Wall Mockup.",
    tip: "Export in ultra-sharp 300 DPI PNG or vector PDF for high-end gallery printing.",
  },
];

export default function GuidedOnboardingModal({
  isOpen,
  onClose,
}: GuidedOnboardingModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        void videoRef.current.play().catch(() => {});
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStep = GUIDE_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === GUIDE_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, GUIDE_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    try {
      localStorage.setItem("maparte_onboarding_guide_seen", "true");
    } catch {}
    onClose();
  };

  return (
    <div
      className="guide-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
    >
      <div className="guide-modal-sheet">
        <div className="guide-modal-header">
          <div className="guide-modal-brand">
            <span className="guide-modal-logo">MAPARTE</span>
            <span className="guide-modal-badge">{currentStep.badge}</span>
          </div>
          <button
            type="button"
            className="guide-modal-skip-btn"
            onClick={handleComplete}
            aria-label="Skip Guide"
          >
            Skip Guide ✕
          </button>
        </div>

        {/* Video demonstration */}
        <div className="guide-modal-video-container">
          <video
            ref={videoRef}
            className="guide-modal-video"
            src="/guide-demo.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        </div>

        {/* Step details */}
        <div className="guide-step-body">
          <h2 id="guide-title" className="guide-step-title">
            {currentStep.title}
          </h2>
          <p className="guide-step-description">{currentStep.description}</p>
          <div className="guide-step-tip">
            <span className="guide-tip-icon">💡</span>
            <span className="guide-tip-text">{currentStep.tip}</span>
          </div>
        </div>

        {/* Progress indicators & action buttons */}
        <div className="guide-modal-footer">
          <div className="guide-progress-dots" aria-label="Step progress">
            {GUIDE_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`guide-dot${idx === currentStepIndex ? " is-active" : ""}${idx < currentStepIndex ? " is-completed" : ""}`}
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Go to ${s.title}`}
              />
            ))}
          </div>

          <div className="guide-action-btns">
            {currentStepIndex > 0 ? (
              <button
                type="button"
                className="guide-btn guide-btn--secondary"
                onClick={handleBack}
              >
                ← Back
              </button>
            ) : null}

            <button
              type="button"
              className="guide-btn guide-btn--primary"
              onClick={handleNext}
            >
              {isLastStep ? (
                <>
                  <CheckIcon />
                  <span>Start Exploring MapArte 🚀</span>
                </>
              ) : (
                <span>Next Step →</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
