import { useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
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
  const formatNumber = (value, digits = 2) => {
    const safe = Number.isFinite(value) ? value : 0;
    const fixed = safe.toFixed(digits);
    return fixed.replace(/\.00$/, "");
  };
  const toRad = (deg) => (deg * Math.PI) / 180;

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
        fixedText: "Fixed for now: m = 1.0 kg, L = 2.8 m, θ_max = 21 deg",
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
  const calculations = useMemo(() => {
    const safeMass = Math.max(mass, 0.001);
    const safeK = Math.max(springConstant, 0.001);
    const safeA = Math.max(amplitude, 0.001);

    if (templateId === "double") {
      const kEff = 2 * safeK;
      const omega = Math.sqrt(kEff / safeMass);
      const period = 2 * Math.PI * Math.sqrt(safeMass / kEff);
      const vMax = omega * safeA;
      const aMax = omega * omega * safeA;
      const energy = 0.5 * kEff * safeA * safeA;
      return {
        title: "Calculations",
        rows: [
          { latex: "k_{eff} = 2k", value: `${formatNumber(kEff)} N/m` },
          { latex: "\\omega = \\sqrt{\\frac{k_{eff}}{m}}", value: `${formatNumber(omega)} rad/s` },
          { latex: "T = 2\\pi\\sqrt{\\frac{m}{k_{eff}}}", value: `${formatNumber(period)} s` },
          { latex: "x(t) = A\\sin(\\omega t)" },
          { latex: "v_{max} = \\omega A", value: `${formatNumber(vMax)} m/s` },
          { latex: "a_{max} = \\omega^2 A", value: `${formatNumber(aMax)} m/s^2` },
          { latex: "E = \\frac{1}{2}k_{eff}A^2", value: `${formatNumber(energy)} J` }
        ]
      };
    }

    if (templateId === "pendulum") {
      const length = 2.8;
      const g = 9.81;
      const theta0Deg = clampValue(amplitude * 7, 8, 35);
      const theta0 = toRad(theta0Deg);
      const omega = Math.sqrt(g / length);
      const period = 2 * Math.PI * Math.sqrt(length / g);
      const vMax = omega * length * theta0;
      const energy = 0.5 * safeMass * length * length * omega * omega * theta0 * theta0;
      return {
        title: "Calculations",
        rows: [
          { latex: "\\omega = \\sqrt{\\frac{g}{L}}", value: `${formatNumber(omega)} rad/s` },
          { latex: "T = 2\\pi\\sqrt{\\frac{L}{g}}", value: `${formatNumber(period)} s` },
          {
            latex: "\\theta_0",
            value: `${formatNumber(theta0, 3)} rad (${formatNumber(theta0Deg, 1)} deg)`
          },
          { latex: "\\theta(t) = \\theta_0\\cos(\\omega t)" },
          { latex: "v_{max} = \\omega L\\theta_0", value: `${formatNumber(vMax)} m/s` },
          {
            latex: "E = \\frac{1}{2}mL^2\\omega^2\\theta_0^2",
            value: `${formatNumber(energy)} J`
          }
        ]
      };
    }

    const omega = Math.sqrt(safeK / safeMass);
    const period = 2 * Math.PI * Math.sqrt(safeMass / safeK);
    const vMax = omega * safeA;
    const aMax = omega * omega * safeA;
    const energy = 0.5 * safeK * safeA * safeA;
    return {
      title: "Calculations",
      rows: [
        { latex: "\\omega = \\sqrt{\\frac{k}{m}}", value: `${formatNumber(omega)} rad/s` },
        { latex: "T = 2\\pi\\sqrt{\\frac{m}{k}}", value: `${formatNumber(period)} s` },
        { latex: "x(t) = A\\sin(\\omega t)" },
        { latex: "v_{max} = \\omega A", value: `${formatNumber(vMax)} m/s` },
        { latex: "a_{max} = \\omega^2 A", value: `${formatNumber(aMax)} m/s^2` },
        { latex: "E = \\frac{1}{2}kA^2", value: `${formatNumber(energy)} J` }
      ]
    };
  }, [templateId, mass, springConstant, amplitude]);

  const effects = useMemo(() => {
    if (templateId === "pendulum") {
      return [
        "Mass does not change the period (small-angle); it changes energy.",
        "Increasing amplitude raises max speed and energy; period stays nearly the same.",
        "Length and gravity set omega and the period in this model."
      ];
    }
    if (templateId === "double") {
      return [
        "Increasing mass decreases omega, so the period increases.",
        "Increasing k raises omega and shortens the period (effective stiffness is 2k).",
        "Increasing amplitude increases max speed and total energy; period stays the same."
      ];
    }
    return [
      "Increasing mass decreases omega, so the period increases.",
      "Increasing k raises omega and shortens the period.",
      "Increasing amplitude increases max speed and total energy; period stays the same."
    ];
  }, [templateId]);

  const renderFormula = (latex) => ({
    __html: katex.renderToString(latex, { throwOnError: false })
  });

  return (
    <main className="app-shell">
      <div className="scene-panel">
        <ActiveScene
          mass={mass}
          springConstant={springConstant}
          amplitude={amplitude}
          isPlaying={isPlaying}
        />
        <div className="left-stack">
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
          {effects.length > 0 ? (
            <div className="param-notes-block">
              <span className="param-notes-title">What Changes</span>
              <div className="param-notes-list">
                {effects.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
          {calculations?.rows?.length ? (
            <div className="calc-panel calc-panel-left">
              <span className="calc-title">{calculations.title}</span>
              <div className="calc-list">
                {calculations.rows.map((row, index) => (
                  <div
                    key={`${row.latex}-${index}`}
                    className={`calc-row ${row.value ? "has-value" : "no-value"}`}
                  >
                    <span
                      className="calc-formula"
                      dangerouslySetInnerHTML={renderFormula(row.latex)}
                    />
                    {row.value ? <span className="calc-value">{row.value}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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


