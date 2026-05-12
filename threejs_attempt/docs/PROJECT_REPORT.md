# Unfold : Physics - Detailed Project Report

## 1. Title

**Unfold : Physics**  
An Interactive Web-Based Physics Simulation Lab Using React, Three.js, Canvas, KaTeX, and Local RAG

## 2. Abstract

Unfold : Physics is a web-based interactive physics learning platform designed to make abstract physics concepts easier to understand through visual simulation, formula-based calculation, and guided exploration. The application focuses on three major physics areas: oscillations, waves, and optics. Instead of presenting physics only as static theory, the project allows learners to change parameters, observe motion, inspect mathematical relationships, and connect formulas directly with visual behavior.

The project includes 3D simulations for oscillatory systems such as single spring-mass motion, double spring-mass motion, and simple pendulum motion. It also includes 2D and canvas-based simulations for wave parameters, transverse and longitudinal wave comparison, standing waves, refraction through media, and spherical mirror image formation. The interface supports chapter selection, simulation selection, parameter controls, real-time visual updates, calculation panels, symbol guides, resource panels, and a guided tour.

In addition to the frontend simulation lab, the repository contains an offline local Retrieval-Augmented Generation pipeline. This backend uses local notes, sentence-transformer embeddings, ChromaDB vector storage, and an optional Ollama local language model to answer scoped physics questions for each simulation. This makes the project not only a visual learning tool but also a foundation for an offline intelligent tutoring assistant.

## 3. Introduction

Physics often becomes difficult for students because many concepts involve invisible relationships between motion, force, energy, waves, light, and mathematical equations. Learners may memorize formulas without understanding how parameter changes affect physical behavior. For example, students may know that the angular frequency of a spring-mass system is `omega = sqrt(k / m)`, but they may not intuitively see why increasing mass slows the oscillation or why increasing spring stiffness speeds it up.

This project addresses that gap by combining:

- Interactive simulations.
- Real-time parameter control.
- Visual representations of physical quantities.
- Formula rendering using KaTeX.
- Step-by-step calculation panels.
- Chapter-wise resources.
- Offline local question answering through RAG.

The application is built as a browser-based learning lab. A learner can open the site, select a chapter, choose a simulation, change parameter values, pause or play motion, inspect formulas, open study resources, and explore the same concept from both mathematical and visual perspectives.

## 4. Project Objectives

The main objectives of this project are:

1. To create an interactive physics simulation lab that runs directly in the browser.
2. To visualize important physics concepts from oscillations, waves, and optics.
3. To connect equations with real-time visual motion and parameter changes.
4. To provide calculation panels that show current formula values and substitution steps.
5. To support guided exploration through symbol guides, notices, and resource panels.
6. To build a modular React architecture where each simulation is implemented as an independent component.
7. To use Three.js for 3D physics scenes and Canvas/SVG for high-performance 2D diagrams.
8. To include a local offline RAG backend for simulation-specific question answering.
9. To make the project suitable as an educational demonstration, academic submission, or extensible future learning platform.

## 5. Scope of the Project

The project currently covers the following chapters and simulations.

### 5.1 Oscillations

- Single spring-mass system.
- Double spring-mass system.
- Simple pendulum.

### 5.2 Waves

- Static wave parameter markers.
- Transverse versus longitudinal wave comparison.
- Standing waves on a string.

### 5.3 Optics

- Refraction using Snell's law.
- Spherical mirror formula and ray diagram.

### 5.4 Supporting Learning Features

- Landing page with chapter and simulation launch cards.
- Chapter selector and simulation selector.
- Parameter controls.
- Play/pause controls.
- Real-time calculation display.
- Symbol guide.
- "What To Notice" panel.
- Study resources panel with chapter PDFs.
- Guided walkthrough for first-time users.
- Local RAG backend for question answering.

## 6. Technology Stack

### 6.1 Frontend

| Technology | Purpose |
| --- | --- |
| React 18 | Component-based user interface and state management. |
| Vite | Fast frontend development server and production bundling. |
| Three.js | 3D rendering for spring-mass and pendulum simulations. |
| HTML Canvas | Efficient animated 2D simulations for waves and optics. |
| SVG | Static wave marker diagram with clear parameter annotations. |
| KaTeX | Mathematical equation rendering in the interface. |
| CSS | Layout, responsive design, panels, modals, and visual styling. |

### 6.2 Backend / Local RAG

| Technology | Purpose |
| --- | --- |
| Python | Backend implementation for local RAG. |
| FastAPI | HTTP API for health check, indexing, and chat. |
| ChromaDB | Persistent local vector database. |
| sentence-transformers | Local embedding generation. |
| Ollama | Optional local LLM generation. |
| JSON knowledge base | Simulation-scoped physics notes. |

### 6.3 Project Tooling

| Tool | Purpose |
| --- | --- |
| npm | JavaScript dependency management and scripts. |
| package-lock.json | Dependency version lock file. |
| Vite build | Production compilation. |
| Mermaid diagrams | Workflow and architecture diagrams in documentation. |

## 7. Project Directory Structure

The repository is organized into frontend, documentation, resources, diagrams, and local RAG backend sections.

```text
threejs_attempt/
  index.html
  package.json
  vite.config.js
  README.md
  docs/
    SYSTEM_WORKFLOW.md
    PROJECT_REPORT.md
  src/
    main.jsx
    RootApp.jsx
    App.jsx
    styles.css
    components/
      LandingPage.jsx
      SpringMassScene.jsx
      DoubleSpringMassScene.jsx
      PendulumScene.jsx
      WaveStaticMarkersScene.jsx
      WaveCompareScene.jsx
      WaveStandingScene.jsx
      RefractionScene.jsx
      MirrorFormulaScene.jsx
      TemplateResourcesPanel.jsx
      TemplateRagChat.jsx
  resources/
    oscillations.pdf
    waves.pdf
    optics.pdf
  rag_local/
    server.py
    build_index.py
    requirements.txt
    knowledge/
      templates.json
  physics_diagram/
    dia_1.mmd
    dia_1.png
    dia_2.mmd
    dia_2.png
    dia_3.mmd
    dia_3.png
    dia_4.mmd
    dia_4.png
    dia_5.mmd
    dia_5.png
    dia_6.mmd
    dia_6.png
    dia_7.png
    flow.png
```

## 8. System Overview

The system consists of two major parts:

1. **Frontend simulation lab**  
   A React application that renders the landing page, simulation shell, controls, panels, and visual simulations.

2. **Local RAG backend**  
   A FastAPI service that indexes local knowledge notes and returns simulation-specific answers using vector search and optional local generation.

The frontend can run independently as a physics simulator. The RAG backend is optional and can be started separately when local question-answering is needed.

## 9. User Workflow

The user workflow is:

1. The learner opens the web application.
2. The landing page displays the project identity, flow diagram, and simulation cards.
3. The learner selects a chapter: Oscillations, Waves, or Optics.
4. The learner opens a simulation from that chapter.
5. The simulation lab renders the selected scene.
6. The learner adjusts parameters using controls.
7. React state updates the current parameter values.
8. Derived values and calculations are recomputed.
9. The scene updates visually based on the new values.
10. The calculation panel, notices, and symbol guide help explain the result.
11. The learner may open textbook resources or switch to another simulation.

This workflow is documented further in `docs/SYSTEM_WORKFLOW.md`.

## 10. Frontend Architecture

### 10.1 Entry Point

The frontend starts from `src/main.jsx`, which mounts the React application into the root HTML element. The main visible application is controlled by `RootApp.jsx`.

### 10.2 Root Application

`RootApp.jsx` controls whether the user is on the landing page or inside the simulation lab.

Important responsibilities:

- Stores whether the user has entered the lab.
- Stores launch context such as chapter and simulation.
- Shows `LandingPage` before entering the lab.
- Shows `App` after entering the lab.
- Allows returning from the lab to the main page.

This separation keeps the landing experience independent from the simulation workspace.

### 10.3 Main Lab Component

`App.jsx` is the central controller of the simulation lab.

It owns:

- Current chapter.
- Current oscillation simulation.
- Current wave simulation.
- Current optics simulation.
- Shared oscillation parameters such as mass, spring constant, amplitude, and play state.
- Calculation modal state.
- Resource panel state.
- Guided tour state.
- Active notices and highlighted effects.

It also defines the configuration objects for simulations:

- `templateConfig` for oscillation simulations.
- `waveSimConfig` for wave simulations.
- `opticsSimConfig` for optics simulations.

Based on the selected chapter and simulation, `App.jsx` chooses the correct scene component and passes required props.

### 10.4 Component-Based Scene Design

Each simulation is implemented as a dedicated component. This improves maintainability because physics logic, rendering logic, and interaction logic are localized to the scene that needs them.

| Component | Responsibility |
| --- | --- |
| `SpringMassScene.jsx` | 3D single spring-mass SHM simulation. |
| `DoubleSpringMassScene.jsx` | 3D two-spring mass simulation. |
| `PendulumScene.jsx` | 3D simple pendulum simulation. |
| `WaveStaticMarkersScene.jsx` | SVG-based static wave parameter explanation. |
| `WaveCompareScene.jsx` | Canvas-based transverse/longitudinal wave comparison. |
| `WaveStandingScene.jsx` | Canvas-based standing wave simulation. |
| `RefractionScene.jsx` | Canvas-based Snell's law and total internal reflection simulation. |
| `MirrorFormulaScene.jsx` | Canvas-based spherical mirror ray diagram. |
| `TemplateResourcesPanel.jsx` | Chapter-specific PDF resource drawer. |
| `TemplateRagChat.jsx` | Local RAG chat interface. |
| `LandingPage.jsx` | Main entry page and simulation launch catalog. |

## 11. State Management

The project uses React's built-in state and memoization instead of an external state management library.

Key state examples in `App.jsx`:

- `chapterId`: active chapter.
- `templateId`: active oscillation simulation.
- `waveSimId`: active wave simulation.
- `opticsSimId`: active optics simulation.
- `mass`: mass value for oscillation scenes.
- `springConstant`: spring constant for spring scenes.
- `amplitude`: amplitude or maximum angle control.
- `isPlaying`: play/pause state.
- `activeCalc`: selected calculation row for modal display.
- `isResourcesPanelOpen`: study resource panel state.
- `tourStepIndex`: guided tour progress.

Derived values are calculated using `useMemo`. This is useful because physics formulas depend on current parameter values, and recalculation should occur only when relevant inputs change.

## 12. UI and Learning Design

The user interface is designed around a lab-style layout:

- Top bar for chapter and simulation selection.
- Left panel for formulas, calculations, symbol guides, and theory.
- Center area for the main interactive simulation.
- Right panel for controls, parameter sliders, readouts, and notices.
- Modal overlays for detailed calculations and guided tour steps.
- Resource drawer for supporting textbook PDFs.

This layout supports repeated learning actions:

- Choose concept.
- Change value.
- Observe result.
- Read formula.
- Compare with theory.
- Repeat with another parameter.

The interface avoids making simulations passive. Each simulation invites interaction through sliders, stepper buttons, drag gestures, play/pause buttons, or selection cards.

## 13. Physics Simulations

## 13.1 Single Spring-Mass Simulation

### Concept

The single spring-mass simulation demonstrates simple harmonic motion where a block is attached to a fixed wall by a spring. The spring obeys Hooke's law, and the block oscillates about an equilibrium position.

### Physics Model

The restoring force is:

```text
F = -kx
```

Using Newton's second law:

```text
m d^2x/dt^2 = -kx
```

The angular frequency is:

```text
omega = sqrt(k / m)
```

The time period is:

```text
T = 2 pi sqrt(m / k)
```

The maximum velocity is:

```text
v_max = omega A
```

The maximum acceleration is:

```text
a_max = omega^2 A
```

The total energy is:

```text
E = 1/2 k A^2
```

### Visual Implementation

The scene uses Three.js to render:

- A fixed wall.
- A spring generated from a tube geometry along a helix-like curve.
- A moving block.
- Floor and grid.
- Equilibrium marker.
- Velocity arrow.
- Restoring force arrow.
- Text labels.
- Orbit controls for camera interaction.

The block position is updated with:

```text
x = equilibrium + A sin(theta)
```

The velocity is updated with:

```text
v = A omega cos(theta)
```

The restoring force arrow changes direction depending on displacement. When the block is to the right of equilibrium, force points left. When the block is to the left, force points right.

### Educational Value

This simulation helps learners see:

- Why force is always restoring.
- Why velocity is maximum at equilibrium.
- Why force and acceleration are maximum at extreme positions.
- How mass, spring constant, and amplitude affect the motion.

## 13.2 Double Spring-Mass Simulation

### Concept

The double spring-mass simulation shows a block connected between two springs. Both springs contribute to the restoring force, making the system effectively stiffer than a single-spring setup.

### Physics Model

For two identical springs:

```text
k_eff = 2k
```

The angular frequency becomes:

```text
omega = sqrt(k_eff / m) = sqrt(2k / m)
```

The time period is:

```text
T = 2 pi sqrt(m / k_eff)
```

The maximum speed is:

```text
v_max = omega A
```

The total energy is:

```text
E = 1/2 k_eff A^2
```

### Visual Implementation

The scene renders:

- Left and right walls.
- Two spring geometries.
- A central moving mass.
- Equilibrium line.
- Left spring force arrow.
- Right spring force arrow.
- Velocity arrow.
- Labels for springs, block, and force components.

The effective stiffness is doubled, so for the same mass and spring value, the double-spring system oscillates faster than the single-spring system.

### Educational Value

The simulation is useful for comparing:

- Single spring versus double spring.
- Individual spring force versus net force.
- Effective stiffness.
- Changes in angular frequency and period.

## 13.3 Simple Pendulum Simulation

### Concept

The simple pendulum simulation demonstrates small-angle oscillatory motion of a bob attached to a rigid support by a rod/string.

### Physics Model

For small angles:

```text
omega = sqrt(g / L)
```

The time period is:

```text
T = 2 pi sqrt(L / g)
```

Angular displacement is modeled as:

```text
theta(t) = theta_0 cos(omega t)
```

Maximum speed near the bottom is approximated as:

```text
v_max = omega L theta_0
```

Tangential restoring force is:

```text
F_t = -mg sin(theta)
```

For small angles:

```text
F_t approximately equals -mg theta
```

### Visual Implementation

The Three.js scene contains:

- Top support beam.
- Pivot point.
- Pendulum rod.
- Bob.
- Equilibrium line.
- Length label.
- Tangential velocity arrow.
- Tangential restoring force arrow.
- Camera controls and labels.

The amplitude control from the UI is mapped to maximum angle, clamped between a safe minimum and maximum range.

### Educational Value

The simulation demonstrates:

- Pendulum period does not depend on mass in the ideal small-angle model.
- Longer length produces slower motion.
- Maximum speed occurs near equilibrium.
- Restoring force is strongest near angular extremes.

## 13.4 Static Wave Marker Simulation

### Concept

This simulation introduces wave terminology using a static wave snapshot. The goal is to help learners identify amplitude, wavelength, initial phase, period, and phase point before studying full wave motion.

### Physics Model

The displayed equation is:

```text
y(x,t) = a sin((2 pi / lambda)x - omega t + phi)
```

Supporting relations:

```text
omega = 2 pi / T
f = 1 / T
v = f lambda = lambda / T
```

### Visual Implementation

This scene uses SVG because the visual is mostly a labeled static diagram. It includes:

- Wave curve.
- Mean position line.
- x and y axes.
- Crest and trough labels.
- Amplitude marker.
- Wavelength marker.
- Initial phase marker.
- Phase point marker.
- Period inset diagram.
- Clickable parameter blocks.
- Phase slider.

### Educational Value

The scene helps students learn the vocabulary of waves:

- Amplitude as maximum displacement.
- Wavelength as distance between same-phase points.
- Period as time for one oscillation.
- Phase as a horizontal shift.
- Frequency and speed relationships.

## 13.5 Transverse vs Longitudinal Wave Simulation

### Concept

This simulation compares transverse and longitudinal waves using the same parameter set. The top canvas shows transverse motion, while the bottom canvas shows longitudinal motion.

### Physics Model

The shared wave equation is:

```text
y(x,t) = A sin(kx - omega t + phi)
```

Derived values:

```text
k = 2 pi / lambda
T = 2 pi / omega
f = omega / 2 pi
v = omega / k
```

### Visual Implementation

The component uses two HTML canvas elements:

- Transverse canvas: particles move vertically while the wave propagates horizontally.
- Longitudinal canvas: particles move horizontally, creating compression and rarefaction regions.

Controls include:

- Play/pause.
- Amplitude.
- Wavelength.
- Angular frequency.
- Phase.

The calculation panel highlights affected values when a parameter changes.

### Educational Value

This simulation helps learners distinguish:

- Direction of particle vibration.
- Direction of wave propagation.
- Compression and rarefaction.
- Shared mathematical parameters across wave types.

## 13.6 Standing Wave Simulation

### Concept

The standing wave simulation models a string fixed at both ends. It shows nodes, antinodes, harmonic modes, and the relationship between string length, tension, linear density, and harmonic frequency.

### Physics Model

Standing wave shape:

```text
y(x,t) = A sin(n pi x / L) sin(2 pi f t)
```

Allowed wavelengths:

```text
lambda = 2L / n
```

Wave speed:

```text
v = sqrt(T / mu)
```

Harmonic frequency:

```text
f_n = n v / 2L
```

### Visual Implementation

The simulation uses Canvas to draw:

- String axis.
- Oscillating standing wave.
- Fixed ends.
- Nodes.
- Antinodes.
- Length marker.

Controls include:

- Harmonic number.
- String length.
- Tension.
- Frequency.
- Linear mass density.
- Play/pause.

### Educational Value

This simulation helps explain:

- Why fixed ends are nodes.
- How higher harmonics add more nodes and antinodes.
- Why increased tension increases wave speed.
- Why increased string length lowers harmonic frequency.

## 13.7 Refraction Simulation

### Concept

The refraction simulation demonstrates Snell's law at a boundary between two media. It also shows total internal reflection when light travels from a higher refractive index medium to a lower refractive index medium at an incidence angle greater than the critical angle.

### Physics Model

Snell's law:

```text
n1 sin(i) = n2 sin(r)
```

Critical angle:

```text
theta_c = sin^-1(n2 / n1), valid when n1 > n2
```

Total internal reflection occurs when:

```text
n1 > n2 and i > theta_c
```

### Visual Implementation

The scene uses Canvas and includes:

- Upper and lower media.
- Boundary line.
- Normal line.
- Incident ray.
- Reflected ray.
- Refracted ray.
- Angle arcs.
- Material presets for air, water, and glass.
- Animated ray tracing.
- Drag interaction to change incidence angle.
- Sliders for `n1`, `n2`, and incidence angle.

### Educational Value

The simulation demonstrates:

- Bending toward the normal when entering a denser medium.
- Bending away from the normal when entering a rarer medium.
- Critical angle calculation.
- Total internal reflection.
- How refractive index affects ray direction.

## 13.8 Spherical Mirror Formula Simulation

### Concept

The mirror formula simulation visualizes image formation by concave and convex mirrors. It combines an interactive ray diagram with signed mirror formula values.

### Physics Model

Mirror formula:

```text
1/v + 1/u = 1/f
```

Magnification:

```text
m = v / u
```

The simulation uses a sign convention:

- Distances to the left of the pole are negative.
- Distances to the right of the pole are positive.
- Concave mirror focal length is treated as negative.
- Convex mirror focal length is treated as positive.

### Visual Implementation

The scene draws:

- Principal axis.
- Mirror surface.
- Pole.
- Focus.
- Center of curvature.
- Object arrow.
- Image arrow.
- Incident and reflected rays.
- Dashed virtual ray extensions.
- Sign convention box.

Controls include:

- Mirror type selection.
- Focal length slider.
- Object distance slider.
- Drag interaction for moving the object.
- Reset button.

### Educational Value

This simulation helps learners understand:

- Difference between real and virtual images.
- Inverted versus upright image formation.
- Magnified and diminished images.
- Concave mirror cases based on object position.
- Convex mirror behavior.
- Signed values in the mirror formula.

## 14. Calculation System

The application includes calculation rows that update when the user changes simulation parameters. For oscillation simulations, the calculation panel is especially detailed.

Each calculation row may include:

- Formula.
- Current numeric result.
- Unit.
- Detailed explanation.
- Substitution steps.
- Modal view for expanded learning.

Examples:

- Effective spring constant.
- Angular frequency.
- Time period.
- Maximum velocity.
- Maximum acceleration.
- Total energy.
- Pendulum period.
- Pendulum maximum speed.

KaTeX is used to render equations cleanly in the browser. The helper function `renderFormula` converts LaTeX strings into HTML that React can inject into the calculation rows.

## 15. Guided Tour System

The oscillation chapter includes a guided walkthrough. The tour highlights key parts of the interface:

- Calculations panel.
- Simulation viewer.
- Simulation selector.
- Parameter controls.
- What To Notice panel.

The tour uses:

- CSS selectors through `data-tour` attributes.
- React state to track the active tour step.
- A spotlight overlay to focus attention.
- Tooltip positioning based on target element geometry.

This feature improves usability for first-time users.

## 16. Study Resources Panel

`TemplateResourcesPanel.jsx` provides chapter-specific resources. It maps chapters to local PDF files:

| Chapter | PDF |
| --- | --- |
| Oscillations | `resources/oscillations.pdf` |
| Waves | `resources/waves.pdf` |
| Optics | `resources/optics.pdf` |

The panel also maps simulations to relevant starting pages. When the learner opens the resource, the embedded PDF viewer loads the selected chapter PDF at a page related to the current simulation.

This makes the application useful as both:

- A simulation tool.
- A textbook-linked study companion.

## 17. Local RAG Backend

The repository includes a local Retrieval-Augmented Generation system in `rag_local/`.

### 17.1 Purpose

The RAG backend is designed to answer questions using local simulation notes. It avoids dependence on cloud APIs and can run fully offline except for optional local model setup.

### 17.2 Main Files

| File | Purpose |
| --- | --- |
| `server.py` | FastAPI app, indexing, retrieval, chat endpoint, fallback answer logic. |
| `build_index.py` | Command-line script to rebuild the vector index. |
| `requirements.txt` | Python dependencies. |
| `knowledge/templates.json` | Local physics notes scoped by chapter and simulation. |

### 17.3 Knowledge Structure

The knowledge file stores documents with:

- `chapterId`.
- `templateId`.
- `title`.
- `source`.
- `content`.

This allows retrieval to be scoped to the currently selected simulation.

### 17.4 Indexing Flow

Indexing works as follows:

1. Load `templates.json`.
2. Validate that documents exist.
3. Split content into overlapping text chunks.
4. Generate embeddings using `sentence-transformers`.
5. Store chunks, metadata, and embeddings in ChromaDB.

Chunking uses a word-based strategy with overlap so that context is preserved across chunk boundaries.

### 17.5 Query Flow

When a user asks a question:

1. The frontend sends `question`, `chapterId`, `templateId`, and `topK` to `/chat`.
2. The backend embeds the question.
3. ChromaDB searches only chunks matching the requested chapter and simulation.
4. Retrieved chunks are used as context.
5. If `OLLAMA_MODEL` is configured, Ollama may generate an answer.
6. If no local LLM is configured, the backend returns a rule-based or sentence-ranked fallback answer.
7. The response includes answer text and source metadata.

### 17.6 API Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Returns service health, collection count, model name, and CORS origins. |
| `/index` | POST | Rebuilds the local vector index. |
| `/chat` | POST | Answers a scoped simulation question. |

### 17.7 Frontend Chat Component

`TemplateRagChat.jsx` is the frontend interface for the RAG system. It supports:

- Simulation-scoped greeting.
- User question input.
- Chat history.
- Source display.
- Reindex button.
- Error message when the local RAG API is unavailable.

## 18. Data Flow

The main data flow in the frontend is:

1. User changes a control.
2. React state updates.
3. `useMemo` recalculates derived physics values.
4. The selected scene receives new props.
5. Three.js/Canvas/SVG scene updates.
6. Calculation panel and notices update.
7. User observes the new visual result.

For Three.js scenes, the rendering loop uses `requestAnimationFrame`. For canvas simulations, drawing functions are called continuously during animation. For SVG scenes, React state changes update SVG attributes and class names.

## 19. Rendering Techniques

### 19.1 Three.js Rendering

Three.js is used for 3D oscillation simulations because these scenes benefit from depth, perspective, lighting, camera movement, and 3D geometry.

Common Three.js features used:

- `Scene`.
- `PerspectiveCamera`.
- `WebGLRenderer`.
- `HemisphereLight`.
- `DirectionalLight`.
- `PointLight`.
- `MeshStandardMaterial`.
- `BoxGeometry`.
- `SphereGeometry`.
- `CylinderGeometry`.
- `TubeGeometry`.
- `ArrowHelper`.
- `GridHelper`.
- `OrbitControls`.
- `ResizeObserver`.

The scenes also include cleanup logic to dispose geometry, materials, controls, animation frames, and renderer resources.

### 19.2 Canvas Rendering

Canvas is used where continuous 2D drawing is efficient and flexible:

- Transverse and longitudinal waves.
- Standing waves.
- Refraction rays.
- Mirror ray diagrams.

Canvas is suitable here because the app needs custom drawing of axes, rays, particles, arrows, labels, and continuously changing mathematical curves.

### 19.3 SVG Rendering

SVG is used for the static wave marker scene. SVG is appropriate because the diagram consists of structured, clickable, scalable shapes and labels.

### 19.4 KaTeX Rendering

KaTeX is used throughout the app to render physics equations. This gives formulas a professional mathematical appearance and improves readability.

## 20. Important Physics Formulas Used

### 20.1 Simple Harmonic Motion

```text
F = -kx
omega = sqrt(k / m)
T = 2 pi sqrt(m / k)
v_max = omega A
a_max = omega^2 A
E = 1/2 k A^2
```

### 20.2 Double Spring-Mass

```text
k_eff = 2k
omega = sqrt(k_eff / m)
T = 2 pi sqrt(m / k_eff)
E = 1/2 k_eff A^2
```

### 20.3 Simple Pendulum

```text
omega = sqrt(g / L)
T = 2 pi sqrt(L / g)
theta(t) = theta_0 cos(omega t)
F_t = -mg sin(theta)
```

### 20.4 Progressive Waves

```text
y(x,t) = A sin(kx - omega t + phi)
k = 2 pi / lambda
T = 2 pi / omega
f = omega / 2 pi
v = omega / k
```

### 20.5 Standing Waves

```text
y(x,t) = A sin(n pi x / L) sin(2 pi f t)
lambda_n = 2L / n
v = sqrt(T / mu)
f_n = n v / 2L
```

### 20.6 Refraction

```text
n1 sin(i) = n2 sin(r)
theta_c = sin^-1(n2 / n1)
```

### 20.7 Spherical Mirrors

```text
1/v + 1/u = 1/f
m = v / u
```

## 21. Accessibility and Interaction Considerations

The project includes several accessibility-oriented practices:

- Buttons use clear labels or `aria-label` where needed.
- Resource panel uses dialog roles.
- PDF viewer uses titles.
- Escape key closes resource overlays.
- Controls use labels linked to inputs.
- Live notices use `aria-live` for status updates.
- Canvas areas include visual hints for drag interactions.

There is still room to improve accessibility further, especially for canvas-heavy simulations, because canvas content is not naturally readable by screen readers.

## 22. Performance Considerations

Performance choices in the project include:

- Vite for fast development and optimized builds.
- `useMemo` to avoid unnecessary recalculation of derived values.
- `useRef` for mutable animation values that should not trigger React re-renders.
- `ResizeObserver` to resize canvases and renderers only when containers change.
- Device pixel ratio clamping for canvas and WebGL rendering.
- Cleanup of Three.js objects to avoid memory leaks.
- Canvas rendering for high-frequency 2D animations.

## 23. Build and Run Instructions

### 23.1 Frontend

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build production files:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

### 23.2 Local RAG Backend

Go to the RAG backend folder:

```bash
cd rag_local
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Build the local index:

```bash
python build_index.py
```

Start the backend:

```bash
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

Optional Ollama generation:

```bash
set OLLAMA_MODEL=llama3.1
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

## 24. Testing and Verification

The project can be verified using the following checks:

### 24.1 Frontend Build Test

Run:

```bash
npm run build
```

Expected result:

- Vite should compile the React application successfully.
- Production files should be generated in `dist/`.

### 24.2 Manual Simulation Tests

Recommended manual checks:

- Launch landing page.
- Open each chapter.
- Open every simulation.
- Change every available parameter.
- Confirm formulas update.
- Confirm visual scene updates.
- Toggle play/pause.
- Open and close calculation modals.
- Open study resources.
- Test drag interactions in refraction and mirror simulations.
- Confirm no major layout overlap on common desktop sizes.

### 24.3 RAG Backend Tests

Recommended backend checks:

- Start backend.
- Open `/health`.
- Run `/index`.
- Ask simulation-specific questions through `/chat`.
- Verify that results are scoped by `chapterId` and `templateId`.

## 25. Strengths of the Project

1. Covers multiple physics chapters in one integrated lab.
2. Uses 3D rendering where spatial visualization is valuable.
3. Uses Canvas/SVG where 2D diagrams are more suitable.
4. Connects simulations directly with formulas and live calculations.
5. Includes resource PDFs for additional theory.
6. Includes a local offline RAG architecture.
7. Uses modular React components for maintainability.
8. Provides guided learning features such as symbol guides, notices, and tour overlay.
9. Demonstrates practical use of web technologies for education.
10. Can be extended with more simulations and tutoring features.

## 26. Limitations

The current project is strong as an interactive educational prototype, but it has some limitations:

1. Some simulations use idealized physics models and approximations.
2. Oscillation scenes do not currently include damping or external driving.
3. Pendulum length and gravity are fixed in the main UI.
4. Canvas simulations need more accessibility support for screen readers.
5. RAG chat is present as a component and backend, but the main visible app currently emphasizes the resources panel.
6. Some labels and text content could be polished further for consistent encoding and typography.
7. No automated test suite is currently included.
8. Mobile responsiveness should be tested thoroughly because simulations are visually dense.

## 27. Future Scope

Possible future improvements include:

1. Add damping and driven oscillation simulations.
2. Add energy versus time graphs for oscillation systems.
3. Add pendulum controls for length and gravity.
4. Add data export for lab-style analysis.
5. Add measurement tools such as rulers, timers, and graph cursors.
6. Add wave interference and Doppler effect simulations.
7. Add lens formula and prism dispersion simulations.
8. Integrate the local RAG chat directly into the main resources panel.
9. Add automated frontend tests.
10. Add more accessible textual alternatives for Canvas simulations.
11. Add mobile-specific layouts for smaller screens.
12. Add teacher mode with prepared activities and quiz prompts.
13. Add saved experiments or shareable parameter presets.

## 28. Conclusion

Unfold : Physics successfully demonstrates how modern web technologies can be used to create an interactive physics learning environment. The project moves beyond static textbook diagrams by allowing learners to manipulate parameters and observe immediate visual and mathematical consequences. Its combination of React, Three.js, Canvas, SVG, KaTeX, and local RAG creates a rich educational platform that supports both exploration and explanation.

The project is especially effective because it treats physics as a connected experience: the learner can see the object move, inspect the formula, change the inputs, read the symbol guide, and open related resources in the same interface. The architecture is modular and extensible, making it suitable for future expansion into a larger virtual physics lab.

## 29. References

- NCERT-style physics resources included in `resources/`.
- Three.js documentation for WebGL rendering concepts.
- React documentation for component state and hooks.
- KaTeX documentation for mathematical formula rendering.
- FastAPI documentation for local API design.
- ChromaDB documentation for persistent vector storage.
- Sentence Transformers documentation for local embedding models.

## 30. Appendix: Main Project Files

| File | Description |
| --- | --- |
| `src/RootApp.jsx` | Switches between landing page and lab. |
| `src/App.jsx` | Main simulation lab controller. |
| `src/components/LandingPage.jsx` | Landing page and simulation cards. |
| `src/components/SpringMassScene.jsx` | Single spring-mass 3D simulation. |
| `src/components/DoubleSpringMassScene.jsx` | Double spring-mass 3D simulation. |
| `src/components/PendulumScene.jsx` | Pendulum 3D simulation. |
| `src/components/WaveStaticMarkersScene.jsx` | Static wave marker diagram. |
| `src/components/WaveCompareScene.jsx` | Transverse/longitudinal wave comparison. |
| `src/components/WaveStandingScene.jsx` | Standing wave simulation. |
| `src/components/RefractionScene.jsx` | Refraction and total internal reflection simulation. |
| `src/components/MirrorFormulaScene.jsx` | Spherical mirror ray diagram. |
| `src/components/TemplateResourcesPanel.jsx` | Study resource drawer. |
| `src/components/TemplateRagChat.jsx` | Local RAG chat UI. |
| `rag_local/server.py` | Local RAG API. |
| `rag_local/build_index.py` | Index builder. |
| `rag_local/knowledge/templates.json` | Local physics knowledge base. |
| `docs/SYSTEM_WORKFLOW.md` | Workflow and architecture diagrams. |
