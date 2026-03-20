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

  const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));
  const nudgeValue = (value, delta, min, max) => clampValue(value + delta, min, max);
  const formatValue = (value, precision = 1) => {
    const fixed = value.toFixed(precision);
    return precision > 0 ? fixed.replace(/\.0$/, "") : fixed;
  };

  const templateConfig = useMemo(
    () => ({
      single: {
        label: "Single Spring-Mass",
        title: "Spring-Mass Oscillation",
        description:
          "Undamped simple harmonic motion where the wall-fixed spring pulls a movable block via Hooke's Law and Newton's Second Law.",
        fixedText: "Fixed for now: m = 1.0 kg, k = 15.0 N/m, A = 3.0 m",
        legend: [
          "k: spring constant",
          "omega: angular frequency",
          "Blue: velocity v",
          "Red: restoring force F",
          "x: displacement from equilibrium",
          "A: amplitude"
        ],
        Scene: SpringMassScene
      },
      double: {
        label: "Double Spring-Mass",
        title: "Double Spring-Mass Experiment",
        description:
          "Two springs pull the mass back to center from both sides, making the restoring force stronger than a single spring.",
        fixedText: "Fixed for now: m = 1.0 kg, k = 15.0 N/m (each), A = 3.0 m",
        legend: [
          "v: block velocity (blue arrow)",
          "Left spring force (red)",
          "Right spring force (green)",
          "k: spring constant",
          "omega: angular frequency of oscillation",
          "T: time period to complete one oscillation",
          "A: amplitude",
          "x: displacement from equilibrium"
        ],
        Scene: DoubleSpringMassScene
      },
      pendulum: {
        label: "Simple Pendulum",
        title: "Simple Pendulum Oscillation",
        description:
          "Small-angle pendulum motion where a bob swings about equilibrium under gravity with a rigid support.",
        fixedText: "Fixed for now: m = 1.0 kg, L = 2.8 m, θ_max = 21°",
        legend: [
          "L: string length",
          "theta: angular displacement",
          "theta0: maximum angle",
          "omega: angular frequency",
          "T: time period",
          "v: bob velocity (tangent to arc)",
          "F_t: tangential restoring force"
        ],
        Scene: PendulumScene
      }
    }),
    []
  );

  const activeTemplate = templateConfig[templateId] ?? templateConfig.single;
  const ActiveScene = activeTemplate.Scene;
  const legendItems = activeTemplate.legend ?? [];

  return (
    <main className="app-shell">
      <div className="scene-panel">
        <ActiveScene
          mass={mass}
          springConstant={springConstant}
          amplitude={amplitude}
          isPlaying={isPlaying}
        />
        <div className="param-panel">
          <span className="param-panel-title">Parameters</span>
          <div className="param-item">
            <span className="param-label">Mass (m)</span>
            <div className="param-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setMass(nudgeValue(mass, -1, 0.5, 5))}
                disabled={mass <= 0.5}
                aria-label="Decrease mass"
              >
                -
              </button>
              <span className="param-value">{formatValue(mass, 1)}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setMass(nudgeValue(mass, 1, 0.5, 5))}
                disabled={mass >= 5}
                aria-label="Increase mass"
              >
                +
              </button>
            </div>
          </div>
          <div className="param-item">
            <span className="param-label">Spring Constant (k)</span>
            <div className="param-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setSpringConstant(nudgeValue(springConstant, -1, 5, 30))}
                disabled={springConstant <= 5}
                aria-label="Decrease spring constant"
              >
                -
              </button>
              <span className="param-value">{formatValue(springConstant, 0)}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setSpringConstant(nudgeValue(springConstant, 1, 5, 30))}
                disabled={springConstant >= 30}
                aria-label="Increase spring constant"
              >
                +
              </button>
            </div>
          </div>
          <div className="param-item">
            <span className="param-label">Amplitude (A)</span>
            <div className="param-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setAmplitude(nudgeValue(amplitude, -1, 0.5, 5))}
                disabled={amplitude <= 0.5}
                aria-label="Decrease amplitude"
              >
                -
              </button>
              <span className="param-value">{formatValue(amplitude, 1)}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setAmplitude(nudgeValue(amplitude, 1, 0.5, 5))}
                disabled={amplitude >= 5}
                aria-label="Increase amplitude"
              >
                +
              </button>
            </div>
          </div>
        </div>
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
          {legendItems.length > 0 ? (
            <div className="legend-panel">
              <span className="legend-title">Legend</span>
              <div className="legend-items">
                {legendItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </main>
  );
}

