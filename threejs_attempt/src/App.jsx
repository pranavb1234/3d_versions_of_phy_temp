import { useState } from "react";
import SpringMassScene from "./components/SpringMassScene";

export default function App() {
  const mass = 1.0;
  const springConstant = 15.0;
  const amplitude = 3.0;
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <main className="app-shell">
      <div className="scene-panel">
        <SpringMassScene
          mass={mass}
          springConstant={springConstant}
          amplitude={amplitude}
          isPlaying={isPlaying}
        />
      </div>

      <aside className="controls-panel">
        <h1>Spring-Mass Oscillation</h1>
        <p>
          Undamped simple harmonic motion where the wall-fixed spring pulls a movable block via
          Hooke&apos;s Law and Newton&apos;s Second Law.
        </p>

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

        <p>Fixed for now: m = 1.0 kg, k = 15.0 N/m, A = 3.0 m</p>
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
