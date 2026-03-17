import { useMemo, useState } from "react";
import SpringMassScene from "./components/SpringMassScene";
import DoubleSpringMassScene from "./components/DoubleSpringMassScene";
import PendulumScene from "./components/PendulumScene";

export default function App() {
  const [mass, setMass] = useState(1.0);
  const [springConstant, setSpringConstant] = useState(15.0);
  const [amplitude, setAmplitude] = useState(3.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [templateId, setTemplateId] = useState("single");
  const [isParamOpen, setIsParamOpen] = useState(false);

  const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

  const templateConfig = useMemo(
    () => ({
      single: {
        label: "Single Spring-Mass",
        title: "Spring-Mass Oscillation",
        description:
          "Undamped simple harmonic motion where the wall-fixed spring pulls a movable block via Hooke's Law and Newton's Second Law.",
        fixedText: "Fixed for now: m = 1.0 kg, k = 15.0 N/m, A = 3.0 m",
        Scene: SpringMassScene
      },
      double: {
        label: "Double Spring-Mass",
        title: "Double Spring-Mass Experiment",
        description:
          "Two springs pull the mass back to center from both sides, making the restoring force stronger than a single spring.",
        fixedText: "Fixed for now: m = 1.0 kg, k = 15.0 N/m (each), A = 3.0 m",
        Scene: DoubleSpringMassScene
      },
      pendulum: {
        label: "Simple Pendulum",
        title: "Simple Pendulum Oscillation",
        description:
          "Small-angle pendulum motion where a bob swings about equilibrium under gravity with a rigid support.",
        fixedText: "Fixed for now: m = 1.0 kg, L = 2.8 m, θ_max = 21°",
        Scene: PendulumScene
      }
    }),
    []
  );

  const activeTemplate = templateConfig[templateId] ?? templateConfig.single;
  const ActiveScene = activeTemplate.Scene;

  return (
    <main className="app-shell">
      <div className="scene-panel">
        <ActiveScene
          mass={mass}
          springConstant={springConstant}
          amplitude={amplitude}
          isPlaying={isPlaying}
        />
        <div className="scene-controls">
          <label className="template-select">
            <span>Template</span>
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              <option value="single">{templateConfig.single.label}</option>
              <option value="double">{templateConfig.double.label}</option>
              <option value="pendulum">{templateConfig.pendulum.label}</option>
            </select>
          </label>

          <div className="sim-toggle">
            <span>Simulation:</span>
            <button
              type="button"
              className={`sim-toggle-btn ${isPlaying ? "playing" : "paused"}`}
              onClick={() => setIsPlaying((prev) => !prev)}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
          <button
            type="button"
            className="param-trigger"
            onClick={() => setIsParamOpen(true)}
          >
            Parameters
          </button>
        </div>

        <div
          className={`param-drawer-overlay ${isParamOpen ? "open" : ""}`}
          onClick={() => setIsParamOpen(false)}
        >
          <aside className="param-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="param-drawer-header">
              <span>Oscillation Parameters</span>
              <button type="button" onClick={() => setIsParamOpen(false)}>
                Close
              </button>
            </div>

            <div className="param-group">
              <div className="param-notes">
                <p>
                  On changing m: ⬆️ increase m and the system oscillates slower, ω
                  decreases, and the time period T increases.
                </p>
              </div>
              <label>
                <span>Mass (m)</span>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={mass}
                  onChange={(event) =>
                    setMass(clampValue(Number(event.target.value), 0.5, 5))
                  }
                />
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={mass}
                  onChange={(event) =>
                    setMass(clampValue(Number(event.target.value), 0.5, 5))
                  }
                />
              </label>

              <div className="param-notes">
                <p>
                  Spring Constant (k) measures stiffness. ⬆️ Increase k makes the
                  restoring force stronger, the mass returns faster, ω increases,
                  and T decreases.
                </p>
              </div>
              <label>
                <span>Spring Constant (k)</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="0.5"
                  value={springConstant}
                  onChange={(event) =>
                    setSpringConstant(clampValue(Number(event.target.value), 5, 30))
                  }
                />
                <input
                  type="number"
                  min="5"
                  max="30"
                  step="0.5"
                  value={springConstant}
                  onChange={(event) =>
                    setSpringConstant(clampValue(Number(event.target.value), 5, 30))
                  }
                />
              </label>

              <div className="param-notes">
                <p>
                  Amplitude (A) is the maximum distance from center. ⬆️ Increase A
                  so the mass moves farther from equilibrium, speed increases
                  (v_max = ωA), energy increases, while the time period stays the
                  same.
                </p>
              </div>
              <label>
                <span>Amplitude (A)</span>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={amplitude}
                  onChange={(event) =>
                    setAmplitude(clampValue(Number(event.target.value), 0.5, 5))
                  }
                />
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={amplitude}
                  onChange={(event) =>
                    setAmplitude(clampValue(Number(event.target.value), 0.5, 5))
                  }
                />
              </label>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
