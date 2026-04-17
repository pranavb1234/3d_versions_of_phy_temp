import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;
const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toRad = (deg) => deg * RAD_PER_DEG;
const toDeg = (rad) => rad * DEG_PER_RAD;
const formatNumber = (value, digits = 2) => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(digits);
  return fixed.replace(/\.00$/, "");
};
const renderFormula = (latex) => ({
  __html: katex.renderToString(latex, { throwOnError: false })
});

const normalizeAngleDelta = (delta) => {
  let next = delta;
  while (next <= -Math.PI) {
    next += TAU;
  }
  while (next > Math.PI) {
    next -= TAU;
  }
  return next;
};

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

const getIncidencePoint = (width, height) => ({
  x: width * 0.5,
  y: height * 0.5
});

const sanitizeIndex = (value) => {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return clamp(value, 1, 2.5);
};

const sanitizeIncidence = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clamp(value, 0, 89.9);
};

const computeRefraction = ({ incidenceDeg, n1, n2, showBoundary }) => {
  const safeIncidence = sanitizeIncidence(incidenceDeg);
  const safeN1 = sanitizeIndex(n1);
  const safeN2 = sanitizeIndex(n2);
  const effectiveN2 = showBoundary ? safeN2 : safeN1;
  const iRad = toRad(safeIncidence);
  const sinI = Math.sin(iRad);
  const ratio = (safeN1 / effectiveN2) * sinI;
  const tir = showBoundary && safeN1 > safeN2 && ratio > 1;
  const refractedRad = tir ? null : Math.asin(clamp(ratio, -1, 1));
  const refractedDeg = refractedRad === null ? null : toDeg(refractedRad);
  const criticalDeg =
    showBoundary && safeN1 > safeN2 ? toDeg(Math.asin(clamp(safeN2 / safeN1, -1, 1))) : null;

  let status = "No bending (same refractive index)";
  if (!showBoundary) {
    status = "Single medium view (no boundary)";
  } else if (tir) {
    status = "Total Internal Reflection";
  } else if (safeN2 > safeN1) {
    status = "Bends towards normal";
  } else if (safeN2 < safeN1) {
    status = "Bends away from normal";
  }

  return {
    incidenceDeg: safeIncidence,
    incidenceRad: iRad,
    refractedDeg,
    refractedRad,
    n1: safeN1,
    n2: safeN2,
    effectiveN2,
    tir,
    criticalDeg,
    status
  };
};

const drawMediumBackground = (ctx, width, height, boundaryY, showBoundary) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#050912");
  gradient.addColorStop(1, "#090f1a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (showBoundary) {
    ctx.fillStyle = "rgba(17, 24, 39, 0.9)";
    ctx.fillRect(0, 0, width, boundaryY);
    ctx.fillStyle = "rgba(21, 36, 58, 0.92)";
    ctx.fillRect(0, boundaryY, width, height - boundaryY);
  } else {
    ctx.fillStyle = "rgba(17, 24, 39, 0.9)";
    ctx.fillRect(0, 0, width, height);
  }
};

const drawArrowRay = (ctx, start, end, color, width, progress = 1) => {
  const safeProgress = clamp(progress, 0, 1);
  if (safeProgress <= 0) {
    return;
  }
  const drawEnd = {
    x: start.x + (end.x - start.x) * safeProgress,
    y: start.y + (end.y - start.y) * safeProgress
  };
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(drawEnd.x, drawEnd.y);
  ctx.stroke();

  const segLen = Math.hypot(drawEnd.x - start.x, drawEnd.y - start.y);
  if (safeProgress < 0.98 || segLen < 8) {
    return;
  }
  const angle = Math.atan2(drawEnd.y - start.y, drawEnd.x - start.x);
  const head = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(drawEnd.x, drawEnd.y);
  ctx.lineTo(
    drawEnd.x - head * Math.cos(angle - Math.PI / 7),
    drawEnd.y - head * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    drawEnd.x - head * Math.cos(angle + Math.PI / 7),
    drawEnd.y - head * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fill();
};

const drawAngleArc = (ctx, center, radius, fromVec, toVec, color, label) => {
  const start = Math.atan2(fromVec.y, fromVec.x);
  const end = Math.atan2(toVec.y, toVec.x);
  const delta = normalizeAngleDelta(end - start);
  const finalEnd = start + delta;
  const anticlockwise = delta < 0;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, start, finalEnd, anticlockwise);
  ctx.stroke();

  const mid = start + delta * 0.5;
  const labelPos = {
    x: center.x + Math.cos(mid) * (radius + 13),
    y: center.y + Math.sin(mid) * (radius + 13)
  };
  ctx.fillStyle = color;
  ctx.font = '700 13px "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, labelPos.x, labelPos.y);
};

export default function RefractionScene({ title, description }) {
  const [incidenceDeg, setIncidenceDeg] = useState(34);
  const [incidentSide, setIncidentSide] = useState(-1);
  const [n1, setN1] = useState(1.0);
  const [n2, setN2] = useState(1.5);
  const showBoundary = true;
  const showArcs = true;
  const showNormal = true;
  const [animateTrace, setAnimateTrace] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const metricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const dragActiveRef = useRef(false);
  const traceProgressRef = useRef(1);
  const stateRef = useRef({
    incidenceDeg,
    incidentSide,
    n1,
    n2,
    showBoundary,
    showArcs,
    showNormal,
    animateTrace
  });

  const derived = useMemo(
    () => computeRefraction({ incidenceDeg, n1, n2, showBoundary }),
    [incidenceDeg, n1, n2, showBoundary]
  );

  useEffect(() => {
    stateRef.current = {
      incidenceDeg,
      incidentSide,
      n1,
      n2,
      showBoundary,
      showArcs,
      showNormal,
      animateTrace
    };
  }, [incidenceDeg, incidentSide, n1, n2, animateTrace]);

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

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const metrics = metricsRef.current;
      const ctx = metrics.ctx;
      if (ctx) {
        const snapshot = stateRef.current;
        const refraction = computeRefraction(snapshot);
        if (snapshot.animateTrace) {
          traceProgressRef.current += dt * 0.28;
          if (traceProgressRef.current > 1) {
            traceProgressRef.current = 0;
          }
        } else {
          traceProgressRef.current = 1;
        }
        const trace = traceProgressRef.current;

        const width = metrics.width;
        const height = metrics.height;
        const point = getIncidencePoint(width, height);
        const rayLength = Math.max(80, Math.min(width, height) * 0.42);

        drawMediumBackground(ctx, width, height, point.y, snapshot.showBoundary);

        if (snapshot.showBoundary) {
          ctx.strokeStyle = "rgba(191, 219, 254, 0.68)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, point.y);
          ctx.lineTo(width, point.y);
          ctx.stroke();
        }

        if (snapshot.showNormal) {
          ctx.save();
          ctx.setLineDash([8, 8]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(point.x, 14);
          ctx.lineTo(point.x, height - 14);
          ctx.stroke();
          ctx.restore();
        }

        const iRad = refraction.incidenceRad;
        const sourceDir = {
          x: snapshot.incidentSide * Math.sin(iRad),
          y: -Math.cos(iRad)
        };
        const sourcePoint = {
          x: point.x + sourceDir.x * rayLength,
          y: point.y + sourceDir.y * rayLength
        };
        const reflectedDir = {
          x: -snapshot.incidentSide * Math.sin(iRad),
          y: -Math.cos(iRad)
        };
        const reflectedEnd = {
          x: point.x + reflectedDir.x * rayLength,
          y: point.y + reflectedDir.y * rayLength
        };
        const refractedRad = refraction.refractedRad ?? iRad;
        const refractedDir = {
          x: -snapshot.incidentSide * Math.sin(refractedRad),
          y: Math.cos(refractedRad)
        };
        const refractedEnd = {
          x: point.x + refractedDir.x * rayLength,
          y: point.y + refractedDir.y * rayLength
        };

        const incidentProg = snapshot.animateTrace ? clamp(trace * 2.7, 0, 1) : 1;
        const outgoingProg = snapshot.animateTrace ? clamp((trace - 0.35) * 1.9, 0, 1) : 1;

        drawArrowRay(ctx, sourcePoint, point, "#facc15", 3.2, incidentProg);
        if (snapshot.showBoundary) {
          drawArrowRay(ctx, point, reflectedEnd, "#7dd3fc", 2.3, outgoingProg);
        }
        if (!refraction.tir) {
          drawArrowRay(ctx, point, refractedEnd, "#4ade80", 3, outgoingProg);
        }

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4.2, 0, TAU);
        ctx.fill();

        ctx.fillStyle = "rgba(248, 250, 252, 0.9)";
        ctx.font = '600 12px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        if (snapshot.showBoundary) {
          ctx.fillText(`Medium 1 (n1 = ${formatNumber(refraction.n1, 2)})`, 14, 22);
          ctx.fillText(`Medium 2 (n2 = ${formatNumber(refraction.n2, 2)})`, 14, point.y + 22);
        } else {
          ctx.fillText(`Single Medium (n = ${formatNumber(refraction.n1, 2)})`, 14, 22);
        }

        const normalUp = { x: 0, y: -1 };
        const normalDown = { x: 0, y: 1 };
        const incidentFromPoint = sourceDir;
        if (snapshot.showArcs) {
          drawAngleArc(ctx, point, 32, normalUp, incidentFromPoint, "#facc15", "i");
          if (snapshot.showBoundary) {
            drawAngleArc(ctx, point, 46, normalUp, reflectedDir, "#7dd3fc", "i'");
          }
          if (!refraction.tir) {
            drawAngleArc(ctx, point, 34, normalDown, refractedDir, "#4ade80", "r");
          }
        }
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const stopDrag = () => {
      dragActiveRef.current = false;
      setIsDragging(false);
    };
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, []);

  const updateAngleFromPointer = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const metrics = metricsRef.current;
    if (!canvas || !metrics.width || !metrics.height) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const point = getIncidencePoint(metrics.width, metrics.height);
    const vx = px - point.x;
    const vy = py - point.y;
    const absVy = Math.max(2, Math.abs(vy));
    const nextAngle = sanitizeIncidence(toDeg(Math.atan2(Math.abs(vx), absVy)));

    if (Math.abs(vx) > 6) {
      setIncidentSide(vx >= 0 ? 1 : -1);
    }
    setIncidenceDeg(nextAngle);
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    const metrics = metricsRef.current;
    if (!metrics.width || !metrics.height) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const py = event.clientY - rect.top;
    const point = getIncidencePoint(metrics.width, metrics.height);
    if (py > point.y + 28) {
      return;
    }
    dragActiveRef.current = true;
    setIsDragging(true);
    updateAngleFromPointer(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragActiveRef.current) {
      return;
    }
    updateAngleFromPointer(event.clientX, event.clientY);
  };

  const handlePointerUp = (event) => {
    dragActiveRef.current = false;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const updateIndex = (setter, rawValue) => {
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setter(clamp(parsed, 1, 2.5));
  };

  const applyPreset = (setter, value) => {
    setter(clamp(value, 1, 2.5));
  };

  const resetScene = () => {
    setIncidenceDeg(34);
    setIncidentSide(-1);
    setN1(1.0);
    setN2(1.5);
    setAnimateTrace(false);
    traceProgressRef.current = 1;
  };

  const titleText = title ?? "Refraction Through Media Boundary";
  const descriptionText =
    description ??
    "Drag the incident ray directly on the canvas, or use controls to test Snell's law and total internal reflection.";

  return (
    <>
    <div className="wave-shell">
      <aside className="wave-left">
        <div className="wave-left-title">{titleText}</div>
        <div className="wave-left-desc">{descriptionText}</div>
        <div
          className="wave-formula"
          dangerouslySetInnerHTML={renderFormula("n_1\\sin i = n_2\\sin r")}
        />
        <div className="wave-left-hint">
          This experiment shows how light changes direction at a boundary because of different optical
          densities.
        </div>
        <div className="wave-left-list">
          <div className="wave-left-item refraction-legend-text">Incident ray: yellow</div>
          <div className="wave-left-item refraction-legend-text">Refracted ray: green</div>
          <div className="wave-left-item refraction-legend-text">
            Reflected ray: light blue (TIR only)
          </div>
          <div className="wave-left-item refraction-legend-text">Normal: dashed white line</div>
        </div>
        <div className="wave-symbols">
          <div className="wave-symbols-title">Symbol Guide</div>
          <div className="wave-symbols-list">
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">i</span>
                <span className="wave-symbol-label">Angle of incidence</span>
              </summary>
              <div className="wave-symbol-desc">
                Angle between incident ray and normal in medium 1.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">r</span>
                <span className="wave-symbol-label">Angle of refraction</span>
              </summary>
              <div className="wave-symbol-desc">
                Angle between refracted ray and normal in medium 2.
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">i'</span>
                <span className="wave-symbol-label">Reflected angle</span>
              </summary>
              <div className="wave-symbol-desc">
                Reflection angle in medium 1 (equal to incidence angle).
              </div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">n1</span>
                <span className="wave-symbol-label">Refractive index 1</span>
              </summary>
              <div className="wave-symbol-desc">Refractive index of the top medium.</div>
            </details>
            <details className="wave-symbol-item">
              <summary className="wave-symbol-summary">
                <span className="wave-symbol-name">n2</span>
                <span className="wave-symbol-label">Refractive index 2</span>
              </summary>
              <div className="wave-symbol-desc">Refractive index of the bottom medium.</div>
            </details>
          </div>
        </div>
      </aside>

      <section className="wave-center">
        <div className="wave-center-header">
          <div className="wave-center-title">Refraction at a Boundary</div>
          <div className="wave-center-desc">
            Drag on the canvas to rotate the incident angle and watch Snell's law update in real time.
          </div>
        </div>

        <div className="wave-graphs single">
          <div className="wave-graph-card">
            <div className="wave-graph-title">Interactive Refraction Canvas</div>
            <div
              ref={wrapRef}
              className={`wave-canvas-wrap refraction-canvas-wrap ${isDragging ? "is-dragging" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <canvas ref={canvasRef} className="wave-canvas" />
              <div className="refraction-canvas-hint">
                Drag the yellow ray in the top region to change incidence angle
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="wave-right">
        <div className="wave-control-block">
          <div className="wave-control-title">Material Presets</div>
          <div className="wave-select-row">
            <button type="button" className="wave-toggle-btn active" onClick={() => setShowPresetModal(true)}>
              Open Material Presets
            </button>
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Simulation</div>
          <div className="wave-select-row">
            <button
              type="button"
              className={`wave-toggle-btn ${animateTrace ? "active" : ""}`}
              onClick={() => {
                traceProgressRef.current = 0;
                setAnimateTrace((prev) => !prev);
              }}
            >
              {animateTrace ? "Animation: On" : "Animation: Off"}
            </button>
            <button type="button" className="wave-toggle-btn" onClick={resetScene}>
              Reset
            </button>
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Experiment Guide</div>
          <div className="wave-left-list">
            <div className="wave-left-item">
              A ray travels from Medium 1 to Medium 2 and bends at the boundary.
            </div>
            <div className="wave-left-item">
              If n2 {'>'} n1, light bends towards the normal. If n2 {'<'} n1, it bends away.
            </div>
            <div className="wave-left-item">
              If n1 {'>'} n2 and incidence angle is above critical angle, total internal reflection occurs.
            </div>
            <div className="wave-left-item">
              Current behavior: {derived.status}
            </div>
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-slider-row">
            <label htmlFor="refraction-angle">
              Angle of incidence (i)
              <span className="wave-value">{formatNumber(derived.incidenceDeg, 1)} deg</span>
            </label>
            <input
              id="refraction-angle"
              type="range"
              min="0"
              max="89.9"
              step="0.1"
              value={incidenceDeg}
              onChange={(event) => setIncidenceDeg(sanitizeIncidence(parseFloat(event.target.value)))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="refraction-n1">
              Refractive index n1
              <span className="wave-value">{formatNumber(derived.n1, 2)}</span>
            </label>
            <input
              id="refraction-n1"
              type="range"
              min="1"
              max="2.5"
              step="0.01"
              value={n1}
              onChange={(event) => updateIndex(setN1, event.target.value)}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="refraction-n2">
              Refractive index n2
              <span className="wave-value">{formatNumber(derived.n2, 2)}</span>
            </label>
            <input
              id="refraction-n2"
              type="range"
              min="1"
              max="2.5"
              step="0.01"
              value={n2}
              onChange={(event) => updateIndex(setN2, event.target.value)}
            />
          </div>
        </div>

      </aside>
    </div>
    {showPresetModal ? (
      <div className="refraction-modal-backdrop" onClick={() => setShowPresetModal(false)}>
        <div
          className="refraction-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Material presets"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="refraction-modal-header">
            <div className="refraction-modal-title">Material Presets</div>
            <button
              type="button"
              className="refraction-modal-close"
              onClick={() => setShowPresetModal(false)}
            >
              Close
            </button>
          </div>
          <div className="refraction-modal-subtitle">
            <strong>n1</strong> is Medium 1 (upper medium) and <strong>n2</strong> is Medium 2 (lower
            medium).
          </div>
          <div className="refraction-modal-grid">
            <div className="refraction-modal-section">
              <div className="refraction-modal-section-title">Set n1 (Medium 1)</div>
              <div className="refraction-modal-actions">
                <button type="button" className="wave-toggle-btn" onClick={() => applyPreset(setN1, 1.0)}>
                  Air (1.0)
                </button>
                <button type="button" className="wave-toggle-btn" onClick={() => applyPreset(setN1, 1.33)}>
                  Water (1.33)
                </button>
                <button type="button" className="wave-toggle-btn" onClick={() => applyPreset(setN1, 1.5)}>
                  Glass (1.5)
                </button>
              </div>
            </div>
            <div className="refraction-modal-section">
              <div className="refraction-modal-section-title">Set n2 (Medium 2)</div>
              <div className="refraction-modal-actions">
                <button type="button" className="wave-toggle-btn" onClick={() => applyPreset(setN2, 1.0)}>
                  Air (1.0)
                </button>
                <button type="button" className="wave-toggle-btn" onClick={() => applyPreset(setN2, 1.33)}>
                  Water (1.33)
                </button>
                <button type="button" className="wave-toggle-btn" onClick={() => applyPreset(setN2, 1.5)}>
                  Glass (1.5)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
