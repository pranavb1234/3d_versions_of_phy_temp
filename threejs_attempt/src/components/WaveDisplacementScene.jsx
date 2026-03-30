import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";

const TWO_PI = Math.PI * 2;
const DEG_PER_RAD = 180 / Math.PI;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const formatNumber = (value, digits = 2) => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(digits);
  return fixed.replace(/\.00$/, "");
};

const formatPhasePi = (value) => {
  const ratio = value / Math.PI;
  const rounded = Math.round(ratio * 100) / 100;
  if (Math.abs(rounded) < 0.01) {
    return "0";
  }
  if (Math.abs(rounded - 1) < 0.01) {
    return "π";
  }
  if (Math.abs(rounded + 1) < 0.01) {
    return "-π";
  }
  return `${rounded}π`;
};

const renderFormula = (latex) => ({
  __html: katex.renderToString(latex, { throwOnError: false })
});

const setupCanvas = (canvas, wrapper, metricsRef) => {
  if (!canvas || !wrapper) {
    return;
  }
  const rect = wrapper.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  metricsRef.current = { width, height, dpr, ctx };
};

const drawBackground = (ctx, width, height) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#f8fbff");
  gradient.addColorStop(1, "#e2eaf5");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const drawGrid = (ctx, left, top, width, height) => {
  ctx.strokeStyle = "rgba(148, 163, 184, 0.32)";
  ctx.lineWidth = 1;
  const columns = 6;
  const rows = 4;
  for (let i = 0; i <= columns; i += 1) {
    const x = left + (width / columns) * i;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + height);
    ctx.stroke();
  }
  for (let j = 0; j <= rows; j += 1) {
    const y = top + (height / rows) * j;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }
};

const drawAxes = (ctx, left, top, width, height, zeroY) => {
  ctx.strokeStyle = "rgba(71, 85, 105, 0.85)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(left, zeroY);
  ctx.lineTo(left + width, zeroY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + height);
  ctx.stroke();
};

export default function WaveDisplacementScene({ title, description }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [amplitude, setAmplitude] = useState(1.6);
  const [wavelength, setWavelength] = useState(6);
  const [omega, setOmega] = useState(2.2);
  const [phase, setPhase] = useState(0);
  const [selectedRatioA, setSelectedRatioA] = useState(0.3);
  const [selectedRatioB, setSelectedRatioB] = useState(0.7);
  const [selectTarget, setSelectTarget] = useState(null);

  const topCanvasRef = useRef(null);
  const bottomCanvasRef = useRef(null);
  const topWrapRef = useRef(null);
  const bottomWrapRef = useRef(null);
  const topMetricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const bottomMetricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const topPlotRef = useRef(null);
  const timeRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const paramsRef = useRef({
    amplitude,
    wavelength,
    omega,
    phase,
    selectedRatioA,
    selectedRatioB
  });

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    paramsRef.current = { amplitude, wavelength, omega, phase, selectedRatioA, selectedRatioB };
  }, [amplitude, wavelength, omega, phase, selectedRatioA, selectedRatioB]);

  useEffect(() => {
    const resize = () => {
      setupCanvas(topCanvasRef.current, topWrapRef.current, topMetricsRef);
      setupCanvas(bottomCanvasRef.current, bottomWrapRef.current, bottomMetricsRef);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (topWrapRef.current) {
      observer.observe(topWrapRef.current);
    }
    if (bottomWrapRef.current) {
      observer.observe(bottomWrapRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const drawFrame = () => {
      const topMetrics = topMetricsRef.current;
      const bottomMetrics = bottomMetricsRef.current;
      const topCtx = topMetrics.ctx;
      const bottomCtx = bottomMetrics.ctx;
      if (!topCtx || !bottomCtx) {
        return;
      }

      const {
        amplitude: amp,
        wavelength: lambda,
        omega: omegaValue,
        phase: phi,
        selectedRatioA: ratioA,
        selectedRatioB: ratioB
      } = paramsRef.current;

      const safeLambda = Math.max(lambda, 0.4);
      const safeOmega = Math.max(omegaValue, 0.05);
      const k = TWO_PI / safeLambda;
      const xRange = safeLambda * 3;
      const xMin = 0;
      const xMax = xRange;
      const x1 = clamp(ratioA, 0.02, 0.98) * xRange;
      const x2 = clamp(ratioB, 0.02, 0.98) * xRange;
      const yMax = Math.max(amp * 1.3, 0.6);
      const yMin = -yMax;
      const t = timeRef.current;
      const phaseOffset1 = k * x1 + phi;
      const phaseOffset2 = k * x2 + phi;
      const period = TWO_PI / safeOmega;
      const tRange = period * 2;

      const drawWaveGraph = () => {
        const { width, height } = topMetrics;
        drawBackground(topCtx, width, height);
        const padding = { left: 54, right: 20, top: 26, bottom: 36 };
        const plotWidth = Math.max(10, width - padding.left - padding.right);
        const plotHeight = Math.max(10, height - padding.top - padding.bottom);
        const plotLeft = padding.left;
        const plotTop = padding.top;
        const plotBottom = plotTop + plotHeight;
        const plotRight = plotLeft + plotWidth;

        topPlotRef.current = {
          left: plotLeft,
          right: plotRight,
          top: plotTop,
          bottom: plotBottom,
          xMin,
          xMax
        };

        drawGrid(topCtx, plotLeft, plotTop, plotWidth, plotHeight);
        const zeroY =
          plotTop + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
        drawAxes(topCtx, plotLeft, plotTop, plotWidth, plotHeight, zeroY);

        const samples = Math.max(160, Math.floor(plotWidth));
        topCtx.strokeStyle = "#2563eb";
        topCtx.lineWidth = 2.1;
        topCtx.beginPath();
        for (let i = 0; i <= samples; i += 1) {
          const progress = i / samples;
          const x = xMin + progress * (xMax - xMin);
          const y = amp * Math.sin(k * x - safeOmega * t + phi);
          const px = plotLeft + progress * plotWidth;
          const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
          if (i === 0) {
            topCtx.moveTo(px, py);
          } else {
            topCtx.lineTo(px, py);
          }
        }
        topCtx.stroke();

        const lambdaStep = safeLambda;
        const crestPhase = safeOmega * t - phi + Math.PI / 2;
        const troughPhase = safeOmega * t - phi + (3 * Math.PI) / 2;
        let crestX = crestPhase / k;
        let troughX = troughPhase / k;
        while (crestX < xMin) {
          crestX += lambdaStep;
        }
        while (troughX < xMin) {
          troughX += lambdaStep;
        }

        topCtx.fillStyle = "#f97316";
        for (let x = crestX; x <= xMax; x += lambdaStep) {
          const y = amp * Math.sin(k * x - safeOmega * t + phi);
          const px = plotLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
          const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
          topCtx.beginPath();
          topCtx.arc(px, py, 3.6, 0, TWO_PI);
          topCtx.fill();
        }

        topCtx.fillStyle = "#0ea5e9";
        for (let x = troughX; x <= xMax; x += lambdaStep) {
          const y = amp * Math.sin(k * x - safeOmega * t + phi);
          const px = plotLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
          const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
          topCtx.beginPath();
          topCtx.arc(px, py, 3.6, 0, TWO_PI);
          topCtx.fill();
        }

        const pointAColor = "#7c3aed";
        const pointBColor = "#10b981";
        const selectedY1 = amp * Math.sin(k * x1 - safeOmega * t + phi);
        const selectedY2 = amp * Math.sin(k * x2 - safeOmega * t + phi);
        const selectedPx1 = plotLeft + ((x1 - xMin) / (xMax - xMin)) * plotWidth;
        const selectedPx2 = plotLeft + ((x2 - xMin) / (xMax - xMin)) * plotWidth;
        const selectedPy1 =
          plotTop + (1 - (selectedY1 - yMin) / (yMax - yMin)) * plotHeight;
        const selectedPy2 =
          plotTop + (1 - (selectedY2 - yMin) / (yMax - yMin)) * plotHeight;

        topCtx.lineWidth = 1.1;
        topCtx.setLineDash([6, 6]);
        topCtx.strokeStyle = "rgba(124, 58, 237, 0.6)";
        topCtx.beginPath();
        topCtx.moveTo(selectedPx1, plotTop);
        topCtx.lineTo(selectedPx1, plotBottom);
        topCtx.stroke();
        topCtx.strokeStyle = "rgba(16, 185, 129, 0.6)";
        topCtx.beginPath();
        topCtx.moveTo(selectedPx2, plotTop);
        topCtx.lineTo(selectedPx2, plotBottom);
        topCtx.stroke();
        topCtx.setLineDash([]);

        topCtx.fillStyle = pointAColor;
        topCtx.beginPath();
        topCtx.arc(selectedPx1, selectedPy1, 5, 0, TWO_PI);
        topCtx.fill();
        topCtx.fillStyle = "#e2e8f0";
        topCtx.beginPath();
        topCtx.arc(selectedPx1, selectedPy1, 2.8, 0, TWO_PI);
        topCtx.fill();

        topCtx.fillStyle = pointBColor;
        topCtx.beginPath();
        topCtx.arc(selectedPx2, selectedPy2, 5, 0, TWO_PI);
        topCtx.fill();
        topCtx.fillStyle = "#e2e8f0";
        topCtx.beginPath();
        topCtx.arc(selectedPx2, selectedPy2, 2.8, 0, TWO_PI);
        topCtx.fill();

        topCtx.font = "600 12px \"Segoe UI\", sans-serif";
        topCtx.fillStyle = pointAColor;
        topCtx.fillText("x1", selectedPx1 + 6, plotTop + 16);
        topCtx.fillStyle = pointBColor;
        topCtx.fillText("x2", selectedPx2 + 6, plotTop + 30);

        topCtx.fillStyle = "#475569";
        topCtx.font = "600 12px \"Segoe UI\", sans-serif";
        topCtx.fillText("wave", plotRight - 40, plotTop + 14);
        topCtx.fillText("x", plotRight - 10, plotBottom + 18);
        topCtx.fillText("y", plotLeft - 18, plotTop + 12);

        topCtx.fillStyle = "#64748b";
        topCtx.font = "600 11px \"Segoe UI\", sans-serif";
        for (let i = 0; i <= 3; i += 1) {
          const tickX = plotLeft + (plotWidth / 3) * i;
          const label = i === 0 ? "0" : i === 1 ? "lambda" : `${i} lambda`;
          topCtx.fillText(label, tickX - 10, plotBottom + 18);
        }

        topCtx.fillStyle = "#1f2937";
        topCtx.font = "600 12px \"Segoe UI\", sans-serif";
        topCtx.fillText(`x1 = ${formatNumber(x1, 2)}`, plotLeft + 6, plotTop + 16);
        topCtx.fillText(`x2 = ${formatNumber(x2, 2)}`, plotLeft + 6, plotTop + 30);
      };

      const drawParticleGraph = () => {
        const { width, height } = bottomMetrics;
        drawBackground(bottomCtx, width, height);
        const padding = { left: 54, right: 20, top: 26, bottom: 36 };
        const plotWidth = Math.max(10, width - padding.left - padding.right);
        const plotHeight = Math.max(10, height - padding.top - padding.bottom);
        const plotLeft = padding.left;
        const plotTop = padding.top;
        const plotBottom = plotTop + plotHeight;
        const plotRight = plotLeft + plotWidth;

        drawGrid(bottomCtx, plotLeft, plotTop, plotWidth, plotHeight);
        const zeroY =
          plotTop + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
        drawAxes(bottomCtx, plotLeft, plotTop, plotWidth, plotHeight, zeroY);

        const samples = Math.max(160, Math.floor(plotWidth));
        bottomCtx.strokeStyle = "#7c3aed";
        bottomCtx.lineWidth = 2.1;
        bottomCtx.beginPath();
        for (let i = 0; i <= samples; i += 1) {
          const progress = i / samples;
          const tVal = progress * tRange;
          const y = amp * Math.sin(phaseOffset1 - safeOmega * tVal);
          const px = plotLeft + progress * plotWidth;
          const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
          if (i === 0) {
            bottomCtx.moveTo(px, py);
          } else {
            bottomCtx.lineTo(px, py);
          }
        }
        bottomCtx.stroke();

        bottomCtx.strokeStyle = "#10b981";
        bottomCtx.lineWidth = 1.8;
        bottomCtx.setLineDash([8, 6]);
        bottomCtx.beginPath();
        for (let i = 0; i <= samples; i += 1) {
          const progress = i / samples;
          const tVal = progress * tRange;
          const y = amp * Math.sin(phaseOffset2 - safeOmega * tVal);
          const px = plotLeft + progress * plotWidth;
          const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
          if (i === 0) {
            bottomCtx.moveTo(px, py);
          } else {
            bottomCtx.lineTo(px, py);
          }
        }
        bottomCtx.stroke();
        bottomCtx.setLineDash([]);

        const markerT = tRange > 0 ? (t % tRange) : 0;
        const markerY1 = amp * Math.sin(phaseOffset1 - safeOmega * markerT);
        const markerY2 = amp * Math.sin(phaseOffset2 - safeOmega * markerT);
        const markerPx = plotLeft + (markerT / tRange) * plotWidth;
        const markerPy1 =
          plotTop + (1 - (markerY1 - yMin) / (yMax - yMin)) * plotHeight;
        const markerPy2 =
          plotTop + (1 - (markerY2 - yMin) / (yMax - yMin)) * plotHeight;
        bottomCtx.strokeStyle = "rgba(15, 118, 110, 0.6)";
        bottomCtx.lineWidth = 1.2;
        bottomCtx.setLineDash([6, 6]);
        bottomCtx.beginPath();
        bottomCtx.moveTo(markerPx, plotTop);
        bottomCtx.lineTo(markerPx, plotBottom);
        bottomCtx.stroke();
        bottomCtx.setLineDash([]);
        bottomCtx.fillStyle = "#7c3aed";
        bottomCtx.beginPath();
        bottomCtx.arc(markerPx, markerPy1, 4.8, 0, TWO_PI);
        bottomCtx.fill();
        bottomCtx.fillStyle = "#e2e8f0";
        bottomCtx.beginPath();
        bottomCtx.arc(markerPx, markerPy1, 2.6, 0, TWO_PI);
        bottomCtx.fill();

        bottomCtx.fillStyle = "#10b981";
        bottomCtx.beginPath();
        bottomCtx.arc(markerPx, markerPy2, 4.8, 0, TWO_PI);
        bottomCtx.fill();
        bottomCtx.fillStyle = "#e2e8f0";
        bottomCtx.beginPath();
        bottomCtx.arc(markerPx, markerPy2, 2.6, 0, TWO_PI);
        bottomCtx.fill();

        bottomCtx.fillStyle = "#475569";
        bottomCtx.font = "600 12px \"Segoe UI\", sans-serif";
        bottomCtx.fillText("t", plotRight - 8, plotBottom + 18);
        bottomCtx.fillText("y", plotLeft - 18, plotTop + 12);

        bottomCtx.font = "600 12px \"Segoe UI\", sans-serif";
        bottomCtx.fillStyle = "#7c3aed";
        bottomCtx.fillText("x1", plotLeft + 6, plotTop + 16);
        bottomCtx.fillStyle = "#10b981";
        bottomCtx.fillText("x2", plotLeft + 6, plotTop + 32);

        bottomCtx.fillStyle = "#64748b";
        bottomCtx.font = "600 11px \"Segoe UI\", sans-serif";
        bottomCtx.fillText("0", plotLeft - 4, plotBottom + 18);
        bottomCtx.fillText("T", plotLeft + plotWidth / 2 - 4, plotBottom + 18);
        bottomCtx.fillText("2T", plotRight - 18, plotBottom + 18);
      };

      drawWaveGraph();
      drawParticleGraph();
    };

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (isPlayingRef.current) {
        timeRef.current += dt;
      }
      drawFrame();
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleSelect = (event) => {
    if (!selectTarget) {
      return;
    }
    event.preventDefault();
    const canvas = topCanvasRef.current;
    const plot = topPlotRef.current;
    if (!canvas || !plot) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < plot.left || x > plot.right) {
      return;
    }
    const ratio = (x - plot.left) / (plot.right - plot.left);
    if (selectTarget === "a") {
      setSelectedRatioA(clamp(ratio, 0.02, 0.98));
    } else {
      setSelectedRatioB(clamp(ratio, 0.02, 0.98));
    }
  };

  const derived = useMemo(() => {
    const safeLambda = Math.max(wavelength, 0.4);
    const safeOmega = Math.max(omega, 0.05);
    const k = TWO_PI / safeLambda;
    const period = TWO_PI / safeOmega;
    const frequency = safeOmega / TWO_PI;
    const speed = safeOmega / k;
    const xRange = safeLambda * 3;
    const x1 = clamp(selectedRatioA, 0.02, 0.98) * xRange;
    const x2 = clamp(selectedRatioB, 0.02, 0.98) * xRange;
    const deltaX = x2 - x1;
    const deltaPhiRaw = k * deltaX;
    const deltaPhi =
      ((deltaPhiRaw + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
    return { k, period, frequency, speed, x1, x2, deltaX, deltaPhi };
  }, [wavelength, omega, selectedRatioA, selectedRatioB]);

  const titleText = title ?? "Displacement in a Progressive Wave";
  const descriptionText =
    description ??
    "A traveling wave depends on both position and time. Watch the shape move and track one particle.";

  return (
    <div className="wave-shell">
      <aside className="wave-left">
        <div className="wave-left-title">{titleText}</div>
        <div className="wave-left-desc">{descriptionText}</div>
        <div className="wave-formula" dangerouslySetInnerHTML={renderFormula("y(x,t) = A\\sin(kx - \\omega t + \\phi)")} />
        <div className="wave-left-list">
          <div className="wave-left-item">Top graph: wave shape (y vs x) at a moment.</div>
          <div className="wave-left-item">Bottom graph: motion of two particles (y vs t).</div>
          <div className="wave-left-item">Each particle does SHM with a different phase.</div>
          <div className="wave-left-item">Crests (orange) and troughs (cyan) are auto-marked.</div>
        </div>
        <div className="wave-left-hint">
          Use Pick Point 1 / 2, then click the top wave to choose x1 and x2.
        </div>
      </aside>

      <section className="wave-center">
        <div className="wave-center-header">
          <div className="wave-center-title">Wave as Function of Space and Time</div>
          <div className="wave-center-desc">
            Same equation gives the traveling wave shape and the SHM of any single particle.
          </div>
        </div>

        <div className="wave-graphs">
          <div className="wave-graph-card">
            <div className="wave-graph-title">Wave Shape (y vs x)</div>
            <div
              ref={topWrapRef}
              className={`wave-canvas-wrap ${selectTarget ? "is-selecting" : ""}`}
              onPointerDown={handleSelect}
            >
              <canvas ref={topCanvasRef} className="wave-canvas" />
              {selectTarget ? (
                <div className="wave-select-hint">
                  Click to set {selectTarget === "a" ? "point 1 (x1)" : "point 2 (x2)"}
                </div>
              ) : null}
            </div>
          </div>

          <div className="wave-graph-card">
            <div className="wave-graph-title">Particle Motion (y vs t)</div>
            <div ref={bottomWrapRef} className="wave-canvas-wrap">
              <canvas ref={bottomCanvasRef} className="wave-canvas" />
            </div>
          </div>
        </div>
      </section>

      <aside className="wave-right">
        <div className="wave-control-block">
          <div className="wave-control-title">Simulation</div>
          <button
            type="button"
            className={`sim-toggle-btn ${isPlaying ? "playing" : "paused"}`}
            onClick={() => setIsPlaying((prev) => !prev)}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Pick Points</div>
          <div className="wave-select-row">
            <button
              type="button"
              className={`wave-toggle-btn ${selectTarget === "a" ? "active" : ""}`}
              onClick={() => setSelectTarget((prev) => (prev === "a" ? null : "a"))}
            >
              Pick Point 1 (x1)
            </button>
            <button
              type="button"
              className={`wave-toggle-btn ${selectTarget === "b" ? "active" : ""}`}
              onClick={() => setSelectTarget((prev) => (prev === "b" ? null : "b"))}
            >
              Pick Point 2 (x2)
            </button>
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-slider-row">
            <label htmlFor="wave-amplitude">
              Amplitude (A)
              <span className="wave-value">{formatNumber(amplitude, 2)}</span>
            </label>
            <input
              id="wave-amplitude"
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={amplitude}
              onChange={(event) => setAmplitude(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="wave-wavelength">
              Wavelength (lambda)
              <span className="wave-value">{formatNumber(wavelength, 2)}</span>
            </label>
            <input
              id="wave-wavelength"
              type="range"
              min="2"
              max="10"
              step="0.2"
              value={wavelength}
              onChange={(event) => setWavelength(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="wave-omega">
              Angular Frequency (omega)
              <span className="wave-value">{formatNumber(omega, 2)}</span>
            </label>
            <input
              id="wave-omega"
              type="range"
              min="0.6"
              max="5"
              step="0.1"
              value={omega}
              onChange={(event) => setOmega(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="wave-phase">
              Initial Phase (phi)
              <span className="wave-value">{formatNumber(phase, 2)}</span>
            </label>
            <input
              id="wave-phase"
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
          <div className="wave-control-title">Readouts</div>
          <div className="wave-readout">
            <span>k</span>
            <span>{formatNumber(derived.k, 3)}</span>
          </div>
          <div className="wave-readout">
            <span>omega</span>
            <span>{formatNumber(omega, 2)} rad/s</span>
          </div>
          <div className="wave-readout">
            <span>Period (T)</span>
            <span>{formatNumber(derived.period, 2)} s</span>
          </div>
          <div className="wave-readout">
            <span>Frequency (f)</span>
            <span>{formatNumber(derived.frequency, 2)} Hz</span>
          </div>
          <div className="wave-readout">
            <span>Wave speed (v)</span>
            <span>{formatNumber(derived.speed, 2)}</span>
          </div>
          <div className="wave-readout">
            <span>phi</span>
            <span>
              {formatPhasePi(phase)} ({formatNumber(phase * DEG_PER_RAD, 0)}°)
            </span>
          </div>
          <div className="wave-readout">
            <span>Selected x1</span>
            <span>{formatNumber(derived.x1, 2)}</span>
          </div>
          <div className="wave-readout">
            <span>Selected x2</span>
            <span>{formatNumber(derived.x2, 2)}</span>
          </div>
          <div className="wave-readout">
            <span>Delta x</span>
            <span>{formatNumber(derived.deltaX, 2)}</span>
          </div>
          <div className="wave-readout">
            <span>Delta phi</span>
            <span>
              {formatNumber(derived.deltaPhi, 2)} rad ({formatNumber(derived.deltaPhi * DEG_PER_RAD, 0)}°)
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
