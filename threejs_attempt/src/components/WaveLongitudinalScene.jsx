import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";

const TWO_PI = Math.PI * 2;
const DOMAIN_LENGTH = 15;
const AMPLITUDE_MAX = 1.6;
const AMPLITUDE_PADDING = 1.2;

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

export default function WaveLongitudinalScene({ title, description }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [amplitude, setAmplitude] = useState(0.8);
  const [wavelength, setWavelength] = useState(6);
  const [omega, setOmega] = useState(2.0);
  const [phase, setPhase] = useState(0);
  const [probeRatio, setProbeRatio] = useState(0.35);

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
    probeRatio
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
      probeRatio
    };
  }, [amplitude, wavelength, omega, phase, probeRatio]);

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
        probeRatio: ratio
      } = paramsRef.current;

      const showBands = true;
      const showArrow = true;
      const safeLambda = Math.max(lambda, 0.6);
      const safeOmega = Math.max(omegaValue, 0.05);
      const k = TWO_PI / safeLambda;
      const xRange = DOMAIN_LENGTH;
      const xMin = 0;
      const xMax = xRange;
      const t = timeRef.current;
      const yMax = AMPLITUDE_MAX * AMPLITUDE_PADDING;
      const yMin = -yMax;
      const probeX = clamp(ratio, 0.02, 0.98) * xRange;
      const probePhase = k * probeX - safeOmega * t + phi;
      const probeDisp = amp * Math.sin(probePhase);
      const probeVel = -amp * safeOmega * Math.cos(probePhase);
      const period = TWO_PI / safeOmega;
      const tRange = period * 2;

      const drawLongitudinalView = () => {
        const { width, height } = topMetrics;
        drawBackground(topCtx, width, height);
        const padding = { left: 54, right: 20, top: 26, bottom: 38 };
        const plotWidth = Math.max(10, width - padding.left - padding.right);
        const plotHeight = Math.max(10, height - padding.top - padding.bottom);
        const plotLeft = padding.left;
        const plotTop = padding.top;
        const plotBottom = plotTop + plotHeight;
        const plotRight = plotLeft + plotWidth;

        topPlotRef.current = { left: plotLeft, right: plotRight, xMin, xMax };

        drawGrid(topCtx, plotLeft, plotTop, plotWidth, plotHeight);
        const zeroY =
          plotTop + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
        drawAxes(topCtx, plotLeft, plotTop, plotWidth, plotHeight, zeroY);

        topCtx.setLineDash([6, 6]);
        topCtx.strokeStyle = "rgba(71, 85, 105, 0.45)";
        topCtx.lineWidth = 1.1;
        topCtx.beginPath();
        topCtx.moveTo(plotLeft, zeroY);
        topCtx.lineTo(plotRight, zeroY);
        topCtx.stroke();
        topCtx.setLineDash([]);

        drawArrow(
          topCtx,
          plotLeft + 12,
          plotTop + 12,
          plotLeft + 110,
          plotTop + 12,
          "#1f2937",
          1.3
        );
        topCtx.fillStyle = "#1f2937";
        topCtx.font = "600 12px \"Segoe UI\", sans-serif";
        topCtx.fillText("propagation", plotLeft + 118, plotTop + 16);

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
            topCtx.fillStyle = color;
            topCtx.fillRect(pxA, zeroY - barHeight / 2, pxB - pxA, barHeight);
          }
        }

        topCtx.fillStyle = "rgba(148, 163, 184, 0.7)";
        equilibrium.forEach((xEq) => {
          const px = plotLeft + ((xEq - xMin) / (xMax - xMin)) * plotWidth;
          topCtx.beginPath();
          topCtx.arc(px, zeroY, 2.8, 0, TWO_PI);
          topCtx.fill();
        });

        topCtx.fillStyle = "#0f172a";
        displaced.forEach((xDisp) => {
          const px = plotLeft + ((xDisp - xMin) / (xMax - xMin)) * plotWidth;
          topCtx.beginPath();
          topCtx.arc(px, zeroY, 4.1, 0, TWO_PI);
          topCtx.fill();
        });

        const probeEqPx =
          plotLeft + ((probeX - xMin) / (xMax - xMin)) * plotWidth;
        const probePx =
          plotLeft + ((probeX + probeDisp - xMin) / (xMax - xMin)) * plotWidth;
        topCtx.strokeStyle = "#f97316";
        topCtx.lineWidth = 2;
        topCtx.beginPath();
        topCtx.moveTo(probeEqPx, zeroY);
        topCtx.lineTo(probePx, zeroY);
        topCtx.stroke();

        if (showArrow && Math.abs(probeVel) > 0.01) {
          const arrowLength = 26;
          const direction = Math.sign(probeVel);
          drawArrow(
            topCtx,
            probePx,
            zeroY - 18,
            probePx + direction * arrowLength,
            zeroY - 18,
            "#f97316",
            1.4
          );
          topCtx.fillStyle = "#f97316";
          topCtx.font = "700 12px \"Segoe UI\", sans-serif";
          topCtx.fillText("v", probePx + direction * (arrowLength + 6), zeroY - 14);
        }

        topCtx.fillStyle = "#f97316";
        topCtx.beginPath();
        topCtx.arc(probePx, zeroY, 5.2, 0, TWO_PI);
        topCtx.fill();
        topCtx.fillStyle = "#fef3c7";
        topCtx.beginPath();
        topCtx.arc(probePx, zeroY, 2.6, 0, TWO_PI);
        topCtx.fill();

        topCtx.fillStyle = "#1f2937";
        topCtx.font = "600 12px \"Segoe UI\", sans-serif";
        topCtx.fillText(`probe x0 = ${formatNumber(probeX, 2)}`, plotLeft + 6, plotTop + 34);
        topCtx.fillText(`displacement = ${formatNumber(probeDisp, 2)}`, plotLeft + 6, plotTop + 50);

        topCtx.fillStyle = "#475569";
        topCtx.font = "600 12px \"Segoe UI\", sans-serif";
        topCtx.fillText("x", plotRight - 8, plotBottom + 18);
        topCtx.fillText("s", plotLeft - 18, plotTop + 12);
      };

      const drawProbeGraph = () => {
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
        bottomCtx.strokeStyle = "#f97316";
        bottomCtx.lineWidth = 2.1;
        bottomCtx.beginPath();
        for (let i = 0; i <= samples; i += 1) {
          const progress = i / samples;
          const tVal = progress * tRange;
          const y = amp * Math.sin(k * probeX - safeOmega * tVal + phi);
          const px = plotLeft + progress * plotWidth;
          const py = plotTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
          if (i === 0) {
            bottomCtx.moveTo(px, py);
          } else {
            bottomCtx.lineTo(px, py);
          }
        }
        bottomCtx.stroke();

        const markerT = tRange > 0 ? (t % tRange) : 0;
        const markerY = amp * Math.sin(k * probeX - safeOmega * markerT + phi);
        const markerPx = plotLeft + (markerT / tRange) * plotWidth;
        const markerPy =
          plotTop + (1 - (markerY - yMin) / (yMax - yMin)) * plotHeight;

        bottomCtx.strokeStyle = "rgba(15, 118, 110, 0.6)";
        bottomCtx.lineWidth = 1.2;
        bottomCtx.setLineDash([6, 6]);
        bottomCtx.beginPath();
        bottomCtx.moveTo(markerPx, plotTop);
        bottomCtx.lineTo(markerPx, plotBottom);
        bottomCtx.stroke();
        bottomCtx.setLineDash([]);

        bottomCtx.fillStyle = "#f97316";
        bottomCtx.beginPath();
        bottomCtx.arc(markerPx, markerPy, 4.8, 0, TWO_PI);
        bottomCtx.fill();
        bottomCtx.fillStyle = "#fef3c7";
        bottomCtx.beginPath();
        bottomCtx.arc(markerPx, markerPy, 2.4, 0, TWO_PI);
        bottomCtx.fill();

        bottomCtx.fillStyle = "#475569";
        bottomCtx.font = "600 12px \"Segoe UI\", sans-serif";
        bottomCtx.fillText("t", plotRight - 8, plotBottom + 18);
        bottomCtx.fillText("s", plotLeft - 18, plotTop + 12);

        bottomCtx.fillStyle = "#64748b";
        bottomCtx.font = "600 11px \"Segoe UI\", sans-serif";
        bottomCtx.fillText("0", plotLeft - 4, plotBottom + 18);
        bottomCtx.fillText("T", plotLeft + plotWidth / 2 - 4, plotBottom + 18);
        bottomCtx.fillText("2T", plotRight - 18, plotBottom + 18);
      };

      drawLongitudinalView();
      drawProbeGraph();
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
    setProbeRatio(clamp(ratio, 0.02, 0.98));
  };

  const derived = useMemo(() => {
    const safeLambda = Math.max(wavelength, 0.6);
    const safeOmega = Math.max(omega, 0.05);
    const k = TWO_PI / safeLambda;
    const period = TWO_PI / safeOmega;
    const frequency = safeOmega / TWO_PI;
    const speed = safeOmega / k;
    const xRange = DOMAIN_LENGTH;
    const probeX = clamp(probeRatio, 0.02, 0.98) * xRange;
    return { k, period, frequency, speed, probeX };
  }, [wavelength, omega, probeRatio]);

  const titleText = title ?? "Longitudinal Wave (Compressions and Rarefactions)";
  const descriptionText =
    description ??
    "Particles oscillate parallel to the direction of travel, producing compressions and rarefactions.";

  return (
    <div className="wave-shell">
      <aside className="wave-left">
        <div className="wave-left-title">{titleText}</div>
        <div className="wave-left-desc">{descriptionText}</div>
        <div
          className="wave-formula"
          dangerouslySetInnerHTML={renderFormula("s(x,t) = A\\sin(kx - \\omega t + \\phi)")}
        />
        <div className="wave-left-list">
          <div className="wave-left-item">
            Definition: A longitudinal wave has particle motion parallel to the direction of travel.
          </div>
          <div className="wave-left-item">
            Here the wave travels along +x, and particles oscillate back and forth along x.
          </div>
          <div className="wave-left-item">
            Blue bands show compressions (high density) and rarefactions (low density).
          </div>
          <div className="wave-left-item">
            The orange probe is one particle fixed at x0. Its displacement s(t) is SHM.
          </div>
        </div>
        <div className="wave-compare">
          <div className="wave-compare-title">Compare With Transverse</div>
          <div className="wave-compare-item">
            <span className="wave-compare-label">Same</span>
            <span>Both use the same wave parameters: A, λ, ω, T, and wave speed v.</span>
          </div>
          <div className="wave-compare-item">
            <span className="wave-compare-label">Different</span>
            <span>Particles move along x here, not up/down like transverse waves.</span>
          </div>
          <div className="wave-compare-item">
            <span className="wave-compare-label">Look For</span>
            <span>Compressions move right while each particle only shifts left/right.</span>
          </div>
        </div>
        <div className="wave-left-hint">
          Tip: Watch the orange probe slide left/right as compressions move right.
        </div>
      </aside>

      <section className="wave-center">
        <div className="wave-center-header">
          <div className="wave-center-title">Longitudinal Wave Snapshot</div>
          <div className="wave-center-desc">
            Density bands show where particles crowd together or spread apart.
          </div>
        </div>

        <div className="wave-graphs">
          <div className="wave-graph-card">
            <div className="wave-graph-title">Medium Snapshot (x direction)</div>
            <div
              ref={topWrapRef}
              className="wave-canvas-wrap is-interactive"
              onPointerDown={handleSelect}
            >
              <canvas ref={topCanvasRef} className="wave-canvas" />
              <div className="wave-select-hint">Click to move the probe particle</div>
            </div>
          </div>

          <div className="wave-graph-card">
            <div className="wave-graph-title">Probe Displacement (s vs t)</div>
            <div ref={bottomWrapRef} className="wave-canvas-wrap">
              <canvas ref={bottomCanvasRef} className="wave-canvas" />
            </div>
          </div>
        </div>
      </section>

      <aside className="wave-right compact">
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
          <div className="wave-control-title">Probe</div>
          <div className="wave-slider-row">
            <label htmlFor="longitudinal-probe">
              Probe position (x0)
              <span className="wave-value">{formatNumber(derived.probeX, 2)}</span>
            </label>
            <input
              id="longitudinal-probe"
              type="range"
              min="0.02"
              max="0.98"
              step="0.01"
              value={probeRatio}
              onChange={(event) => setProbeRatio(parseFloat(event.target.value))}
            />
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-slider-row">
            <label htmlFor="longitudinal-amplitude">
              Amplitude (A)
              <span className="wave-value">{formatNumber(amplitude, 2)}</span>
            </label>
            <input
              id="longitudinal-amplitude"
              type="range"
              min="0.2"
              max="1.6"
              step="0.05"
              value={amplitude}
              onChange={(event) => setAmplitude(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="longitudinal-wavelength">
              Wavelength (lambda)
              <span className="wave-value">{formatNumber(wavelength, 2)}</span>
            </label>
            <input
              id="longitudinal-wavelength"
              type="range"
              min="2.5"
              max="10"
              step="0.2"
              value={wavelength}
              onChange={(event) => setWavelength(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="longitudinal-omega">
              Angular Frequency (omega)
              <span className="wave-value">{formatNumber(omega, 2)}</span>
            </label>
            <input
              id="longitudinal-omega"
              type="range"
              min="0.6"
              max="5"
              step="0.1"
              value={omega}
              onChange={(event) => setOmega(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="longitudinal-phase">
              Initial Phase (phi)
              <span className="wave-value">{formatNumber(phase, 2)}</span>
            </label>
            <input
              id="longitudinal-phase"
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
          <div className="wave-control-title">Calculations</div>
          <div className="wave-calc-list">
            <div
              className="wave-calc-row"
              dangerouslySetInnerHTML={renderFormula(
                `k = \\frac{2\\pi}{\\lambda} = \\frac{2\\pi}{${formatNumber(
                  wavelength,
                  2
                )}} = ${formatNumber(derived.k, 3)}`
              )}
            />
            <div
              className="wave-calc-row"
              dangerouslySetInnerHTML={renderFormula(
                `T = \\frac{2\\pi}{\\omega} = \\frac{2\\pi}{${formatNumber(
                  omega,
                  2
                )}} = ${formatNumber(derived.period, 2)}\\,s`
              )}
            />
            <div
              className="wave-calc-row"
              dangerouslySetInnerHTML={renderFormula(
                `f = \\frac{\\omega}{2\\pi} = \\frac{${formatNumber(
                  omega,
                  2
                )}}{2\\pi} = ${formatNumber(derived.frequency, 2)}\\,Hz`
              )}
            />
            <div
              className="wave-calc-row"
              dangerouslySetInnerHTML={renderFormula(
                `v = \\frac{\\omega}{k} = \\frac{${formatNumber(
                  omega,
                  2
                )}}{${formatNumber(derived.k, 3)}} = ${formatNumber(derived.speed, 2)}`
              )}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
