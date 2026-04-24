const HOW_IT_WORKS_STEPS = [
  {
    title: "1. Select a Module",
    text: "Choose from interactive topics in oscillations, waves, and optics."
  },
  {
    title: "2. Adjust Parameters",
    text: "Tune variables like mass, gravity, angle, and refractive index in real time."
  },
  {
    title: "3. Visualize Results",
    text: "Watch live motion, equations, and insights update as you experiment."
  }
];

export default function LandingPage({ onStart }) {
  const scrollToSection = (id) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-brand">Physics Lab</div>
        <nav className="landing-links" aria-label="Primary">
          <button type="button" onClick={() => scrollToSection("simulations")}>
            Simulations
          </button>
          <button type="button" onClick={() => scrollToSection("how-it-works")}>
            How It Works
          </button>
          <button type="button" onClick={() => scrollToSection("about")}>
            About
          </button>
        </nav>
        <button type="button" className="landing-nav-cta" onClick={onStart}>
          Start Exploring
        </button>
      </header>

      <section className="landing-hero" id="about">
        <div className="landing-hero-inner">
          <h1>
            Experience Physics <span>Like Never Before</span>
          </h1>
          <p>
            Transform static formulas into interactive 3D simulations. Learn by doing, not just
            reading.
          </p>
          <div className="landing-hero-actions">
            <button type="button" className="landing-primary-btn" onClick={onStart}>
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
          <p>Three simple steps to interactive learning.</p>
        </div>
        <div className="landing-step-grid">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <article key={step.title} className="landing-step-card">
              <div className="landing-step-icon" aria-hidden="true" />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-feature-grid" id="simulations">
        <article className="landing-feature-card">
          <div className="landing-pill">Live Sync</div>
          <h2>Live Formula Sync</h2>
          <p>
            As you adjust sliders and controls, mathematical formulas update instantly beside 3D
            motion so the connection is always visible.
          </p>
          <ul>
            <li>Instant visual feedback</li>
            <li>Side-by-side equation rendering</li>
          </ul>
        </article>
        <div className="landing-media-card formula" aria-hidden="true">
          <div className="formula-overlay">
            <span>LIVE</span>
            <p>F = ma</p>
            <p>x(t) = A sin(omega t)</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-feature-grid reverse">
        <div className="landing-media-card scene" aria-hidden="true">
          <div className="scene-hud">
            <button type="button">+</button>
            <button type="button">-</button>
          </div>
        </div>
        <article className="landing-feature-card">
          <div className="landing-pill">Immersive Environments</div>
          <h2>Interactive 3D Environments</h2>
          <p>
            Move through accurate simulated spaces where you can rotate, inspect, and experiment
            with physical systems as if they were in your hands.
          </p>
          <div className="landing-pro-tip">
            Pro Tip: Pause a simulation to inspect velocity vectors and energy states at key
            moments.
          </div>
        </article>
      </section>

      <section className="landing-final-cta">
        <h2>Ready to dive in?</h2>
        <p>
          Start your journey into interactive physics today. No installation required, everything
          runs directly in your browser.
        </p>
        <button type="button" className="landing-primary-btn" onClick={onStart}>
          Launch Lab
        </button>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>Physics Lab</strong>
          <p>Precision in learning.</p>
        </div>
        <div className="landing-footer-links">
          <button type="button">Privacy Policy</button>
          <button type="button">Terms</button>
          <button type="button">Contact</button>
          <button type="button">Documentation</button>
        </div>
      </footer>
    </div>
  );
}
