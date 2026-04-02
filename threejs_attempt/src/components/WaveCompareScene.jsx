import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";

const TWO_PI = Math.PI * 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const formatNumber = (value, digits = 2) => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(digits);
  return fixed.replace(/\.00$/, "");
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

const drawArrow = (ctx, x1, y1, x2, y2, color, width = 1.4) => {
  const headLength = 7;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};

const drawDoubleArrow = (ctx, x1, y1, x2, y2, color, width = 1.4) => {
  drawArrow(ctx, x1, y1, x2, y2, color, width);
  drawArrow(ctx, x2, y2, x1, y1, color, width);
};


export default function WaveCompareScene({ title, description }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [amplitude, setAmplitude] = useState(1.2);
  const [wavelength, setWavelength] = useState(6);
  const [omega, setOmega] = useState(2.0);
  const [phase, setPhase] = useState(0);
  const [showTransverseDots, setShowTransverseDots] = useState(true);
  const [showTransverseLines, setShowTransverseLines] = useState(true);
  const [showDensityBands, setShowDensityBands] = useState(true);

  const transverseCanvasRef = useRef(null);
  const longitudinalCanvasRef = useRef(null);
  const transverseWrapRef = useRef(null);
  const longitudinalWrapRef = useRef(null);
  const transverseMetricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const longitudinalMetricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const timeRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const paramsRef = useRef({
    amplitude,
    wavelength,
    omega,
    phase,
    showTransverseDots,
    showTransverseLines,
    showDensityBands
  });

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    paramsRef.current = {
      amplitude,
      wavelength,
      omega,
      phase,
      showTransverseDots,
      showTransverseLines,
      showDensityBands
    };
  }, [amplitude, wavelength, omega, phase, showTransverseDots, showTransverseLines, showDensityBands]);

  useEffect(() => {
    const resize = () => {
      setupCanvas(transverseCanvasRef.current, transverseWrapRef.current, transverseMetricsRef);
      setupCanvas(longitudinalCanvasRef.current, longitudinalWrapRef.current, longitudinalMetricsRef);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (transverseWrapRef.current) {
      observer.observe(transverseWrapRef.current);
    }
    if (longitudinalWrapRef.current) {
      observer.observe(longitudinalWrapRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const drawFrame = () => {
      const transverseMetrics = transverseMetricsRef.current;
      const longitudinalMetrics = longitudinalMetricsRef.current;
      const tCtx = transverseMetrics.ctx;
      const lCtx = longitudinalMetrics.ctx;
      if (!tCtx || !lCtx) {
        return;
      }

      const {
        amplitude: amp,
        wavelength: lambda,
        omega: omegaValue,
        phase: phi,
        showTransverseDots: showDots,
        showTransverseLines: showLines,
        showDensityBands: showBands
      } = paramsRef.current;

      const safeLambda = Math.max(lambda, 0.6);
      const safeOmega = Math.max(omegaValue, 0.05);
      const k = TWO_PI / safeLambda;
      const xRange = safeLambda * 3;
      const xMin = 0;
      const xMax = xRange;
      const t = timeRef.current;
      const yMax = Math.max(amp * 1.5, 0.8);
      const yMin = -yMax;

      const drawTransverse = () => {
        const { width, height } = transverseMetrics;
        drawBackground(tCtx, width, height);
        const padding = { left: 54, right: 20, top: 26, bottom: 38 };
        const plotWidth = Math.max(10, width - padding.left - padding.right);
        const plotHeight = Math.max(10, height - padding.top - padding.bottom);
        const plotLeft = padding.left;
        const plotTop = padding.top;
        const plotBottom = plotTop + plotHeight;
        const plotRight = plotLeft + plotWidth;

        drawGrid(tCtx, plotLeft, plotTop, plotWidth, plotHeight);
        const zeroY =
          plotTop + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
        drawAxes(tCtx, plotLeft, plotTop, plotWidth, plotHeight, zeroY);

        drawArrow(
          tCtx,
          plotLeft + 12,
          plotTop + 12,
          plotLeft + 110,
          plotTop + 12,
          "#1f2937",
          1.3
        );
        tCtx.fillStyle = "#1f2937";
        tCtx.font = "600 12px \"Segoe UI\", sans-serif";
        tCtx.fillText("propagation", plotLeft + 118, plotTop + 16);

        drawDoubleArrow(
          tCtx,
          plotLeft - 18,
          plotTop + 14,
          plotLeft - 18,
          plotBottom - 14,
          "#2563eb",
          1.4
        );
        tCtx.fillStyle = "#1f2937";
        tCtx.font = "700 14px \"Segoe UI\", sans-serif";
        tCtx.textAlign = "center";
        tCtx.fillText(
          "Particles move vertically up and down",
          (plotLeft + plotRight) / 2,
          plotTop + 8
        );
        tCtx.textAlign = "start";

        const samples = Math.max(200, Math.floor(plotWidth));
        tCtx.strokeStyle = "#1d4ed8";
        tCtx.lineWidth = 2.1;
        tCtx.beginPath();
        for (let i = 0; i <= samples; i += 1) {
          const progress = i / samples;
          const x = xMin + progress * (xMax - xMin);
          const y = amp * Math.sin(k * x - safeOmega * t + phi);
          const px = plotLeft + progress * plotWidth;
          const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
          if (i === 0) {
            tCtx.moveTo(px, py);
          } else {
            tCtx.lineTo(px, py);
          }
        }
        tCtx.stroke();

        const particleCount = 13;
        const particleSpacing = (xMax - xMin) / (particleCount - 1);
        if (showDots) {
          if (showLines) {
            tCtx.strokeStyle = "rgba(251, 146, 60, 0.6)";
            tCtx.lineWidth = 1;
            for (let i = 0; i < particleCount; i += 1) {
              const x = xMin + particleSpacing * i;
              const y = amp * Math.sin(k * x - safeOmega * t + phi);
              const px = plotLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
              const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
              tCtx.beginPath();
              tCtx.moveTo(px, zeroY);
              tCtx.lineTo(px, py);
              tCtx.stroke();
            }
          }

          tCtx.fillStyle = "#fb923c";
          for (let i = 0; i < particleCount; i += 1) {
            const x = xMin + particleSpacing * i;
            const y = amp * Math.sin(k * x - safeOmega * t + phi);
            const px = plotLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
            const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
            tCtx.beginPath();
            tCtx.arc(px, py, 3.4, 0, TWO_PI);
            tCtx.fill();
          }
        }

        tCtx.fillStyle = "#475569";
        tCtx.font = "600 12px \"Segoe UI\", sans-serif";
        tCtx.fillText("x", plotRight - 8, plotBottom + 18);
        tCtx.fillText("y", plotLeft - 18, plotTop + 12);
      };

      const drawLongitudinal = () => {
        const { width, height } = longitudinalMetrics;
        drawBackground(lCtx, width, height);
        const padding = { left: 54, right: 20, top: 26, bottom: 38 };
        const plotWidth = Math.max(10, width - padding.left - padding.right);
        const plotHeight = Math.max(10, height - padding.top - padding.bottom);
        const plotLeft = padding.left;
        const plotTop = padding.top;
        const plotBottom = plotTop + plotHeight;
        const plotRight = plotLeft + plotWidth;

        drawGrid(lCtx, plotLeft, plotTop, plotWidth, plotHeight);
        const zeroY =
          plotTop + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
        drawAxes(lCtx, plotLeft, plotTop, plotWidth, plotHeight, zeroY);

        drawArrow(
          lCtx,
          plotLeft + 12,
          plotTop + 12,
          plotLeft + 110,
          plotTop + 12,
          "#1f2937",
          1.3
        );
        lCtx.fillStyle = "#1f2937";
        lCtx.font = "600 12px \"Segoe UI\", sans-serif";
        lCtx.fillText("propagation", plotLeft + 118, plotTop + 16);

        drawDoubleArrow(
          lCtx,
          plotLeft + 80,
          plotBottom - 16,
          plotRight - 80,
          plotBottom - 16,
          "#0ea5e9",
          1.4
        );
        lCtx.fillStyle = "#1f2937";
        lCtx.font = "700 14px \"Segoe UI\", sans-serif";
        lCtx.textAlign = "center";
        lCtx.fillText(
          "Particles move left and right",
          (plotLeft + plotRight) / 2,
          plotBottom - 24
        );
        lCtx.textAlign = "start";

        const particleCount = 15;
        const eqSpacing = (xMax - xMin) / (particleCount - 1);
        const equilibrium = [];
        const displaced = [];

        for (let i = 0; i < particleCount; i += 1) {
          const xEq = xMin + eqSpacing * i;
          const disp = amp * Math.sin(k * xEq - safeOmega * t + phi);
          const xDisp = xEq + disp;
          equilibrium.push(xEq);
          displaced.push(xDisp);
        }

        if (showBands) {
          for (let i = 0; i < particleCount - 1; i += 1) {
            const xA = displaced[i];
            const xB = displaced[i + 1];
            const segWidth = xB - xA;
            if (segWidth <= 0.02) {
              continue;
            }
            const spacingDelta = (eqSpacing - segWidth) / eqSpacing;
            const intensity = clamp(Math.abs(spacingDelta), 0, 0.9);
            const alpha = 0.12 + intensity * 0.45;
            const color =
              spacingDelta >= 0
                ? `rgba(37, 99, 235, ${alpha})`
                : `rgba(14, 165, 233, ${alpha})`;
            const pxA = plotLeft + ((xA - xMin) / (xMax - xMin)) * plotWidth;
            const pxB = plotLeft + ((xB - xMin) / (xMax - xMin)) * plotWidth;
            const barHeight = 22;
            lCtx.fillStyle = color;
            lCtx.fillRect(pxA, zeroY - barHeight / 2, pxB - pxA, barHeight);
          }
        }

        lCtx.fillStyle = "rgba(148, 163, 184, 0.7)";
        equilibrium.forEach((xEq) => {
          const px = plotLeft + ((xEq - xMin) / (xMax - xMin)) * plotWidth;
          lCtx.beginPath();
          lCtx.arc(px, zeroY, 2.8, 0, TWO_PI);
          lCtx.fill();
        });

        lCtx.fillStyle = "#0f172a";
        displaced.forEach((xDisp) => {
          const px = plotLeft + ((xDisp - xMin) / (xMax - xMin)) * plotWidth;
          lCtx.beginPath();
          lCtx.arc(px, zeroY, 4.1, 0, TWO_PI);
          lCtx.fill();
        });

        lCtx.fillStyle = "#475569";
        lCtx.font = "600 12px \"Segoe UI\", sans-serif";
        lCtx.fillText("x", plotRight - 8, plotBottom + 18);
        lCtx.fillText("s", plotLeft - 18, plotTop + 12);
      };

      drawTransverse();
      drawLongitudinal();
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

  const derived = useMemo(() => {
    const safeLambda = Math.max(wavelength, 0.6);
    const safeOmega = Math.max(omega, 0.05);
    const k = TWO_PI / safeLambda;
    const period = TWO_PI / safeOmega;
    const frequency = safeOmega / TWO_PI;
    const speed = safeOmega / k;
    return { k, period, frequency, speed };
  }, [wavelength, omega]);

  const titleText = title ?? "Transverse vs Longitudinal (Side-by-Side)";
  const descriptionText =
    description ??
    "Top: transverse (particle motion ⟂ travel). Bottom: longitudinal (particle motion ∥ travel).";

  return (
    <div className="wave-shell">
      <aside className="wave-left">
        <div className="wave-left-title">{titleText}</div>
        <div className="wave-left-desc">{descriptionText}</div>
        <div
          className="wave-formula"
          dangerouslySetInnerHTML={renderFormula("y(x,t) = A\\sin(kx - \\omega t + \\phi)")}
        />
        <div className="wave-left-list">
          <div className="wave-left-item">
            Transverse: particles move up/down while the wave moves right.
          </div>
          <div className="wave-left-item">
            Longitudinal: particles move left/right, creating compressions.
          </div>
          <div className="wave-left-item">
            Both share the same wave parameters A, λ, ω, and speed v.
          </div>
        </div>
        <div className="wave-compare">
          <div className="wave-compare-title">Key Differences</div>
          <div className="wave-compare-item">
            <span className="wave-compare-label">Motion</span>
            <span>Perpendicular in transverse, parallel in longitudinal.</span>
          </div>
          <div className="wave-compare-item">
            <span className="wave-compare-label">Pattern</span>
            <span>Crests/troughs vs compressions/rarefactions.</span>
          </div>
          <div className="wave-compare-item">
            <span className="wave-compare-label">Same</span>
            <span>Both are traveling waves described by kx − ωt.</span>
          </div>
        </div>
      </aside>

      <section className="wave-center">
        <div className="wave-center-header">
          <div className="wave-center-title">One Simulation, Two Wave Types</div>
          <div className="wave-center-desc">
            Compare how the same equation looks for transverse and longitudinal motion.
          </div>
        </div>

        <div className="wave-graphs">
          <div className="wave-graph-card">
            <div className="wave-graph-title">Transverse Wave (top)</div>
            <div ref={transverseWrapRef} className="wave-canvas-wrap">
              <canvas ref={transverseCanvasRef} className="wave-canvas" />
            </div>
          </div>

          <div className="wave-graph-card">
            <div className="wave-graph-title">Longitudinal Wave (bottom)</div>
            <div ref={longitudinalWrapRef} className="wave-canvas-wrap">
              <canvas ref={longitudinalCanvasRef} className="wave-canvas" />
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
          <div className="wave-control-title">View</div>
          <div className="wave-select-row">
            <button
              type="button"
              className={`wave-toggle-btn ${showTransverseDots ? "active" : ""}`}
              onClick={() => setShowTransverseDots((prev) => !prev)}
            >
              Transverse dots
            </button>
            <button
              type="button"
              className={`wave-toggle-btn ${showTransverseLines ? "active" : ""}`}
              onClick={() => setShowTransverseLines((prev) => !prev)}
            >
              Transverse lines
            </button>
            <button
              type="button"
              className={`wave-toggle-btn ${showDensityBands ? "active" : ""}`}
              onClick={() => setShowDensityBands((prev) => !prev)}
            >
              Density bands
            </button>
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-slider-row">
            <label htmlFor="compare-amplitude">
              Amplitude (A)
              <span className="wave-value">{formatNumber(amplitude, 2)}</span>
            </label>
            <input
              id="compare-amplitude"
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={amplitude}
              onChange={(event) => setAmplitude(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="compare-wavelength">
              Wavelength (lambda)
              <span className="wave-value">{formatNumber(wavelength, 2)}</span>
            </label>
            <input
              id="compare-wavelength"
              type="range"
              min="2.5"
              max="10"
              step="0.2"
              value={wavelength}
              onChange={(event) => setWavelength(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="compare-omega">
              Angular Frequency (omega)
              <span className="wave-value">{formatNumber(omega, 2)}</span>
            </label>
            <input
              id="compare-omega"
              type="range"
              min="0.6"
              max="5"
              step="0.1"
              value={omega}
              onChange={(event) => setOmega(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="compare-phase">
              Initial Phase (phi)
              <span className="wave-value">{formatNumber(phase, 2)}</span>
            </label>
            <input
              id="compare-phase"
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
        </div>
      </aside>
    </div>
  );
}
