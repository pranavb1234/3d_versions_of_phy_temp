# Unfold : Physics - Actual Implementation Report

## 1. Title

**Unfold : Physics**  
An Interactive Physics Simulation Lab Using React, Three.js, Canvas, SVG, and KaTeX

## 2. Purpose of This Report

This report describes only the features, technologies, and modules that are actually used in the current working application flow. The repository also contains some extra implemented work, such as a local RAG backend and a RAG chat component, but those pieces are not actively connected to the main user interface at present. Therefore, this report focuses on the real project experience that a user can access through the app.

## 3. Abstract

Unfold : Physics is a browser-based interactive physics simulation lab. It helps learners understand concepts from oscillations, waves, and optics through visual simulations, real-time controls, mathematical formulas, and supporting resource material. The project is built with React and Vite for the frontend, Three.js for 3D physics scenes, Canvas and SVG for 2D simulations, and KaTeX for rendering equations.

The application allows users to open a landing page, select a chapter, choose a simulation, change parameters, observe the visual effect, and read related formulas. The active application includes simulations for spring-mass systems, simple pendulum motion, wave parameters, transverse and longitudinal waves, standing waves, refraction, and spherical mirror image formation.

The main goal of the project is to make physics concepts more understandable by connecting equations with motion and visual diagrams.

## 4. Introduction

Physics concepts are often difficult to understand because learners must connect mathematical equations with physical behavior. Static diagrams and formulas alone do not always show how a system changes when parameters such as mass, stiffness, amplitude, refractive index, or focal length are modified.

This project solves that problem by providing an interactive simulation environment. Users can directly manipulate values and immediately observe how the system responds. For example, increasing the mass in a spring-mass system slows the oscillation, increasing spring constant speeds it up, changing refractive index bends light differently, and moving an object in front of a mirror changes the image position and nature.

The project is designed as an educational web application that supports learning by exploration.

## 5. Actual Project Scope

The currently used project scope includes:

- A landing page for introducing the lab.
- Chapter selection.
- Simulation selection.
- Interactive simulations for oscillations, waves, and optics.
- Real-time parameter controls.
- Formula and calculation displays.
- Symbol guides.
- Study resource panel with local PDF files.
- Guided tour overlay for the oscillation lab.

The active app does not use the local RAG chat in the main interface.

## 6. Actually Used Technologies

| Technology | Actually Used For |
| --- | --- |
| React 18 | Building the component-based frontend interface. |
| Vite | Running and building the frontend application. |
| Three.js | Rendering 3D spring-mass and pendulum simulations. |
| OrbitControls | Allowing camera movement in Three.js scenes. |
| HTML Canvas | Drawing animated wave and optics simulations. |
| SVG | Drawing the static wave marker diagram. |
| KaTeX | Rendering mathematical formulas in the UI. |
| CSS | Styling layout, panels, controls, modals, and responsive screens. |
| Local PDF assets | Displaying chapter-wise study resources. |

## 7. Technologies Present but Not Used in Active UI

The repository contains a local RAG implementation:

- `rag_local/server.py`
- `rag_local/build_index.py`
- `rag_local/knowledge/templates.json`
- `src/components/TemplateRagChat.jsx`
- RAG-related CSS classes in `src/styles.css`

However, `TemplateRagChat.jsx` is not imported or rendered by the current main app. The visible UI uses `TemplateResourcesPanel.jsx` for study resources, not the RAG chat panel. Therefore, RAG should be described as an implemented but currently unused extension, not as an actively used feature of the final application.

## 8. Project Directory Structure

The important actually used files are:

```text
threejs_attempt/
  index.html
  package.json
  vite.config.js
  README.md
  docs/
    SYSTEM_WORKFLOW.md
    PROJECT_REPORT.md
    report_alt.md
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
  resources/
    oscillations.pdf
    waves.pdf
    optics.pdf
  physics_diagram/
    diagram and workflow image assets
```

Files related to RAG are present in the repository but are not part of the active app flow.

## 9. Application Workflow

When the user opens the application, the first screen displayed is the home page of **Unfold : Physics**. This page acts as the entry point to the whole learning environment. From here, the user has two main options:

1. The user can click **Start Exploring**, which directly opens the default simulation in the simulation lab.
2. The user can scroll through the home page, browse the available chapters, choose a chapter, and then select a specific simulation from that chapter.

The chapter-based selection flow is useful when the learner already knows which topic they want to study. For example, the user can open the Oscillations chapter and select the single spring-mass simulation, or open the Optics chapter and select the spherical mirror simulation. Once a simulation is selected, the application directly redirects the user to that exact simulation instead of requiring extra navigation.

### 9.1 Opening a Simulation

After the user enters a simulation, the simulation workspace is displayed. At this stage, the user is given the option to take a guided tour. If the user chooses the tour, the application explains the important parts of the screen step by step. The tour highlights the simulation viewer, calculation section, symbol guide, parameter controls, notices, and other relevant interface areas so that the learner understands how to use the lab.

If the user skips the tour, the simulation opens directly and the learner can begin interacting with it immediately.

### 9.2 Main Simulation Layout

Each simulation is presented as a complete learning workspace rather than only a visual animation. The major sections are:

- **Simulation canvas/viewer**: The main area where the physics simulation is displayed.
- **Calculation panel**: Shows formulas and current calculated values related to the selected simulation.
- **Symbol guide**: Explains the symbols used in the simulation, formulas, diagrams, and equations.
- **Play/pause control**: Allows the user to pause or resume the motion of animated simulations.
- **Parameter controls**: Allows the user to change values such as mass, spring constant, amplitude, wavelength, angle, refractive index, object distance, or other simulation-specific quantities.
- **Additional learning content**: Includes notices, observations, theory hints, and simulation-specific explanation panels that help the user understand what is happening.

The calculation panel is interactive. The user can click a calculation row to open a detailed explanation of that calculation. This expanded view shows how the result is obtained, which formula is used, and how the current parameter values are substituted into the formula.

The symbol guide is also interactive. Symbols used in the simulation or equation are listed with short labels. When the user clicks a symbol entry, it expands to describe what the symbol represents and how it is used in that simulation.

### 9.3 Real-Time Parameter Interaction

A core feature of the project is that changing parameters changes the simulation in real time. When the user moves a slider, selects an option, or changes a numeric value, the physics model recalculates the dependent quantities and the visual representation updates immediately.

For example:

- Changing mass or spring constant changes the speed of oscillation in a spring-mass system.
- Changing amplitude changes the range of motion.
- Changing wavelength, frequency, or phase changes the wave diagram.
- Changing refractive indices or angle of incidence changes the path of light in the refraction simulation.
- Changing object distance or mirror type changes the image position and ray diagram in the mirror simulation.

This helps the user connect cause and effect. Instead of only reading a formula, the learner can see how the formula affects the physical behavior.

### 9.4 Interactivity in 3D and 2D Simulations

The 3D simulations are fully interactive. The user can rotate the view, zoom in or out, inspect the scene from different angles, and observe objects such as blocks, springs, pendulums, arrows, labels, and reference markers. This is especially useful for oscillation simulations, where depth, camera movement, and object positioning make the concept easier to visualize.

Some 2D simulations also include direct interaction. For example, the user can drag elements or adjust graphical controls in simulations such as refraction and mirror image formation. Other 2D scenes focus on parameter-based interaction through sliders and buttons.

### 9.5 Study Resources

Each simulation includes a resources section. When the user opens this section, the application displays study material related to the current chapter and simulation. At present, the available study resource is the NCERT-style textbook PDF.

The resource system is simulation-aware. When the user clicks **Open**, the application opens the relevant PDF at the page connected to the selected simulation. It does not open a random page. This allows the user to move directly from the interactive simulation to the matching textbook explanation.

### 9.6 Returning to the Home Page

The simulation workspace includes a **Back to Main Page** option. This allows the user to leave the current simulation and return to the home page. From there, the learner can start exploring again, choose another chapter, or open a different simulation.

Overall, the user workflow is:

1. Open the application.
2. Use **Start Exploring** or choose a chapter from the home page.
3. Select a simulation.
4. Take the guided tour or skip it.
5. Interact with the simulation canvas.
6. Change parameters and observe real-time physics changes.
7. Open calculations to understand formulas and substitutions.
8. Use the symbol guide to understand notation.
9. Open the resources section for related NCERT material.
10. Return to the main page when finished.

## 10. Main Application Components

## 10.1 `RootApp.jsx`

`RootApp.jsx` controls whether the user sees the landing page or the simulation lab.

It manages:

- `enteredLab`: whether the user has entered the lab.
- `launchContext`: selected chapter and simulation.
- Switching between `LandingPage` and `App`.
- Returning from the lab to the landing page.

## 10.2 `LandingPage.jsx`

The landing page is the first screen of the project.

It includes:

- Hero section with background video.
- Project name: Unfold : Physics.
- Introductory text.
- Start button.
- Demo/navigation button.
- How-it-works section using `flow.png`.
- Chapter dropdown.
- Simulation cards for each chapter.
- Final call-to-action section.

The landing page allows users to launch a selected simulation directly.

## 10.3 `App.jsx`

`App.jsx` is the main simulation lab controller.

It handles:

- Chapter selection.
- Simulation selection.
- Oscillation parameter state.
- Play/pause state.
- Calculation data.
- Active scene rendering.
- Symbol guide display.
- Resource panel opening.
- Guided tour state.
- Parameter change notices.

It decides which scene component should be shown based on the selected chapter and simulation.

## 10.4 `TemplateResourcesPanel.jsx`

This component is actively used in the current app.

It provides:

- A Resources button in the top bar.
- A slide-out study resource panel.
- Chapter-specific PDFs.
- Embedded PDF viewer.
- Direct opening in a new tab.
- Escape key closing behavior.

PDF mapping:

| Chapter | PDF |
| --- | --- |
| Oscillations | `oscillations.pdf` |
| Waves | `waves.pdf` |
| Optics | `optics.pdf` |

## 11. Active Chapters and Simulations

## 11.1 Oscillations Chapter

The Oscillations chapter includes:

- Single Spring-Mass.
- Double Spring-Mass.
- Simple Pendulum.

This chapter uses a three-column lab layout:

- Left: calculations and symbol guide.
- Center: 3D simulation.
- Right: controls and "What To Notice" panel.

## 11.2 Waves Chapter

The Waves chapter includes:

- Wave Markers (Static).
- Transverse vs Longitudinal.
- Standing Waves on a String.

These simulations use SVG and Canvas instead of Three.js because the diagrams are mainly 2D wave visualizations.

## 11.3 Optics Chapter

The Optics chapter includes:

- Refraction using Snell's Law.
- Spherical Mirrors.

These simulations use Canvas because optics diagrams involve rays, axes, boundaries, mirrors, and drag-based interactions.

## 12. Oscillation Simulations

## 12.1 Single Spring-Mass

### File

`src/components/SpringMassScene.jsx`

### Visible Features

- 3D wall, spring, mass block, floor, and grid.
- Spring stretching and compression.
- Moving block.
- Velocity arrow.
- Restoring force arrow.
- Equilibrium marker.
- Play/pause behavior.
- Parameter controls for mass, spring constant, and amplitude.
- Formula calculation panel.
- Symbol guide.

## 12.2 Double Spring-Mass

### File

`src/components/DoubleSpringMassScene.jsx`

### Visible Features

- 3D left wall and right wall.
- Two spring meshes.
- Central moving block.
- Left and right force arrows.
- Velocity arrow.
- Equilibrium position marker.
- Play/pause behavior.
- Mass, spring constant, and amplitude controls.
- Calculation panel and modal explanation.

## 12.3 Simple Pendulum

### File

`src/components/PendulumScene.jsx`

### Visible Features

- 3D support beam.
- Pivot.
- Rod/string.
- Bob.
- Equilibrium marker.
- Length label.
- Velocity arrow.
- Tangential restoring force arrow.
- Maximum angle control through the amplitude parameter.
- Mass control.
- Formula and symbol guide panels.

## 13. Wave Simulations

## 13.1 Wave Markers Static

### File

`src/components/WaveStaticMarkersScene.jsx`

### Visible Features

- SVG wave curve.
- Amplitude marker.
- Wavelength marker.
- Initial phase marker.
- Period inset.
- Phase point marker.
- Clickable parameter blocks.
- Phase slider.
- Symbol guide.
- Color-coded highlights.

## 13.2 Transverse vs Longitudinal

### File

`src/components/WaveCompareScene.jsx`

### Visible Features

- Canvas graph for transverse wave.
- Canvas graph for longitudinal wave.
- Moving particles.
- Compression and rarefaction representation.
- Controls for amplitude, wavelength, angular frequency, and phase.
- Play/pause button.
- Live calculation list.
- Parameter explanation modal.

## 13.3 Standing Waves on a String

### File

`src/components/WaveStandingScene.jsx`

### Visible Features

- Canvas standing wave animation.
- Fixed-end string.
- Nodes.
- Antinodes.
- Harmonic mode control.
- String length control.
- Tension control.
- Frequency control.
- Linear density control.
- Live formula calculations.

## 14. Optics Simulations

## 14.1 Refraction

### File

`src/components/RefractionScene.jsx`

### Visible Features

- Canvas ray diagram.
- Medium 1 and Medium 2.
- Boundary line.
- Normal line.
- Incident ray.
- Reflected ray.
- Refracted ray.
- Angle arcs.
- Animated ray trace.
- Drag control for incident angle.
- Sliders for incidence angle, `n1`, and `n2`.
- Material preset modal for air, water, and glass.
- Total internal reflection condition.

## 14.2 Spherical Mirrors

### File

`src/components/MirrorFormulaScene.jsx`

### Visible Features

- Canvas ray diagram.
- Concave and convex mirror modes.
- Principal axis.
- Pole.
- Focus.
- Center of curvature.
- Object arrow.
- Image arrow.
- Ray construction.
- Dashed virtual ray extensions.
- Drag control for object position.
- Focal length slider.
- Object distance slider.
- Image nature, orientation, and size readouts.

## 15. Actually Used Learning Features

## 15.1 Calculation Panels

The simulation pages include calculation panels that show current values and allow users to open a short explanation when needed.

## 15.2 Symbol Guides

Symbol guides explain the notation used in the currently selected simulation without requiring the user to leave the page.

## 15.3 What To Notice Panel

The oscillation chapter includes a panel that explains the visible effect of parameter changes.

## 15.4 Guided Tour

The app includes a guided tour for the oscillation lab. It highlights:

- Calculations panel.
- Simulation viewer.
- Simulation selector.
- Parameter controls.
- What To Notice panel.

## 15.5 Resource Panel

The Resources button opens a study resources panel with relevant chapter PDFs. This is actively used in the current app and is the main supporting learning resource feature.

## 16. Actual Data Flow

The frontend data flow is:

1. User changes a parameter.
2. React updates state.
3. Derived physics values are recalculated using `useMemo`.
4. Selected scene component receives updated props.
5. The 3D, Canvas, or SVG scene updates.
6. Formula values and visual notices update.
7. User sees both the visual and mathematical result.

For 3D scenes, animation is handled using `requestAnimationFrame` inside Three.js components. For Canvas scenes, drawing is performed directly on the canvas every animation frame. For SVG scenes, React state changes update SVG attributes.

## 17. Rendering Methods Actually Used

## 17.1 Three.js

Used for:

- Single spring-mass.
- Double spring-mass.
- Simple pendulum.

Three.js is appropriate for these because they benefit from 3D geometry, lighting, perspective camera, and orbit controls.

## 17.2 Canvas

Used for:

- Transverse and longitudinal waves.
- Standing waves.
- Refraction.
- Spherical mirror diagrams.

Canvas is appropriate because these simulations require custom animated drawings and ray/curve updates.

## 17.3 SVG

Used for:

- Static wave marker diagram.

SVG is appropriate because the diagram is a scalable, clickable, label-heavy visual.

## 17.4 KaTeX

Used for:

- Formula display.
- Calculation panels.
- Symbol guides.
- Modal explanations.
- Parameter labels.

## 18. Active Assets

The project actively uses:

- `5373-183629075 (1).mp4` as landing page background video.
- `flow.png` as the how-it-works image.
- `resources/oscillations.pdf`.
- `resources/waves.pdf`.
- `resources/optics.pdf`.
- CSS-defined simulation card visuals.

The `physics_diagram/` folder contains diagram assets that support documentation and project explanation.

## 19. Build and Run Instructions

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production version:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## 20. Testing Done / Recommended Verification

The project should be tested by:

1. Opening the landing page.
2. Launching each chapter.
3. Opening each simulation.
4. Changing all parameter controls.
5. Testing play/pause buttons.
6. Dragging the incident ray in refraction.
7. Dragging the object arrow in the mirror simulation.
8. Opening the Resources panel.
9. Opening PDFs.
10. Checking calculation modals.
11. Running `npm run build`.

## 21. Implemented but Not Used in Current App Flow

The following features are present in the repository but are not actively used in the current main application UI:

| Feature | Current Status |
| --- | --- |
| Local RAG backend | Implemented in `rag_local/`, but not required for the active app. |
| `TemplateRagChat.jsx` | Implemented, but not imported/rendered in `App.jsx`. |
| RAG CSS styles | Present in `styles.css`, but not visible unless the chat component is connected. |
| ChromaDB indexing flow | Available separately, but not part of normal frontend usage. |
| Ollama answer generation | Optional backend feature, not used by the current app UI. |

These can be described as future extension work or optional experimental functionality.

## 22. Strengths of the Actual Application

1. It provides a complete interactive frontend experience.
2. It covers three major chapters: oscillations, waves, and optics.
3. It uses appropriate rendering methods for each simulation type.
4. It connects formulas with live visual behavior.
5. It includes chapter resources using local PDFs.
6. It provides a professional landing page and simulation selection flow.
7. It supports both stepper-style controls and drag-based interactions.
8. It is modular and easy to extend with more simulations.

## 23. Limitations of the Actual Application

1. RAG chat is implemented but not integrated into the active UI.
2. No automated test suite is currently included.
3. Some physics models are idealized for learning purposes.
4. Some advanced features like damping, resonance, and data export are not included.
5. Canvas-based simulations need stronger accessibility alternatives.
6. The app should be checked carefully on smaller mobile screens because the layouts are information-dense.

## 24. Future Scope

Future improvements can include:

1. Integrating the existing RAG chat into the Resources panel.
2. Adding damping and driven oscillation simulations.
3. Adding energy-time graphs.
4. Adding data export for experiments.
5. Adding more optics simulations such as lenses and prisms.
6. Adding accessibility text descriptions for Canvas scenes.
7. Adding automated tests.
8. Adding teacher mode or quiz mode.
9. Improving mobile layouts.

## 25. Conclusion

Unfold : Physics is an interactive browser-based physics simulation lab that is actively usable through its React frontend. The current working application includes a landing page, chapter-wise simulations, real-time controls, formula rendering, visual diagrams, guided learning panels, and PDF resources.

The actually used implementation is centered on React, Three.js, Canvas, SVG, KaTeX, and local static assets. Although a RAG backend and chat component are present in the repository, they are not currently part of the active app flow. Therefore, the final project should be presented mainly as an interactive physics simulation lab, with RAG mentioned only as an optional or future extension.

## 26. Actual Main File Summary

| File | Actually Used Purpose |
| --- | --- |
| `src/main.jsx` | Mounts the React app. |
| `src/RootApp.jsx` | Switches between landing page and lab. |
| `src/App.jsx` | Main simulation lab controller. |
| `src/components/LandingPage.jsx` | Landing page and simulation cards. |
| `src/components/SpringMassScene.jsx` | Single spring-mass 3D simulation. |
| `src/components/DoubleSpringMassScene.jsx` | Double spring-mass 3D simulation. |
| `src/components/PendulumScene.jsx` | Simple pendulum 3D simulation. |
| `src/components/WaveStaticMarkersScene.jsx` | Static wave marker simulation. |
| `src/components/WaveCompareScene.jsx` | Transverse and longitudinal wave simulation. |
| `src/components/WaveStandingScene.jsx` | Standing wave simulation. |
| `src/components/RefractionScene.jsx` | Refraction simulation. |
| `src/components/MirrorFormulaScene.jsx` | Spherical mirror simulation. |
| `src/components/TemplateResourcesPanel.jsx` | Active study resources panel. |
| `src/styles.css` | Application styling. |
| `resources/*.pdf` | Active study resources. |
