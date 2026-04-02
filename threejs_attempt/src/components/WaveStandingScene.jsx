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

export default function WaveStandingScene({ title, description }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [lengthL, setLengthL] = useState(6);
  const [tension, setTension] = useState(20);
  const [frequency, setFrequency] = useState(2.2);
  const [mu, setMu] = useState(0.5);
  const [mode, setMode] = useState(1);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const metricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const timeRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const paramsRef = useRef({ lengthL, tension, frequency, mu, mode });

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    paramsRef.current = { lengthL, tension, frequency, mu, mode };
  }, [lengthL, tension, frequency, mu, mode]);

  useEffect(() => {
    const resize = () => {
      setupCanvas(canvasRef.current, wrapRef.current, metricsRef);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (wrapRef.current) {
      observer.observe(wrapRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frameId = 0;
    let lastTime = performance.now();

    const drawFrame = () => {
      const metrics = metricsRef.current;
      const ctx = metrics.ctx;
      if (!ctx) {
        return;
      }

      const { lengthL: L, frequency: f, mode: n } = paramsRef.current;
      const safeL = Math.max(L, 1);
      const safeN = Math.max(1, Math.round(n));
      const omega = TWO_PI * Math.max(f, 0.05);
      const t = timeRef.current;
      const { width, height } = metrics;
      drawBackground(ctx, width, height);

      const padding = { left: 54, right: 20, top: 26, bottom: 38 };
      const plotWidth = Math.max(10, width - padding.left - padding.right);
      const plotHeight = Math.max(10, height - padding.top - padding.bottom);
      const plotLeft = padding.left;
      const plotTop = padding.top;
      const plotBottom = plotTop + plotHeight;
      const plotRight = plotLeft + plotWidth;

      drawGrid(ctx, plotLeft, plotTop, plotWidth, plotHeight);
      const zeroY = plotTop + plotHeight / 2;
      drawAxes(ctx, plotLeft, plotTop, plotWidth, plotHeight, zeroY);

      const ampPx = plotHeight * 0.34;
      const samples = Math.max(200, Math.floor(plotWidth));
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= samples; i += 1) {
        const progress = i / samples;
        const x = progress * safeL;
        const shape = Math.sin((safeN * Math.PI * x) / safeL);
        const y = ampPx * shape * Math.sin(omega * t);
        const px = plotLeft + progress * plotWidth;
        const py = zeroY - y;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      const nodeCount = safeN + 1;
      ctx.fillStyle = "#1d4ed8";
      for (let i = 0; i < nodeCount; i += 1) {
        const x = (safeL / safeN) * i;
        const px = plotLeft + (x / safeL) * plotWidth;
        ctx.beginPath();
        ctx.arc(px, zeroY, 4.6, 0, TWO_PI);
        ctx.fill();
      }

      const antinodeCount = safeN;
      ctx.fillStyle = "#ef4444";
      for (let i = 0; i < antinodeCount; i += 1) {
        const x = (safeL / safeN) * (i + 0.5);
        const px = plotLeft + (x / safeL) * plotWidth;
        const shape = Math.sin((safeN * Math.PI * x) / safeL);
        const y = ampPx * shape * Math.sin(omega * t);
        const py = zeroY - y;
        ctx.beginPath();
        ctx.arc(px, py, 4.8, 0, TWO_PI);
        ctx.fill();
      }

      ctx.fillStyle = "#475569";
      ctx.font = "600 12px \"Segoe UI\", sans-serif";
      ctx.fillText("x", plotRight - 8, plotBottom + 18);
      ctx.fillText("y", plotLeft - 18, plotTop + 12);
      ctx.fillText("fixed end", plotLeft + 6, plotTop + 16);
      ctx.fillText("fixed end", plotRight - 64, plotTop + 16);
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
    const safeL = Math.max(lengthL, 0.5);
    const safeMu = Math.max(mu, 0.05);
    const safeT = Math.max(tension, 0.1);
    const safeN = Math.max(1, Math.round(mode));
    const v = Math.sqrt(safeT / safeMu);
    const lambda = (2 * safeL) / safeN;
    const harmonicF = (safeN * v) / (2 * safeL);
    return { v, lambda, harmonicF, n: safeN };
  }, [lengthL, tension, mu, mode]);

  const titleText = title ?? "Standing Waves on a String";
  const descriptionText =
    description ??
    "Change length, tension, frequency, and mode to see nodes and antinodes on a fixed string.";

  const handleModeSelect = (value) => {
    const next = clamp(value, 1, 6);
    setMode(next);
    setFrequency(derived.harmonicF);
  };

  return (
    <div className="wave-shell">
      <aside className="wave-left">
        <div className="wave-left-title">{titleText}</div>
        <div className="wave-left-desc">{descriptionText}</div>
        <div
          className="wave-formula"
          dangerouslySetInnerHTML={renderFormula("y(x,t)=A\\sin\\left(\\frac{n\\pi x}{L}\\right)\\sin(2\\pi f t)")}
        />
        <div className="wave-left-list">
          <div className="wave-left-item">
            Nodes (<span className="wave-node-text">blue</span>) stay fixed at zero displacement.
          </div>
          <div className="wave-left-item">
            Antinodes (<span className="wave-antinode-text">orange</span>) reach maximum displacement.
          </div>
          <div className="wave-left-item">Higher modes add more nodes and antinodes.</div>
        </div>
        <div className="wave-equations">
          <div
            className="wave-equation"
            dangerouslySetInnerHTML={renderFormula(
              `\\lambda = \\frac{2L}{n} = \\frac{2\\times ${formatNumber(
                lengthL,
                2
              )}}{${derived.n}} = ${formatNumber(derived.lambda, 2)}`
            )}
          />
          <div
            className="wave-equation"
            dangerouslySetInnerHTML={renderFormula(
              `v = \\sqrt{\\frac{T}{\\mu}} = \\sqrt{\\frac{${formatNumber(
                tension,
                1
              )}}{${formatNumber(mu, 2)}}} = ${formatNumber(derived.v, 2)}`
            )}
          />
          <div
            className="wave-equation"
            dangerouslySetInnerHTML={renderFormula(
              `f_n = \\frac{n v}{2L} = \\frac{${derived.n}\\times ${formatNumber(
                derived.v,
                2
              )}}{2\\times ${formatNumber(lengthL, 2)}} = ${formatNumber(
                derived.harmonicF,
                2
              )}`
            )}
          />
        </div>
        <div className="wave-symbols">
          <div className="wave-symbols-title">Symbol Guide</div>
          <div className="wave-symbols-list">
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">L</span>
                <span className="wave-symbol-label">String length</span>
              </summary>
              <div className="wave-symbol-desc">Distance between fixed ends.</div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">n</span>
                <span className="wave-symbol-label">Harmonic number</span>
              </summary>
              <div className="wave-symbol-desc">Mode index (1, 2, 3, ...).</div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">T</span>
                <span className="wave-symbol-label">Tension</span>
              </summary>
              <div className="wave-symbol-desc">Pulling force along the string.</div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">μ</span>
                <span className="wave-symbol-label">Mass per length</span>
              </summary>
              <div className="wave-symbol-desc">Linear density of the string.</div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">λ</span>
                <span className="wave-symbol-label">Wavelength</span>
              </summary>
              <div className="wave-symbol-desc">Distance between adjacent antinodes.</div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">f</span>
                <span className="wave-symbol-label">Frequency</span>
              </summary>
              <div className="wave-symbol-desc">Oscillations per second.</div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">v</span>
                <span className="wave-symbol-label">Wave speed</span>
              </summary>
              <div className="wave-symbol-desc">Speed of wave propagation on the string.</div>
            </details>
          </div>
        </div>
      </aside>

      <section className="wave-center">
        <div className="wave-center-header">
          <div className="wave-center-title">Standing Wave Pattern</div>
          <div className="wave-center-desc">
            A string fixed at both ends supports only specific harmonic shapes.
          </div>
        </div>

        <div className="wave-graphs single">
          <div className="wave-graph-card">
            <div className="wave-graph-title">String Snapshot</div>
            <div ref={wrapRef} className="wave-canvas-wrap">
              <canvas ref={canvasRef} className="wave-canvas" />
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
          <div className="wave-control-title">Harmonics</div>
          <div className="wave-select-row">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={`mode-${value}`}
                type="button"
                className={`wave-toggle-btn ${mode === value ? "active" : ""}`}
                onClick={() => handleModeSelect(value)}
              >
                {value}th harmonic
              </button>
            ))}
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Controls</div>
          <div className="wave-slider-row">
            <label htmlFor="standing-length">
              Length (L)
              <span className="wave-value">{formatNumber(lengthL, 2)}</span>
            </label>
            <input
              id="standing-length"
              type="range"
              min="3"
              max="10"
              step="0.1"
              value={lengthL}
              onChange={(event) => setLengthL(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="standing-tension">
              Tension
              <span className="wave-value">{formatNumber(tension, 1)}</span>
            </label>
            <input
              id="standing-tension"
              type="range"
              min="5"
              max="40"
              step="0.5"
              value={tension}
              onChange={(event) => setTension(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="standing-frequency">
              Frequency (f)
              <span className="wave-value">{formatNumber(frequency, 2)}</span>
            </label>
            <input
              id="standing-frequency"
              type="range"
              min="0.5"
              max="8"
              step="0.05"
              value={frequency}
              onChange={(event) => setFrequency(parseFloat(event.target.value))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="standing-mu">
              Mass/length (μ)
              <span className="wave-value">{formatNumber(mu, 2)}</span>
            </label>
            <input
              id="standing-mu"
              type="range"
              min="0.2"
              max="1.5"
              step="0.05"
              value={mu}
              onChange={(event) => setMu(parseFloat(event.target.value))}
            />
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Drive</div>
          <div className="wave-readout">
            <span>Drive f</span>
            <span>{formatNumber(frequency, 2)} Hz</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
