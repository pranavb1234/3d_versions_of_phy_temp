import { useMemo, useState } from "react";
import SpringMassScene from "./components/SpringMassScene";
import DoubleSpringMassScene from "./components/DoubleSpringMassScene";

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
        title: "Double Spring-Mass Oscillation",
        description:
          "Mass connected to two identical springs fixed to both walls; the net restoring force is the sum of both springs.",
        fixedText: "Fixed for now: m = 1.0 kg, k = 15.0 N/m (each), A = 3.0 m",
        Scene: DoubleSpringMassScene
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
      </div>

      <aside className="controls-panel">
        <h1>{activeTemplate.title}</h1>
        <p>{activeTemplate.description}</p>

        <label className="template-select">
          <span>Template</span>
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="single">{templateConfig.single.label}</option>
            <option value="double">{templateConfig.double.label}</option>
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

        <p>{activeTemplate.fixedText}</p>
        {/*
          Parameter controls are intentionally hidden for now:
          - Mass slider
          - Spring constant slider
          - Amplitude slider
          - Formula/equation block
        */}

        <div className="hint">
          <p>Camera controls:</p>
          <p>Left drag: rotate | Wheel: zoom | Right drag: pan</p>
        </div>
      </aside>
    </main>
  );
}
