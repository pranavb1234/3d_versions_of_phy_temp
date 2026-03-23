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
  const [activeParamInfo, setActiveParamInfo] = useState(null);
  const [activeCalc, setActiveCalc] = useState(null);

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
  const paramInfo = useMemo(
    () => ({
      mass:
        "Mass (m) is the inertia of the block. Larger m means slower oscillations and a longer period.",
      springConstant:
        "Spring constant (k) measures stiffness. Larger k means faster oscillations and a shorter period.",
      amplitude:
        "Amplitude (A) is the starting displacement from equilibrium. Larger A increases max speed and energy."
    }),
    []
  );

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
          {
            title: "Effective Spring Constant",
            latex: "k_{eff} = 2k",
            value: `${formatNumber(kEff)} N/m`,
            detail:
              "Two springs act together, so their stiffness adds. We use k_eff in omega, T, and energy."
          },
          {
            title: "Angular Frequency",
            latex: "\\omega = \\sqrt{\\frac{k_{eff}}{m}}",
            value: `${formatNumber(omega)} rad/s`,
            detail:
              "Omega sets how fast the oscillation happens. Larger k_eff increases omega; larger m decreases it."
          },
          {
            title: "Period",
            latex: "T = 2\\pi\\sqrt{\\frac{m}{k_{eff}}}",
            value: `${formatNumber(period)} s`,
            detail: "Time for one full oscillation. T = 2*pi/omega."
          },
          {
            title: "Displacement",
            latex: "x(t) = A\\sin(\\omega t)",
            detail:
              "Position as a function of time. The sine form assumes x(0) = 0 and peaks at +/-A."
          },
          {
            title: "Maximum Speed",
            latex: "v_{max} = \\omega A",
            value: `${formatNumber(vMax)} m/s`,
            detail: "Maximum speed occurs at the center (equilibrium)."
          },
          {
            title: "Maximum Acceleration",
            latex: "a_{max} = \\omega^2 A",
            value: `${formatNumber(aMax)} m/s^2`,
            detail: "Maximum acceleration occurs at the extremes (x = +/-A)."
          },
          {
            title: "Total Energy",
            latex: "E = \\frac{1}{2}k_{eff}A^2",
            value: `${formatNumber(energy)} J`,
            detail: "Total mechanical energy for the ideal system is constant."
          }
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
          {
            title: "Angular Frequency",
            latex: "\\omega = \\sqrt{\\frac{g}{L}}",
            value: `${formatNumber(omega)} rad/s`,
            detail: "Small-angle approximation: omega depends only on gravity and length."
          },
          {
            title: "Period",
            latex: "T = 2\\pi\\sqrt{\\frac{L}{g}}",
            value: `${formatNumber(period)} s`,
            detail: "Time for one swing cycle. Mass does not affect T (small-angle)."
          },
          {
            title: "Maximum Angle",
            latex: "\\theta_0",
            value: `${formatNumber(theta0, 3)} rad (${formatNumber(theta0Deg, 1)} deg)`,
            detail:
              "Peak angular displacement derived from the amplitude control and clamped for small angles."
          },
          {
            title: "Angular Position",
            latex: "\\theta(t) = \\theta_0\\cos(\\omega t)",
            detail: "Angle as a function of time for small-angle SHM."
          },
          {
            title: "Maximum Speed",
            latex: "v_{max} = \\omega L\\theta_0",
            value: `${formatNumber(vMax)} m/s`,
            detail: "Maximum speed occurs at the bottom of the swing."
          },
          {
            title: "Total Energy",
            latex: "E = \\frac{1}{2}mL^2\\omega^2\\theta_0^2",
            value: `${formatNumber(energy)} J`,
            detail: "Total energy for the small-angle pendulum model."
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
        {
          title: "Given Values",
          latex: `\\text{Given } m = ${formatNumber(safeMass)}\\,\\text{kg},\\; k = ${formatNumber(
            safeK
          )}\\,\\text{N/m},\\; A = ${formatNumber(safeA)}\\,\\text{m}`,
          detail: `Using the current parameters: m = ${formatNumber(
            safeMass
          )} kg, k = ${formatNumber(safeK)} N/m, A = ${formatNumber(safeA)} m.`
        },
        {
          title: "Angular Frequency",
          latex: "\\omega = \\sqrt{\\frac{k}{m}}",
          value: `${formatNumber(omega)} rad/s`,
          detail:
            "Omega sets how fast the oscillation happens. Larger k increases omega; larger m decreases it."
        },
        {
          title: "Period",
          latex: "T = 2\\pi\\sqrt{\\frac{m}{k}}",
          value: `${formatNumber(period)} s`,
          detail: "Time for one full oscillation. T = 2*pi/omega."
        },
        {
          title: "Displacement",
          latex: "x(t) = A\\sin(\\omega t)",
          detail:
            "Position as a function of time. The sine form assumes x(0) = 0 and peaks at +/-A."
        },
        {
          title: "Velocity",
          latex: "v(t) = A\\omega\\cos(\\omega t)",
          detail: "Velocity is the time-derivative of displacement."
        },
        {
          title: "Acceleration",
          latex: "a(t) = -A\\omega^2\\sin(\\omega t)",
          detail: "Acceleration is the time-derivative of velocity and equals -omega^2 x(t)."
        },
        {
          title: "Maximum Speed",
          latex: "v_{max} = \\omega A",
          value: `${formatNumber(vMax)} m/s`,
          detail: "Maximum speed occurs at the center (equilibrium)."
        },
        {
          title: "Maximum Acceleration",
          latex: "a_{max} = \\omega^2 A",
          value: `${formatNumber(aMax)} m/s^2`,
          detail: "Maximum acceleration occurs at the extremes (x = +/-A)."
        },
        {
          title: "Total Energy",
          latex: "E = \\frac{1}{2}kA^2",
          value: `${formatNumber(energy)} J`,
          detail: "Total mechanical energy for the ideal system is constant."
        }
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
  const toggleParamInfo = (key) => {
    setActiveParamInfo((prev) => (prev === key ? null : key));
  };
  const openCalcModal = (row) => {
    setActiveCalc(row);
  };
  const closeCalcModal = () => {
    setActiveCalc(null);
  };

  return (
    <main className="app-shell">
      <div className="shm-frame">
        <aside className="shm-left shm-left-calc">
          <div className="shm-left-title">Calculations</div>
          <div className="shm-calc-panel">
            <div className="calc-title">{calculations.title}</div>
            <div className="calc-list">
              {calculations.rows.map((row, index) => (
                <div
                  key={`${row.latex}-${index}`}
                  className={`calc-row ${row.value ? "" : "no-value"}`}
                >
                  <button
                    type="button"
                    className="calc-info-btn"
                    onClick={() => openCalcModal(row)}
                    aria-label="Open calculation details"
                  >
                    ▶
                  </button>
                  <div className="calc-formula" dangerouslySetInnerHTML={renderFormula(row.latex)} />
                  {row.value ? <div className="calc-value">= {row.value}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="shm-center">
          <div className="shm-simBox">
            <div className="shm-simScene">
              <div className="scene-panel shm-scenePanel">
                <ActiveScene
                  mass={mass}
                  springConstant={springConstant}
                  amplitude={amplitude}
                  isPlaying={isPlaying}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="shm-rightbar">
          <div className="shm-instructions">
            <div className="shm-instructions-title">Quick Start</div>
            <div className="shm-instructions-text">
              Try changing the parameters to see what happens.
            </div>
            <div className="shm-instructions-text">
              Click any parameter to view what it is and its info.
            </div>
          </div>

          <div className="shm-right-section">
            <div className="shm-right-title">Simulation</div>
            <button
              type="button"
              className={`sim-toggle-btn ${isPlaying ? "playing" : "paused"}`}
              onClick={() => setIsPlaying((prev) => !prev)}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>

          <div className="shm-section-divider" />

          <div className="shm-right-section">
            <div className="shm-right-title">Oscillation Template</div>
            <div className="template-select">
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                aria-label="Select oscillation template"
              >
                {Object.entries(templateConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="shm-section-divider" />

          <div className="shm-right-section">
            <div className="shm-right-title">Parameters</div>
            <div className="shm-param-group">
              <div className="param-item">
                <button
                  type="button"
                  className={`param-label-button ${activeParamInfo === "mass" ? "active" : ""}`}
                  onClick={() => toggleParamInfo("mass")}
                  aria-expanded={activeParamInfo === "mass"}
                  aria-controls="param-info-mass"
                >
                  Mass (m)
                </button>
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
              {activeParamInfo === "mass" ? (
                <div id="param-info-mass" className="param-info">
                  {paramInfo.mass}
                </div>
              ) : null}

              <div className="param-item">
                <button
                  type="button"
                  className={`param-label-button ${
                    activeParamInfo === "springConstant" ? "active" : ""
                  }`}
                  onClick={() => toggleParamInfo("springConstant")}
                  aria-expanded={activeParamInfo === "springConstant"}
                  aria-controls="param-info-spring"
                >
                  Spring Constant (k)
                </button>
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
              {activeParamInfo === "springConstant" ? (
                <div id="param-info-spring" className="param-info">
                  {paramInfo.springConstant}
                </div>
              ) : null}

              <div className="param-item">
                <button
                  type="button"
                  className={`param-label-button ${
                    activeParamInfo === "amplitude" ? "active" : ""
                  }`}
                  onClick={() => toggleParamInfo("amplitude")}
                  aria-expanded={activeParamInfo === "amplitude"}
                  aria-controls="param-info-amplitude"
                >
                  Amplitude (A)
                </button>
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
              {activeParamInfo === "amplitude" ? (
                <div id="param-info-amplitude" className="param-info">
                  {paramInfo.amplitude}
                </div>
              ) : null}
            </div>
          </div>

          <div className="shm-section-divider" />

          <div className="shm-right-section">
            <div className="shm-right-title">What To Notice</div>
            <div className="shm-effects-list">
              {effects.map((item) => (
                <div key={item} className="shm-effects-item">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="shm-section-divider" />

          <div className="shm-right-section">
            <div className="shm-right-title">Legend</div>
            <div className="shm-legend-items">
              {legendItems.map((item) => (
                <span key={item} className="shm-legend-item">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {activeCalc ? (
        <div className="calc-modal-backdrop" onClick={closeCalcModal}>
          <div className="calc-modal" onClick={(event) => event.stopPropagation()}>
            <div className="calc-modal-header">
              <div className="calc-modal-title">
                {activeCalc.title ?? "Calculation Details"}
              </div>
              <button type="button" className="calc-modal-close" onClick={closeCalcModal}>
                Close
              </button>
            </div>
            <div
              className="calc-modal-formula"
              dangerouslySetInnerHTML={renderFormula(activeCalc.latex)}
            />
            {activeCalc.value ? (
              <div className="calc-modal-value">= {activeCalc.value}</div>
            ) : null}
            <div className="calc-modal-detail">
              {activeCalc.detail ??
                "This equation connects the current parameters to the simulation."}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
