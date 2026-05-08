import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";

const TWO_PI = Math.PI * 2;
const LENGTH_MAX = 10;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const formatNumber = (value, digits = 2) => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(digits);
  return fixed.replace(/\.00$/, "");
};

const renderFormula = (latex) => ({
  __html: katex.renderToString(latex, { throwOnError: false })
});

const MathInline = ({ latex, className = "" }) => (
  <span
    className={`wave-math-inline ${className}`.trim()}
    dangerouslySetInnerHTML={renderFormula(latex)}
  />
);

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

const drawArrow = (ctx, x1, y1, x2, y2, color) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 8;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
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

const drawDoubleArrow = (ctx, x1, y1, x2, y2, color) => {
  drawArrow(ctx, x1, y1, x2, y2, color);
  drawArrow(ctx, x2, y2, x1, y1, color);
};

export default function WaveStandingScene({ title, description }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [lengthL, setLengthL] = useState(LENGTH_MAX);
  const [tension, setTension] = useState(20);
  const [frequency, setFrequency] = useState(1.0);
  const [mu, setMu] = useState(0.5);
  const [mode, setMode] = useState(1);
  const [calcHighlight, setCalcHighlight] = useState({});

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const metricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const timeRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const paramsRef = useRef({ lengthL, tension, frequency, mu, mode });
  const prevParamsRef = useRef({ lengthL, tension, frequency, mu, mode });
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    paramsRef.current = { lengthL, tension, frequency, mu, mode };
  }, [lengthL, tension, frequency, mu, mode]);

  useEffect(() => {
    const prev = prevParamsRef.current;
    const changedKeys = new Set();

    if (lengthL !== prev.lengthL) {
      changedKeys.add("lambda");
      changedKeys.add("harmonic");
    }
    if (tension !== prev.tension) {
      changedKeys.add("v");
      changedKeys.add("harmonic");
    }
    if (mu !== prev.mu) {
      changedKeys.add("v");
      changedKeys.add("harmonic");
    }
    if (mode !== prev.mode) {
      changedKeys.add("lambda");
      changedKeys.add("harmonic");
    }
    if (changedKeys.size) {
      const nextHighlight = {};
      changedKeys.forEach((key) => {
        nextHighlight[key] = true;
      });
      setCalcHighlight(nextHighlight);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = setTimeout(() => {
        setCalcHighlight({});
        highlightTimerRef.current = null;
      }, 900);
    }

    prevParamsRef.current = { lengthL, tension, frequency, mu, mode };
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

      const { lengthL: L, frequency: f, mode: n, tension: T, mu: muValue } =
        paramsRef.current;
      const safeL = Math.max(L, 1);
      const safeN = Math.max(1, Math.round(n));
      const safeT = Math.max(T, 0.1);
      const safeMu = Math.max(muValue, 0.05);
      const v = Math.sqrt(safeT / safeMu);
      const harmonicF = (safeN * v) / (2 * safeL);
      const bandwidth = Math.max(0.2, harmonicF * 0.2);
      const detune = (f - harmonicF) / bandwidth;
      const resonance = 1 / (1 + detune * detune);
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
      const stringWidth = plotWidth * (safeL / LENGTH_MAX);
      const stringRight = plotLeft + stringWidth;

      drawGrid(ctx, plotLeft, plotTop, plotWidth, plotHeight);
      const zeroY = plotTop + plotHeight / 2;
      drawAxes(ctx, plotLeft, plotTop, stringWidth, plotHeight, zeroY);

      ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plotRight, plotTop);
      ctx.lineTo(plotRight, plotBottom);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stringRight, plotTop);
      ctx.lineTo(stringRight, plotBottom);
      ctx.stroke();
      ctx.restore();

      const ampPx = plotHeight * 0.34 * (0.3 + 0.7 * resonance);
      const samples = Math.max(160, Math.floor(stringWidth));
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= samples; i += 1) {
        const progress = i / samples;
        const x = progress * safeL;
        const shape = Math.sin((safeN * Math.PI * x) / safeL);
        const y = ampPx * shape * Math.sin(omega * t);
        const px = plotLeft + (x / LENGTH_MAX) * plotWidth;
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
        const px = plotLeft + (x / LENGTH_MAX) * plotWidth;
        ctx.beginPath();
        ctx.arc(px, zeroY, 4.6, 0, TWO_PI);
        ctx.fill();
      }

      const antinodeCount = safeN;
      ctx.fillStyle = "#ef4444";
      for (let i = 0; i < antinodeCount; i += 1) {
        const x = (safeL / safeN) * (i + 0.5);
        const px = plotLeft + (x / LENGTH_MAX) * plotWidth;
        const shape = Math.sin((safeN * Math.PI * x) / safeL);
        const y = ampPx * shape * Math.sin(omega * t);
        const py = zeroY - y;
        ctx.beginPath();
        ctx.arc(px, py, 4.8, 0, TWO_PI);
        ctx.fill();
      }

      ctx.fillStyle = "#475569";
      ctx.font = "600 12px \"Segoe UI\", sans-serif";
      ctx.fillText("x", stringRight - 8, plotBottom + 18);
      ctx.fillText("y", plotLeft - 18, plotTop + 12);
      ctx.fillText("fixed end", plotLeft + 6, plotTop + 16);

      const fixedLabelX = plotRight - 72;
      const fixedLabelY = plotTop + 6;
      ctx.fillText("Fixed end", fixedLabelX - 8, fixedLabelY);
      drawArrow(
        ctx,
        fixedLabelX + 4,
        fixedLabelY + 4,
        plotRight - 4,
        plotTop + 18,
        "#0f172a"
      );

      const lengthArrowY = plotBottom - 10;
      const lengthArrowStart = plotLeft + 10;
      const lengthArrowEnd = Math.max(plotLeft + 40, stringRight - 10);
      drawDoubleArrow(ctx, lengthArrowStart, lengthArrowY, lengthArrowEnd, lengthArrowY, "#0f172a");
      ctx.fillStyle = "#0f172a";
      ctx.font = "600 12px \"Segoe UI\", sans-serif";
      ctx.fillText("length of", lengthArrowStart + 6, lengthArrowY + 18);
      ctx.fillText("the string", lengthArrowStart + 8, lengthArrowY + 32);
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
    const next = clamp(value, 1, 5);
    setMode(next);
  };

  const equationsPanel = (
    <div className="wave-equations">
      <div
        className={`wave-equation ${calcHighlight.lambda ? "is-highlighted" : ""}`}
        dangerouslySetInnerHTML={renderFormula(
          `\\lambda = \\frac{2L}{n} = \\frac{2\\times ${formatNumber(
            lengthL,
            2
          )}}{${derived.n}} = ${formatNumber(derived.lambda, 2)}`
        )}
      />
      <div
        className={`wave-equation ${calcHighlight.v ? "is-highlighted" : ""}`}
        dangerouslySetInnerHTML={renderFormula(
          `v = \\sqrt{\\frac{T}{\\mu}} = \\sqrt{\\frac{${formatNumber(
            tension,
            1
          )}}{${formatNumber(mu, 2)}}} = ${formatNumber(derived.v, 2)}`
        )}
      />
      <div
        className={`wave-equation ${calcHighlight.harmonic ? "is-highlighted" : ""}`}
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
  );

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
          <div className="wave-left-item">
            Higher modes (<MathInline latex={"n=2,3,\\ldots"} />) add more nodes and antinodes.
          </div>
        </div>
        <div className="wave-symbols">
          <div className="wave-symbols-title">Symbol Guide</div>
          <div className="wave-symbols-list">
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <MathInline className="wave-symbol-name" latex="L" />
                <span className="wave-symbol-label">String length</span>
              </summary>
              <div className="wave-symbol-desc">
                Distance between fixed ends, measured as <MathInline latex="L" />.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <MathInline className="wave-symbol-name" latex="n" />
                <span className="wave-symbol-label">Harmonic number</span>
              </summary>
              <div className="wave-symbol-desc">
                Mode index <MathInline latex={"n=1,2,3,\\ldots"} />.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <MathInline className="wave-symbol-name" latex="T" />
                <span className="wave-symbol-label">Tension</span>
              </summary>
              <div className="wave-symbol-desc">
                Pulling force along the string, written as <MathInline latex="T" />.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <MathInline className="wave-symbol-name" latex={"\\mu"} />
                <span className="wave-symbol-label">Mass per length</span>
              </summary>
              <div className="wave-symbol-desc">
                Linear density of the string, written as <MathInline latex={"\\mu"} />.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <MathInline className="wave-symbol-name" latex={"\\lambda"} />
                <span className="wave-symbol-label">Wavelength</span>
              </summary>
              <div className="wave-symbol-desc">
                Distance between adjacent antinodes, written as <MathInline latex={"\\lambda"} />.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <MathInline className="wave-symbol-name" latex="f" />
                <span className="wave-symbol-label">Frequency</span>
              </summary>
              <div className="wave-symbol-desc">
                Oscillations per second, written as <MathInline latex="f" />.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <MathInline className="wave-symbol-name" latex="v" />
                <span className="wave-symbol-label">Wave speed</span>
              </summary>
              <div className="wave-symbol-desc">
                Speed of wave propagation on the string, written as <MathInline latex="v" />.
              </div>
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

      <aside className="wave-right wave-standing-controls">
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

        <div className="wave-control-block wave-standing-params">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-param-row">
            <div className="wave-param-head">
              <MathInline className="wave-param-icon" latex="n" />
              <label htmlFor="standing-mode">
                Harmonic <MathInline latex="(n)" />
              </label>
              <MathInline className="wave-param-value" latex={`n=${formatNumber(mode, 0)}`} />
            </div>
            <input
              id="standing-mode"
              type="range"
              min="1"
              max="5"
              step="1"
              value={mode}
              onChange={(event) => handleModeSelect(parseFloat(event.target.value))}
            />
          </div>

          <div className="wave-param-row">
            <div className="wave-param-head">
              <MathInline className="wave-param-icon" latex="L" />
              <label htmlFor="standing-length">
                Length <MathInline latex="(L)" />
              </label>
              <MathInline className="wave-param-value" latex={`L=${formatNumber(lengthL, 2)}`} />
            </div>
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
          <div className="wave-param-row">
            <div className="wave-param-head">
              <MathInline className="wave-param-icon" latex="T" />
              <label htmlFor="standing-tension">Tension</label>
              <MathInline className="wave-param-value" latex={`T=${formatNumber(tension, 1)}`} />
            </div>
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
          <div className="wave-param-row">
            <div className="wave-param-head">
              <MathInline className="wave-param-icon" latex="f" />
              <label htmlFor="standing-frequency">
                Frequency <MathInline latex="(f)" />
              </label>
              <MathInline className="wave-param-value" latex={`f=${formatNumber(frequency, 2)}`} />
            </div>
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
          <div className="wave-param-row">
            <div className="wave-param-head">
              <MathInline className="wave-param-icon" latex={"\\mu"} />
              <label htmlFor="standing-mu">
                Mass/length <MathInline latex={"(\\mu)"} />
              </label>
              <MathInline className="wave-param-value" latex={`\\mu=${formatNumber(mu, 2)}`} />
            </div>
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

        <div className="wave-control-block wave-standing-calculations">
          <div className="wave-control-title">Calculations</div>
          {equationsPanel}
        </div>

      </aside>
    </div>
  );
}
