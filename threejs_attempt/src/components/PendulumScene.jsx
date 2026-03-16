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

const smoothStep = (t) => t * t * (3 - 2 * t);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getCheckpointExplanation(checkpointCount) {
  const quarter = ((checkpointCount - 1) % 4) + 1;

  if (quarter === 1) {
    return [
      "Pause at T/4: Maximum Angle (+θ_max)",
      "Bob reached far-right turning point.",
      "Tangential velocity is zero; restoring force is maximum."
    ];
  }
  if (quarter === 2) {
    return [
      "Pause at T/2: Mean Position",
      "Bob crossed equilibrium moving left at max speed.",
      "Restoring force is near zero momentarily."
    ];
  }
  if (quarter === 3) {
    return [
      "Pause at 3T/4: Maximum Angle (-θ_max)",
      "Bob reached far-left turning point.",
      "Tangential velocity is zero; restoring force is maximum."
    ];
  }
  return [
    "Pause at T: Mean Position",
    "One full oscillation is complete.",
    "Bob crosses equilibrium moving right at max speed."
  ];
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
  const bodyStartX = Math.max((canvas.width - maxTextWidth) * 0.5, paddingX);

  let y = paddingY;
  lineMetrics.forEach((entry, index) => {
    context.font = `700 ${entry.fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
    context.fillStyle = index === 0 ? "#ff7a00" : "#f8fbff";
    const lineX =
      index === 0 ? Math.max((canvas.width - entry.width) * 0.5, paddingX) : bodyStartX;
    context.strokeText(entry.line, lineX, y);
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

function updateBottomInfoSprite(sprite, lines) {
  const canvas = sprite.userData.canvas;
  const context = sprite.userData.context;
  const texture = sprite.userData.texture;
  if (!context || !Array.isArray(lines) || lines.length === 0) {
    return;
  }

  const fontSize = 31;
  const paddingX = 24;
  const paddingY = 20;
  const lineGap = 7;
  const maxTextWidthRatio = 1;
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

  context.font = `700 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
  const maxTextWidth = Math.min(canvas.width - paddingX * 2, canvas.width * maxTextWidthRatio);
  const paragraph = lines.join(" ");
  const wrappedLines = wrapTextLines(context, paragraph, maxTextWidth);
  const contentHeight =
    paddingY * 2 +
    wrappedLines.length * fontSize +
    Math.max(wrappedLines.length - 1, 0) * lineGap;
  const targetHeight = Math.max(minHeight, Math.ceil(contentHeight));
  if (canvas.height !== targetHeight) {
    canvas.height = targetHeight;
  }

  const maxLineWidth = wrappedLines.reduce((maxWidth, line) => {
    return Math.max(maxWidth, context.measureText(line).width);
  }, 0);
  const startX = Math.max((canvas.width - maxLineWidth) * 0.5, paddingX);

  let y = paddingY;
  wrappedLines.forEach((line) => {
    context.strokeText(line, startX, y);
    context.fillText(line, startX, y);
    y += fontSize + lineGap;
  });
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  texture.needsUpdate = true;
  const baseScale = 0.00095;
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
    camera.position.set(9.5, 4.8, 11.5);
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
    controls.target.set(0, 1.4, 0);
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
    const sideOverlayY = 0.18;
    const sideOverlayMargin = 0.08;

    const velocityExplainLabel = createWrappedTextLabelSprite(
      "v: bob velocity (tangent to arc)",
      sideExplainLabelOptions
    );
    velocityExplainLabel.center.set(0.5, 0.5);
    velocityExplainLabel.position.set(0, sideOverlayY, -sideOverlayDepth);
    camera.add(velocityExplainLabel);

    const forceExplainLabel = createWrappedTextLabelSprite(
      "F_t: tangential restoring force",
      sideExplainLabelOptions
    );
    forceExplainLabel.center.set(0.5, 0.5);
    forceExplainLabel.position.set(0, sideOverlayY, -sideOverlayDepth);
    camera.add(forceExplainLabel);

    const updateSideExplainLabelPositions = () => {
      const halfViewHeight =
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * sideOverlayDepth;
      const halfViewWidth = halfViewHeight * camera.aspect;

      velocityExplainLabel.position.set(
        -halfViewWidth + velocityExplainLabel.scale.x * 0.5 + sideOverlayMargin,
        sideOverlayY,
        -sideOverlayDepth
      );
      forceExplainLabel.position.set(
        halfViewWidth - forceExplainLabel.scale.x * 0.5 - sideOverlayMargin,
        sideOverlayY,
        -sideOverlayDepth
      );
    };

    const narrationSprite = createNarrationSprite([
      "Simple Pendulum",
      "Small-angle SHM: T = 2π√(L/g).",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.",
      "Incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam."
    ]);
    narrationSprite.center.set(0.5, 0.5);
    narrationSprite.position.set(0, 1.1, -6.6);
    camera.add(narrationSprite);

    const bottomInfoSprite = createBottomInfoSprite([
      "Status: simulation loaded.",
      "Blue v = bob velocity along the arc.",
      "Red F_t = tangential restoring force.",
      "Watch: turning point -> v ~ 0, equilibrium -> |v| is largest.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed do eiusmod tempor incididunt ut labore et dolore."
    ]);
    bottomInfoSprite.center.set(0.5, 0.5);
    bottomInfoSprite.position.set(0, -2.28, -6.6);
    camera.add(bottomInfoSprite);

    const bottomOverlayDepth = 6.6;
    const bottomOverlayMargin = 0.32;

    const updateBottomInfoPosition = () => {
      const halfViewHeight =
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * bottomOverlayDepth;
      const halfViewWidth = halfViewHeight * camera.aspect;
      const baseScale = bottomInfoSprite.userData.baseScale ?? 0.00095;
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
      updateBottomInfoPosition();
    };
    setRendererSize();

    const resizeObserver = new ResizeObserver(setRendererSize);
    resizeObserver.observe(container);

    const maxAngle = clamp(
      THREE.MathUtils.degToRad(amplitude * 7),
      THREE.MathUtils.degToRad(8),
      THREE.MathUtils.degToRad(35)
    );
    const omega = Math.sqrt(gravity / pendulumLength);
    const quarterStep = Math.PI / 2;
    const pauseDuration = 2.7;
    const minRunDuration = 1.35;
    const physicalQuarterDuration = quarterStep / Math.max(omega, 0.001);
    const playbackTimeScale = Math.min(1, physicalQuarterDuration / minRunDuration);

    let phase = 0;
    let nextCheckpointPhase = quarterStep;
    let checkpointCount = 0;
    let pausedFor = 0;
    let isPaused = false;

    let angle = maxAngle * Math.sin(phase);
    let angleRate = maxAngle * omega * Math.cos(phase);
    let previousTime = performance.now() / 1000;
    let narrationKey = "";
    let bottomInfoKey = "";
    let animationFrameId = 0;

    const lineA = new THREE.Vector3();
    const lineB = new THREE.Vector3();
    const lineC = new THREE.Vector3();
    const bobWorld = new THREE.Vector3();
    const rodMidWorld = new THREE.Vector3();
    const arrowDirection = new THREE.Vector3();
    const tangentDirection = new THREE.Vector3();
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
      "Simple Pendulum",
      "Small-angle SHM: T = 2π√(L/g).",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.",
      "Incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam."
    ]);
    setBottomInfo("intro", [
      "Status: quarter-cycle teaching mode is active.",
      "Blue v = bob velocity along the arc.",
      "Red F_t = tangential restoring force.",
      "Watch: turning point -> v ~ 0, equilibrium -> |v| is largest.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed do eiusmod tempor incididunt ut labore et dolore."
    ]);

    const updateVisuals = () => {
      pendulumGroup.rotation.z = angle;

      bob.getWorldPosition(bobWorld);
      rodMidWorld.set(pivotX, pivotY - pendulumLength * 0.5, pivotZ);
      rodMidWorld.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);

      lineA.set(pivotX, pivotY + 0.25, 0.6);
      lineB.set(rodMidWorld.x, rodMidWorld.y + 0.4, 0.9);
      lineC.set(rodMidWorld.x + 1.2, rodMidWorld.y + 0.4, 0.9);
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
        const forceLength = clamp(0.12 + forceMagnitude * 0.03, 0.18, 1.6);
        arrowDirection.copy(tangentDirection).multiplyScalar(forceDirection || 1);
        forceArrow.position.set(bobWorld.x, bobWorld.y + 0.2, 0.42);
        forceArrow.setDirection(arrowDirection);
        forceArrow.setLength(
          forceLength,
          Math.min(forceLength * 0.32, 0.26),
          Math.min(forceLength * 0.24, 0.18)
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
        const velocityLength = clamp(0.12 + tangentialSpeed * 0.22, 0.16, 1.6);
        const velocityDirection = Math.sign(angleRate);
        arrowDirection.copy(tangentDirection).multiplyScalar(velocityDirection || 1);
        velocityArrow.position.set(bobWorld.x, bobWorld.y - 0.05, -0.42);
        velocityArrow.setDirection(arrowDirection);
        velocityArrow.setLength(
          velocityLength,
          Math.min(velocityLength * 0.3, 0.24),
          Math.min(velocityLength * 0.22, 0.16)
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

      const activeQuarter = isPaused
        ? ((checkpointCount - 1 + 4) % 4) + 1
        : (checkpointCount % 4) + 1;
      const statusText = isPaused
        ? `Status: paused at checkpoint ${activeQuarter}/4.`
        : `Status: moving through quarter ${activeQuarter}/4.`;
      const velocityDirectionText =
        angleRate > 0.02 ? "moving right" : angleRate < -0.02 ? "moving left" : "near turning point";
      const forceDirectionText =
        angle > 0.02
          ? "points left toward equilibrium"
          : angle < -0.02
            ? "points right toward equilibrium"
            : "is near zero at equilibrium";

      const infoKey = `${isPaused ? 1 : 0}|${activeQuarter}|${Math.sign(angleRate)}|${Math.sign(angle)}`;
      setBottomInfo(infoKey, [
        statusText,
        `Blue v = bob velocity (${velocityDirectionText}).`,
        `Red F_t = tangential restoring force (${forceDirectionText}).`,
        "Watch: turning point -> v ~ 0, equilibrium -> |v| is largest.",
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        "Sed do eiusmod tempor incididunt ut labore et dolore."
      ]);
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
        checkpointCount += 1;
        nextCheckpointPhase += quarterStep;
        isPaused = true;
        pausedFor = 0;
      }

      angle = maxAngle * Math.sin(phase);
      angleRate = maxAngle * omega * Math.cos(phase);
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

