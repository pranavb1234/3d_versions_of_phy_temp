import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { array } from "three/tsl";

const wallWidth = 0.4;
const blockWidth = 1.2;
const leftWallX = -6.2;
const rightWallX = 6.2;
const leftWallAnchorX = leftWallX + wallWidth / 2;
const rightWallAnchorX = rightWallX - wallWidth / 2;
const equilibriumX = 0;
const springRadius = 0.22;
const springWireRadius = 0.026;
const springCoils = 14;

const smoothStep = (t) => t * t * (3 - 2 * t);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getCheckpointExplanation(checkpointCount) {
  const quarter = ((checkpointCount - 1) % 4) + 1;

  if (quarter === 1) {
    return [
      "Checkpoint 1/4 — At Mean Position (Moving Right)",
      "The mass is at the center (x = 0). Both springs are at their natural length — neither stretched nor compressed. So the force from each spring is zero, meaning net force = 0 and acceleration = 0. The mass is moving at its maximum speed. All energy is Kinetic Energy."
    ];
  }
  if (quarter === 2) {
    return [
      "Checkpoint 2/4 — At Right Extreme (x = +A)",
      "The mass has moved to the right extreme. The right spring is compressed and the left spring is stretched — both by the same amount A. Both springs are now pushing and pulling the mass back toward the center. Net restoring force = −2kA (maximum). Velocity = 0, acceleration = maximum. All energy is Potential Energy."
    ];
  }
  if (quarter === 3) {
    return [
      "Checkpoint 3/4 — Back at Mean Position (Moving Left)",
      "The mass is passing through the center again, now moving leftward. Both springs are back to natural length — net force = 0, acceleration = 0. Speed is at its maximum (in the left direction). All energy is Kinetic Energy. This is identical to Checkpoint 1 but in the opposite direction."
    ];
  }
  return [
    "Checkpoint 4/4 — At Left Extreme (x = −A)",
    "The mass has moved to the left extreme. Now the left spring is compressed and the right spring is stretched — both by amount A. Again both springs act together to push and pull the mass back toward center. Net force = +2kA (maximum, pointing right). Velocity = 0, acceleration = maximum. All energy is Potential Energy. After this the mass returns to center and one full oscillation is complete."
  ];
}

function getCheckpointCalculations(checkpointCount, params = {}) {
  const quarter = ((checkpointCount - 1) % 4) + 1;
  const mass = Math.max(params.mass ?? 1, 0.001);
  const springConstant = params.springConstant ?? 15;
  const amplitude = params.amplitude ?? 3;
  const kEff = 2 * springConstant;
  const omega = Math.sqrt(kEff / mass);
  const vMax = omega * amplitude;
  const totalEnergy = 0.5 * kEff * amplitude * amplitude;

  const format = (value) => {
    const safe = Math.abs(value) < 0.005 ? 0 : value;
    return safe.toFixed(2);
  };
  const formatSigned = (value) => {
    const safe = Math.abs(value) < 0.005 ? 0 : value;
    const fixed = safe.toFixed(2);
    return safe > 0 ? `+${fixed}` : fixed;
  };

  const summaryLines = [
    "Calculations involved",
    `k_eff = 2K = ${format(kEff)} N/m`,
    `ω = ${format(omega)} rad/s`,
    `v_max = ωA = ${format(vMax)} m/s`,
    `Total energy = ${format(totalEnergy)} J`
  ];

  const x =
    quarter === 2 ? amplitude : quarter === 4 ? -amplitude : 0;
  const v =
    quarter === 1 ? vMax : quarter === 3 ? -vMax : 0;
  const a = -omega * omega * x;
  const force = -kEff * x;
  const ke = 0.5 * mass * v * v;
  const pe = 0.5 * kEff * x * x;

  const instantLines = [
    "At this checkpoint",
    `x = ${formatSigned(x)} m, v = ${formatSigned(v)} m/s`,
    `a = ${formatSigned(a)} m/s^2, F = ${formatSigned(force)} N`,
    `KE = ${format(ke)} J, PE = ${format(pe)} J`
  ];

  return { summaryLines, instantLines };
}

function createUnitSpringGeometry() {
  const points = [];
  const leadFraction = 0.05;
  const bridgeFraction = 0.045;
  const leadSegments = 14;
  const bridgeSegments = 14;
  const coilSegments = springCoils * 40;

  const helixStart = leadFraction + bridgeFraction;
  const helixEnd = 1 - leadFraction - bridgeFraction;
  const helixLength = helixEnd - helixStart;

  for (let i = 0; i <= leadSegments; i += 1) {
    const u = i / leadSegments;
    points.push(new THREE.Vector3(u * leadFraction, 0, 0));
  }

  for (let i = 1; i <= bridgeSegments; i += 1) {
    const u = i / bridgeSegments;
    const x = leadFraction + u * bridgeFraction;
    const radius = springRadius * smoothStep(u);
    points.push(new THREE.Vector3(x, 0, radius));
  }

  for (let i = 1; i <= coilSegments; i += 1) {
    const u = i / coilSegments;
    const angle = u * springCoils * Math.PI * 2;
    const x = helixStart + u * helixLength;
    points.push(new THREE.Vector3(x, springRadius * Math.sin(angle), springRadius * Math.cos(angle)));
  }

  for (let i = 1; i <= bridgeSegments; i += 1) {
    const u = i / bridgeSegments;
    const x = helixEnd + u * bridgeFraction;
    const radius = springRadius * (1 - smoothStep(u));
    points.push(new THREE.Vector3(x, 0, radius));
  }

  for (let i = 1; i <= leadSegments; i += 1) {
    const u = i / leadSegments;
    const x = 1 - leadFraction + u * leadFraction;
    points.push(new THREE.Vector3(x, 0, 0));
  }

  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  return new THREE.TubeGeometry(curve, points.length * 3, springWireRadius, 14, false);
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
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#000000";
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.textBaseline = "top";

  const lineMetrics = lines.map((line, index) => {
    const fontSize = index === 0 ? headingFontSize : bodyFontSize;
    context.font = `500 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    return { line, fontSize, width: context.measureText(line).width };
  });
  const maxTextWidth = lineMetrics.reduce((maxWidth, entry) => {
    return Math.max(maxWidth, entry.width);
  }, 0);
  const bodyStartX = Math.max((canvas.width - maxTextWidth) * 0.5, paddingX);

  const headingEntry = lineMetrics[0];
  const headingX = Math.max((canvas.width - headingEntry.width) * 0.5, paddingX);
  const headingY = paddingY;
  const headingBgPaddingX = 18;
  const headingBgPaddingY = 8;

  context.fillStyle = "rgba(255, 255, 255, 0.5)";
  context.strokeStyle = "rgba(0, 0, 0, 0.25)";
  context.lineWidth = 2;
  context.fillRect(
    headingX - headingBgPaddingX,
    headingY - headingBgPaddingY,
    headingEntry.width + headingBgPaddingX * 2,
    headingEntry.fontSize + headingBgPaddingY * 2
  );
  context.strokeRect(
    headingX - headingBgPaddingX,
    headingY - headingBgPaddingY,
    headingEntry.width + headingBgPaddingX * 2,
    headingEntry.fontSize + headingBgPaddingY * 2
  );
  context.strokeStyle = "#000000";
  context.lineWidth = 2;

  let y = paddingY;
  lineMetrics.forEach((entry, index) => {
    context.font = `500 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    context.fillStyle = index === 0 ? "#ff7a00" : "#000000";
    const lineX =
      index === 0 ? Math.max((canvas.width - entry.width) * 0.5, paddingX) : bodyStartX;
    if (index === 0) {
      context.strokeText(entry.line, lineX, y);
    }
    context.fillText(entry.line, lineX, y);
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

function updateBottomInfoSprite(sprite, content) {
  const canvas = sprite.userData.canvas;
  const context = sprite.userData.context;
  const texture = sprite.userData.texture;
  const payload = Array.isArray(content) ? { textLines: content } : content;
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
  const minHeight = 320

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(15, 23, 42, 0.82)";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.fillStyle = "#000000";
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.textBaseline = "top";

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

export default function DoubleSpringMassScene({ mass, springConstant, amplitude, isPlaying }) {
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
    camera.position.set(10.5, 4.8, 11.5);
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
    controls.target.set(0, 0.8, 0);
    controls.rotateSpeed = 0.9;
    controls.panSpeed = 0.95;
    controls.zoomSpeed = 1.0;

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

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: "#8c9aa6",
      roughness: 0.85,
      metalness: 0.12
    });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, 3.6, 3), wallMaterial);
    leftWall.position.set(leftWallX, 1.8, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, 3.6, 3), wallMaterial);
    rightWall.position.set(rightWallX, 1.8, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    const block = new THREE.Mesh(
      new THREE.BoxGeometry(blockWidth, 1, 1),
      new THREE.MeshStandardMaterial({ color: "#ff8c42", roughness: 0.45, metalness: 0.22 })
    );
    block.position.set(equilibriumX, 0.5, 0);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);

    const springMaterial = new THREE.MeshStandardMaterial({
      color: "#f6f7f9",
      roughness: 0.27,
      metalness: 0.72
    });
    const leftSpring = new THREE.Mesh(createUnitSpringGeometry(), springMaterial);
    leftSpring.castShadow = true;
    leftSpring.position.set(leftWallAnchorX, 0.5, 0);
    scene.add(leftSpring);

    const rightSpring = new THREE.Mesh(createUnitSpringGeometry(), springMaterial);
    rightSpring.castShadow = true;
    rightSpring.position.set(equilibriumX + blockWidth / 2, 0.5, 0);
    scene.add(rightSpring);

    const anchorMaterial = new THREE.MeshStandardMaterial({
      color: "#2f333b",
      roughness: 0.3,
      metalness: 0.85
    });
    const leftWallAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), anchorMaterial);
    leftWallAnchor.position.set(leftWallAnchorX, 0.5, 0);
    scene.add(leftWallAnchor);

    const rightWallAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), anchorMaterial);
    rightWallAnchor.position.set(rightWallAnchorX, 0.5, 0);
    scene.add(rightWallAnchor);

    const leftBlockAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), anchorMaterial);
    const rightBlockAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), anchorMaterial);
    scene.add(leftBlockAnchor);
    scene.add(rightBlockAnchor);

    const blockLabel = createTextLabelSprite("block");
    const leftSpringLabel = createTextLabelSprite("spring");
    const rightSpringLabel = createTextLabelSprite("spring");
    const massLabel = createTextLabelSprite("mass");
    blockLabel.center.set(0, 0.5);
    leftSpringLabel.center.set(0, 0.5);
    rightSpringLabel.center.set(0, 0.5);
    massLabel.center.set(0, 0.5);
    scene.add(blockLabel);
    scene.add(leftSpringLabel);
    scene.add(rightSpringLabel);
    scene.add(massLabel);

    const blockLeader = createLeaderLine();
    const leftSpringLeader = createLeaderLine();
    const rightSpringLeader = createLeaderLine();
    const massLeader = createLeaderLine();
    scene.add(blockLeader);
    scene.add(leftSpringLeader);
    scene.add(rightSpringLeader);
    scene.add(massLeader);

    const equilibriumLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(equilibriumX, 0.03, -0.82),
      new THREE.Vector3(equilibriumX, 3.05, -0.82)
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
    eqLabel.position.set(equilibriumX, 3.38, -0.82);
    scene.add(eqLabel);

    const leftForceArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(equilibriumX, 1.18, 0.7),
      0.4,
      "#dc2626"
    );
    const rightForceArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(equilibriumX, 1.18, -0.7),
      0.4,
      "#16a34a"
    );
    configureArrowOverlay(leftForceArrow);
    configureArrowOverlay(rightForceArrow);
    scene.add(leftForceArrow);
    scene.add(rightForceArrow);

    const velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(equilibriumX, 0.86, -0.42),
      0.4,
      "#2563eb"
    );
    configureArrowOverlay(velocityArrow);
    scene.add(velocityArrow);

    const leftForceLabel = createTextLabelSprite("F_L");
    leftForceLabel.center.set(0, 0.5);
    leftForceLabel.scale.multiplyScalar(0.58);
    scene.add(leftForceLabel);

    const rightForceLabel = createTextLabelSprite("F_R");
    rightForceLabel.center.set(0, 0.5);
    rightForceLabel.scale.multiplyScalar(0.58);
    scene.add(rightForceLabel);

    const velocityLabel = createTextLabelSprite("v");
    velocityLabel.center.set(0, 0.5);
    velocityLabel.scale.multiplyScalar(0.58);
    scene.add(velocityLabel);

    const updateSideExplainLabelPositions = () => {};

    const axisHelper = new THREE.AxesHelper(2.6);
    axisHelper.position.set(-7.8, 0.01, -2.2);
    scene.add(axisHelper);

    const setRendererSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      updateSideExplainLabelPositions();
    };
    setRendererSize();

    const resizeObserver = new ResizeObserver(setRendererSize);
    resizeObserver.observe(container);

    const omega = Math.sqrt((2 * springConstant) / mass);
    const quarterStep = Math.PI / 2;
    const pauseDuration = 2.7;
    const minRunDuration = 1.35;
    const physicalQuarterDuration = quarterStep / Math.max(omega, 0.001);
    const playbackTimeScale = Math.min(1, physicalQuarterDuration / minRunDuration);

    let theta = 0;
    let nextCheckpointTheta = quarterStep;
    let pausedFor = 0;
    let isPaused = false;

    let positionX = equilibriumX + amplitude * Math.sin(theta);
    let velocityX = amplitude * omega * Math.cos(theta);
    let previousTime = performance.now() / 1000;
    let animationFrameId = 0;
    const lineA = new THREE.Vector3();
    const lineB = new THREE.Vector3();
    const lineC = new THREE.Vector3();
    const arrowDirection = new THREE.Vector3();

    const updateVisuals = () => {
      block.position.x = positionX;
      const blockLeftX = positionX - blockWidth / 2;
      const blockRightX = positionX + blockWidth / 2;
      leftBlockAnchor.position.set(blockLeftX, 0.5, 0);
      rightBlockAnchor.position.set(blockRightX, 0.5, 0);

      const leftLength = Math.max(blockLeftX - leftWallAnchorX, 0.45);
      const rightLength = Math.max(rightWallAnchorX - blockRightX, 0.45);
      leftSpring.scale.set(leftLength, 1, 1);
      rightSpring.scale.set(rightLength, 1, 1);
      rightSpring.position.set(blockRightX, 0.5, 0);

      lineA.set(leftWallX, 1.8, 0.55);
      lineB.set(leftWallX, 2.95, 0.82);
      lineC.set(leftWallX + 1.1, 2.95, 0.82);
      blockLabel.position.copy(lineC);
      updateLeaderLine(blockLeader, lineA, lineB, lineC);

      const leftSpringCenterX = leftWallAnchorX + leftLength * 0.5;
      lineA.set(leftSpringCenterX, 0.62, 0.0);
      lineB.set(leftSpringCenterX - 0.6, 2.18, 0.96);
      lineC.set(leftSpringCenterX - 1.75, 2.18, 0.96);
      leftSpringLabel.position.copy(lineC);
      updateLeaderLine(leftSpringLeader, lineA, lineB, lineC);

      const rightSpringCenterX = blockRightX + rightLength * 0.5;
      lineA.set(rightSpringCenterX, 0.62, 0.0);
      lineB.set(rightSpringCenterX + 0.6, 2.18, 0.96);
      lineC.set(rightSpringCenterX + 1.75, 2.18, 0.96);
      rightSpringLabel.position.copy(lineC);
      updateLeaderLine(rightSpringLeader, lineA, lineB, lineC);

      lineA.set(positionX, 0.95, 0.5);
      lineB.set(positionX + 0.35, 1.95, 0.84);
      lineC.set(positionX + 1.25, 1.95, 0.84);
      massLabel.position.copy(lineC);
      updateLeaderLine(massLeader, lineA, lineB, lineC);

      const displacement = positionX - equilibriumX;
      const forceEach = -springConstant * displacement;

      const forceMagnitude = Math.abs(forceEach);
      if (forceMagnitude > 0.02) {
        const forceDirection = Math.sign(forceEach) || 1;
        const forceLength = clamp(0.24 + forceMagnitude * 0.12, 0.34, 3.0);
        arrowDirection.set(forceDirection, 0, 0);

        leftForceArrow.position.set(blockLeftX + 0.06, 1.18, 0.7);
        leftForceArrow.setDirection(arrowDirection);
        leftForceArrow.setLength(
          forceLength,
          Math.min(forceLength * 0.5, 0.5),
          Math.min(forceLength * 0.4, 0.36)
        );
        leftForceArrow.visible = true;
        leftForceLabel.visible = true;
        leftForceLabel.position.set(
          blockLeftX + 0.06 + forceDirection * (forceLength + 0.22),
          1.34,
          0.75
        );

        rightForceArrow.position.set(blockRightX - 0.06, 1.18, -0.7);
        rightForceArrow.setDirection(arrowDirection);
        rightForceArrow.setLength(
          forceLength,
          Math.min(forceLength * 0.5, 0.5),
          Math.min(forceLength * 0.4, 0.36)
        );
        rightForceArrow.visible = true;
        rightForceLabel.visible = true;
        rightForceLabel.position.set(
          blockRightX - 0.06 + forceDirection * (forceLength + 0.22),
          1.34,
          -0.75
        );
      } else {
        leftForceArrow.visible = false;
        rightForceArrow.visible = false;
        leftForceLabel.visible = false;
        rightForceLabel.visible = false;
      }

      const velocityMagnitude = Math.abs(velocityX);
      if (velocityMagnitude > 0.02) {
        const velocityDirection = Math.sign(velocityX);
        const velocityLength = clamp(0.2 + velocityMagnitude * 0.4, 0.3, 2.5);
        arrowDirection.set(velocityDirection, 0, 0);
        velocityArrow.position.set(positionX, 0.86, -0.42);
        velocityArrow.setDirection(arrowDirection);
        velocityArrow.setLength(
          velocityLength,
          Math.min(velocityLength * 0.5, 0.42),
          Math.min(velocityLength * 0.36, 0.3)
        );
        velocityArrow.visible = true;
        velocityLabel.visible = true;
        velocityLabel.position.set(positionX + velocityDirection * (velocityLength + 0.22), 1.0, -0.48);
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

      theta += omega * dt * playbackTimeScale;
      if (theta >= nextCheckpointTheta) {
        theta = nextCheckpointTheta;
        nextCheckpointTheta += quarterStep;
        isPaused = true;
        pausedFor = 0;
      }

      positionX = equilibriumX + amplitude * Math.sin(theta);
      velocityX = amplitude * omega * Math.cos(theta);
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
  }, [mass, springConstant, amplitude]);

  return <div className="scene-canvas" ref={containerRef} />;
}


