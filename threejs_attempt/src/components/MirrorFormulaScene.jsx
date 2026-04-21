import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatNumber = (value, digits = 2) => {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(digits);
  return fixed.replace(/\.00$/, "");
};

const formatSigned = (value, digits = 2) => {
  if (!Number.isFinite(value)) {
    return "infinity";
  }
  const abs = formatNumber(Math.abs(value), digits);
  return value < 0 ? `-${abs}` : `+${abs}`;
};

const renderFormula = (latex) => ({
  __html: katex.renderToString(latex, { throwOnError: false })
});

const DEFAULT_OBJECT_BOUNDS = {
  min: 34,
  max: 320
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

const getLayout = (width, height) => {
  const leftPad = 22;
  const rightPad = 22;
  const poleX = Math.min(width - 90, width * 0.78);
  const axisY = height * 0.58;
  const objectHeight = Math.min(88, height * 0.27);
  const minObjectDistance = 34;
  const maxObjectDistance = Math.max(90, poleX - leftPad - 16);
  return {
    leftPad,
    rightPad,
    poleX,
    axisY,
    objectHeight,
    minObjectDistance,
    maxObjectDistance,
    maxImageHeight: Math.max(70, height * 0.38)
  };
};

const normalize = (vector) => {
  const len = Math.hypot(vector.x, vector.y);
  if (len < 1e-6) {
    return { x: 0, y: 0 };
  }
  return { x: vector.x / len, y: vector.y / len };
};

const pointAtX = (start, through, targetX) => {
  const dx = through.x - start.x;
  if (Math.abs(dx) < 1e-6) {
    return null;
  }
  const t = (targetX - start.x) / dx;
  return {
    x: targetX,
    y: start.y + (through.y - start.y) * t,
    t
  };
};

const drawSegment = (ctx, start, end, options = {}) => {
  const {
    color = "#0f172a",
    width = 2,
    dash = [],
    arrow = false,
    alpha = 1
  } = options;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();

  if (!arrow) {
    return;
  }

  const dir = Math.atan2(end.y - start.y, end.x - start.x);
  const head = 9;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - head * Math.cos(dir - Math.PI / 7), end.y - head * Math.sin(dir - Math.PI / 7));
  ctx.lineTo(end.x - head * Math.cos(dir + Math.PI / 7), end.y - head * Math.sin(dir + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawArrow = (ctx, x, axisY, height, color, label, dashed = false) => {
  const tipY = axisY - height;
  drawSegment(
    ctx,
    { x, y: axisY },
    { x, y: tipY },
    { color, width: 3.2, dash: dashed ? [6, 5] : [], arrow: true }
  );

  ctx.fillStyle = color;
  ctx.font = '700 12px "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x, height >= 0 ? tipY - 6 : tipY + 16);
};

const computeMirrorData = ({ objectDistance, focalLength, mirrorType }) => {
  const safeObjectDistance = Math.max(1e-3, objectDistance);
  const safeFocalLength = Math.max(1e-3, focalLength);
  const u = -safeObjectDistance;
  const f = mirrorType === "concave" ? -safeFocalLength : safeFocalLength;
  const denominator = 1 / f - 1 / u;
  const isInfinity = Math.abs(denominator) < 1e-4;
  const v = isInfinity ? Number.POSITIVE_INFINITY : 1 / denominator;
  const mDisplay = isInfinity ? Number.POSITIVE_INFINITY : v / u;
  const mLinear = isInfinity ? Number.POSITIVE_INFINITY : -v / u;

  let natureText = "Image at infinity";
  let orientationText = "Strongly enlarged";
  let sizeText = "Highly magnified";

  if (!isInfinity) {
    natureText = v < 0 ? "Real image" : "Virtual image";
    orientationText = mLinear >= 0 ? "Upright" : "Inverted";
    const absM = Math.abs(mLinear);
    if (absM > 1.05) {
      sizeText = "Magnified";
    } else if (absM < 0.95) {
      sizeText = "Diminished";
    } else {
      sizeText = "Same size";
    }
  }

  return {
    u,
    v,
    f,
    mDisplay,
    mLinear,
    isInfinity,
    natureText,
    orientationText,
    sizeText
  };
};

const getIntuitionNote = ({ mirrorType, objectDistance, focalLength, isInfinity }) => {
  const twoF = 2 * focalLength;
  if (mirrorType === "convex") {
    return "Convex mirror always gives a virtual upright image behind the mirror. Moving object farther shrinks the image toward F.";
  }
  if (isInfinity) {
    return "At focus, reflected rays become nearly parallel, so the image shifts to infinity.";
  }
  if (objectDistance > twoF) {
    return "Object beyond C: image forms between F and C, real, inverted, and diminished.";
  }
  if (Math.abs(objectDistance - twoF) < 4) {
    return "Object at C: image forms at C and is roughly same size (real, inverted).";
  }
  if (objectDistance > focalLength) {
    return "Object between F and C: image forms beyond C, real, inverted, and magnified.";
  }
  return "Object between mirror and F: reflected rays diverge; backward extensions meet behind mirror, giving a virtual upright image.";
};

const MirrorFormulaScene = ({ title, description }) => {
  const [mirrorType, setMirrorType] = useState("concave");
  const [focalLength, setFocalLength] = useState(120);
  const [objectDistance, setObjectDistance] = useState(220);
  const [objectBounds, setObjectBounds] = useState(DEFAULT_OBJECT_BOUNDS);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const metricsRef = useRef({ width: 0, height: 0, dpr: 1, ctx: null });
  const dragActiveRef = useRef(false);
  const stateRef = useRef({
    mirrorType,
    focalLength,
    objectDistance
  });

  useEffect(() => {
    stateRef.current = {
      mirrorType,
      focalLength,
      objectDistance
    };
  }, [mirrorType, focalLength, objectDistance]);

  const derived = useMemo(
    () => computeMirrorData({ mirrorType, focalLength, objectDistance }),
    [mirrorType, focalLength, objectDistance]
  );
  const intuitionNote = useMemo(
    () =>
      getIntuitionNote({
        mirrorType,
        objectDistance,
        focalLength,
        isInfinity: derived.isInfinity
      }),
    [mirrorType, objectDistance, focalLength, derived.isInfinity]
  );

  const titleText = title ?? "Mirror Formula Visualizer";
  const subtitleText =
    description ??
    "Drag the object on the principal axis and watch ray geometry plus mirror-formula values update live.";

  useEffect(() => {
    const resize = () => {
      setupCanvas(canvasRef.current, wrapRef.current, metricsRef);
      const metrics = metricsRef.current;
      if (!metrics.width || !metrics.height) {
        return;
      }
      const layout = getLayout(metrics.width, metrics.height);
      const nextBounds = {
        min: layout.minObjectDistance,
        max: layout.maxObjectDistance
      };
      setObjectBounds(nextBounds);
      setObjectDistance((prev) => clamp(prev, nextBounds.min, nextBounds.max));
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (wrapRef.current) {
      observer.observe(wrapRef.current);
    }
    return () => observer.disconnect();
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

  useEffect(() => {
    let frameId = 0;
    const draw = () => {
      const metrics = metricsRef.current;
      const ctx = metrics.ctx;
      if (ctx) {
        const width = metrics.width;
        const height = metrics.height;
        const snapshot = stateRef.current;
        const layout = getLayout(width, height);

        const safeObjectDistance = clamp(
          snapshot.objectDistance,
          layout.minObjectDistance,
          layout.maxObjectDistance
        );
        const safeFocalLength = clamp(snapshot.focalLength, 40, Math.max(55, width * 0.28));
        const data = computeMirrorData({
          mirrorType: snapshot.mirrorType,
          objectDistance: safeObjectDistance,
          focalLength: safeFocalLength
        });

        const pole = { x: layout.poleX, y: layout.axisY };
        const focus = { x: pole.x + data.f, y: layout.axisY };
        const center = { x: pole.x + 2 * data.f, y: layout.axisY };
        const objectBase = { x: pole.x - safeObjectDistance, y: layout.axisY };
        const objectTip = { x: objectBase.x, y: layout.axisY - layout.objectHeight };

        const imageBase = data.isInfinity ? null : { x: pole.x + data.v, y: layout.axisY };
        const rawImageHeight = data.isInfinity ? 0 : data.mLinear * layout.objectHeight;
        const imageHeight = clamp(rawImageHeight, -layout.maxImageHeight, layout.maxImageHeight);
        const showVirtualExtensions = !data.isInfinity && data.v > 0;

        ctx.clearRect(0, 0, width, height);
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, "#071223");
        bg.addColorStop(1, "#0f1f38");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        drawSegment(
          ctx,
          { x: layout.leftPad, y: layout.axisY },
          { x: width - layout.rightPad, y: layout.axisY },
          { color: "rgba(226, 232, 240, 0.92)", width: 2.2 }
        );
        ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
        ctx.font = '700 12px "Segoe UI", Tahoma, sans-serif';
        ctx.fillText("Principal axis", layout.leftPad + 6, layout.axisY - 10);
        ctx.font = '700 11px "Segoe UI", Tahoma, sans-serif';
        ctx.fillStyle = "rgba(191, 219, 254, 0.95)";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("(-) left side", layout.leftPad + 6, layout.axisY + 14);
        ctx.textAlign = "right";
        ctx.fillText("(+) right side", width - layout.rightPad - 6, layout.axisY + 14);

        const mirrorHalfHeight = Math.min(128, height * 0.36);
        const shellX = snapshot.mirrorType === "concave" ? pole.x - 24 : pole.x + 24;
        const controlX = snapshot.mirrorType === "concave" ? pole.x + 24 : pole.x - 24;
        const coatShift = snapshot.mirrorType === "concave" ? 10 : -10;

        ctx.strokeStyle = "#93c5fd";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(shellX, layout.axisY - mirrorHalfHeight);
        ctx.quadraticCurveTo(controlX, layout.axisY, shellX, layout.axisY + mirrorHalfHeight);
        ctx.stroke();

        ctx.strokeStyle = "rgba(148, 163, 184, 0.85)";
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.moveTo(shellX + coatShift, layout.axisY - mirrorHalfHeight);
        ctx.quadraticCurveTo(controlX + coatShift, layout.axisY, shellX + coatShift, layout.axisY + mirrorHalfHeight);
        ctx.stroke();

        const drawAxisMarker = (x, label, color, dashed = false) => {
          if (x < layout.leftPad - 30 || x > width - layout.rightPad + 30) {
            return;
          }
          drawSegment(
            ctx,
            { x, y: layout.axisY - 10 },
            { x, y: layout.axisY + 10 },
            { color, width: 2, dash: dashed ? [5, 4] : [] }
          );
          ctx.fillStyle = color;
          ctx.font = '700 12px "Segoe UI", Tahoma, sans-serif';
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(label, x, layout.axisY + 12);
        };

        drawAxisMarker(pole.x, "P", "#ffffff");
        drawAxisMarker(
          focus.x,
          snapshot.mirrorType === "concave" ? "F (-)" : "F (+)",
          "#fca5a5",
          snapshot.mirrorType === "convex"
        );
        drawAxisMarker(
          center.x,
          snapshot.mirrorType === "concave" ? "C (-)" : "C (+)",
          "#fde68a",
          snapshot.mirrorType === "convex"
        );

        const signBoxW = Math.min(240, width * 0.36);
        const signBoxH = 78;
        const signBoxX = width - layout.rightPad - signBoxW;
        const signBoxY = 12;
        ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
        ctx.fillRect(signBoxX, signBoxY, signBoxW, signBoxH);
        ctx.strokeStyle = "rgba(147, 197, 253, 0.62)";
        ctx.lineWidth = 1;
        ctx.strokeRect(signBoxX, signBoxY, signBoxW, signBoxH);
        ctx.fillStyle = "rgba(224, 242, 254, 0.96)";
        ctx.font = '700 11px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("Sign convention", signBoxX + 8, signBoxY + 14);
        ctx.font = '600 11px "Segoe UI", Tahoma, sans-serif';
        ctx.fillText("left of P: negative, right of P: positive", signBoxX + 8, signBoxY + 30);
        ctx.fillText(`u ${formatSigned(data.u, 1)}, f ${formatSigned(data.f, 1)}, v ${data.isInfinity ? "infinity" : formatSigned(data.v, 1)}`, signBoxX + 8, signBoxY + 46);
        ctx.fillText("F/C labels include sign in brackets", signBoxX + 8, signBoxY + 62);

        drawArrow(ctx, objectBase.x, layout.axisY, layout.objectHeight, "#facc15", "Object");

        if (imageBase) {
          drawArrow(
            ctx,
            imageBase.x,
            layout.axisY,
            imageHeight,
            imageBase.x > pole.x ? "#86efac" : "#4ade80",
            "Image",
            imageBase.x > pole.x
          );
          if (Math.abs(rawImageHeight) > Math.abs(imageHeight) + 1) {
            ctx.fillStyle = "#f8fafc";
            ctx.font = '600 11px "Segoe UI", Tahoma, sans-serif';
            ctx.textAlign = "left";
            ctx.fillText("Image height clipped on canvas", layout.leftPad + 8, 20);
          }
        } else {
          ctx.fillStyle = "#f8fafc";
          ctx.font = '700 12px "Segoe UI", Tahoma, sans-serif';
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText("Object at focus: reflected rays become nearly parallel (image at infinity).", layout.leftPad + 8, 20);
        }

        const rayIncColor = "#f59e0b";
        const rayRefColor = "#38bdf8";
        const rayExtColor = "rgba(148, 163, 184, 0.9)";

        const p1 = { x: pole.x, y: objectTip.y };
        drawSegment(ctx, objectTip, p1, { color: rayIncColor, width: 2.3, arrow: true });
        const dir1 =
          snapshot.mirrorType === "concave"
            ? normalize({ x: focus.x - p1.x, y: focus.y - p1.y })
            : normalize({ x: p1.x - focus.x, y: p1.y - focus.y });
        const p1End = { x: p1.x + dir1.x * 1200, y: p1.y + dir1.y * 1200 };
        drawSegment(ctx, p1, p1End, { color: rayRefColor, width: 2.3, arrow: true });
        if (showVirtualExtensions) {
          const extEnd = { x: p1.x - dir1.x * 520, y: p1.y - dir1.y * 520 };
          drawSegment(ctx, p1, extEnd, { color: rayExtColor, width: 1.8, dash: [6, 6] });
        }

        const p2 = pointAtX(objectTip, center, pole.x);
        if (p2 && Number.isFinite(p2.y) && Math.abs(p2.y - layout.axisY) < height * 1.5) {
          drawSegment(ctx, objectTip, p2, { color: "#fbbf24", width: 2.1, arrow: true });
          const dir2 = normalize({ x: objectTip.x - p2.x, y: objectTip.y - p2.y });
          const p2End = { x: p2.x + dir2.x * 1200, y: p2.y + dir2.y * 1200 };
          drawSegment(ctx, p2, p2End, { color: rayRefColor, width: 2.1, arrow: true });
          if (showVirtualExtensions) {
            const extEnd = { x: p2.x - dir2.x * 520, y: p2.y - dir2.y * 520 };
            drawSegment(ctx, p2, extEnd, { color: rayExtColor, width: 1.6, dash: [6, 6] });
          }
        }

        const p3 = pointAtX(objectTip, focus, pole.x);
        if (p3 && Number.isFinite(p3.y) && Math.abs(p3.y - layout.axisY) < height * 1.5) {
          drawSegment(ctx, objectTip, p3, { color: "#fbbf24", width: 2.1, arrow: true });
          const p3End = { x: layout.leftPad - 260, y: p3.y };
          drawSegment(ctx, p3, p3End, { color: rayRefColor, width: 2.1, arrow: true });
          if (showVirtualExtensions) {
            const extEnd = { x: width - layout.rightPad + 260, y: p3.y };
            drawSegment(ctx, p3, extEnd, { color: rayExtColor, width: 1.6, dash: [6, 6] });
          }
        }
      }
      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const updateDistanceFromPointer = (clientX) => {
    const canvas = canvasRef.current;
    const metrics = metricsRef.current;
    if (!canvas || !metrics.width) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const layout = getLayout(metrics.width, metrics.height);
    const maxDistance = layout.maxObjectDistance;
    const nextDistance = clamp(layout.poleX - px, layout.minObjectDistance, maxDistance);
    setObjectDistance(nextDistance);
  };

  const handlePointerDown = (event) => {
    const metrics = metricsRef.current;
    if (!metrics.width || !metrics.height) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const layout = getLayout(metrics.width, metrics.height);
    const currentObjectX = layout.poleX - objectDistance;
    const withinX = Math.abs(px - currentObjectX) <= 28;
    const withinY = py >= layout.axisY - layout.objectHeight - 28 && py <= layout.axisY + 28;

    if (!withinX || !withinY) {
      return;
    }
    dragActiveRef.current = true;
    setIsDragging(true);
    updateDistanceFromPointer(event.clientX);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragActiveRef.current) {
      return;
    }
    updateDistanceFromPointer(event.clientX);
  };

  const handlePointerUp = (event) => {
    dragActiveRef.current = false;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const resetScene = () => {
    setMirrorType("concave");
    setFocalLength(120);
    setObjectDistance(clamp(220, objectBounds.min, objectBounds.max));
  };

  return (
    <div className="wave-shell">
      <aside className="wave-left">
        <div className="wave-left-title">{titleText}</div>
        <div className="wave-left-hint">{subtitleText}</div>
        <div
          className="wave-formula"
          dangerouslySetInnerHTML={renderFormula("\\frac{1}{v}+\\frac{1}{u}=\\frac{1}{f}")}
        />
        <div className="wave-control-block mirror-values-block">
          <div className="wave-control-title">Values</div>
          <div className="wave-readout">
            <span>u (signed)</span>
            <span>{formatSigned(derived.u, 2)}</span>
          </div>
          <div className="wave-readout">
            <span>v (signed)</span>
            <span>{derived.isInfinity ? "infinity" : formatSigned(derived.v, 2)}</span>
          </div>
          <div className="wave-readout">
            <span>f (signed)</span>
            <span>{formatSigned(derived.f, 2)}</span>
          </div>
          <div className="wave-readout">
            <span>m = v/u</span>
            <span>{derived.isInfinity ? "infinity" : formatNumber(derived.mDisplay, 3)}</span>
          </div>
        </div>
        <div className="wave-readout mirror-readout-box">
          <span>Nature</span>
          <span>{derived.natureText}</span>
        </div>
        <div className="wave-readout mirror-readout-box">
          <span>Orientation</span>
          <span>{derived.orientationText}</span>
        </div>
        <div className="wave-readout mirror-readout-box">
          <span>Size</span>
          <span>{derived.sizeText}</span>
        </div>
        <div className="wave-left-hint mirror-intuition-note">{intuitionNote}</div>
        <div className="wave-left-list">
          <div className="wave-left-item">Ray 1: parallel to axis reflects through/away from F.</div>
          <div className="wave-left-item">Ray 2: directed through C retraces after reflection.</div>
          <div className="wave-left-item">Ray 3: through/towards F reflects parallel to axis.</div>
          <div className="wave-left-item">Dashed rays show backward extensions for virtual images.</div>
        </div>
      </aside>

      <section className="wave-center">
        <div className="wave-center-header">
          <div className="wave-center-title">Ray Diagram and Image Formation</div>
          <div className="wave-center-desc">
            Drag the object arrow to move it along the principal axis and inspect real-time image formation.
          </div>
        </div>
        <div className="wave-graphs single">
          <div className="wave-graph-card">
            <div className="wave-graph-title">Interactive Spherical Mirror Diagram</div>
            <div
              ref={wrapRef}
              className={`wave-canvas-wrap mirror-canvas-wrap ${isDragging ? "is-dragging" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <canvas ref={canvasRef} className="wave-canvas" />
              <div className="mirror-canvas-hint">Drag the object arrow left/right along the axis</div>
            </div>
          </div>
        </div>
      </section>

      <aside className="wave-right mirror-right">
        <div className="wave-control-block">
          <div className="wave-control-title">Mirror Type</div>
          <div className="wave-select-row">
            <button
              type="button"
              className={`wave-toggle-btn ${mirrorType === "concave" ? "active" : ""}`}
              onClick={() => setMirrorType("concave")}
            >
              Concave
            </button>
            <button
              type="button"
              className={`wave-toggle-btn ${mirrorType === "convex" ? "active" : ""}`}
              onClick={() => setMirrorType("convex")}
            >
              Convex
            </button>
          </div>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Parameters</div>
          <div className="wave-slider-row">
            <label htmlFor="mirror-focal-length">
              Focal length |f|
              <span className="wave-value">{formatNumber(focalLength, 1)} units</span>
            </label>
            <input
              id="mirror-focal-length"
              type="range"
              min="40"
              max="220"
              step="1"
              value={focalLength}
              onChange={(event) => setFocalLength(clamp(parseFloat(event.target.value), 40, 220))}
            />
          </div>
          <div className="wave-slider-row">
            <label htmlFor="mirror-object-distance">
              Object distance |u|
              <span className="wave-value">{formatNumber(objectDistance, 1)} units</span>
            </label>
            <input
              id="mirror-object-distance"
              type="range"
              min={objectBounds.min}
              max={objectBounds.max}
              step="1"
              value={clamp(objectDistance, objectBounds.min, objectBounds.max)}
              onChange={(event) =>
                setObjectDistance(
                  clamp(parseFloat(event.target.value), objectBounds.min, objectBounds.max)
                )
              }
            />
          </div>
          <button type="button" className="wave-toggle-btn" onClick={resetScene}>
            Reset
          </button>
        </div>

        <div className="wave-control-block">
          <div className="wave-control-title">Edge Cases</div>
          <div className="wave-left-hint">
            Concave: when object reaches focus (u = f), image tends to infinity.
          </div>
          <div className="wave-left-hint">
            Concave: object between F and mirror produces virtual, upright image behind mirror.
          </div>
          <div className="wave-left-hint">
            Convex: image is always virtual, upright, and diminished.
          </div>
        </div>
      </aside>
    </div>
  );
};

export default MirrorFormulaScene;
