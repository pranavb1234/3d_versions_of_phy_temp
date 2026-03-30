import { useMemo, useState } from "react";
import katex from "katex";

const TWO_PI = Math.PI * 2;

const formatNumber = (value, digits = 2) => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(digits);
  return fixed.replace(/\.00$/, "");
};

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
    key: "initial_phase",
    label: "Initial Phase (φ)",
    color: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.18)",
    description:
      "Initial phase shifts the whole wave left or right along the x-axis."
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
  const [activeKey, setActiveKey] = useState(null);
  const [phase, setPhase] = useState(-2.0);
  const activeMarker = markerConfig.find((marker) => marker.key === activeKey) ?? null;
  const markerByKey = useMemo(() => {
    return markerConfig.reduce((acc, marker) => {
      acc[marker.key] = marker;
      return acc;
    }, {});
  }, []);
  const lambdaDisplay = 4.0;

  const equations = useMemo(
    () => [
      "y(x,t) = a\\sin\\left(\\frac{2\\pi}{\\lambda}x - \\omega t + \\phi\\right)",
      "\\omega = \\frac{2\\pi}{T}",
      "f = \\frac{1}{T}",
      "v = f\\lambda = \\frac{\\lambda}{T}"
    ],
    []
  );

  const symbolGuide = [
    {
      symbol: "a",
      label: "Amplitude",
      description: "Maximum displacement of a particle from the mean position."
    },
    {
      symbol: "λ",
      label: "Wavelength",
      description: "Distance between two points in the same phase (crest to crest)."
    },
    {
      symbol: "T",
      label: "Time period",
      description: "Time taken by a particle at a fixed x to complete one oscillation."
    },
    {
      symbol: "f",
      label: "Frequency",
      description: "Number of oscillations per second. f = 1/T."
    },
    {
      symbol: "ω",
      label: "Angular frequency",
      description: "Rate of phase change in time. ω = 2π/T."
    },
    {
      symbol: "φ",
      label: "Initial phase",
      description: "Phase offset at x = 0 and t = 0; shifts the wave left or right."
    },
    {
      symbol: "v",
      label: "Wave speed",
      description: "Speed of the wave pattern moving through space. v = λ/T."
    }
  ];

  const titleText = title ?? "Wave Parameters on a Static Snapshot";
  const descriptionText =
    description ??
    "Click a parameter block on the right to highlight its marker on the wave. Click again to reset.";

  const blockSubtext = (marker) => {
    if (marker.key === "initial_phase") {
      return `phi = ${formatNumber(phase, 2)} rad`;
    }
    if (marker.key === "wavelength") {
      return `lambda = ${formatNumber(lambdaDisplay, 1)}`;
    }
    return "Click to highlight";
  };

  const infoTitle = activeMarker ? activeMarker.label : "Select a parameter";

  const waveGeometry = useMemo(() => {
    const amplitude = 70;
    const centerY = 180;
    const lambda = 220;
    const startX = 70;
    const endX = 840;
    const step = 6;
    let path = "";
    for (let x = startX; x <= endX; x += step) {
      const y =
        centerY - amplitude * Math.sin(((x - startX) / lambda) * TWO_PI + phase);
      path += `${x === startX ? "M" : "L"}${x},${y} `;
    }
    return { path: path.trim(), amplitude, centerY, lambda, startX, endX };
  }, [phase]);

  const isDim = Boolean(activeKey);
  const {
    path: wavePath,
    amplitude: waveAmplitude,
    centerY: waveCenterY,
    lambda: waveLambda,
    startX: waveStartX
  } = waveGeometry;
  const yAxisX = 360;
  const axisTopY = 75;
  const axisBottomY = 320;
  const lambdaY = 300;
  const directionArrowY = 70;

  const waveY = (x) =>
    waveCenterY - waveAmplitude * Math.sin(((x - waveStartX) / waveLambda) * TWO_PI + phase);

  const wrapToRange = (value) => {
    let next = value;
    while (next < waveStartX) {
      next += waveLambda;
    }
    while (next > waveGeometry.endX) {
      next -= waveLambda;
    }
    return next;
  };

  const crestBaseX = waveStartX + ((Math.PI / 2 - phase) * waveLambda) / TWO_PI;
  const crestX = wrapToRange(crestBaseX);
  const troughX = wrapToRange(crestBaseX + waveLambda / 2);
  const crestY = waveY(crestX);
  const troughY = waveY(troughX);

  const amplitudeX = crestX;
  const amplitudeTopY = crestY;
  const amplitudeBottomY = waveCenterY;

  const phasePointX = Math.min(Math.max(yAxisX + waveLambda * 0.55, waveStartX + 40), waveGeometry.endX - 40);
  const phasePointY = waveY(phasePointX);

  const xShift = (-phase * waveLambda) / TWO_PI;
  const phiStartX = yAxisX;
  const phiEndX = Math.min(
    Math.max(phiStartX + xShift, waveStartX + 30),
    waveGeometry.endX - 30
  );

  const lambdaSegments = [];
  let lambdaStart = crestX;
  while (lambdaStart < waveStartX + 10) {
    lambdaStart += waveLambda;
  }
  let count = 0;
  while (lambdaStart + waveLambda <= waveGeometry.endX - 10 && count < 2) {
    lambdaSegments.push({ start: lambdaStart, end: lambdaStart + waveLambda });
    lambdaStart += waveLambda;
    count += 1;
  }
  if (lambdaSegments.length === 0) {
    lambdaSegments.push({ start: waveStartX + 120, end: waveStartX + 120 + waveLambda });
  }
  const lambdaLabelX = (lambdaSegments[0].start + lambdaSegments[0].end) / 2;

  const activeDescription = useMemo(() => {
    if (!activeMarker) {
      return "Click any parameter block to highlight it on the wave. The info panel will explain what the highlight means.";
    }
    if (activeMarker.key === "initial_phase") {
      return `phi = ${formatNumber(phase, 2)} rad. Positive phi shifts the wave left. Watch the wave slide as you adjust it.`;
    }
    return `${activeMarker.description} Look for the matching color on the wave to locate it quickly.`;
  }, [activeMarker, phase]);

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

        <div className="wave-symbols">
          <div className="wave-symbols-title">Symbol Guide</div>
          <div className="wave-symbols-list">
            {symbolGuide.map((item) => (
              <details key={item.symbol} className="wave-symbol-item">
                <summary className="wave-symbol-summary">
                  <span className="wave-symbol-name">{item.symbol}</span>
                  <span className="wave-symbol-label">{item.label}</span>
                </summary>
                <div className="wave-symbol-desc">{item.description}</div>
              </details>
            ))}
          </div>
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
              stroke="#475569"
              strokeWidth="1.4"
              strokeDasharray="6 6"
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
            <g className="wave-static-annotation">
              <g style={{ color: "#64748b" }}>
                <text
                  x={waveStartX + 18}
                  y={axisTopY - 12}
                  fill="currentColor"
                  fontSize="14"
                  fontStyle="italic"
                >
                  Mean position
                </text>
                <line
                  x1={waveStartX + 46}
                  y1={axisTopY - 6}
                  x2={waveStartX + 82}
                  y2={waveCenterY}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  markerEnd="url(#arrow)"
                />
              </g>
              <line
                x1={yAxisX + 40}
                y1={directionArrowY}
                x2={yAxisX + 150}
                y2={directionArrowY}
                stroke="#1f2937"
                strokeWidth="1.4"
                markerEnd="url(#axis-arrow)"
              />
              <text x={yAxisX + 160} y={directionArrowY - 12} fill="#1f2937" fontSize="16">
                x
              </text>

              <circle cx={crestX} cy={crestY} r="5" fill="#0f172a" />
              <text
                x={crestX - 20}
                y={crestY - 12}
                fill="#0f172a"
                fontSize="14"
                fontWeight="700"
              >
                Crest
              </text>
              <circle cx={troughX} cy={troughY} r="5" fill="#0f172a" />
              <text
                x={troughX - 24}
                y={troughY + 26}
                fill="#0f172a"
                fontSize="14"
                fontWeight="700"
              >
                Trough
              </text>
            </g>

            <g
              className={`marker-group ${activeKey === "amplitude" ? "is-active" : ""}`}
              style={{ color: markerByKey.amplitude.color }}
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
                y={(amplitudeTopY + amplitudeBottomY) / 2 + 6}
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
              style={{ color: markerByKey.wavelength.color }}
            >
              {lambdaSegments.map((segment, index) => (
                <g key={`lambda-${segment.start}-${index}`}>
                  <line
                    x1={segment.start}
                    y1={waveCenterY}
                    x2={segment.start}
                    y2={lambdaY}
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <line
                    x1={segment.end}
                    y1={waveCenterY}
                    x2={segment.end}
                    y2={lambdaY}
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <line
                    x1={segment.start}
                    y1={lambdaY}
                    x2={segment.end}
                    y2={lambdaY}
                    stroke="currentColor"
                    strokeWidth="2"
                    markerStart="url(#arrow)"
                    markerEnd="url(#arrow)"
                  />
                </g>
              ))}
              <text
                x={lambdaLabelX - 6}
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
              className={`marker-group ${activeKey === "initial_phase" ? "is-active" : ""}`}
              style={{ color: markerByKey.initial_phase.color }}
            >
              <line
                x1={phiStartX}
                y1={axisTopY + 24}
                x2={phiEndX}
                y2={axisTopY + 24}
                stroke="currentColor"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <text
                x={(phiStartX + phiEndX) / 2 - 6}
                y={axisTopY + 18}
                fill="currentColor"
                fontSize="16"
                fontWeight="700"
                fontStyle="italic"
              >
                φ
              </text>
            </g>

            <g
              className={`marker-group ${activeKey === "phase_point" ? "is-active" : ""}`}
              style={{ color: markerByKey.phase_point.color }}
            >
              <line
                x1={phasePointX}
                y1={waveCenterY}
                x2={phasePointX}
                y2={phasePointY}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeDasharray="5 6"
              />
              <circle cx={phasePointX} cy={phasePointY} r="6" fill="currentColor" />
              <text
                x={phasePointX + 10}
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
            className={`wave-static-inset ${
              activeKey === "period" ? "active" : activeKey ? "is-dim" : "idle"
            }`}
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
              <g style={{ color: markerByKey.period.color }}>
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
          <div className="wave-static-info-title">{infoTitle}</div>
          <div className="wave-static-info-text">{activeDescription}</div>
        </div>
      </section>

      <aside className="wave-right wave-static-right">
        <div className="wave-control-block">
          <div className="wave-control-title">Initial Phase</div>
          <div className="wave-slider-row">
            <label htmlFor="static-phase">
              Phase (phi)
              <span className="wave-value">{formatNumber(phase, 2)}</span>
            </label>
            <input
              id="static-phase"
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step="0.05"
              value={phase}
              onChange={(event) => setPhase(parseFloat(event.target.value))}
            />
          </div>
        </div>
        <div className="wave-control-block">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-static-blocks">
            {markerConfig.map((marker) => (
              <button
                key={marker.key}
                type="button"
                className={`wave-static-block ${activeKey === marker.key ? "active" : ""}`}
                style={{ background: marker.bg, borderColor: marker.color }}
                onClick={() =>
                  setActiveKey((prev) => (prev === marker.key ? null : marker.key))
                }
              >
                <span className="wave-static-block-label" style={{ color: marker.color }}>
                  {marker.label}
                </span>
                <span className="wave-static-block-subtext">{blockSubtext(marker)}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
