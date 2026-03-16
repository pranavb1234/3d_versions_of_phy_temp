import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
      "Checkpoint 1/4 - Mass pulled to the right",
      "Left spring stretched; right spring compressed.",
      "The mass pauses for an instant (v = 0).",
      "Both springs pull/push back toward the center.",
      "Restoring force is largest here."
    ];
  }
  if (quarter === 2) {
    return [
      "Checkpoint 2/4 - Mass crosses the center",
      "The mass passes equilibrium moving left.",
      "Speed is maximum here.",
      "Left/right spring forces cancel (net F ~ 0).",
      "Energy is mostly kinetic."
    ];
  }
  if (quarter === 3) {
    return [
      "Checkpoint 3/4 - Mass pulled to the left",
      "Right spring stretched; left spring compressed.",
      "The mass pauses again (v = 0).",
      "Both springs push/pull back toward the center.",
      "Restoring force is largest here."
    ];
  }
  return [
    "Checkpoint 4/4 - Mass crosses the center again",
    "Back through equilibrium moving right.",
    "Speed is maximum; net spring force ~ 0.",
    "One full oscillation is complete."
  ];
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

  const headingFontSize = 36;
  const bodyFontSize = 26;
  const paddingX = 30;
  const paddingY = 20;
  const lineGap = 6;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(15, 23, 42, 0.8)";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.shadowColor = "rgba(13, 20, 35, 0.65)";
  context.shadowBlur = 4;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 2;
  context.textBaseline = "top";

  const lineMetrics = lines.map((line, index) => {
    const fontSize = index === 0 ? headingFontSize : bodyFontSize;
    context.font = `700 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    return { line, fontSize, width: context.measureText(line).width };
  });
  const maxTextWidth = lineMetrics.reduce((maxWidth, entry) => {
    return Math.max(maxWidth, entry.width);
  }, 0);
  const startX = Math.max((canvas.width - maxTextWidth) * 0.5, paddingX);

  let y = paddingY;
  lineMetrics.forEach((entry, index) => {
    context.font = `700 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    context.fillStyle = index === 0 ? "#ff7a00" : "#f8fbff";
    context.strokeText(entry.line, startX, y);
    context.fillText(entry.line, startX, y);
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
  if (!context || !Array.isArray(lines) || lines.length === 0) {
    return;
  }

  const headingFontSize = 28;
  const bodyFontSize = 22;
  const paddingX = 44;
  const paddingY = 24;
  const lineGap = 6;
  const maxTextWidthRatio = 0.7;
  const minHeight = 320;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(15, 23, 42, 0.82)";
  context.lineWidth = 6;
  context.lineJoin = "round";
  context.fillStyle = "#f7fbff";
  context.shadowColor = "rgba(13, 20, 35, 0.66)";
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
    context.font = `700 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    return Math.max(maxWidth, context.measureText(entry.text).width);
  }, 0);
  const startX = Math.max((canvas.width - maxLineWidth) * 0.5, paddingX);

  let y = paddingY;
  wrappedLines.forEach((entry) => {
    context.font = `700 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    context.strokeText(entry.text, startX, y);
    context.fillText(entry.text, startX, y);
    y += entry.fontSize + lineGap;
  });
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
      new THREE.Vector3(equilibriumX, 1.18, 0.35),
      0.4,
      "#dc2626"
    );
    const rightForceArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(equilibriumX, 1.18, -0.35),
      0.4,
      "#dc2626"
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

    const velocityExplainLabel = createWrappedTextLabelSprite(
      "v: block velocity (blue arrow)",
      sideExplainLabelOptions
    );
    velocityExplainLabel.center.set(0.5, 0.5);
    velocityExplainLabel.position.set(0, 0, -sideOverlayDepth);
    camera.add(velocityExplainLabel);

    const forceExplainLabel = createWrappedTextLabelSprite(
      "Red: left/right spring forces",
      sideExplainLabelOptions
    );
    forceExplainLabel.center.set(0.5, 0.5);
    forceExplainLabel.position.set(0, 0, -sideOverlayDepth);
    camera.add(forceExplainLabel);

    const updateSideExplainLabelPositions = () => {
      const halfViewHeight =
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * sideOverlayDepth;
      const halfViewWidth = halfViewHeight * camera.aspect;

      const leftX = -halfViewWidth + velocityExplainLabel.scale.x * 0.5 + sideOverlayMargin;
      const topY = halfViewHeight - velocityExplainLabel.scale.y * 0.5 - sideOverlayMargin;
      const stackedOffset =
        velocityExplainLabel.scale.y * 0.5 + forceExplainLabel.scale.y * 0.5 + sideOverlayGap;

      velocityExplainLabel.position.set(leftX, topY, -sideOverlayDepth);
      forceExplainLabel.position.set(leftX, topY - stackedOffset, -sideOverlayDepth);
    };

    const narrationSprite = createNarrationSprite([
      "Double Spring-Mass Experiment",
      "Two springs pull the mass back to center from both sides (net F = -2k*x)."
    ]);
    narrationSprite.center.set(0.5, 0.5);
    narrationSprite.position.set(0, 1.1, -6.6);
    camera.add(narrationSprite);

    const bottomInfoSprite = createBottomInfoSprite([...getCheckpointExplanation(1)]);
    bottomInfoSprite.center.set(0.5, 0.5);
    bottomInfoSprite.position.set(0, -2.28, -6.6);
    camera.add(bottomInfoSprite);

    const axisHelper = new THREE.AxesHelper(2.6);
    axisHelper.position.set(-7.8, 0.01, -2.2);
    scene.add(axisHelper);

    const bottomOverlayDepth = 6.6;
    const bottomOverlayMargin = 0.2;

    const updateBottomInfoPosition = () => {
      const halfViewHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * bottomOverlayDepth;
      const halfViewWidth = halfViewHeight * camera.aspect;
      const baseScale = bottomInfoSprite.userData.baseScale ?? 0.00085;
      bottomInfoSprite.scale.set(
        bottomInfoSprite.userData.canvas.width * baseScale,
        bottomInfoSprite.userData.canvas.height * baseScale,
        1
      );

      const maxAllowedWidth = Math.max(0.001, 2 * halfViewWidth - 0.4);
      const maxAllowedHeight = Math.max(0.001, 2 * halfViewHeight - 0.4);
      const shrink = Math.min(
        maxAllowedWidth / bottomInfoSprite.scale.x,
        maxAllowedHeight / bottomInfoSprite.scale.y,
        1
      );
      if (shrink < 1) {
        bottomInfoSprite.scale.multiplyScalar(shrink);
      }

      const bottomY = -halfViewHeight + bottomInfoSprite.scale.y * 0.5 + bottomOverlayMargin;
      bottomInfoSprite.position.set(0, bottomY, -bottomOverlayDepth);
    };

    const setRendererSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      updateSideExplainLabelPositions();
      updateBottomInfoPosition();
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
    let checkpointCount = 0;
    let pausedFor = 0;
    let isPaused = false;

    let positionX = equilibriumX + amplitude * Math.sin(theta);
    let velocityX = amplitude * omega * Math.cos(theta);
    let previousTime = performance.now() / 1000;
    let narrationKey = "";
    let bottomInfoKey = "";
    let animationFrameId = 0;

    const lineA = new THREE.Vector3();
    const lineB = new THREE.Vector3();
    const lineC = new THREE.Vector3();
    const arrowDirection = new THREE.Vector3();
    const setNarration = (key, lines) => {
      if (key !== narrationKey) {
        updateNarrationSprite(narrationSprite, lines);
        narrationKey = key;
      }
    };
    const setBottomInfo = (key, lines) => {
      if (key !== bottomInfoKey) {
        updateBottomInfoSprite(bottomInfoSprite, lines);
        bottomInfoKey = key;
        updateBottomInfoPosition();
      }
    };

    setNarration("intro", [
      "Double Spring-Mass Experiment",
      "Two springs pull the mass back to center from both sides (net F = -2k*x)."
    ]);
    setBottomInfo("intro", getCheckpointExplanation(1));

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
        const forceLength = clamp(0.1 + forceMagnitude * 0.07, 0.18, 1.65);
        arrowDirection.set(forceDirection, 0, 0);

        leftForceArrow.position.set(blockLeftX + 0.06, 1.18, 0.35);
        leftForceArrow.setDirection(arrowDirection);
        leftForceArrow.setLength(
          forceLength,
          Math.min(forceLength * 0.32, 0.26),
          Math.min(forceLength * 0.24, 0.18)
        );
        leftForceArrow.visible = true;
        leftForceLabel.visible = true;
        leftForceLabel.position.set(
          blockLeftX + 0.06 + forceDirection * (forceLength + 0.22),
          1.34,
          0.4
        );

        rightForceArrow.position.set(blockRightX - 0.06, 1.18, -0.35);
        rightForceArrow.setDirection(arrowDirection);
        rightForceArrow.setLength(
          forceLength,
          Math.min(forceLength * 0.32, 0.26),
          Math.min(forceLength * 0.24, 0.18)
        );
        rightForceArrow.visible = true;
        rightForceLabel.visible = true;
        rightForceLabel.position.set(
          blockRightX - 0.06 + forceDirection * (forceLength + 0.22),
          1.34,
          -0.4
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
        const velocityLength = clamp(0.1 + velocityMagnitude * 0.3, 0.16, 1.6);
        arrowDirection.set(velocityDirection, 0, 0);
        velocityArrow.position.set(positionX, 0.86, -0.42);
        velocityArrow.setDirection(arrowDirection);
        velocityArrow.setLength(
          velocityLength,
          Math.min(velocityLength * 0.3, 0.24),
          Math.min(velocityLength * 0.22, 0.16)
        );
        velocityArrow.visible = true;
        velocityLabel.visible = true;
        velocityLabel.position.set(positionX + velocityDirection * (velocityLength + 0.22), 1.0, -0.48);
      } else {
        velocityArrow.visible = false;
        velocityLabel.visible = false;
      }

      const activeQuarter = isPaused
        ? ((checkpointCount - 1 + 4) % 4) + 1
        : (checkpointCount % 4) + 1;
      const infoKey = `${activeQuarter}`;
      setBottomInfo(infoKey, getCheckpointExplanation(activeQuarter));
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
        checkpointCount += 1;
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
