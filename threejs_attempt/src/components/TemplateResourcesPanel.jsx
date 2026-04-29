import { useEffect, useMemo } from "react";

const RESOURCE_LIBRARY = {
  oscillations: {
    core: [
      {
        title: "Simple Harmonic Motion Overview",
        source: "Khan Academy",
        url: "https://www.khanacademy.org/science/physics/mechanical-waves-and-sound"
      },
      {
        title: "Oscillations and SHM Notes",
        source: "HyperPhysics",
        url: "http://hyperphysics.phy-astr.gsu.edu/hbase/shm.html"
      }
    ],
    simulations: {
      single: [
        {
          title: "Hooke's Law and Spring Systems",
          source: "Physics Classroom",
          url: "https://www.physicsclassroom.com/class/springs"
        }
      ],
      double: [
        {
          title: "Combined Spring Stiffness and Oscillation",
          source: "OpenStax University Physics",
          url: "https://openstax.org/books/university-physics-volume-1/pages/15-1-simple-harmonic-motion"
        }
      ],
      pendulum: [
        {
          title: "Simple Pendulum Theory",
          source: "OpenStax University Physics",
          url: "https://openstax.org/books/university-physics-volume-1/pages/15-5-pendulums"
        }
      ]
    }
  },
  waves: {
    core: [
      {
        title: "Wave Basics (Amplitude, Wavelength, Frequency)",
        source: "Khan Academy",
        url: "https://www.khanacademy.org/science/physics/mechanical-waves-and-sound"
      },
      {
        title: "Mechanical Waves Summary",
        source: "Physics Classroom",
        url: "https://www.physicsclassroom.com/class/waves"
      }
    ],
    simulations: {
      static_markers: [
        {
          title: "Reading Wave Parameters from Graphs",
          source: "Physics Classroom",
          url: "https://www.physicsclassroom.com/class/waves/Lesson-2/The-Anatomy-of-a-Wave"
        }
      ],
      compare: [
        {
          title: "Transverse vs Longitudinal Waves",
          source: "BBC Bitesize",
          url: "https://www.bbc.co.uk/bitesize/guides/ztw7y4j/revision/1"
        }
      ],
      standing: [
        {
          title: "Standing Waves and Harmonics",
          source: "OpenStax",
          url: "https://openstax.org/books/college-physics-2e/pages/16-11-waves"
        }
      ]
    }
  },
  optics: {
    core: [
      {
        title: "Geometrical Optics Review",
        source: "Khan Academy",
        url: "https://www.khanacademy.org/science/physics/geometric-optics"
      },
      {
        title: "Ray Optics Concepts",
        source: "Physics Classroom",
        url: "https://www.physicsclassroom.com/class/refrn"
      }
    ],
    simulations: {
      refraction: [
        {
          title: "Snell's Law and Total Internal Reflection",
          source: "OpenStax",
          url: "https://openstax.org/books/college-physics-2e/pages/25-4-total-internal-reflection"
        }
      ],
      mirror_formula: [
        {
          title: "Spherical Mirrors and Mirror Formula",
          source: "Khan Academy",
          url: "https://www.khanacademy.org/science/physics/geometric-optics/mirrors"
        }
      ]
    }
  }
};

export default function TemplateResourcesPanel({
  chapterId,
  simulationId,
  chapterLabel,
  simulationLabel,
  isOpen,
  onClose = () => {}
}) {
  const resources = useMemo(() => {
    const chapterResources = RESOURCE_LIBRARY[chapterId] ?? { core: [], simulations: {} };
    return {
      core: chapterResources.core ?? [],
      simulation: chapterResources.simulations?.[simulationId] ?? []
    };
  }, [chapterId, simulationId]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <section className={`resources-widget ${isOpen ? "open" : ""}`} aria-label="Study resources">
      <div className={`resources-backdrop ${isOpen ? "open" : ""}`} onClick={onClose} />
      <aside
        id="template-resources-panel"
        className={`resources-panel ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        <div className="resources-head">
          <div>
            <div className="resources-title">Study Resources</div>
            <div className="resources-scope">
              {chapterLabel} / {simulationLabel}
            </div>
          </div>
          <button type="button" className="resources-close-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="resources-scroll">
          <section className="resources-group">
            <h3>Core Concepts</h3>
            <div className="resources-list">
              {resources.core.map((item) => (
                <a
                  key={`${item.title}-${item.url}`}
                  className="resource-item"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="resource-title">{item.title}</span>
                  <span className="resource-source">{item.source}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="resources-group">
            <h3>Simulation Focus</h3>
            <div className="resources-list">
              {resources.simulation.length > 0 ? (
                resources.simulation.map((item) => (
                  <a
                    key={`${item.title}-${item.url}`}
                    className="resource-item"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="resource-title">{item.title}</span>
                    <span className="resource-source">{item.source}</span>
                  </a>
                ))
              ) : (
                <div className="resource-empty">No simulation-specific resources available yet.</div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </section>
  );
}
