import { useEffect, useMemo, useRef, useState } from "react";

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
  const [showBoundary, setShowBoundary] = useState(true);
  const [showArcs, setShowArcs] = useState(true);
  const [showNormal, setShowNormal] = useState(true);
  const [animateTrace, setAnimateTrace] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
  }, [incidenceDeg, incidentSide, n1, n2, showBoundary, showArcs, showNormal, animateTrace]);

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

        const statusBg = refraction.tir
          ? "rgba(124, 45, 18, 0.75)"
          : refraction.status.includes("towards")
          ? "rgba(21, 101, 74, 0.72)"
          : refraction.status.includes("away")
          ? "rgba(30, 64, 175, 0.72)"
          : "rgba(71, 85, 105, 0.68)";
        const statusWidth = Math.min(320, width - 24);
        const statusX = width - statusWidth - 12;
        ctx.fillStyle = statusBg;
        ctx.fillRect(statusX, 12, statusWidth, 28);
        ctx.fillStyle = "#f8fafc";
        ctx.font = '700 12px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(refraction.status, statusX + statusWidth / 2, 26);

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
    setShowBoundary(true);
    setShowArcs(true);
    setShowNormal(true);
    setAnimateTrace(false);
    traceProgressRef.current = 1;
  };

  const titleText = title ?? "Refraction Through Media Boundary";
  const descriptionText =
    description ??
    "Drag the incident ray directly on the canvas, or use controls to test Snell's law and total internal reflection.";

  return (
    <div className="optics-shell">
      <section className="optics-header-card">
        <div className="optics-title">{titleText}</div>
        <div className="optics-description">{descriptionText}</div>
      </section>

      <section className="optics-canvas-card">
        <div
          ref={wrapRef}
          className={`optics-canvas-wrap ${isDragging ? "is-dragging" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} className="optics-canvas" />
          <div className="optics-canvas-hint">Drag the yellow ray near the top half to change angle</div>
        </div>
      </section>

      <section className="optics-controls-grid">
        <div className="optics-control-block">
          <div className="optics-control-title">Primary Controls</div>
          <label className="optics-slider-row" htmlFor="refraction-angle">
            <span>Angle of incidence (i)</span>
            <span>{formatNumber(derived.incidenceDeg, 1)} deg</span>
          </label>
          <div className="optics-control-row">
            <input
              id="refraction-angle"
              type="range"
              min="0"
              max="89.9"
              step="0.1"
              value={incidenceDeg}
              onChange={(event) => setIncidenceDeg(sanitizeIncidence(parseFloat(event.target.value)))}
            />
            <input
              type="number"
              min="0"
              max="89.9"
              step="0.1"
              value={formatNumber(incidenceDeg, 1)}
              onChange={(event) => setIncidenceDeg(sanitizeIncidence(parseFloat(event.target.value)))}
            />
          </div>

          <label className="optics-slider-row" htmlFor="refraction-n1">
            <span>Refractive index n1</span>
            <span>{formatNumber(derived.n1, 2)}</span>
          </label>
          <div className="optics-control-row">
            <input
              id="refraction-n1"
              type="range"
              min="1"
              max="2.5"
              step="0.01"
              value={n1}
              onChange={(event) => updateIndex(setN1, event.target.value)}
            />
            <input
              type="number"
              min="1"
              max="2.5"
              step="0.01"
              value={formatNumber(n1, 2)}
              onChange={(event) => updateIndex(setN1, event.target.value)}
            />
          </div>

          <label className="optics-slider-row" htmlFor="refraction-n2">
            <span>Refractive index n2</span>
            <span>{formatNumber(derived.n2, 2)}</span>
          </label>
          <div className="optics-control-row">
            <input
              id="refraction-n2"
              type="range"
              min="1"
              max="2.5"
              step="0.01"
              value={n2}
              onChange={(event) => updateIndex(setN2, event.target.value)}
            />
            <input
              type="number"
              min="1"
              max="2.5"
              step="0.01"
              value={formatNumber(n2, 2)}
              onChange={(event) => updateIndex(setN2, event.target.value)}
            />
          </div>
        </div>

        <div className="optics-control-block">
          <div className="optics-control-title">Material Presets</div>
          <div className="optics-preset-label">Set n1</div>
          <div className="optics-preset-row">
            <button type="button" className="optics-preset-btn" onClick={() => applyPreset(setN1, 1.0)}>
              Air (1.0)
            </button>
            <button type="button" className="optics-preset-btn" onClick={() => applyPreset(setN1, 1.33)}>
              Water (1.33)
            </button>
            <button type="button" className="optics-preset-btn" onClick={() => applyPreset(setN1, 1.5)}>
              Glass (1.5)
            </button>
          </div>
          <div className="optics-preset-label">Set n2</div>
          <div className="optics-preset-row">
            <button type="button" className="optics-preset-btn" onClick={() => applyPreset(setN2, 1.0)}>
              Air (1.0)
            </button>
            <button type="button" className="optics-preset-btn" onClick={() => applyPreset(setN2, 1.33)}>
              Water (1.33)
            </button>
            <button type="button" className="optics-preset-btn" onClick={() => applyPreset(setN2, 1.5)}>
              Glass (1.5)
            </button>
          </div>
          <div className="optics-actions-row">
            <button
              type="button"
              className={`optics-toggle-btn ${animateTrace ? "active" : ""}`}
              onClick={() => {
                traceProgressRef.current = 0;
                setAnimateTrace((prev) => !prev);
              }}
            >
              {animateTrace ? "Animation: On" : "Animation: Off"}
            </button>
            <button type="button" className="optics-reset-btn" onClick={resetScene}>
              Reset
            </button>
          </div>
        </div>

        <div className="optics-control-block">
          <div className="optics-control-title">View Toggles</div>
          <label className="optics-check-row">
            <input
              type="checkbox"
              checked={showBoundary}
              onChange={(event) => setShowBoundary(event.target.checked)}
            />
            <span>Show medium boundary</span>
          </label>
          <label className="optics-check-row">
            <input
              type="checkbox"
              checked={showNormal}
              onChange={(event) => setShowNormal(event.target.checked)}
            />
            <span>Show normal line</span>
          </label>
          <label className="optics-check-row">
            <input
              type="checkbox"
              checked={showArcs}
              onChange={(event) => setShowArcs(event.target.checked)}
            />
            <span>Show angle arcs</span>
          </label>
        </div>

        <div className="optics-control-block">
          <div className="optics-control-title">Live Readout</div>
          <div className="optics-readout-row">
            <span>Incidence angle i</span>
            <span>{formatNumber(derived.incidenceDeg, 2)} deg</span>
          </div>
          <div className="optics-readout-row">
            <span>Refraction angle r</span>
            <span>{derived.refractedDeg === null ? "N/A (TIR)" : `${formatNumber(derived.refractedDeg, 2)} deg`}</span>
          </div>
          <div className="optics-readout-row">
            <span>n1</span>
            <span>{formatNumber(derived.n1, 2)}</span>
          </div>
          <div className="optics-readout-row">
            <span>n2</span>
            <span>{formatNumber(derived.n2, 2)}</span>
          </div>
          <div className="optics-readout-row">
            <span>Critical angle</span>
            <span>{derived.criticalDeg === null ? "Not applicable" : `${formatNumber(derived.criticalDeg, 2)} deg`}</span>
          </div>
          <div className={`optics-status-pill ${derived.tir ? "tir" : ""}`}>{derived.status}</div>
        </div>
      </section>
    </div>
  );
}
