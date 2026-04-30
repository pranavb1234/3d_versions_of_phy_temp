import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import SpringMassScene from "./components/SpringMassScene";
import DoubleSpringMassScene from "./components/DoubleSpringMassScene";
import PendulumScene from "./components/PendulumScene";
import WaveDisplacementScene from "./components/WaveDisplacementScene";
import WaveStaticMarkersScene from "./components/WaveStaticMarkersScene";
import WaveCompareScene from "./components/WaveCompareScene";
import WaveStandingScene from "./components/WaveStandingScene";
import RefractionScene from "./components/RefractionScene";
import MirrorFormulaScene from "./components/MirrorFormulaScene";
import TemplateResourcesPanel from "./components/TemplateResourcesPanel";

export default function App({
  onBackToHome,
  initialChapterId = "oscillations",
  initialSimulationId = "single"
}) {
  const validChapters = ["oscillations", "waves", "optics"];
  const validOscillationSimulations = ["single", "double", "pendulum"];
  const validWaveSimulations = ["static_markers", "compare", "standing"];
  const validOpticsSimulations = ["refraction", "mirror_formula"];
  const normalizedInitialChapterId = validChapters.includes(initialChapterId)
    ? initialChapterId
    : "oscillations";

  const [mass, setMass] = useState(1.0);
  const [springConstant, setSpringConstant] = useState(15.0);
  const [amplitude, setAmplitude] = useState(3.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [templateId, setTemplateId] = useState(() => {
    if (
      normalizedInitialChapterId === "oscillations" &&
      validOscillationSimulations.includes(initialSimulationId)
    ) {
      return initialSimulationId;
    }
    return "single";
  });
  const [chapterId, setChapterId] = useState(normalizedInitialChapterId);
  const [waveSimId, setWaveSimId] = useState(() => {
    if (
      normalizedInitialChapterId === "waves" &&
      validWaveSimulations.includes(initialSimulationId)
    ) {
      return initialSimulationId;
    }
    return "static_markers";
  });
  const [opticsSimId, setOpticsSimId] = useState(() => {
    if (
      normalizedInitialChapterId === "optics" &&
      validOpticsSimulations.includes(initialSimulationId)
    ) {
      return initialSimulationId;
    }
    return "refraction";
  });
  const [activeParamInfo, setActiveParamInfo] = useState(null);
  const [activeCalc, setActiveCalc] = useState(null);
  const [activeEffectKey, setActiveEffectKey] = useState(null);
  const [canvasNotice, setCanvasNotice] = useState(null);
  const [isResourcesPanelOpen, setIsResourcesPanelOpen] = useState(false);
  const [showTourIntro, setShowTourIntro] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(null);
  const [tourSpotlight, setTourSpotlight] = useState(null);
  const [tourTooltip, setTourTooltip] = useState(null);
  const tourTargetRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const prevParamsRef = useRef({
    mass,
    springConstant,
    amplitude,
    templateId
  });

  const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));
  const nudgeValue = (value, delta, min, max) => clampValue(value + delta, min, max);
  const formatValue = (value, precision = 1) => {
    const fixed = value.toFixed(precision);
    return precision > 0 ? fixed.replace(/\.0$/, "") : fixed;
  };
  const formatNumber = (value, digits = 2) => {
    const safe = Number.isFinite(value) ? value : 0;
    const fixed = safe.toFixed(digits);
    return fixed.replace(/\.00$/, "");
  };
  const toRad = (deg) => (deg * Math.PI) / 180;
  const paramInfo = useMemo(
    () => ({
      mass:
        "Mass (m) is the inertia of the block. Larger m means slower oscillations and a longer period.",
      springConstant:
        "Spring constant (k) measures stiffness. Larger k means faster oscillations and a shorter period.",
      amplitude:
        "Amplitude (A) is the starting displacement from equilibrium. Larger A increases max speed and energy.",
      amplitudePendulum:
        "Max angle (theta_0) is the starting angular displacement. Larger theta_0 increases speed and energy; period changes only slightly for small angles."
    }),
    []
  );
  const pendulumTheta0Deg = useMemo(() => {
    if (templateId !== "pendulum") {
      return null;
    }
    return clampValue(amplitude * 7, 8, 35);
  }, [templateId, amplitude]);
  const tourSteps = useMemo(
    () => [
      {
        id: "calculations",
        title: "Calculations Panel",
        text: "Open any row to see the math for the current setup.",
        selector: "[data-tour='calculations']"
      },
      {
        id: "scene",
        title: "Simulation Viewer",
        text: "This is the live motion canvas. The visuals update as you change inputs.",
        selector: "[data-tour='scene']"
      },
      {
        id: "template",
        title: "Simulation Selector",
        text: "Pick the simulation for the current chapter from the top bar.",
        selector: "[data-tour='template']"
      },
      {
        id: "parameters",
        title: "Parameters",
        text: "Nudge the sliders to explore mass, spring constant, and amplitude.",
        selector: "[data-tour='parameters']"
      },
      {
        id: "insights",
        title: "What To Notice",
        text: "Quick takeaways update based on the active template.",
        selector: "[data-tour='insights']"
      }
    ],
    []
  );

  const chapterConfig = useMemo(
    () => ({
      oscillations: { label: "Oscillations" },
      waves: { label: "Waves" },
      optics: { label: "Optics" }
    }),
    []
  );

  const waveSimConfig = useMemo(
    () => ({
      static_markers: {
        label: "Wave Markers (Static)",
        title: "Wave Parameters on a Static Snapshot",
        description:
          "A still wave snapshot with labeled parameters. Click blocks on the right to highlight each parameter.",
        Scene: WaveStaticMarkersScene
      },
      /*
      displacement: {
        label: "Displacement y(x,t)",
        title: "Displacement in a Progressive Wave",
        description:
          "See how a traveling wave depends on both position and time, and how any single particle performs SHM.",
        Scene: WaveDisplacementScene
      },
      */
      compare: {
        label: "Transverse vs Longitudinal",
        title: "Transverse and Longitudinal Waves",
        description:
          "One combined view: transverse wave on top, longitudinal wave below, using the same parameters.",
        Scene: WaveCompareScene
      },
      standing: {
        label: "Standing Waves on a String",
        title: "Standing Waves on a String",
        description:
          "Explore how a fixed string forms nodes and antinodes. Adjust L, T, f, and the harmonic mode.",
        Scene: WaveStandingScene
      }
    }),
    []
  );

  const templateConfig = useMemo(
    () => ({
      single: {
        label: "Single Spring-Mass",
        title: "Spring-Mass Oscillation",
        description:
          "Undamped simple harmonic motion where the wall-fixed spring pulls a movable block via Hooke's Law and Newton's Second Law.",
        fixedText: "Fixed for now: m = 1.0 kg, k = 15.0 N/m, A = 3.0 m",
        legend: [
          "k: spring constant",
          "omega: angular frequency",
          "Blue: velocity v",
          "Red: restoring force F",
          "x: displacement from equilibrium",
          "A: amplitude"
        ],
        symbolGuide: [
          {
            symbol: "m",
            label: "Mass",
            description:
              "Inertia of the moving block. Higher mass lowers angular frequency and increases period.",
            descriptionLatex: "\\omega = \\sqrt{\\frac{k}{m}}"
          },
          {
            symbol: "k",
            label: "Spring Constant",
            description:
              "Stiffness of the spring. Higher k increases angular frequency and shortens period.",
            descriptionLatex: "\\omega = \\sqrt{\\frac{k}{m}}"
          },
          {
            symbol: "x",
            label: "Displacement",
            description:
              "Instantaneous position from equilibrium. Positive x is to the right, negative x is to the left."
          },
          {
            symbol: "A",
            label: "Amplitude",
            description:
              "Maximum displacement from equilibrium. It sets the motion range and total energy.",
            descriptionLatex: "|x|_{\\max} = A"
          },
          {
            symbol: "\\omega",
            label: "Angular Frequency",
            description:
              "Rate of oscillation in rad/s.",
            descriptionLatex: "\\omega = \\sqrt{\\frac{k}{m}}"
          },
          {
            symbol: "T",
            label: "Time Period",
            description:
              "Time for one full oscillation cycle.",
            descriptionLatex: "T = 2\\pi\\sqrt{\\frac{m}{k}}"
          },
          {
            symbol: "v",
            label: "Velocity",
            description:
              "Blue arrow in the scene. The instantaneous rate of change of displacement.",
            descriptionLatex: "v = \\frac{dx}{dt}"
          },
          {
            symbol: "F",
            label: "Restoring Force",
            description:
              "Red arrow in the scene. The force exerted by the system that always acts to bring the object back toward the equilibrium position.",
            descriptionLatex: "F = -kx"
          }
        ],
        Scene: SpringMassScene
      },
      double: {
        label: "Double Spring-Mass",
        title: "Double Spring-Mass Experiment",
        description:
          "Two springs pull the mass back to center from both sides, making the restoring force stronger than a single spring.",
        fixedText: "Fixed for now: m = 1.0 kg, k = 15.0 N/m (each), A = 3.0 m",
        legend: [
          "v: block velocity (blue arrow)",
          "Red arrow: left spring restoring force (F_L)",
          "Green arrow: right spring restoring force (F_R)",
          "k: spring constant",
          "omega: angular frequency of oscillation",
          "T: time period to complete one oscillation",
          "A: amplitude",
          "x: displacement from equilibrium"
        ],
        symbolGuide: [
          {
            symbol: "m",
            label: "Mass",
            description:
              "Inertia of the block. Increasing mass reduces angular frequency and increases period.",
            descriptionLatex: "\\omega = \\sqrt{\\frac{k_{eff}}{m}}"
          },
          {
            symbol: "k",
            label: "Spring Constant",
            description:
              "Stiffness of each spring in the setup.",
            descriptionLatex: "k_{eff} = 2k"
          },
          {
            symbol: "k_{eff}",
            label: "Effective Spring Constant",
            description:
              "Net stiffness of the two-spring system.",
            descriptionLatex: "k_{eff} = 2k"
          },
          {
            symbol: "x",
            label: "Displacement",
            description:
              "Position from equilibrium. Both springs act to restore the block toward the center."
          },
          {
            symbol: "A",
            label: "Amplitude",
            description:
              "Maximum displacement from equilibrium.",
            descriptionLatex: "|x|_{\\max} = A"
          },
          {
            symbol: "\\omega",
            label: "Angular Frequency",
            description:
              "Rate of oscillation in rad/s.",
            descriptionLatex: "\\omega = \\sqrt{\\frac{k_{eff}}{m}}"
          },
          {
            symbol: "T",
            label: "Time Period",
            description:
              "Duration of one full oscillation cycle.",
            descriptionLatex: "T = 2\\pi\\sqrt{\\frac{m}{k_{eff}}}"
          },
          {
            symbol: "v",
            label: "Velocity",
            description:
              "Blue arrow in the scene. Instantaneous speed and direction of the block.",
            descriptionLatex: "v = \\frac{dx}{dt}"
          },
          {
            symbol: "F_L",
            label: "Left Spring Force",
            description:
              "Red arrow in the scene. Restoring force contribution from the left spring.",
            descriptionLatex: "F_{net} = F_L + F_R = -k_{eff}x"
          },
          {
            symbol: "F_R",
            label: "Right Spring Force",
            description:
              "Green arrow in the scene. Restoring force contribution from the right spring.",
            descriptionLatex: "F_{net} = F_L + F_R = -k_{eff}x"
          }
        ],
        Scene: DoubleSpringMassScene
      },
      pendulum: {
        label: "Simple Pendulum",
        title: "Simple Pendulum Oscillation",
        description:
          "Small-angle pendulum motion where a bob swings about equilibrium under gravity with a rigid support.",
        fixedText: "Fixed for now: m = 1.0 kg, L = 2.8 m, θ_max = 21 deg",
        legend: [
          "L: string length",
          "theta: angular displacement",
          "theta0: maximum angle",
          "omega: angular frequency",
          "T: time period",
          "Blue arrow: v - bob velocity (tangent to arc)",
          "Red arrow: F_t - tangential restoring force"
        ],
        symbolGuide: [
          {
            symbol: "m",
            label: "Mass",
            description:
              "Mass of the bob. In the small-angle model, it does not affect period.",
            descriptionLatex: ""
          },
          {
            symbol: "L",
            label: "Length",
            description:
              "Distance from pivot to bob. A longer pendulum oscillates more slowly.",
            descriptionLatex: ""
          },
          {
            symbol: "\\theta",
            label: "Angular Displacement",
            description:
              "Instantaneous angular position from the equilibrium direction.",
            descriptionLatex: "\\theta(t) = \\theta_0\\cos(\\omega t)"
          },
          {
            symbol: "\\theta_0",
            label: "Maximum Angle",
            description:
              "Peak angular displacement (amplitude of angular oscillation).",
            descriptionLatex: "|\\theta|_{\\max} = \\theta_0"
          },
          {
            symbol: "\\omega",
            label: "Angular Frequency",
            description:
              "Rate of oscillation in rad/s for small angles.",
            descriptionLatex: "\\omega = \\sqrt{\\frac{g}{L}}"
          },
          {
            symbol: "T",
            label: "Time Period",
            description:
              "Time for one complete oscillation.",
            descriptionLatex: "T = 2\\pi\\sqrt{\\frac{L}{g}}"
          },
          {
            symbol: "v",
            label: "Bob Velocity",
            description:
              "Blue arrow in the scene. Tangential velocity of the bob along the arc.",
            descriptionLatex: "v = L\\frac{d\\theta}{dt}"
          },
          {
            symbol: "F_t",
            label: "Tangential Restoring Force",
            description:
              "Red arrow in the scene. Tangential component of gravity that drives oscillation.",
            descriptionLatex: "F_t = -mg\\sin\\theta\\;\\approx\\;-mg\\theta"
          }
        ],
        Scene: PendulumScene
      }
    }),
    []
  );

  const isOscillationChapter = chapterId === "oscillations";
  const isWavesChapter = chapterId === "waves";
  const isOpticsChapter = chapterId === "optics";
  const opticsSimConfig = useMemo(
    () => ({
      refraction: {
        label: "Refraction (Snell's Law)",
        title: "Refraction Through Media Boundary",
        description:
          "Drag the incident ray or use controls to explore Snell's law, bending direction, and total internal reflection.",
        Scene: RefractionScene
      },
      mirror_formula: {
        label: "Spherical Mirrors",
        title: "Mirror Formula Visualizer",
        description:
          "Interactive ray diagram for concave and convex mirrors with live mirror-formula values and image nature.",
        Scene: MirrorFormulaScene
      }
    }),
    []
  );
  const chapterSimConfig = isWavesChapter
    ? waveSimConfig
    : isOpticsChapter
    ? opticsSimConfig
    : null;
  const activeChapterSimId = isWavesChapter ? waveSimId : isOpticsChapter ? opticsSimId : null;
  const activeChapterSim =
    (chapterSimConfig && activeChapterSimId && chapterSimConfig[activeChapterSimId]) ?? {
      label: "Simulation"
    };
  const ActiveChapterScene = activeChapterSim.Scene;
  const activeTemplate = templateConfig[templateId] ?? templateConfig.single;
  const ActiveScene = activeTemplate.Scene;
  const legendItems = useMemo(() => {
    const items = activeTemplate.legend ?? [];
    return items.map((label) => {
      const normalized = label.toLowerCase();
      let tone = "";
      if (normalized.includes("blue")) {
        tone = "legend-blue";
      } else if (normalized.includes("red")) {
        tone = "legend-red";
      } else if (normalized.includes("green")) {
        tone = "legend-green";
      }
      return { key: label, label, tone };
    });
  }, [activeTemplate.legend]);
  const symbolGuideItems = useMemo(
    () => activeTemplate.symbolGuide ?? [],
    [activeTemplate.symbolGuide]
  );
  const calculations = useMemo(() => {
    const safeMass = Math.max(mass, 0.001);
    const safeK = Math.max(springConstant, 0.001);
    const safeA = Math.max(amplitude, 0.001);

    if (templateId === "double") {
      const kEff = 2 * safeK;
      const omega = Math.sqrt(kEff / safeMass);
      const period = 2 * Math.PI * Math.sqrt(safeMass / kEff);
      const vMax = omega * safeA;
      const aMax = omega * omega * safeA;
      const energy = 0.5 * kEff * safeA * safeA;
      const massVal = formatNumber(safeMass);
      const kVal = formatNumber(safeK);
      const aVal = formatNumber(safeA);
      const kEffVal = formatNumber(kEff);
      const omegaVal = formatNumber(omega);
      const periodVal = formatNumber(period);
      const vMaxVal = formatNumber(vMax);
      const aMaxVal = formatNumber(aMax);
      const energyVal = formatNumber(energy);
      return {
        title: "Calculations",
        rows: [
          {
            title: "Effective Spring Constant",
            latex: "k_{eff} = 2k",
            value: `${kEffVal} N/m`,
            valueLatex: `${kEffVal}\\,\\text{N/m}`,
            detail:
              "Two springs act together, so their stiffness adds. We use this in angular frequency, period, and energy.",
            detailLatex: "k_{eff} = 2k",
            steps: [
              "k_{eff} = 2k",
              `k_{eff} = 2 \\times ${kVal}`,
              `k_{eff} = ${kEffVal}\\,\\text{N/m}`
            ]
          },
          {
            title: "Angular Frequency",
            latex: "\\omega = \\sqrt{\\frac{k_{eff}}{m}}",
            value: `${omegaVal} rad/s`,
            valueLatex: `${omegaVal}\\,\\text{rad/s}`,
            detail:
              "Angular frequency sets how fast the oscillation happens. Larger effective stiffness increases it; larger mass decreases it.",
            detailLatex: "\\omega = \\sqrt{\\frac{k_{eff}}{m}}",
            steps: [
              "\\omega = \\sqrt{\\frac{k_{eff}}{m}}",
              `\\omega = \\sqrt{\\frac{${kEffVal}}{${massVal}}}`,
              `\\omega = ${omegaVal}\\,\\text{rad/s}`
            ]
          },
          {
            title: "Period",
            latex: "T = 2\\pi\\sqrt{\\frac{m}{k_{eff}}}",
            value: `${periodVal} s`,
            valueLatex: `${periodVal}\\,\\text{s}`,
            detail: "Time for one full oscillation.",
            detailLatex: "T = \\frac{2\\pi}{\\omega}",
            steps: [
              "T = 2\\pi\\sqrt{\\frac{m}{k_{eff}}}",
              `T = 2\\pi\\sqrt{\\frac{${massVal}}{${kEffVal}}}`,
              `T = ${periodVal}\\,\\text{s}`
            ]
          },
          {
            title: "Displacement",
            latex: "x(t) = A\\sin(\\omega t)",
            detail:
              "Position as a function of time. The sine form assumes x(0) = 0 and peaks at +/-A.",
            steps: [
              "x(t) = A\\sin(\\omega t)",
              `x(t) = ${aVal}\\sin(${omegaVal} t)`
            ]
          },
          {
            title: "Maximum Speed",
            latex: "v_{max} = \\omega A",
            value: `${vMaxVal} m/s`,
            valueLatex: `${vMaxVal}\\,\\text{m/s}`,
            detail: "Maximum speed occurs at the center (equilibrium).",
            steps: [
              "v_{max} = \\omega A",
              `v_{max} = ${omegaVal} \\times ${aVal}`,
              `v_{max} = ${vMaxVal}\\,\\text{m/s}`
            ]
          },
          {
            title: "Maximum Acceleration",
            latex: "a_{max} = \\omega^2 A",
            value: `${aMaxVal} m/s^2`,
            valueLatex: `${aMaxVal}\\,\\text{m/s}^2`,
            detail: "Maximum acceleration occurs at the extremes (x = +/-A).",
            steps: [
              "a_{max} = \\omega^2 A",
              `a_{max} = (${omegaVal})^2 \\times ${aVal}`,
              `a_{max} = ${aMaxVal}\\,\\text{m/s^2}`
            ]
          },
          {
            title: "Total Energy",
            latex: "E = \\frac{1}{2}k_{eff}A^2",
            value: `${energyVal} J`,
            valueLatex: `${energyVal}\\,\\text{J}`,
            detail: "Total mechanical energy for the ideal system is constant.",
            steps: [
              "E = \\frac{1}{2}k_{eff}A^2",
              `E = \\frac{1}{2} \\times ${kEffVal} \\times (${aVal})^2`,
              `E = ${energyVal}\\,\\text{J}`
            ]
          }
        ]
      };
    }

    if (templateId === "pendulum") {
      const length = 2.8;
      const g = 9.81;
      const theta0Deg = clampValue(amplitude * 7, 8, 35);
      const theta0 = toRad(theta0Deg);
      const omega = Math.sqrt(g / length);
      const period = 2 * Math.PI * Math.sqrt(length / g);
      const vMax = omega * length * theta0;
      const energy = 0.5 * safeMass * length * length * omega * omega * theta0 * theta0;
      const lengthVal = formatNumber(length);
      const gVal = formatNumber(g);
      const massVal = formatNumber(safeMass);
      const theta0Val = formatNumber(theta0, 3);
      const theta0DegVal = formatNumber(theta0Deg, 1);
      const omegaVal = formatNumber(omega);
      const periodVal = formatNumber(period);
      const vMaxVal = formatNumber(vMax);
      const energyVal = formatNumber(energy);
      return {
        title: "Calculations",
        rows: [
          {
            title: "Angular Frequency",
            latex: "\\omega = \\sqrt{\\frac{g}{L}}",
            value: `${omegaVal} rad/s`,
            valueLatex: `${omegaVal}\\,\\text{rad/s}`,
            detail: "Small-angle approximation: angular frequency depends on gravity and length.",
            detailLatex: "\\omega = \\sqrt{\\frac{g}{L}}",
            steps: [
              "\\omega = \\sqrt{\\frac{g}{L}}",
              `\\omega = \\sqrt{\\frac{${gVal}}{${lengthVal}}}`,
              `\\omega = ${omegaVal}\\,\\text{rad/s}`
            ]
          },
          {
            title: "Period",
            latex: "T = 2\\pi\\sqrt{\\frac{L}{g}}",
            value: `${periodVal} s`,
            valueLatex: `${periodVal}\\,\\text{s}`,
            detail: "Time for one swing cycle. Mass does not affect T (small-angle).",
            detailLatex: "T = 2\\pi\\sqrt{\\frac{L}{g}}",
            steps: [
              "T = 2\\pi\\sqrt{\\frac{L}{g}}",
              `T = 2\\pi\\sqrt{\\frac{${lengthVal}}{${gVal}}}`,
              `T = ${periodVal}\\,\\text{s}`
            ]
          },
          {
            title: "Maximum Angle",
            latex: "\\theta_0",
            value: `${theta0Val} rad (${theta0DegVal} deg)`,
            valueLatex: `${theta0Val}\\,\\text{rad}\\;(${theta0DegVal}^{\\circ})`,
            detail:
              "Peak angular displacement derived from the amplitude control and clamped for small angles.",
            detailLatex: "|\\theta|_{\\max} = \\theta_0",
            steps: [
              `\\theta_0 = ${theta0DegVal}^{\\circ}`,
              `\\theta_0 = ${theta0Val}\\,\\text{rad}`
            ]
          },
          {
            title: "Angular Position",
            latex: "\\theta(t) = \\theta_0\\cos(\\omega t)",
            detail: "Angle as a function of time for small-angle SHM.",
            detailLatex: "\\theta(t) = \\theta_0\\cos(\\omega t)",
            steps: [
              "\\theta(t) = \\theta_0\\cos(\\omega t)",
              `\\theta(t) = ${theta0Val}\\cos(${omegaVal} t)`
            ]
          },
          {
            title: "Maximum Speed",
            latex: "v_{max} = \\omega L\\theta_0",
            value: `${vMaxVal} m/s`,
            valueLatex: `${vMaxVal}\\,\\text{m/s}`,
            detail: "Maximum speed occurs at the bottom of the swing.",
            detailLatex: "v_{max} = \\omega L\\theta_0",
            steps: [
              "v_{max} = \\omega L\\theta_0",
              `v_{max} = ${omegaVal} \\times ${lengthVal} \\times ${theta0Val}`,
              `v_{max} = ${vMaxVal}\\,\\text{m/s}`
            ]
          },
          {
            title: "Total Energy",
            latex: "E = \\frac{1}{2}mL^2\\omega^2\\theta_0^2",
            value: `${energyVal} J`,
            valueLatex: `${energyVal}\\,\\text{J}`,
            detail: "Total energy for the small-angle pendulum model.",
            detailLatex: "E = \\frac{1}{2}mL^2\\omega^2\\theta_0^2",
            steps: [
              "E = \\frac{1}{2}mL^2\\omega^2\\theta_0^2",
              `E = \\frac{1}{2} \\times ${massVal} \\times (${lengthVal})^2 \\times (${omegaVal})^2 \\times (${theta0Val})^2`,
              `E = ${energyVal}\\,\\text{J}`
            ]
          }
        ]
      };
    }

    const omega = Math.sqrt(safeK / safeMass);
    const period = 2 * Math.PI * Math.sqrt(safeMass / safeK);
    const vMax = omega * safeA;
    const aMax = omega * omega * safeA;
    const energy = 0.5 * safeK * safeA * safeA;
    const massVal = formatNumber(safeMass);
    const kVal = formatNumber(safeK);
    const aVal = formatNumber(safeA);
    const omegaVal = formatNumber(omega);
    const periodVal = formatNumber(period);
    const vMaxVal = formatNumber(vMax);
    const aMaxVal = formatNumber(aMax);
    const energyVal = formatNumber(energy);
    return {
      title: "Calculations",
      rows: [
        {
          title: "Given Values",
          latex: `\\text{Given } m = ${massVal}\\,\\text{kg},\\; k = ${kVal}\\,\\text{N/m},\\; A = ${aVal}\\,\\text{m}`,
          detail: `Using the current parameters: m = ${massVal} kg, k = ${kVal} N/m, A = ${aVal} m.`,
          steps: [
            `m = ${massVal}\\,\\text{kg}`,
            `k = ${kVal}\\,\\text{N/m}`,
            `A = ${aVal}\\,\\text{m}`
          ]
        },
        {
          title: "Angular Frequency",
          latex: "\\omega = \\sqrt{\\frac{k}{m}}",
          value: `${omegaVal} rad/s`,
          valueLatex: `${omegaVal}\\,\\text{rad/s}`,
          detail:
            "Angular frequency sets how fast the oscillation happens. Larger stiffness increases it; larger mass decreases it.",
          detailLatex: "\\omega = \\sqrt{\\frac{k}{m}}",
          steps: [
            "\\omega = \\sqrt{\\frac{k}{m}}",
            `\\omega = \\sqrt{\\frac{${kVal}}{${massVal}}}`,
            `\\omega = ${omegaVal}\\,\\text{rad/s}`
          ]
        },
        {
          title: "Period",
          latex: "T = 2\\pi\\sqrt{\\frac{m}{k}}",
          value: `${periodVal} s`,
          valueLatex: `${periodVal}\\,\\text{s}`,
          detail: "Time for one full oscillation.",
          detailLatex: "T = \\frac{2\\pi}{\\omega}",
          steps: [
            "T = 2\\pi\\sqrt{\\frac{m}{k}}",
            `T = 2\\pi\\sqrt{\\frac{${massVal}}{${kVal}}}`,
            `T = ${periodVal}\\,\\text{s}`
          ]
        },
        {
          title: "Displacement",
          latex: "x(t) = A\\sin(\\omega t)",
          detail:
            "Position as a function of time. The sine form assumes x(0) = 0 and peaks at +/-A.",
          steps: [
            "x(t) = A\\sin(\\omega t)",
            `x(t) = ${aVal}\\sin(${omegaVal} t)`
          ]
        },
        {
          title: "Velocity",
          latex: "v(t) = A\\omega\\cos(\\omega t)",
          detail: "Velocity is the time-derivative of displacement.",
          detailLatex: "v(t) = \\frac{dx}{dt}",
          steps: [
            "v(t) = A\\omega\\cos(\\omega t)",
            `v(t) = ${aVal} \\times ${omegaVal}\\cos(${omegaVal} t)`
          ]
        },
        {
          title: "Acceleration",
          latex: "a(t) = -A\\omega^2\\sin(\\omega t)",
          detail: "Acceleration is the time-derivative of velocity.",
          detailLatex: "a(t) = \\frac{dv}{dt} = -\\omega^2 x(t)",
          steps: [
            "a(t) = -A\\omega^2\\sin(\\omega t)",
            `a(t) = -${aVal}(${omegaVal})^2\\sin(${omegaVal} t)`
          ]
        },
        {
          title: "Maximum Speed",
          latex: "v_{max} = \\omega A",
          value: `${vMaxVal} m/s`,
          valueLatex: `${vMaxVal}\\,\\text{m/s}`,
          detail: "Maximum speed occurs at the center (equilibrium).",
          steps: [
            "v_{max} = \\omega A",
            `v_{max} = ${omegaVal} \\times ${aVal}`,
            `v_{max} = ${vMaxVal}\\,\\text{m/s}`
          ]
        },
        {
          title: "Maximum Acceleration",
          latex: "a_{max} = \\omega^2 A",
          value: `${aMaxVal} m/s^2`,
          valueLatex: `${aMaxVal}\\,\\text{m/s}^2`,
          detail: "Maximum acceleration occurs at the extremes (x = +/-A).",
          steps: [
            "a_{max} = \\omega^2 A",
            `a_{max} = (${omegaVal})^2 \\times ${aVal}`,
            `a_{max} = ${aMaxVal}\\,\\text{m/s^2}`
          ]
        },
        {
          title: "Total Energy",
          latex: "E = \\frac{1}{2}kA^2",
          value: `${energyVal} J`,
          valueLatex: `${energyVal}\\,\\text{J}`,
          detail: "Total mechanical energy for the ideal system is constant.",
          steps: [
            "E = \\frac{1}{2}kA^2",
            `E = \\frac{1}{2} \\times ${kVal} \\times (${aVal})^2`,
            `E = ${energyVal}\\,\\text{J}`
          ]
        }
      ]
    };
  }, [templateId, mass, springConstant, amplitude]);

  const effects = useMemo(() => {
    if (templateId === "pendulum") {
      return [
        {
          key: "mass",
          text: "Mass does not change the period (small-angle); it changes energy."
        },
        {
          key: "amplitude",
          text: "Increasing max angle raises max speed and energy; period stays nearly the same."
        },
        {
          key: "system",
          text: "Length and gravity set omega and the period in this model."
        }
      ];
    }
    if (templateId === "double") {
      return [
        {
          key: "mass",
          text: "Increasing mass decreases omega, so the period increases."
        },
        {
          key: "springConstant",
          text: "Increasing k raises omega and shortens the period (effective stiffness is 2k)."
        },
        {
          key: "amplitude",
          text: "Increasing amplitude increases max speed and total energy; period stays the same."
        }
      ];
    }
    return [
      {
        key: "mass",
        text: "Increasing mass decreases omega, so the period increases."
      },
      {
        key: "springConstant",
        text: "Increasing k raises omega and shortens the period."
      },
      {
        key: "amplitude",
        text: "Increasing amplitude increases max speed and total energy; period stays the same."
      }
    ];
  }, [templateId]);

  const effectMessages = useMemo(
    () => ({
      single: {
        mass: {
          up: "Increasing mass decreases omega, so the period increases.",
          down: "Decreasing mass increases omega, so the period decreases."
        },
        springConstant: {
          up: "Increasing k raises omega and shortens the period.",
          down: "Decreasing k lowers omega and lengthens the period."
        },
        amplitude: {
          up: "Increasing amplitude increases max speed and total energy; period stays the same.",
          down: "Decreasing amplitude lowers max speed and total energy; period stays the same."
        }
      },
      double: {
        mass: {
          up: "Increasing mass decreases omega, so the period increases.",
          down: "Decreasing mass increases omega, so the period decreases."
        },
        springConstant: {
          up: "Increasing k raises omega and shortens the period (k_eff = 2k).",
          down: "Decreasing k lowers omega and lengthens the period (k_eff = 2k)."
        },
        amplitude: {
          up: "Increasing amplitude increases max speed and total energy; period stays the same.",
          down: "Decreasing amplitude lowers max speed and total energy; period stays the same."
        }
      },
      pendulum: {
        mass: {
          up: "Mass does not change the period (small-angle); it changes energy.",
          down: "Mass does not change the period (small-angle); it changes energy."
        },
        springConstant: {
          up: "Spring constant does not affect the pendulum model here.",
          down: "Spring constant does not affect the pendulum model here."
        },
        amplitude: {
          up: "Increasing max angle raises max speed and energy; period stays nearly the same.",
          down: "Decreasing max angle lowers max speed and energy; period stays nearly the same."
        }
      }
    }),
    []
  );

  const renderFormula = (latex) => ({
    __html: katex.renderToString(latex, { throwOnError: false })
  });

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previous = prevParamsRef.current;
    if (previous.templateId !== templateId) {
      prevParamsRef.current = { mass, springConstant, amplitude, templateId };
      return;
    }

    let changedKey = null;
    let delta = 0;
    if (mass !== previous.mass) {
      changedKey = "mass";
      delta = mass - previous.mass;
    } else if (springConstant !== previous.springConstant) {
      changedKey = "springConstant";
      delta = springConstant - previous.springConstant;
    } else if (amplitude !== previous.amplitude) {
      changedKey = "amplitude";
      delta = amplitude - previous.amplitude;
    }

    if (changedKey && effects.some((item) => item.key === changedKey)) {
      setActiveEffectKey(changedKey);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setActiveEffectKey(null);
      }, 1600);
    }

    if (changedKey) {
      const direction = delta >= 0 ? "up" : "down";
      const templateEffects = effectMessages[templateId] ?? effectMessages.single;
      const effectText = templateEffects?.[changedKey]?.[direction];
      const labelMap = {
        mass: "Mass",
        springConstant: "Spring constant",
        amplitude: templateId === "pendulum" ? "Max angle" : "Amplitude"
      };
      const valuePayload = (() => {
        if (changedKey === "mass") {
          const value = formatValue(mass, 1);
          return {
            text: `m = ${value} kg`,
            latex: `m = ${value}\\,\\text{kg}`
          };
        }
        if (changedKey === "springConstant") {
          const value = formatValue(springConstant, 0);
          return {
            text: `k = ${value} N/m`,
            latex: `k = ${value}\\,\\text{N/m}`
          };
        }
        if (changedKey === "amplitude") {
          if (templateId === "pendulum" && pendulumTheta0Deg !== null) {
            const value = formatNumber(pendulumTheta0Deg, 1);
            return {
              text: `theta0 = ${value} deg`,
              latex: `\\theta_0 = ${value}^{\\circ}`
            };
          }
          const value = formatValue(amplitude, 1);
          return {
            text: `A = ${value} m`,
            latex: `A = ${value}\\,\\text{m}`
          };
        }
        return { text: "", latex: "" };
      })();
      const title = `${labelMap[changedKey] ?? "Parameter"} ${
        direction === "up" ? "increased" : "decreased"
      }`;
      const parts = [];
      if (valuePayload.text) {
        parts.push(`Now ${valuePayload.text}.`);
      }
      if (effectText) {
        parts.push(`Effect: ${effectText}`);
      }
      setCanvasNotice({
        title,
        text: parts.join(" "),
        valueLatex: valuePayload.latex,
        effectText: effectText ?? ""
      });
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
      noticeTimeoutRef.current = setTimeout(() => {
        setCanvasNotice(null);
      }, 6500);
    }

    prevParamsRef.current = { mass, springConstant, amplitude, templateId };
  }, [mass, springConstant, amplitude, templateId, effects, effectMessages]);

  useEffect(() => {
    const seenTour = window.localStorage.getItem("shm_tour_seen");
    if (!seenTour) {
      setShowTourIntro(true);
    }
  }, []);

  useEffect(() => {
    if (templateId === "pendulum" && activeParamInfo === "springConstant") {
      setActiveParamInfo(null);
    }
  }, [templateId, activeParamInfo]);

  useEffect(() => {
    if (chapterId === "oscillations") {
      return;
    }
    setActiveCalc(null);
    setActiveParamInfo(null);
    setActiveEffectKey(null);
    setCanvasNotice(null);
    setTourStepIndex(null);
    setTourSpotlight(null);
    setTourTooltip(null);
  }, [chapterId]);

  useEffect(() => {
    if (tourStepIndex === null) {
      if (tourTargetRef.current) {
        tourTargetRef.current.classList.remove("tour-highlight");
        tourTargetRef.current = null;
      }
      setTourSpotlight(null);
      setTourTooltip(null);
      return;
    }

    const step = tourSteps[tourStepIndex];
    if (!step) {
      setTourStepIndex(null);
      return;
    }

    const updatePositions = () => {
      const element = document.querySelector(step.selector);
      if (tourTargetRef.current && tourTargetRef.current !== element) {
        tourTargetRef.current.classList.remove("tour-highlight");
      }
      if (element) {
        element.classList.add("tour-highlight");
        tourTargetRef.current = element;
      } else {
        tourTargetRef.current = null;
      }

      if (!element) {
        setTourSpotlight(null);
        setTourTooltip(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 10;
      const inset = 8;
      const spotlightTop = Math.max(rect.top - padding, inset);
      const spotlightLeft = Math.max(rect.left - padding, inset);
      const spotlightWidth = Math.min(
        rect.width + padding * 2,
        window.innerWidth - spotlightLeft - inset
      );
      const spotlightHeight = Math.min(
        rect.height + padding * 2,
        window.innerHeight - spotlightTop - inset
      );
      setTourSpotlight({
        top: spotlightTop,
        left: spotlightLeft,
        width: spotlightWidth,
        height: spotlightHeight,
        radius: 14
      });

      const tooltipWidth = 280;
      const tooltipHeight = 160;
      const margin = 16;
      let tooltipLeft = rect.left;
      if (tooltipLeft + tooltipWidth > window.innerWidth - margin) {
        tooltipLeft = window.innerWidth - tooltipWidth - margin;
      }
      if (tooltipLeft < margin) {
        tooltipLeft = margin;
      }
      let tooltipTop = rect.bottom + margin;
      if (tooltipTop + tooltipHeight > window.innerHeight - margin) {
        tooltipTop = rect.top - tooltipHeight - margin;
      }
      if (tooltipTop < margin) {
        tooltipTop = margin;
      }
      setTourTooltip({ top: tooltipTop, left: tooltipLeft });
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);
    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
      if (tourTargetRef.current) {
        tourTargetRef.current.classList.remove("tour-highlight");
        tourTargetRef.current = null;
      }
    };
  }, [tourStepIndex, tourSteps]);
  const toggleParamInfo = (key) => {
    setActiveParamInfo((prev) => (prev === key ? null : key));
  };
  const openCalcModal = (row) => {
    setActiveCalc(row);
  };
  const closeCalcModal = () => {
    setActiveCalc(null);
  };
  const startTour = () => {
    window.localStorage.setItem("shm_tour_seen", "true");
    setShowTourIntro(false);
    setTourStepIndex(0);
  };
  const skipTour = () => {
    window.localStorage.setItem("shm_tour_seen", "true");
    setShowTourIntro(false);
    setTourStepIndex(null);
  };
  const endTour = () => {
    setTourStepIndex(null);
  };
  const advanceTour = () => {
    setTourStepIndex((prev) => {
      if (prev === null) {
        return prev;
      }
      if (prev >= tourSteps.length - 1) {
        return null;
      }
      return prev + 1;
    });
  };
  const handleChapterChange = (event) => {
    setChapterId(event.target.value);
  };
  const handleSimulationChange = (event) => {
    const nextSimulation = event.target.value;
    if (chapterId === "oscillations") {
      setTemplateId(nextSimulation);
      return;
    }
    if (chapterId === "waves") {
      setWaveSimId(nextSimulation);
      return;
    }
    if (chapterId === "optics") {
      setOpticsSimId(nextSimulation);
    }
  };
  const currentTourStep = tourStepIndex !== null ? tourSteps[tourStepIndex] : null;
  const selectedChapterLabel = chapterConfig[chapterId]?.label ?? "Chapter";
  const activeSimulationId = isOscillationChapter
    ? templateId
    : isWavesChapter
    ? waveSimId
    : isOpticsChapter
    ? opticsSimId
    : "";
  const activeSimulationLabel = isOscillationChapter
    ? activeTemplate.label
    : activeChapterSim.label ?? "Simulation";

  return (
    <main className="app-shell">
      <header className="shm-topbar">
        <div className="shm-topbar-left">
          <div className="shm-topbar-title">Unfold : Physics</div>
          <div className="shm-topbar-subtitle">A physics learning/simulation lab</div>
        </div>
        <div className="shm-topbar-controls">
          <label className="shm-topbar-field">
            <span className="shm-topbar-label">Chapter</span>
            <select value={chapterId} onChange={handleChapterChange} aria-label="Select chapter">
              {Object.entries(chapterConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
          {chapterId ? (
            <label className="shm-topbar-field" data-tour="template">
              <span className="shm-topbar-label">Simulation</span>
              <select
                value={
                  isOscillationChapter
                    ? templateId
                    : isWavesChapter
                    ? waveSimId
                    : isOpticsChapter
                    ? opticsSimId
                    : ""
                }
                onChange={handleSimulationChange}
                aria-label="Select simulation"
              >
                {isOscillationChapter
                  ? Object.entries(templateConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))
                  : Object.entries(chapterSimConfig ?? {}).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className={`ask-query-btn ${isResourcesPanelOpen ? "active" : ""}`}
            onClick={() => setIsResourcesPanelOpen((prev) => !prev)}
            aria-expanded={isResourcesPanelOpen}
            aria-controls="template-resources-panel"
          >
            Resources
          </button>
          {typeof onBackToHome === "function" ? (
            <button type="button" className="back-home-btn" onClick={onBackToHome}>
              Back to Main Page
            </button>
          ) : null}
        </div>
      </header>
      {isOscillationChapter ? (
        <div className="shm-frame">
        <aside className="shm-left shm-left-calc" data-tour="calculations">
          <div className="shm-left-title">Calculations</div>
          <div className="shm-left-note">
            Click the triangle ▶ (play) button to view its info.
          </div>
          <div className="shm-calc-panel">
            <div className="calc-title">{calculations.title}</div>
            <div className="calc-list">
              {calculations.rows.map((row, index) => (
                <div
                  key={`${row.latex}-${index}`}
                  className={`calc-row ${row.value ? "" : "no-value"}`}
                >
                  <button
                    type="button"
                    className="calc-info-btn"
                    onClick={() => openCalcModal(row)}
                    aria-label="Open calculation details"
                  >
                    ▶
                  </button>
                  <div className="calc-formula" dangerouslySetInnerHTML={renderFormula(row.latex)} />
                  {row.value ? (
                    <div className="calc-value">
                      ={" "}
                      {row.valueLatex ? (
                        <span dangerouslySetInnerHTML={renderFormula(row.valueLatex)} />
                      ) : (
                        row.value
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="shm-section-divider" />

          {symbolGuideItems.length > 0 ? (
            <div className="wave-symbols">
              <div className="wave-symbols-title">Symbol Guide</div>
              <div className="wave-symbols-list">
                {symbolGuideItems.map((item) => (
                  <details key={`${item.symbol}-${item.label}`} className="wave-symbol-item">
                    <summary className="wave-symbol-summary">
                      <span
                        className="wave-symbol-name"
                        dangerouslySetInnerHTML={renderFormula(item.symbol)}
                      />
                      <span className="wave-symbol-label">{item.label}</span>
                    </summary>
                    <div className="wave-symbol-desc">{item.description}</div>
                    {item.descriptionLatex ? (
                      <div
                        className="wave-symbol-desc"
                        dangerouslySetInnerHTML={renderFormula(item.descriptionLatex)}
                      />
                    ) : null}
                  </details>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="shm-left-subtitle">Legend</div>
              <div className="shm-legend-items shm-legend-list">
                {legendItems.map((item) => (
                  <div key={item.key} className={`shm-legend-item ${item.tone}`}>
                    {item.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        <section className="shm-center">
          <div className="shm-center-header">
            <div className="shm-center-title">{activeTemplate.title}</div>
            <div className="shm-center-desc">{activeTemplate.description}</div>
          </div>
          <div className="shm-simBox" data-tour="scene">
            <div className="shm-simScene">
              <div className="scene-panel shm-scenePanel">
                <ActiveScene
                  mass={mass}
                  springConstant={springConstant}
                  amplitude={amplitude}
                  isPlaying={isPlaying}
                />
                {canvasNotice ? (
                  <div className="scene-toast" role="status" aria-live="polite">
                    <div className="scene-toast-title">{canvasNotice.title}</div>
                    <div className="scene-toast-text">
                      {canvasNotice.valueLatex ? (
                        <>
                          Now{" "}
                          <span
                            className="scene-toast-formula"
                            dangerouslySetInnerHTML={renderFormula(canvasNotice.valueLatex)}
                          />
                          .{" "}
                          {canvasNotice.effectText ? `Effect: ${canvasNotice.effectText}` : ""}
                        </>
                      ) : (
                        canvasNotice.text
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="shm-rightbar">
          <div className="shm-instructions">
            <div className="shm-instructions-title">Quick Start</div>
            <div className="shm-instructions-text">
              Try changing the parameters to see what happens.
            </div>
          </div>

          <div className="shm-right-section">
            <div className="shm-right-title">Simulation</div>
            <button
              type="button"
              className={`sim-toggle-btn ${isPlaying ? "playing" : "paused"}`}
              onClick={() => setIsPlaying((prev) => !prev)}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>

          <div className="shm-section-divider" />

          <div className="shm-right-section">
            <div className="shm-right-title">Parameters</div>
            <div className="shm-param-group" data-tour="parameters">
              <div className="param-item">
                <button
                  type="button"
                  className={`param-label-button ${activeParamInfo === "mass" ? "active" : ""}`}
                  onClick={() => toggleParamInfo("mass")}
                  aria-expanded={activeParamInfo === "mass"}
                  aria-controls="param-info-mass"
                >
                  Mass (m)
                </button>
                <div className="param-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setMass(nudgeValue(mass, -1, 0.5, 5))}
                    disabled={mass <= 0.5}
                    aria-label="Decrease mass"
                  >
                    -
                  </button>
                  <span className="param-value">{formatValue(mass, 1)}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setMass(nudgeValue(mass, 1, 0.5, 5))}
                    disabled={mass >= 5}
                    aria-label="Increase mass"
                  >
                    +
                  </button>
                </div>
              </div>
              {activeParamInfo === "mass" ? (
                <div id="param-info-mass" className="param-info">
                  {paramInfo.mass}
                </div>
              ) : null}

              {templateId !== "pendulum" ? (
                <>
                  <div className="param-item">
                    <button
                      type="button"
                      className={`param-label-button ${
                        activeParamInfo === "springConstant" ? "active" : ""
                      }`}
                      onClick={() => toggleParamInfo("springConstant")}
                      aria-expanded={activeParamInfo === "springConstant"}
                      aria-controls="param-info-spring"
                    >
                      Spring Constant (k)
                    </button>
                    <div className="param-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => setSpringConstant(nudgeValue(springConstant, -1, 5, 30))}
                        disabled={springConstant <= 5}
                        aria-label="Decrease spring constant"
                      >
                        -
                      </button>
                      <span className="param-value">{formatValue(springConstant, 0)}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => setSpringConstant(nudgeValue(springConstant, 1, 5, 30))}
                        disabled={springConstant >= 30}
                        aria-label="Increase spring constant"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {activeParamInfo === "springConstant" ? (
                    <div id="param-info-spring" className="param-info">
                      {paramInfo.springConstant}
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="param-item">
                <button
                  type="button"
                  className={`param-label-button ${
                    activeParamInfo === "amplitude" ? "active" : ""
                  }`}
                  onClick={() => toggleParamInfo("amplitude")}
                  aria-expanded={activeParamInfo === "amplitude"}
                  aria-controls="param-info-amplitude"
                >
                  {templateId === "pendulum" ? (
                    <span
                      dangerouslySetInnerHTML={renderFormula("\\text{Max Angle }(\\theta_0)")}
                    />
                  ) : (
                    "Amplitude (A)"
                  )}
                </button>
                <div className="param-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setAmplitude(nudgeValue(amplitude, -1, 0.5, 5))}
                    disabled={amplitude <= 0.5}
                    aria-label="Decrease amplitude"
                  >
                    -
                  </button>
                  <span className="param-value">
                    {templateId === "pendulum" && pendulumTheta0Deg !== null
                      ? `${formatNumber(pendulumTheta0Deg, 1)} deg`
                      : formatValue(amplitude, 1)}
                  </span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setAmplitude(nudgeValue(amplitude, 1, 0.5, 5))}
                    disabled={amplitude >= 5}
                    aria-label="Increase amplitude"
                  >
                    +
                  </button>
                </div>
              </div>
              {activeParamInfo === "amplitude" ? (
                <div id="param-info-amplitude" className="param-info">
                  {templateId === "pendulum"
                    ? paramInfo.amplitudePendulum
                    : paramInfo.amplitude}
                </div>
              ) : null}
            </div>
          </div>

          <div className="shm-section-divider" />

          <div
            className="shm-right-section shm-right-highlight shm-right-highlight-clean"
            data-tour="insights"
          >
            <div className="shm-right-title">What To Notice</div>
            <div className="shm-effects-list">
              {effects.map((item) => (
                <div
                  key={item.key}
                  className={`shm-effects-item shm-effects-item-clean ${
                    item.key === activeEffectKey ? "is-highlighted" : ""
                  }`}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      ) : (
        <div className="waves-frame">
          {ActiveChapterScene ? (
            <ActiveChapterScene
              title={activeChapterSim.title}
              description={activeChapterSim.description}
            />
          ) : (
            <div className="waves-empty">
              <div className="waves-card">
                <div className="waves-title">{selectedChapterLabel} Chapter</div>
                <div className="waves-subtitle">
                  Choose a simulation from the top bar to get started. This space is ready for the next
                  set of chapter scenes.
                </div>
                <div className="waves-selection">Selected simulation: {activeChapterSim.label}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {isOscillationChapter && activeCalc ? (
        <div className="calc-modal-backdrop" onClick={closeCalcModal}>
          <div className="calc-modal" onClick={(event) => event.stopPropagation()}>
            <div className="calc-modal-header">
              <div className="calc-modal-title">
                {activeCalc.title ?? "Calculation Details"}
              </div>
              <button type="button" className="calc-modal-close" onClick={closeCalcModal}>
                Close
              </button>
            </div>
            <div
              className="calc-modal-formula"
              dangerouslySetInnerHTML={renderFormula(activeCalc.latex)}
            />
            {activeCalc.value ? (
              <div className="calc-modal-value">
                ={" "}
                {activeCalc.valueLatex ? (
                  <span dangerouslySetInnerHTML={renderFormula(activeCalc.valueLatex)} />
                ) : (
                  activeCalc.value
                )}
              </div>
            ) : null}
            {Array.isArray(activeCalc.steps) && activeCalc.steps.length > 0 ? (
              <div className="calc-modal-steps">
                {activeCalc.steps.map((step, index) => (
                  <div
                    key={`${activeCalc.title ?? "calc"}-${index}`}
                    className="calc-modal-step"
                    dangerouslySetInnerHTML={renderFormula(step)}
                  />
                ))}
              </div>
            ) : null}
            <div className="calc-modal-detail">
              {activeCalc.detail ??
                "This equation connects the current parameters to the simulation."}
            </div>
            {activeCalc.detailLatex ? (
              <div
                className="calc-modal-detail-latex"
                dangerouslySetInnerHTML={renderFormula(activeCalc.detailLatex)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {isOscillationChapter && showTourIntro ? (
        <div className="tour-intro-backdrop">
          <div className="tour-intro-modal" role="dialog" aria-modal="true">
            <div className="tour-intro-title">Welcome to the simulation lab</div>
            <div className="tour-intro-text">
              Want a quick walkthrough? We can highlight the key parts of the page in
              under a minute.
            </div>
            <div className="tour-intro-actions">
              <button type="button" className="tour-btn ghost" onClick={skipTour}>
                Skip tour
              </button>
              <button type="button" className="tour-btn primary" onClick={startTour}>
                Start tour
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOscillationChapter && currentTourStep && tourSpotlight && tourTooltip ? (
        <div className="tour-overlay" aria-live="polite">
          <div className="tour-screen" />
          <div
            className="tour-spotlight"
            style={{
              top: `${tourSpotlight.top}px`,
              left: `${tourSpotlight.left}px`,
              width: `${tourSpotlight.width}px`,
              height: `${tourSpotlight.height}px`,
              borderRadius: `${tourSpotlight.radius}px`
            }}
          />
          <div
            className="tour-tooltip"
            style={{ top: `${tourTooltip.top}px`, left: `${tourTooltip.left}px` }}
          >
            <div className="tour-tooltip-title">{currentTourStep.title}</div>
            <div className="tour-tooltip-text">{currentTourStep.text}</div>
            <div className="tour-tooltip-footer">
              <div className="tour-step-count">
                Step {tourStepIndex + 1} of {tourSteps.length}
              </div>
              <div className="tour-tooltip-actions">
                <button type="button" className="tour-btn ghost small" onClick={endTour}>
                  Exit
                </button>
                <button type="button" className="tour-btn primary small" onClick={advanceTour}>
                  {tourStepIndex >= tourSteps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <TemplateResourcesPanel
        chapterId={chapterId}
        simulationId={activeSimulationId}
        chapterLabel={selectedChapterLabel}
        simulationLabel={activeSimulationLabel}
        isOpen={isResourcesPanelOpen}
        onClose={() => setIsResourcesPanelOpen(false)}
      />
    </main>
  );
}
