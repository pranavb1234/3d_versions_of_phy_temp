import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const supportHeight = 0.35;
const supportWidth = 10;
const supportDepth = 1.5;
const pivotX = 0;
const pivotY = 3.4;
const pivotZ = 0;
const pendulumLength = 2.8;
const rodRadius = 0.06;
const bobRadius = 0.35;
const gravity = 9.81;
const defaultCameraPosition = new THREE.Vector3(0.6, 4.2, 12.4);
const defaultCameraTarget = new THREE.Vector3(0, 1.55, 0);

const smoothStep = (t) => t * t * (3 - 2 * t);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getCheckpointExplanation(checkpointCount) {
  const quarter = ((checkpointCount - 1) % 4) + 1;

  if (quarter === 1) {
    return [
      "Checkpoint 1/4 — Maximum Displacement (t = 0)",
      "The bob is at its extreme position. Velocity is zero and the restoring force is maximum, pulling back toward equilibrium. Energy is all potential."
    ];
  }
  if (quarter === 2) {
    return [
      "Checkpoint 2/4 — Equilibrium Crossing (t = T/4, moving left)",
      "The bob passes through equilibrium at maximum speed. Restoring force is nearly zero. Energy is all kinetic."
    ];
  }
  if (quarter === 3) {
    return [
      "Checkpoint 3/4 — Opposite Extreme (t = T/2)",
      "The bob reaches the opposite turning point. Velocity is zero and the restoring force is maximum in the opposite direction."
    ];
  }
  return [
    "Checkpoint 4/4 — Equilibrium Crossing (t = 3T/4, moving right)",
    "The bob passes through equilibrium at full speed. Restoring force is again near zero. The next quarter returns to the start (t = T)."
  ];
}

function getCheckpointCalculations(checkpointCount, params = {}) {
  const quarter = ((checkpointCount - 1) % 4) + 1;
  const mass = Math.max(params.mass ?? 1, 0.001);
  const length = Math.max(params.length ?? pendulumLength, 0.001);
  const g = params.gravity ?? gravity;
  const theta0 = params.amplitude ?? 0.2;
  const omega = Math.sqrt(g / length);
  const period = 2 * Math.PI * Math.sqrt(length / g);
  const vMax = theta0 * omega * length;
  const totalEnergy = 0.5 * mass * length * length * omega * omega * theta0 * theta0;

  const format = (value) => {
    const safe = Math.abs(value) < 0.005 ? 0 : value;
    return safe.toFixed(2);
  };
  // This is also ok
  const formatSigned = (value) => {
    const safe = Math.abs(value) < 0.005 ? 0 : value;
    const fixed = safe.toFixed(2);
    return safe > 0 ? `+${fixed}` : fixed;
  };

  const summaryLines = [
    "Calculations involved",
    `L = ${format(length)} m`,
    `g = ${format(g)} m/s^2`,
    `\u03C9 = ${format(omega)} rad/s`,
    `T = ${format(period)} s`,
    `v_max = \u03C9L\u03B8\u2080 = ${format(vMax)} m/s`,
    `E_total = ${format(totalEnergy)} J`
  ];

  const theta = quarter === 1 ? theta0 : quarter === 3 ? -theta0 : 0;
  const v = quarter === 2 ? -vMax : quarter === 4 ? vMax : 0;
  const force = -mass * g * Math.sin(theta);
  const ke = 0.5 * mass * v * v;
  const pe = mass * g * length * (1 - Math.cos(theta));
 // this is ok - up
  const instantLines = [
    "At this checkpoint",
    `\u03B8 = ${formatSigned(theta)} rad, v = ${formatSigned(v)} m/s`,
    `F_t = ${formatSigned(force)} N`,
    `KE = ${format(ke)} J, PE = ${format(pe)} J`
  ];

  return { summaryLines, instantLines };
}

function disposeObject3D(root) {
  const disposeMaterial = (material) => {
    if (material.map) {
      material.map.dispose();
    }
    material.dispose();
  };

  root.traverse((item) => {
    if (item.geometry) {
      item.geometry.dispose();
    }
    if (Array.isArray(item.material)) {
      item.material.forEach(disposeMaterial);
    } else if (item.material) {
      disposeMaterial(item.material);
    }
  });
}

function createTextLabelSprite(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const fontSize = 64;
  const paddingX = 22;
  const paddingY = 16;
  context.font = `600 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
  const textWidth = context.measureText(text).width;

  canvas.width = Math.ceil(textWidth + paddingX * 2);
  canvas.height = Math.ceil(fontSize + paddingY * 2);

  context.font = `600 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
  context.fillStyle = "rgba(246, 249, 255, 0.92)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(38, 53, 78, 0.35)";
  context.lineWidth = 4;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  context.fillStyle = "#1e293b";
  context.textBaseline = "top";
  context.fillText(text, paddingX, paddingY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  const scale = 0.0052;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function wrapTextLines(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

function createWrappedTextLabelSprite(text, options = {}) {
  const width = options.width ?? 520;
  const fontSize = options.fontSize ?? 42;
  const paddingX = options.paddingX ?? 22;
  const paddingY = options.paddingY ?? 16;
  const lineHeight = options.lineHeight ?? 1.18;
  const scale = options.scale ?? 0.0032;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return createTextLabelSprite(text);
  }

  canvas.width = width;
  context.font = `600 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
  const lines = wrapTextLines(context, text, width - paddingX * 2);
  const lineHeightPx = fontSize * lineHeight;
  canvas.height = Math.ceil(paddingY * 2 + lines.length * lineHeightPx);

  context.font = `600 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
  context.fillStyle = "rgba(246, 249, 255, 0.92)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(38, 53, 78, 0.35)";
  context.lineWidth = 4;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  context.fillStyle = "#1e293b";
  context.textBaseline = "top";

  lines.forEach((line, index) => {
    context.fillText(line, paddingX, paddingY + index * lineHeightPx);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function createNarrationSprite(lines) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    sizeAttenuation: false,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  sprite.userData.texture = texture;
  sprite.renderOrder = 22;
  updateNarrationSprite(sprite, lines);
  return sprite;
}

function updateNarrationSprite(sprite, lines) {
  const canvas = sprite.userData.canvas;
  const context = sprite.userData.context;
  const texture = sprite.userData.texture;
  if (!context || !Array.isArray(lines) || lines.length === 0) {
    return;
  }

  const headingFontSize = 37;
  const bodyFontSize = 27;
  const paddingX = 30;
  const paddingY = 20;
  const lineGap = 6;
  const maxTextWidthRatio = 0.85;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(15, 23, 42, 0.8)";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.shadowColor = "rgba(13, 20, 35, 0.65)";
  context.shadowBlur = 4;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 2;
  context.textBaseline = "top";

  const maxTextWidth = Math.min(canvas.width - paddingX * 2, canvas.width * maxTextWidthRatio);
  const wrappedLines = [];
  lines.forEach((line, index) => {
    const fontSize = index === 0 ? headingFontSize : bodyFontSize;
    context.font = `700 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    const pieces = wrapTextLines(context, line, maxTextWidth);
    pieces.forEach((piece) => {
      const width = context.measureText(piece).width;
      wrappedLines.push({ text: piece, fontSize, isHeading: index === 0, width });
    });
  });

  const maxLineWidth = wrappedLines.reduce((maxWidth, entry) => {
    return Math.max(maxWidth, entry.width);
  }, 0);
  const bodyStartX = Math.max((canvas.width - maxLineWidth) * 0.5, paddingX);

  let y = paddingY;
  wrappedLines.forEach((entry) => {
    context.font = `700 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    context.fillStyle = entry.isHeading ? "#ff7a00" : "#f8fbff";
    const lineX = entry.isHeading
      ? Math.max((canvas.width - entry.width) * 0.5, paddingX)
      : bodyStartX;
    context.strokeText(entry.text, lineX, y);
    context.fillText(entry.text, lineX, y);
    y += entry.fontSize + lineGap;
  });
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  texture.needsUpdate = true;
  const scale = 0.0009;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
}

function createBottomInfoSprite(lines) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 340;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    sizeAttenuation: false,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  sprite.userData.texture = texture;
  sprite.renderOrder = 21;
  updateBottomInfoSprite(sprite, lines);
  return sprite;
}

function updateBottomInfoSprite(sprite, lines) {
  const canvas = sprite.userData.canvas;
  const context = sprite.userData.context;
  const texture = sprite.userData.texture;
  const payload = Array.isArray(lines) ? { textLines: lines } : lines;
  const textLines = payload?.textLines ?? [];
  const calculationsPayload = payload?.calculationsLines ?? [];
  const calculationsBlocks = Array.isArray(calculationsPayload)
    ? { summaryLines: calculationsPayload, instantLines: [] }
    : calculationsPayload ?? {};
  const summaryLines = calculationsBlocks.summaryLines ?? [];
  const instantLines = calculationsBlocks.instantLines ?? [];
  const hasCalculations = summaryLines.length > 0 || instantLines.length > 0;
  if (!context || !Array.isArray(textLines) || textLines.length === 0) {
    return;
  }

  const headingFontSize = 24;
  const bodyFontSize = 22;
  const paddingX = 28;
  const paddingY = 2;
  const lineGap = 8;
  const leftTextWidthRatio = hasCalculations ? 0.52 : 0.98;
  const minHeight = 320;
  context.textBaseline = "top";

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(15, 23, 42, 0.82)";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.fillStyle = "#000000";
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  const maxTextWidth = Math.min(canvas.width - paddingX * 2, canvas.width * leftTextWidthRatio);
  const normalizedLines =
    textLines.length > 1 ? [textLines[0], textLines.slice(1).join(" ")] : textLines;
  const wrappedLines = [];
  normalizedLines.forEach((line, index) => {
    const fontSize = index === 0 ? headingFontSize : bodyFontSize;
    context.font = `500 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    const pieces = wrapTextLines(context, line, maxTextWidth);
    pieces.forEach((piece) => wrappedLines.push({ text: piece, fontSize, isHeading: index === 0 }));
  });

  const contentHeight =
    paddingY * 2 +
    wrappedLines.reduce((total, entry) => total + entry.fontSize, 0) +
    Math.max(wrappedLines.length - 1, 0) * lineGap;
  const targetHeight = Math.max(minHeight, Math.ceil(contentHeight));
  if (canvas.height !== targetHeight) {
    canvas.height = targetHeight;
  }

  const maxLineWidth = wrappedLines.reduce((maxWidth, entry) => {
    context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    return Math.max(maxWidth, context.measureText(entry.text).width);
  }, 0);
  const textBlockHeight =
    wrappedLines.reduce((total, entry) => total + entry.fontSize, 0) +
    Math.max(wrappedLines.length - 1, 0) * lineGap;
  const bgPaddingX = 20;
  const bgPaddingY = 12;

  const availableWidth = canvas.width - paddingX * 2;
  const columnGap = hasCalculations ? 24 : 0;

  let leftMaxLineWidth = 0;
  let leftMaxTextHeight = 0;
  for (let idx = 1; idx <= 4; idx += 1) {
    const checkpointLines = getCheckpointExplanation(idx);
    const normalized =
      checkpointLines.length > 1
        ? [checkpointLines[0], checkpointLines.slice(1).join(" ")]
        : checkpointLines;
    const tempWrapped = [];
    normalized.forEach((line, lineIndex) => {
      const fontSize = lineIndex === 0 ? headingFontSize : bodyFontSize;
      context.font = `500 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
      const pieces = wrapTextLines(context, line, maxTextWidth);
      pieces.forEach((piece) => tempWrapped.push({ text: piece, fontSize }));
    });
    const tempMaxLineWidth = tempWrapped.reduce((acc, entry) => {
      context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
      return Math.max(acc, context.measureText(entry.text).width);
    }, 0);
    const tempTextHeight =
      tempWrapped.reduce((total, entry) => total + entry.fontSize, 0) +
      Math.max(tempWrapped.length - 1, 0) * lineGap;
    leftMaxLineWidth = Math.max(leftMaxLineWidth, tempMaxLineWidth);
    leftMaxTextHeight = Math.max(leftMaxTextHeight, tempTextHeight);
  }

  const leftBoxWidth = hasCalculations
    ? Math.min(availableWidth * 0.56, leftMaxLineWidth + bgPaddingX * 2)
    : Math.min(availableWidth, leftMaxLineWidth + bgPaddingX * 2);
  const rightBoxWidth = hasCalculations
    ? Math.max(220, Math.min(availableWidth - leftBoxWidth - columnGap, availableWidth * 0.38))
    : 0;

  const useSplitColumns = hasCalculations && instantLines.length > 0;
  const rightInnerWidth = Math.max(60, rightBoxWidth - bgPaddingX * 2);
  const rightColumnGap = useSplitColumns ? 18 : 0;
  const rightColumnWidth = useSplitColumns
    ? Math.max(60, (rightInnerWidth - rightColumnGap) / 2)
    : rightInnerWidth;
  const rightWrappedSummary = [];
  summaryLines.forEach((line, lineIndex) => {
    const fontSize = lineIndex === 0 ? headingFontSize : bodyFontSize;
    context.font = `500 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    const pieces = wrapTextLines(context, line, rightColumnWidth);
    pieces.forEach((piece) =>
      rightWrappedSummary.push({ text: piece, fontSize, isHeading: lineIndex === 0 })
    );
  });

  const rightWrappedInstant = [];
  instantLines.forEach((line, lineIndex) => {
    const fontSize = lineIndex === 0 ? headingFontSize : bodyFontSize;
    context.font = `500 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    const pieces = wrapTextLines(context, line, rightColumnWidth);
    pieces.forEach((piece) =>
      rightWrappedInstant.push({ text: piece, fontSize, isHeading: lineIndex === 0 })
    );
  });

  const summaryMaxLineWidth = rightWrappedSummary.reduce((acc, entry) => {
    context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    return Math.max(acc, context.measureText(entry.text).width);
  }, 0);
  const instantMaxLineWidth = rightWrappedInstant.reduce((acc, entry) => {
    context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    return Math.max(acc, context.measureText(entry.text).width);
  }, 0);
  const summaryHeight =
    rightWrappedSummary.reduce((total, entry) => total + entry.fontSize, 0) +
    Math.max(rightWrappedSummary.length - 1, 0) * lineGap;
  const instantHeight =
    rightWrappedInstant.reduce((total, entry) => total + entry.fontSize, 0) +
    Math.max(rightWrappedInstant.length - 1, 0) * lineGap;
  const rightTextHeight = hasCalculations
    ? useSplitColumns
      ? Math.max(summaryHeight, instantHeight)
      : summaryHeight + instantHeight
    : 0;

  const leftBoxHeight = Math.min(canvas.height - paddingY * 2, leftMaxTextHeight + bgPaddingY * 2);
  const rightBoxHeight = hasCalculations
    ? Math.min(canvas.height - paddingY * 2, rightTextHeight + bgPaddingY * 2)
    : 0;
  const boxHeight = Math.max(leftBoxHeight, rightBoxHeight);

  const blockYOffset = -22;
  const bgY = Math.max(0, (canvas.height - boxHeight) * 0.5 + blockYOffset);
  const leftBoxX = Math.max(0, paddingX);
  const rightBoxX = Math.max(leftBoxX + leftBoxWidth + columnGap, leftBoxX);

  const leftTextInsetX = Math.max((leftBoxWidth - bgPaddingX * 2 - maxLineWidth) * 0.5, 0);
  const leftTextInsetY = Math.max((boxHeight - bgPaddingY * 2 - textBlockHeight) * 0.5, 0);
  const leftTextX = leftBoxX + bgPaddingX + leftTextInsetX;
  let leftTextY = bgY + bgPaddingY + leftTextInsetY;

  const rightTextInsetY = Math.max((boxHeight - bgPaddingY * 2 - rightTextHeight) * 0.5, 0);
  let rightTextY = bgY + bgPaddingY + rightTextInsetY;

  context.fillStyle = "rgba(255, 255, 255, 0.5)";
  context.strokeStyle = "rgba(0, 0, 0, 0.25)";
  context.lineWidth = 2;
  context.fillRect(leftBoxX, bgY, leftBoxWidth, boxHeight);
  context.strokeRect(leftBoxX, bgY, leftBoxWidth, boxHeight);
  if (hasCalculations) {
    context.fillRect(rightBoxX, bgY, rightBoxWidth, boxHeight);
    context.strokeRect(rightBoxX, bgY, rightBoxWidth, boxHeight);
  }
  context.fillStyle = "#000000";

  wrappedLines.forEach((entry) => {
    context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    context.fillText(entry.text, leftTextX, leftTextY);
    leftTextY += entry.fontSize + lineGap;
  });

  if (hasCalculations) {
    if (useSplitColumns) {
      const summaryInsetX = Math.max((rightColumnWidth - summaryMaxLineWidth) * 0.5, 0);
      const instantInsetX = Math.max((rightColumnWidth - instantMaxLineWidth) * 0.5, 0);
      const summaryX = rightBoxX + bgPaddingX + summaryInsetX;
      const instantX =
        rightBoxX + bgPaddingX + rightColumnWidth + rightColumnGap + instantInsetX;
      let summaryY = rightTextY;
      let instantY = rightTextY;

      rightWrappedSummary.forEach((entry) => {
        context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
        context.fillStyle = "#000000";
        context.fillText(entry.text, summaryX, summaryY);
        summaryY += entry.fontSize + lineGap;
      });

      rightWrappedInstant.forEach((entry) => {
        context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
        context.fillStyle = "#000000";
        context.fillText(entry.text, instantX, instantY);
        instantY += entry.fontSize + lineGap;
      });

      const dividerX = rightBoxX + bgPaddingX + rightColumnWidth + rightColumnGap * 0.5;
      context.strokeStyle = "rgba(0, 0, 0, 0.28)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(dividerX, bgY + bgPaddingY);
      context.lineTo(dividerX, bgY + boxHeight - bgPaddingY);
      context.stroke();
    } else {
      const rightTextInsetX = Math.max(
        (rightBoxWidth - bgPaddingX * 2 - summaryMaxLineWidth) * 0.5,
        0
      );
      const rightTextX = rightBoxX + bgPaddingX + rightTextInsetX;

      rightWrappedSummary.forEach((entry) => {
        context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
        context.fillStyle = "#000000";
        context.fillText(entry.text, rightTextX, rightTextY);
        rightTextY += entry.fontSize + lineGap;
      });
    }
  }
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  texture.needsUpdate = true;
  const baseScale = 0.00085;
  sprite.userData.baseScale = baseScale;
  sprite.scale.set(canvas.width * baseScale, canvas.height * baseScale, 1);
}

function createLeaderLine() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
  const material = new THREE.LineBasicMaterial({
    color: "#1f2937",
    depthTest: false,
    depthWrite: false
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.renderOrder = 19;
  return line;
}

function updateLeaderLine(line, a, b, c) {
  const positions = line.geometry.attributes.position.array;
  positions[0] = a.x;
  positions[1] = a.y;
  positions[2] = a.z;
  positions[3] = b.x;
  positions[4] = b.y;
  positions[5] = b.z;
  positions[6] = c.x;
  positions[7] = c.y;
  positions[8] = c.z;
  line.geometry.attributes.position.needsUpdate = true;
}

function configureArrowOverlay(arrow) {
  arrow.line.material.depthTest = false;
  arrow.line.material.depthWrite = false;
  arrow.cone.material.depthTest = false;
  arrow.cone.material.depthWrite = false;
  arrow.line.renderOrder = 23;
  arrow.cone.renderOrder = 23;
}

export default function PendulumScene({ mass, amplitude, isPlaying }) {
  const containerRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f2f5f9");
    scene.fog = new THREE.Fog("#f2f5f9", 10, 45);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 140);
    camera.position.copy(defaultCameraPosition);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 40;
    controls.target.copy(defaultCameraTarget);
    controls.rotateSpeed = 0.9;
    controls.panSpeed = 0.95;
    controls.zoomSpeed = 1.0;
    controls.update();

    const hemiLight = new THREE.HemisphereLight("#ffffff", "#8ca2c2", 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight("#ffffff", 1.05);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 18;
    keyLight.shadow.camera.bottom = -18;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight("#dfe9ff", 0.55, 60);
    fillLight.position.set(-8, 3, -8);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(54, 0.2, 30),
      new THREE.MeshStandardMaterial({ color: "#d6dde7", roughness: 0.9, metalness: 0.08 })
    );
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(32, 32, "#9aacbe", "#bac8d6");
    grid.position.y = 0.005;
    if (Array.isArray(grid.material)) {
      grid.material.forEach((mat) => {
        mat.opacity = 0.45;
        mat.transparent = true;
      });
    } else {
      grid.material.opacity = 0.45;
      grid.material.transparent = true;
    }
    scene.add(grid);

    const support = new THREE.Mesh(
      new THREE.BoxGeometry(supportWidth, supportHeight, supportDepth),
      new THREE.MeshStandardMaterial({ color: "#8c9aa6", roughness: 0.85, metalness: 0.12 })
    );
    support.position.set(0, pivotY + supportHeight * 0.6, 0);
    support.castShadow = true;
    support.receiveShadow = true;
    scene.add(support);

    const pivot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 20, 20),
      new THREE.MeshStandardMaterial({ color: "#1f2937", roughness: 0.3, metalness: 0.85 })
    );
    pivot.position.set(pivotX, pivotY, pivotZ);
    scene.add(pivot);

    const pendulumGroup = new THREE.Group();
    pendulumGroup.position.set(pivotX, pivotY, pivotZ);
    scene.add(pendulumGroup);

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(rodRadius, rodRadius, pendulumLength, 24),
      new THREE.MeshStandardMaterial({ color: "#2da3ff", roughness: 0.3, metalness: 0.15 })
    );
    rod.position.set(0, -pendulumLength / 2, 0);
    rod.castShadow = true;
    pendulumGroup.add(rod);

    const bob = new THREE.Mesh(
      new THREE.SphereGeometry(bobRadius, 32, 32),
      new THREE.MeshStandardMaterial({ color: "#2da3ff", roughness: 0.35, metalness: 0.18 })
    );
    bob.position.set(0, -pendulumLength, 0);
    bob.castShadow = true;
    bob.receiveShadow = true;
    pendulumGroup.add(bob);

    const supportLabel = createTextLabelSprite("support");
    supportLabel.center.set(0, 0.5);
    supportLabel.position.set(-3.9, pivotY + 0.15, 0.9);
    scene.add(supportLabel);

    const lengthLabel = createTextLabelSprite("L");
    lengthLabel.center.set(0.5, 0.5);
    lengthLabel.scale.multiplyScalar(0.5);
    scene.add(lengthLabel);

    const massLabel = createTextLabelSprite("mass");
    massLabel.center.set(0, 0.5);
    scene.add(massLabel);

    const lengthLeader = createLeaderLine();
    const massLeader = createLeaderLine();
    scene.add(lengthLeader);
    scene.add(massLeader);

    const equilibriumLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pivotX, 0.2, -0.82),
      new THREE.Vector3(pivotX, pivotY - 0.1, -0.82)
    ]);
    const equilibriumMarker = new THREE.Line(
      equilibriumLineGeometry,
      new THREE.LineDashedMaterial({
        color: "#475569",
        dashSize: 0.14,
        gapSize: 0.09
      })
    );
    equilibriumMarker.computeLineDistances();
    equilibriumMarker.frustumCulled = false;
    scene.add(equilibriumMarker);

    const eqLabel = createTextLabelSprite("equilibrium position");
    eqLabel.center.set(0.5, 0.5);
    eqLabel.scale.multiplyScalar(0.5);
    eqLabel.position.set(pivotX, pivotY - 0.6, -0.82);
    scene.add(eqLabel);

    const forceArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0.4,
      "#dc2626"
    );
    configureArrowOverlay(forceArrow);
    scene.add(forceArrow);

    const velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0.4,
      "#2563eb"
    );
    configureArrowOverlay(velocityArrow);
    scene.add(velocityArrow);

    const forceLabel = createTextLabelSprite("F_t");
    forceLabel.center.set(0, 0.5);
    forceLabel.scale.multiplyScalar(0.58);
    scene.add(forceLabel);

    const velocityLabel = createTextLabelSprite("v");
    velocityLabel.center.set(0, 0.5);
    velocityLabel.scale.multiplyScalar(0.58);
    scene.add(velocityLabel);

    const sideExplainLabelOptions = {
      width: 360,
      fontSize: 34,
      scale: 0.003,
      paddingX: 20,
      paddingY: 14,
      lineHeight: 1.16
    };

    const sideOverlayDepth = 6.6;
    const sideOverlayMargin = 0.12;
    const sideOverlayGap = 0.12;

    const lengthExplainLabel = createWrappedTextLabelSprite(
      "L: string length",
      sideExplainLabelOptions
    );
    lengthExplainLabel.center.set(0.5, 0.5);
    lengthExplainLabel.position.set(0, 0, -sideOverlayDepth);


    const thetaExplainLabel = createWrappedTextLabelSprite(
      "\u03B8: angular displacement",
      sideExplainLabelOptions
    );
    thetaExplainLabel.center.set(0.5, 0.5);
    thetaExplainLabel.position.set(0, 0, -sideOverlayDepth);


    const theta0ExplainLabel = createWrappedTextLabelSprite(
      "\u03B8\u2080: maximum angle",
      sideExplainLabelOptions
    );
    theta0ExplainLabel.center.set(0.5, 0.5);
    theta0ExplainLabel.position.set(0, 0, -sideOverlayDepth);


    const omegaExplainLabel = createWrappedTextLabelSprite(
      "\u03C9: angular frequency",
      sideExplainLabelOptions
    );
    omegaExplainLabel.center.set(0.5, 0.5);
    omegaExplainLabel.position.set(0, 0, -sideOverlayDepth);


    const periodExplainLabel = createWrappedTextLabelSprite(
      "T: time period",
      sideExplainLabelOptions
    );
    periodExplainLabel.center.set(0.5, 0.5);
    periodExplainLabel.position.set(0, 0, -sideOverlayDepth);


    const velocityExplainLabel = createWrappedTextLabelSprite(
      "v: bob velocity (tangent to arc)",
      sideExplainLabelOptions
    );
    velocityExplainLabel.center.set(0.5, 0.5);
    velocityExplainLabel.position.set(0, 0, -sideOverlayDepth);


    const forceExplainLabel = createWrappedTextLabelSprite(
      "F_t: tangential restoring force",
      sideExplainLabelOptions
    );
    forceExplainLabel.center.set(0.5, 0.5);
    forceExplainLabel.position.set(0, 0, -sideOverlayDepth);


    const updateSideExplainLabelPositions = () => {
      const halfViewHeight =
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * sideOverlayDepth;
      const halfViewWidth = halfViewHeight * camera.aspect;

      const maxLabelWidth = Math.max(
        lengthExplainLabel.scale.x,
        thetaExplainLabel.scale.x,
        theta0ExplainLabel.scale.x,
        omegaExplainLabel.scale.x,
        periodExplainLabel.scale.x,
        velocityExplainLabel.scale.x,
        forceExplainLabel.scale.x
      );
      const leftX = -halfViewWidth + maxLabelWidth * 0.5 + sideOverlayMargin;
      const topY = halfViewHeight - lengthExplainLabel.scale.y * 0.5 - sideOverlayMargin;
      const stackedOffset =
        lengthExplainLabel.scale.y * 0.5 + thetaExplainLabel.scale.y * 0.5 + sideOverlayGap;
      const stackedOffset2 =
        thetaExplainLabel.scale.y * 0.5 + theta0ExplainLabel.scale.y * 0.5 + sideOverlayGap;
      const stackedOffset3 =
        theta0ExplainLabel.scale.y * 0.5 + omegaExplainLabel.scale.y * 0.5 + sideOverlayGap;
      const stackedOffset4 =
        omegaExplainLabel.scale.y * 0.5 + periodExplainLabel.scale.y * 0.5 + sideOverlayGap;
      const stackedOffset5 =
        periodExplainLabel.scale.y * 0.5 + velocityExplainLabel.scale.y * 0.5 + sideOverlayGap;
      const stackedOffset6 =
        velocityExplainLabel.scale.y * 0.5 + forceExplainLabel.scale.y * 0.5 + sideOverlayGap;

      lengthExplainLabel.position.set(leftX, topY, -sideOverlayDepth);
      thetaExplainLabel.position.set(leftX, topY - stackedOffset, -sideOverlayDepth);
      theta0ExplainLabel.position.set(
        leftX,
        topY - stackedOffset - stackedOffset2,
        -sideOverlayDepth
      );
      omegaExplainLabel.position.set(
        leftX,
        topY - stackedOffset - stackedOffset2 - stackedOffset3,
        -sideOverlayDepth
      );
      periodExplainLabel.position.set(
        leftX,
        topY - stackedOffset - stackedOffset2 - stackedOffset3 - stackedOffset4,
        -sideOverlayDepth
      );
      velocityExplainLabel.position.set(
        leftX,
        topY -
          stackedOffset -
          stackedOffset2 -
          stackedOffset3 -
          stackedOffset4 -
          stackedOffset5,
        -sideOverlayDepth
      );
      forceExplainLabel.position.set(
        leftX,
        topY -
          stackedOffset -
          stackedOffset2 -
          stackedOffset3 -
          stackedOffset4 -
          stackedOffset5 -
          stackedOffset6,
        -sideOverlayDepth
      );
        };

    const maxAngle = clamp(
      THREE.MathUtils.degToRad(amplitude * 7),
      THREE.MathUtils.degToRad(8),
      THREE.MathUtils.degToRad(35)
    );


    const axisHelper = new THREE.AxesHelper(2.6);
    axisHelper.position.set(-7.8, 0.01, -2.2);
    scene.add(axisHelper);

    const setRendererSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      updateSideExplainLabelPositions();
    };
    setRendererSize();

    const resizeObserver = new ResizeObserver(setRendererSize);
    resizeObserver.observe(container);

    const omega = Math.sqrt(gravity / pendulumLength);
    const quarterStep = Math.PI / 2;
    const pauseDuration = 2.7;
    const minRunDuration = 1.35;
    const physicalQuarterDuration = quarterStep / Math.max(omega, 0.001);
    const playbackTimeScale = Math.min(1, physicalQuarterDuration / minRunDuration);

    let phase = 0;
    let nextCheckpointPhase = quarterStep;
    let pausedFor = 0;
    let isPaused = false;

    let angle = maxAngle * Math.cos(phase);
    let angleRate = -maxAngle * omega * Math.sin(phase);
    let previousTime = performance.now() / 1000;
    let animationFrameId = 0;

    const lineA = new THREE.Vector3();
    const lineB = new THREE.Vector3();
    const lineC = new THREE.Vector3();
    const bobWorld = new THREE.Vector3();
    const pivotWorld = new THREE.Vector3();
    const rodMidWorld = new THREE.Vector3();
    const radialDirection = new THREE.Vector3();
    const lengthNormal = new THREE.Vector3();
    const arrowDirection = new THREE.Vector3();
    const tangentDirection = new THREE.Vector3();
    const updateVisuals = () => {
      pendulumGroup.rotation.z = angle;

      pendulumGroup.getWorldPosition(pivotWorld);
      bob.getWorldPosition(bobWorld);
      rodMidWorld.copy(pivotWorld).lerp(bobWorld, 0.5);
      radialDirection.subVectors(bobWorld, pivotWorld).normalize();
      lengthNormal.set(-radialDirection.y, radialDirection.x, 0).normalize();

      lineA.copy(rodMidWorld).addScaledVector(radialDirection, 0.06);
      lineA.z = 0.58;
      lineB.set(lineA.x + 0.38, lineA.y + 0.34, lineA.z + 0.18);
      lineC.set(lineB.x + 0.72, lineB.y + 0.24, lineB.z + 0.06);
      lengthLabel.position.copy(lineC);
      updateLeaderLine(lengthLeader, lineA, lineB, lineC);

      lineA.set(bobWorld.x, bobWorld.y, 0.5);
      lineB.set(bobWorld.x + 0.4, bobWorld.y + 1.2, 0.84);
      lineC.set(bobWorld.x + 1.3, bobWorld.y + 1.2, 0.84);
      massLabel.position.copy(lineC);
      updateLeaderLine(massLeader, lineA, lineB, lineC);

      const tangentialForce = -mass * gravity * Math.sin(angle);
      const forceMagnitude = Math.abs(tangentialForce);
      const forceDirection = Math.sign(tangentialForce);
      tangentDirection.set(Math.cos(angle), Math.sin(angle), 0);

      if (forceMagnitude > 0.02) {
        const forceLength = clamp(0.28 + forceMagnitude * 0.06, 0.4, 2.8);
        arrowDirection.copy(tangentDirection).multiplyScalar(forceDirection || 1);
        forceArrow.position.set(bobWorld.x, bobWorld.y + 0.2, 0.42);
        forceArrow.setDirection(arrowDirection);
        forceArrow.setLength(
          forceLength,
          Math.min(forceLength * 0.45, 0.7),
          Math.min(forceLength * 0.35, 0.5)
        );
        forceArrow.visible = true;
        forceLabel.visible = true;
        forceLabel.position.set(
          bobWorld.x + arrowDirection.x * (forceLength + 0.22),
          bobWorld.y + arrowDirection.y * (forceLength + 0.22),
          0.46
        );
      } else {
        forceArrow.visible = false;
        forceLabel.visible = false;
      }

      const tangentialSpeed = Math.abs(pendulumLength * angleRate);
      if (tangentialSpeed > 0.02) {
        const velocityLength = clamp(0.26 + tangentialSpeed * 0.3, 0.36, 2.6);
        const velocityDirection = Math.sign(angleRate);
        arrowDirection.copy(tangentDirection).multiplyScalar(velocityDirection || 1);
        velocityArrow.position.set(bobWorld.x, bobWorld.y - 0.05, -0.42);
        velocityArrow.setDirection(arrowDirection);
        velocityArrow.setLength(
          velocityLength,
          Math.min(velocityLength * 0.42, 0.6),
          Math.min(velocityLength * 0.32, 0.45)
        );
        velocityArrow.visible = true;
        velocityLabel.visible = true;
        velocityLabel.position.set(
          bobWorld.x + arrowDirection.x * (velocityLength + 0.22),
          bobWorld.y + arrowDirection.y * (velocityLength + 0.22),
          -0.48
        );
      } else {
        velocityArrow.visible = false;
        velocityLabel.visible = false;
      }

    };
    updateVisuals();

    const stepSimulation = (deltaTime) => {
      if (!isPlayingRef.current) {
        return;
      }

      const dt = Math.min(deltaTime, 0.05);

      if (isPaused) {
        pausedFor += dt;
        if (pausedFor >= pauseDuration) {
          isPaused = false;
          pausedFor = 0;
        }
        return;
      }

      phase += omega * dt * playbackTimeScale;
      if (phase >= nextCheckpointPhase) {
        phase = nextCheckpointPhase;
        nextCheckpointPhase += quarterStep;
        isPaused = true;
        pausedFor = 0;
      }

      angle = maxAngle * Math.cos(phase);
      angleRate = -maxAngle * omega * Math.sin(phase);
    };

    const animate = () => {
      const now = performance.now() / 1000;
      const dt = now - previousTime;
      previousTime = now;

      stepSimulation(dt);
      updateVisuals();
      controls.update();
      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      disposeObject3D(scene);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [mass, amplitude]);

  return <div className="scene-canvas" ref={containerRef} />;
}



















