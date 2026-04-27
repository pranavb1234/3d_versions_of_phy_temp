import { useMemo, useState } from "react";
import heroBackgroundVideo from "../../5373-183629075 (1).mp4";
import flowImage from "../../flow.png";

const CHAPTER_OPTIONS = [
  { id: "oscillations", label: "Oscillations" },
  { id: "waves", label: "Waves" },
  { id: "optics", label: "Optics" }
];

const SIMULATION_CATALOG = {
  oscillations: [
    {
      id: "single",
      title: "Single Spring-Mass",
      topic: "Oscillations",
      imageTheme: "spring",
      imageTag: "m-k"
    },
    {
      id: "double",
      title: "Double Spring-Mass",
      topic: "Oscillations",
      imageTheme: "double",
      imageTag: "2m-k"
    },
    {
      id: "pendulum",
      title: "Simple Pendulum",
      topic: "Oscillations",
      imageTheme: "pendulum",
      imageTag: "theta"
    }
  ],
  waves: [
    {
      id: "static_markers",
      title: "Wave Markers (Static)",
      topic: "Waves",
      imageTheme: "wave",
      imageTag: "lambda"
    },
    {
      id: "compare",
      title: "Transverse vs Longitudinal",
      topic: "Waves",
      imageTheme: "compare",
      imageTag: "TxL"
    },
    {
      id: "standing",
      title: "Standing Waves",
      topic: "Waves",
      imageTheme: "standing",
      imageTag: "n=3"
    }
  ],
  optics: [
    {
      id: "refraction",
      title: "Refraction (Snell's Law)",
      topic: "Optics",
      imageTheme: "refraction",
      imageTag: "n1/n2"
    },
    {
      id: "mirror_formula",
      title: "Spherical Mirrors",
      topic: "Optics",
      imageTheme: "mirror",
      imageTag: "1/f"
    }
  ]
};

export default function LandingPage({ onStart }) {
  const [selectedChapterId, setSelectedChapterId] = useState("oscillations");

  const scrollToSection = (id) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const chapterSimulations = useMemo(
    () => SIMULATION_CATALOG[selectedChapterId] ?? [],
    [selectedChapterId]
  );
  const handleStartDefault = () => {
    if (typeof onStart === "function") {
      onStart();
    }
  };
  const handleLaunchSimulation = (simulationId) => {
    if (typeof onStart === "function") {
      onStart({ chapterId: selectedChapterId, simulationId });
    }
  };

  return (
    <div className="landing-page">
      <section className="landing-hero" id="about">
        <div className="landing-hero-bg" aria-hidden="true">
          <video
            className="landing-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={heroBackgroundVideo} type="video/mp4" />
          </video>
          <div className="landing-hero-overlay" />
        </div>
        <div className="landing-hero-inner">
          <div className="landing-hero-kicker">A physics learning/simulation lab</div>
          <h1>Unfold : Physics</h1>
          <p>
            Experience physics like never before. Transform static formulas into interactive 3D
            simulations, and learn by doing instead of only reading.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="landing-primary-btn" onClick={handleStartDefault}>
              Start Exploring
            </button>
            <button
              type="button"
              className="landing-secondary-btn"
              onClick={() => scrollToSection("simulations")}
            >
              View Demo
            </button>
          </div>
        </div>
      </section>

      <section className="landing-section landing-steps" id="how-it-works">
        <div className="landing-section-head">
          <h2>How It Works</h2>
        </div>
        <div className="landing-how-flow-wrap">
          <img src={flowImage} alt="How it works process flow diagram" className="landing-how-flow-image" />
        </div>
      </section>

      <section className="landing-section landing-simulations-showcase" id="simulations">
        <div className="landing-sim-header">
          <div className="landing-pill">Simulations</div>
          <h2>Choose chapter and open a simulation</h2>
          <p>Select a chapter from the top-left menu, then pick any card below.</p>
        </div>
        <div className="landing-chapter-menu-block">
          <label className="landing-chapter-menu" htmlFor="landing-chapter-select">
            <span>Chapter</span>
            <select
              id="landing-chapter-select"
              value={selectedChapterId}
              onChange={(event) => setSelectedChapterId(event.target.value)}
            >
              {CHAPTER_OPTIONS.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="landing-sim-card-grid">
          {chapterSimulations.map((simulation) => (
            <article key={simulation.id} className="landing-sim-card">
              <div className={`landing-sim-card-image ${simulation.imageTheme}`} aria-hidden="true">
                <span>{simulation.imageTag}</span>
              </div>
              <div className="landing-sim-card-copy">
                <h3>{simulation.title}</h3>
                <p>{simulation.topic}</p>
              </div>
              <button
                type="button"
                className="landing-sim-card-go"
                onClick={() => handleLaunchSimulation(simulation.id)}
                aria-label={`Open ${simulation.title}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 12h12m-5-5 5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <h2>Ready to dive in?</h2>
        <p>
          Start your journey into interactive physics today. No installation required, everything
          runs directly in your browser.
        </p>
        <button type="button" className="landing-primary-btn" onClick={handleStartDefault}>
          Launch Lab
        </button>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>Unfold : Physics</strong>
          <p>A physics learning/simulation lab.</p>
        </div>
      </footer>
    </div>
  );
}
