import { useMemo, useState } from "react";
import katex from "katex";

const renderFormula = (latex) => ({
  __html: katex.renderToString(latex, { throwOnError: false })
});

const markerConfig = [
  {
    key: "amplitude",
    label: "Amplitude (a)",
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.18)",
    description:
      "Amplitude is the maximum displacement from the mean position."
  },
  {
    key: "wavelength",
    label: "Wavelength (λ)",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.18)",
    description:
      "Wavelength is the distance between two identical points on the wave (crest to crest)."
  },
  {
    key: "period",
    label: "Time Period (T)",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.2)",
    description:
      "Time period is how long a particle takes to complete one full oscillation."
  },
  {
    key: "phase_point",
    label: "Phase Point (x₁)",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.18)",
    description:
      "A chosen particle at position x₁. Its phase sets where it is in its SHM cycle."
  }
];

export default function WaveStaticMarkersScene({ title, description }) {
  const [activeKey, setActiveKey] = useState("amplitude");
  const activeMarker = markerConfig.find((marker) => marker.key === activeKey) ?? markerConfig[0];

  const equations = useMemo(
    () => [
      "y(x,t) = a\\sin(kx - \\omega t + \\phi)",
      "k = \\frac{2\\pi}{\\lambda}",
      "\\omega = \\frac{2\\pi}{T}",
      "f = \\frac{1}{T}",
      "v = f\\lambda = \\frac{\\omega}{k}"
    ],
    []
  );

  const titleText = title ?? "Wave Parameters on a Static Snapshot";
  const descriptionText =
    description ??
    "Click a parameter block on the right to highlight its marker on the wave.";

  const waveGeometry = useMemo(() => {
    const amplitude = 70;
    const centerY = 175;
    const lambda = 220;
    const startX = 70;
    const endX = 840;
    const step = 6;
    let path = "";
    for (let x = startX; x <= endX; x += step) {
      const y = centerY - amplitude * Math.sin(((x - startX) / lambda) * Math.PI * 2);
      path += `${x === startX ? "M" : "L"}${x},${y} `;
    }
    return { path: path.trim(), amplitude, centerY, lambda, startX, endX };
  }, []);

  const isDim = Boolean(activeKey);
  const {
    path: wavePath,
    amplitude: waveAmplitude,
    centerY: waveCenterY,
    lambda: waveLambda,
    startX: waveStartX
  } = waveGeometry;
  const yAxisX = 360;
  const axisTopY = 70;
  const axisBottomY = 300;
  const amplitudeX = 210;
  const amplitudeTopY = waveCenterY - waveAmplitude;
  const amplitudeBottomY = waveCenterY;
  const lambdaStartX = 470;
  const lambdaEndX = lambdaStartX + waveLambda;
  const lambdaY = 285;
  const phaseX = 520;
  const phaseY =
    waveCenterY - waveAmplitude * Math.sin(((phaseX - waveStartX) / waveLambda) * Math.PI * 2);
  const directionArrowY = 90;

  return (
    <div className="wave-shell wave-static-shell">
      <aside className="wave-left">
        <div className="wave-left-title">{titleText}</div>
        <div className="wave-left-desc">{descriptionText}</div>
        <div className="wave-equations">
          {equations.map((latex) => (
            <div
              key={latex}
              className="wave-equation"
              dangerouslySetInnerHTML={renderFormula(latex)}
            />
          ))}
        </div>
      </aside>

      <section className="wave-center wave-static-center">
        <div className="wave-center-header">
          <div className="wave-center-title">Static Wave with Markers</div>
          <div className="wave-center-desc">
            Parameter markers are color-coded to match the blocks on the right.
          </div>
        </div>

        <div className="wave-static-stage">
          <svg
            className={`wave-static-svg ${isDim ? "is-dim" : ""}`}
            viewBox="0 0 900 360"
            role="img"
            aria-label="Static wave with parameter markers"
          >
            <defs>
              <marker
                id="arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
              </marker>
              <marker
                id="axis-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L6,3 L0,6 z" fill="#1f2937" />
              </marker>
            </defs>

            <path
              className="wave-path"
              d={wavePath}
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.6"
            />
            <line
              className="wave-axis"
              x1={waveStartX}
              y1={waveCenterY}
              x2={waveGeometry.endX}
              y2={waveCenterY}
              stroke="#1f2937"
              strokeWidth="1.6"
              markerEnd="url(#axis-arrow)"
            />
            <line
              className="wave-axis"
              x1={yAxisX}
              y1={axisBottomY}
              x2={yAxisX}
              y2={axisTopY}
              stroke="#1f2937"
              strokeWidth="1.6"
              markerEnd="url(#axis-arrow)"
            />
            <text x={waveGeometry.endX + 6} y={waveCenterY + 6} fill="#1f2937" fontSize="18">
              x
            </text>
            <text x={yAxisX - 16} y={axisTopY - 6} fill="#1f2937" fontSize="18">
              y
            </text>
            <line
              x1={yAxisX + 40}
              y1={directionArrowY}
              x2={yAxisX + 150}
              y2={directionArrowY}
              stroke="#1f2937"
              strokeWidth="1.4"
              markerEnd="url(#axis-arrow)"
            />
            <text x={yAxisX + 160} y={directionArrowY + 6} fill="#1f2937" fontSize="16">
              x
            </text>

            <g
              className={`marker-group ${activeKey === "amplitude" ? "is-active" : ""}`}
              style={{ color: markerConfig[0].color }}
            >
              <line
                x1={amplitudeX}
                y1={amplitudeBottomY}
                x2={amplitudeX}
                y2={amplitudeTopY}
                stroke="currentColor"
                strokeWidth="2"
                markerStart="url(#arrow)"
                markerEnd="url(#arrow)"
              />
              <text
                x={amplitudeX + 12}
                y={amplitudeTopY + 8}
                fill="currentColor"
                fontSize="18"
                fontWeight="700"
                fontStyle="italic"
              >
                a
              </text>
            </g>

            <g
              className={`marker-group ${activeKey === "wavelength" ? "is-active" : ""}`}
              style={{ color: markerConfig[1].color }}
            >
              <line
                x1={lambdaStartX}
                y1={waveCenterY}
                x2={lambdaStartX}
                y2={lambdaY}
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <line
                x1={lambdaEndX}
                y1={waveCenterY}
                x2={lambdaEndX}
                y2={lambdaY}
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <line
                x1={lambdaStartX}
                y1={lambdaY}
                x2={lambdaEndX}
                y2={lambdaY}
                stroke="currentColor"
                strokeWidth="2"
                markerStart="url(#arrow)"
                markerEnd="url(#arrow)"
              />
              <text
                x={(lambdaStartX + lambdaEndX) / 2 - 6}
                y={lambdaY + 20}
                fill="currentColor"
                fontSize="18"
                fontWeight="700"
                fontStyle="italic"
              >
                λ
              </text>
            </g>

            <g
              className={`marker-group ${activeKey === "phase_point" ? "is-active" : ""}`}
              style={{ color: markerConfig[3].color }}
            >
              <line
                x1={phaseX}
                y1={waveCenterY}
                x2={phaseX}
                y2={phaseY}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeDasharray="5 6"
              />
              <circle cx={phaseX} cy={phaseY} r="6" fill="currentColor" />
              <text
                x={phaseX + 10}
                y={waveCenterY + 18}
                fill="currentColor"
                fontSize="16"
                fontWeight="700"
              >
                x
                <tspan baselineShift="sub" fontSize="12">
                  1
                </tspan>
              </text>
            </g>
          </svg>

          <div
            className={`wave-static-inset ${activeKey === "period" ? "active" : "is-dim"}`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 240 140" className="wave-static-inset-svg">
              <defs>
                <marker
                  id="inset-arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
                </marker>
              </defs>
              <line
                x1="30"
                y1="90"
                x2="215"
                y2="90"
                stroke="#1f2937"
                strokeWidth="1.4"
                markerEnd="url(#inset-arrow)"
              />
              <line
                x1="70"
                y1="110"
                x2="70"
                y2="25"
                stroke="#1f2937"
                strokeWidth="1.4"
                markerEnd="url(#inset-arrow)"
              />
              <text x="218" y="95" fill="#1f2937" fontSize="14">
                t
              </text>
              <text x="60" y="20" fill="#1f2937" fontSize="14">
                y
              </text>
              <path
                d="M40,90 C55,55 85,55 100,90 C115,125 145,125 160,90 C175,55 205,55 220,90"
                fill="none"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <g style={{ color: markerConfig[2].color }}>
                <line
                  x1="85"
                  y1="120"
                  x2="165"
                  y2="120"
                  stroke="currentColor"
                  strokeWidth="2"
                  markerStart="url(#inset-arrow)"
                  markerEnd="url(#inset-arrow)"
                />
                <text x="120" y="134" fill="currentColor" fontSize="16" fontWeight="700">
                  T
                </text>
              </g>
            </svg>
          </div>
        </div>

        <div className="wave-static-info">
          <div className="wave-static-info-title">{activeMarker.label}</div>
          <div className="wave-static-info-text">{activeMarker.description}</div>
        </div>
      </section>

      <aside className="wave-right wave-static-right">
        <div className="wave-control-block">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-static-blocks">
            {markerConfig.map((marker) => (
              <button
                key={marker.key}
                type="button"
                className={`wave-static-block ${activeKey === marker.key ? "active" : ""}`}
                style={{ background: marker.bg, borderColor: marker.color }}
                onClick={() => setActiveKey(marker.key)}
              >
                <span className="wave-static-block-label" style={{ color: marker.color }}>
                  {marker.label}
                </span>
                <span className="wave-static-block-subtext">Click to highlight</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
