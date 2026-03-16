import { useMemo, useState } from "react";
import SpringMassScene from "./components/SpringMassScene";
import DoubleSpringMassScene from "./components/DoubleSpringMassScene";
import PendulumScene from "./components/PendulumScene";

export default function App() {
  const mass = 1.0;
  const springConstant = 15.0;
  const amplitude = 3.0;
  const [isPlaying, setIsPlaying] = useState(true);
  const [templateId, setTemplateId] = useState("single");

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
        </div>
      </div>
    </main>
  );
}
