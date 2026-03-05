import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const wallWidth = 0.4;
const blockWidth = 1.2;
const wallAnchorX = -4 + wallWidth / 2;
const equilibriumX = 1.6;
const springRadius = 0.22;
const springWireRadius = 0.026;
const springCoils = 14;

const smoothStep = (t) => t * t * (3 - 2 * t);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getSegmentIntro(segmentIndex) {
  if (segmentIndex === 1) {
    return [
      "Segment 1/4: Mean -> +A",
      "Block starts at x_eq with maximum speed.",
      "Spring stretches and slows the block."
    ];
  }
  if (segmentIndex === 2) {
    return [
      "Segment 2/4: +A -> Mean",
      "Force pulls back toward x_eq.",
      "Speed rises while returning."
    ];
  }
  if (segmentIndex === 3) {
    return [
      "Segment 3/4: Mean -> -A",
      "Block passes x_eq and compresses spring.",
      "Restoring force builds opposite to motion."
    ];
  }
  return [
    "Segment 4/4: -A -> Mean",
    "Spring pushes block back toward x_eq.",
    "Cycle ends at mean with max speed again."
  ];
}

function getCheckpointExplanation(checkpointCount) {
  const quarter = ((checkpointCount - 1) % 4) + 1;

  if (quarter === 1) {
    return [
      "Pause at T/4: Maximum Stretch (+A)",
      "Block reached far-right turning point.",
      "v = 0 and spring force is maximum toward x_eq."
    ];
  }
  if (quarter === 2) {
    return [
      "Pause at T/2: Mean Position",
      "Block crossed x_eq moving left at max speed.",
      "Here spring force is near zero momentarily."
    ];
  }
  if (quarter === 3) {
    return [
      "Pause at 3T/4: Maximum Compression (-A)",
      "Block reached far-left turning point.",
      "v = 0 and spring force is maximum toward x_eq."
    ];
  }
  return [
    "Pause at T: Mean Position",
    "One full oscillation is complete.",
    "Block crosses x_eq moving right at max speed."
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

  const fontSize = 34;
  const paddingX = 30;
  const paddingY = 20;
  const lineGap = 7;
  context.font = `700 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;

  context.font = `700 ${fontSize}px "Segoe UI", "Trebuchet MS", sans-serif`;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(15, 23, 42, 0.8)";
  context.lineWidth = 5;
  context.lineJoin = "round";
  context.fillStyle = "#f8fbff";
  context.shadowColor = "rgba(13, 20, 35, 0.65)";
  context.shadowBlur = 4;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 2;
  context.textBaseline = "top";

  const maxTextWidth = lines.reduce((maxWidth, line) => {
    return Math.max(maxWidth, context.measureText(line).width);
  }, 0);
  const startX = Math.max((canvas.width - maxTextWidth) * 0.5, paddingX);

  let y = paddingY;
  lines.forEach((line) => {
    context.strokeText(line, startX, y);
    context.fillText(line, startX, y);
    y += fontSize + lineGap;
  });
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  texture.needsUpdate = true;
  const scale = 0.001;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
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

export default function SpringMassScene({ mass, springConstant, amplitude }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f2f5f9");
    scene.fog = new THREE.Fog("#f2f5f9", 10, 40);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
    camera.position.set(8.5, 4.8, 10.5);
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
    controls.maxDistance = 35;
    controls.target.set(0.6, 0.8, 0);
    controls.rotateSpeed = 0.9;
    controls.panSpeed = 0.95;
    controls.zoomSpeed = 1.0;

    const hemiLight = new THREE.HemisphereLight("#ffffff", "#8ca2c2", 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight("#ffffff", 1.05);
    keyLight.position.set(5, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight("#dfe9ff", 0.55, 50);
    fillLight.position.set(-6, 3, -8);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(44, 0.2, 30),
      new THREE.MeshStandardMaterial({ color: "#d6dde7", roughness: 0.9, metalness: 0.08 })
    );
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(28, 28, "#9aacbe", "#bac8d6");
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

    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wallWidth, 3.6, 3),
      new THREE.MeshStandardMaterial({ color: "#8c9aa6", roughness: 0.85, metalness: 0.12 })
    );
    wall.position.set(-4, 1.8, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    const block = new THREE.Mesh(
      new THREE.BoxGeometry(blockWidth, 1, 1),
      new THREE.MeshStandardMaterial({ color: "#ff8c42", roughness: 0.45, metalness: 0.22 })
    );
    block.position.set(equilibriumX, 0.5, 0);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);

    const spring = new THREE.Mesh(
      createUnitSpringGeometry(),
      new THREE.MeshStandardMaterial({ color: "#f6f7f9", roughness: 0.27, metalness: 0.72 })
    );
    spring.castShadow = true;
    spring.position.set(wallAnchorX, 0.5, 0);
    scene.add(spring);

    const anchorMaterial = new THREE.MeshStandardMaterial({
      color: "#2f333b",
      roughness: 0.3,
      metalness: 0.85
    });
    const wallAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), anchorMaterial);
    wallAnchor.position.set(wallAnchorX, 0.5, 0);
    scene.add(wallAnchor);

    const blockAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), anchorMaterial);
    scene.add(blockAnchor);

    const blockLabel = createTextLabelSprite("block");
    const springLabel = createTextLabelSprite("spring");
    const massLabel = createTextLabelSprite("mass");
    blockLabel.center.set(0, 0.5);
    springLabel.center.set(0, 0.5);
    massLabel.center.set(0, 0.5);
    scene.add(blockLabel);
    scene.add(springLabel);
    scene.add(massLabel);

    const blockLeader = createLeaderLine();
    const springLeader = createLeaderLine();
    const massLeader = createLeaderLine();
    scene.add(blockLeader);
    scene.add(springLeader);
    scene.add(massLeader);

    const equilibriumMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.15, 14),
      new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.65, metalness: 0.2 })
    );
    equilibriumMarker.position.set(equilibriumX, 0.58, -0.82);
    scene.add(equilibriumMarker);

    const eqLabel = createTextLabelSprite("x_eq");
    eqLabel.center.set(0.5, 0.5);
    eqLabel.scale.multiplyScalar(0.68);
    eqLabel.position.set(equilibriumX, 1.4, -0.82);
    scene.add(eqLabel);

    const forceArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(equilibriumX, 1.18, 0.42),
      0.4,
      "#dc2626"
    );
    configureArrowOverlay(forceArrow);
    scene.add(forceArrow);

    const velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(equilibriumX, 0.86, -0.42),
      0.4,
      "#2563eb"
    );
    configureArrowOverlay(velocityArrow);
    scene.add(velocityArrow);

    const forceLabel = createTextLabelSprite("F_s");
    forceLabel.center.set(0, 0.5);
    forceLabel.scale.multiplyScalar(0.58);
    scene.add(forceLabel);

    const velocityLabel = createTextLabelSprite("v");
    velocityLabel.center.set(0, 0.5);
    velocityLabel.scale.multiplyScalar(0.58);
    scene.add(velocityLabel);

    const narrationSprite = createNarrationSprite(getSegmentIntro(1));
    narrationSprite.center.set(0.5, 0.5);
    narrationSprite.position.set(0, 1.1, -6.6);
    camera.add(narrationSprite);

    const axisHelper = new THREE.AxesHelper(2.6);
    axisHelper.position.set(-5.6, 0.01, -2.2);
    scene.add(axisHelper);

    const setRendererSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    setRendererSize();

    const resizeObserver = new ResizeObserver(setRendererSize);
    resizeObserver.observe(container);

    const omega = Math.sqrt(springConstant / mass);
    const quarterStep = Math.PI / 2;
    const pauseDuration = 1.85;

    let theta = 0;
    let nextCheckpointTheta = quarterStep;
    let checkpointCount = 0;
    let pausedFor = 0;
    let isPaused = false;

    let positionX = equilibriumX + amplitude * Math.sin(theta);
    let velocityX = amplitude * omega * Math.cos(theta);
    let previousTime = performance.now() / 1000;
    let narrationKey = "";
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

    setNarration("segment-1", getSegmentIntro(1));

    const updateVisuals = () => {
      block.position.x = positionX;
      const blockAnchorX = positionX - blockWidth / 2;
      blockAnchor.position.set(blockAnchorX, 0.5, 0);

      const currentLength = Math.max(blockAnchorX - wallAnchorX, 0.45);
      spring.scale.set(currentLength, 1, 1);

      lineA.set(-4, 1.8, 0.55);
      lineB.set(-4, 2.95, 0.82);
      lineC.set(-2.9, 2.95, 0.82);
      blockLabel.position.copy(lineC);
      updateLeaderLine(blockLeader, lineA, lineB, lineC);

      const springCenterX = wallAnchorX + currentLength * 0.5;
      lineA.set(springCenterX, 0.62, 0.0);
      lineB.set(springCenterX + 0.8, 2.38, 0.96);
      lineC.set(springCenterX + 1.98, 2.38, 0.96);
      springLabel.position.copy(lineC);
      updateLeaderLine(springLeader, lineA, lineB, lineC);

      lineA.set(positionX, 0.95, 0.5);
      lineB.set(positionX + 0.35, 1.95, 0.84);
      lineC.set(positionX + 1.25, 1.95, 0.84);
      massLabel.position.copy(lineC);
      updateLeaderLine(massLeader, lineA, lineB, lineC);

      const displacement = positionX - equilibriumX;
      const forceX = -springConstant * displacement;

      const forceMagnitude = Math.abs(forceX);
      if (forceMagnitude > 0.02) {
        const forceDirection = Math.sign(forceX);
        const forceLength = clamp(0.1 + forceMagnitude * 0.07, 0.18, 1.85);
        arrowDirection.set(forceDirection, 0, 0);
        forceArrow.position.set(positionX, 1.18, 0.42);
        forceArrow.setDirection(arrowDirection);
        forceArrow.setLength(
          forceLength,
          Math.min(forceLength * 0.32, 0.26),
          Math.min(forceLength * 0.24, 0.18)
        );
        forceArrow.visible = true;
        forceLabel.visible = true;
        forceLabel.position.set(positionX + forceDirection * (forceLength + 0.22), 1.34, 0.46);
      } else {
        forceArrow.visible = false;
        forceLabel.visible = false;
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

    };
    updateVisuals();

    const stepSimulation = (deltaTime) => {
      const dt = Math.min(deltaTime, 0.05);

      if (isPaused) {
        pausedFor += dt;
        if (pausedFor >= pauseDuration) {
          isPaused = false;
          pausedFor = 0;
          const nextSegment = (checkpointCount % 4) + 1;
          setNarration(`segment-${checkpointCount + 1}`, getSegmentIntro(nextSegment));
        }
        return;
      }

      theta += omega * dt;
      if (theta >= nextCheckpointTheta) {
        theta = nextCheckpointTheta;
        checkpointCount += 1;
        nextCheckpointTheta += quarterStep;
        isPaused = true;
        pausedFor = 0;
        setNarration(`pause-${checkpointCount}`, getCheckpointExplanation(checkpointCount));
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
