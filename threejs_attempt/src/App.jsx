import { useMemo, useState } from "react";
import SpringMassScene from "./components/SpringMassScene";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function App() {
  const [mass, setMass] = useState(1.0);
  const [springConstant, setSpringConstant] = useState(7.0);
  const [amplitude, setAmplitude] = useState(1.0);

  const omega = useMemo(() => Math.sqrt(springConstant / mass), [springConstant, mass]);
  const period = useMemo(() => (2 * Math.PI) / omega, [omega]);

  return (
    <main className="app-shell">
      <div className="scene-panel">
        <SpringMassScene mass={mass} springConstant={springConstant} amplitude={amplitude} />
      </div>

      <aside className="controls-panel">
        <h1>Spring-Mass Oscillation</h1>
        <p>
          Undamped simple harmonic motion where the wall-fixed spring pulls a movable block via
          Hooke&apos;s Law and Newton&apos;s Second Law.
        </p>

        <label>
          Mass m (kg): <span>{mass.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.1"
          value={mass}
          onChange={(event) => setMass(clamp(Number(event.target.value), 0.5, 5))}
        />

        <label>
          Spring constant k (N/m): <span>{springConstant.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="2"
          max="20"
          step="0.2"
          value={springConstant}
          onChange={(event) => setSpringConstant(clamp(Number(event.target.value), 2, 20))}
        />

        <label>
          Initial amplitude A (m): <span>{amplitude.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.2"
          max="2.4"
          step="0.1"
          value={amplitude}
          onChange={(event) => setAmplitude(clamp(Number(event.target.value), 0.2, 2.4))}
        />

        <div className="equations">
          <p>F = -k (x - x_eq)</p>
          <p>m * d2x/dt2 = F</p>
          <p>omega = sqrt(k / m) = {omega.toFixed(3)} rad/s</p>
          <p>T = 2 * pi / omega = {period.toFixed(3)} s</p>
        </div>

        <div className="hint">
          <p>Camera controls:</p>
          <p>Left drag: rotate | Wheel: zoom | Right drag: pan</p>
        </div>
      </aside>
    </main>
  );
}
