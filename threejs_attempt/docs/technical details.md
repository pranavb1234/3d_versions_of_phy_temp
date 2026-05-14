# Technical Details

## Project Overview

**Unfold : Physics** is a browser-based interactive physics simulation lab. The active application is built as a frontend web app using React, Vite, Three.js, HTML Canvas, SVG, KaTeX, CSS, and local static assets.

The project is designed around a simple user flow: the learner opens the landing page, selects a chapter, chooses a simulation, adjusts parameters, watches the visual scene update, and opens supporting learning resources when needed.

This document focuses only on technical implementation details. It does not include equations, formula derivations, or mathematical explanations.

## Runtime Architecture

The project runs as a single-page React application. Vite serves the app during development and creates the optimized production build.

The browser loads `index.html`, which provides the root DOM element. React is mounted from `src/main.jsx`, and the application tree starts from `RootApp.jsx`.

The main runtime flow is:

1. `index.html` loads the frontend bundle.
2. `src/main.jsx` mounts the React app into the page.
3. `RootApp.jsx` decides whether to show the landing page or the simulation lab.
4. `LandingPage.jsx` lets the user enter the lab or launch a selected simulation.
5. `App.jsx` controls the simulation workspace, selected chapter, selected simulation, controls, panels, modals, and resources.
6. The selected scene component renders the active simulation using Three.js, Canvas, or SVG.

## Main Technologies Used

| Technology | Purpose in the Project |
| --- | --- |
| React | Builds the component-based user interface and manages UI state. |
| React DOM | Mounts the React app into the browser page. |
| Vite | Provides development server, module bundling, asset handling, and production build. |
| Three.js | Renders the interactive 3D simulations. |
| OrbitControls | Allows camera rotation, zooming, and inspection in 3D scenes. |
| HTML Canvas | Draws animated 2D simulations and ray diagrams. |
| SVG | Draws scalable static diagrams with clickable visual areas. |
| KaTeX | Renders mathematical notation inside panels, labels, and modals. |
| CSS | Controls layout, styling, responsiveness, panels, buttons, modals, and scene containers. |
| Local PDF assets | Provides chapter-wise study resources inside the app. |

## Application Entry Point

The application starts from `src/main.jsx`.

This file imports React, React DOM, the root component, and global styles. It creates a React root using the HTML element with the id `root`, then renders `RootApp` inside `React.StrictMode`.

This keeps the browser page lightweight. The real app structure is controlled by React components rather than separate HTML pages.

## Root Application Control

`src/RootApp.jsx` manages the first major branch of the application:

- Landing page view.
- Simulation lab view.

It stores whether the user has entered the lab and remembers the selected launch context. The launch context contains the selected chapter and selected simulation. When the user starts from the landing page, this context is passed into `App.jsx` so the correct simulation opens directly.

`RootApp.jsx` also updates the document body class when the lab is active. This allows the CSS file to apply different layout behavior for the simulation workspace.

## Landing Page Implementation

`src/components/LandingPage.jsx` provides the public first screen of the project.

It contains:

- Project introduction.
- Background media.
- Start action.
- Chapter selection.
- Simulation cards.
- Navigation into the lab.
- Visual explanation of the workflow.

The landing page does not run the simulations itself. Its main technical role is to collect the user's intended chapter and simulation, then call the start handler from `RootApp.jsx`.

## Simulation Lab Controller

`src/App.jsx` is the main controller for the active lab interface.

It manages:

- Current chapter.
- Current simulation.
- Oscillation input values.
- Play and pause state.
- Calculation panel data.
- Symbol guide data.
- Active modal state.
- Parameter change notices.
- Guided tour state.
- Resources panel state.
- Selection of the active scene component.

The component uses React state for values that change through user interaction. It uses memoized derived data for calculated UI rows, symbol guides, effect messages, and chapter configuration. This keeps the interface responsive while avoiding unnecessary recalculation on every render.

## Chapter and Simulation Selection

The app supports three active chapters:

- Oscillations.
- Waves.
- Optics.

Each chapter has its own simulation list. `App.jsx` keeps separate selected simulation state for oscillations, waves, and optics. This lets the app remember the selected simulation inside each chapter while the user switches between chapters.

The active scene is selected from configuration objects. Each configuration entry includes labels, titles, descriptions, and the React component that should render the simulation.

## State Management Approach

The project uses local React state rather than a global state library. This is suitable because most state belongs directly to the current page and does not need to be shared across unrelated application areas.

State is stored with React hooks such as:

- `useState` for selected chapter, selected simulation, parameter values, modal visibility, and play state.
- `useMemo` for values derived from current state.
- `useEffect` for side effects such as keyboard handlers, resize handling, notices, guided tour positioning, and animation setup.
- `useRef` for mutable runtime values used inside animation loops without forcing React re-renders.

This architecture keeps fast animation work separate from normal React rendering.

## 3D Simulation Rendering

Three.js is used for the oscillation simulations:

- `SpringMassScene.jsx`
- `DoubleSpringMassScene.jsx`
- `PendulumScene.jsx`

Each Three.js scene component creates its own scene, camera, renderer, lights, geometry, materials, labels, arrows, and controls.

The scene components use a container `ref` to attach the WebGL canvas created by Three.js. The renderer is sized to match the container, and a `ResizeObserver` updates the renderer and camera when the layout changes.

The 3D scenes use:

- `THREE.Scene` for the scene graph.
- `THREE.PerspectiveCamera` for depth and perspective.
- `THREE.WebGLRenderer` for rendering.
- Mesh geometry for physical objects.
- Materials for color, roughness, and lighting response.
- Lights for visibility and shadows.
- `OrbitControls` for user camera interaction.
- Sprite-based text labels created from canvas textures.
- Arrow helpers for direction indicators.

The animation loop is driven by `requestAnimationFrame`. Each frame updates visual object positions, labels, arrows, camera controls, and then renders the scene.

## Three.js Resource Cleanup

The Three.js components include cleanup logic in their React effects.

When a scene component unmounts or is recreated with new props, the cleanup process:

- Cancels the animation frame.
- Disconnects resize observers.
- Disposes camera controls.
- Disposes geometries.
- Disposes materials.
- Disposes textures.
- Disposes the renderer.
- Removes the renderer canvas from the DOM container.

This is important because WebGL resources are managed outside normal React DOM cleanup. Without explicit disposal, repeated scene reloads could leave unused GPU resources in memory.

## Canvas Simulation Rendering

HTML Canvas is used for animated 2D simulations and optics diagrams.

Canvas-based components include:

- `WaveCompareScene.jsx`
- `WaveStandingScene.jsx`
- `RefractionScene.jsx`
- `MirrorFormulaScene.jsx`

These components use canvas references and wrapper references. The canvas is resized according to the wrapper size and device pixel ratio. This keeps drawings crisp on high-resolution screens.

Canvas scenes follow this pattern:

1. Measure the wrapper size.
2. Scale the canvas for the device pixel ratio.
3. Store drawing context and size metrics in refs.
4. Store fast-changing animation values in refs.
5. Run a `requestAnimationFrame` loop.
6. Clear and redraw the full scene every frame.

This approach is appropriate for diagrams that are redrawn continuously, such as waves, light rays, moving particles, angle arcs, and object-image diagrams.

## SVG Simulation Rendering

SVG is used for the static wave marker simulation in `WaveStaticMarkersScene.jsx`.

SVG is useful here because the diagram is label-heavy, scalable, and interactive. React can update SVG attributes directly when the selected marker or phase value changes.

The SVG scene uses normal React rendering instead of a manual animation loop. This makes it easier to handle clickable blocks, highlighted markers, and crisp vector labels.

## Formula and Notation Rendering

KaTeX is used to render notation in the interface. The app imports KaTeX and its CSS, then converts notation strings into HTML using `katex.renderToString`.

Rendered notation appears in:

- Calculation panels.
- Calculation detail modals.
- Symbol guides.
- Parameter labels.
- Readout panels.
- Scene explanations.

The project uses `dangerouslySetInnerHTML` for KaTeX output because KaTeX returns prepared HTML markup. The notation content is defined inside the project source, not accepted from arbitrary user input in the active UI.

## Resource Panel System

`src/components/TemplateResourcesPanel.jsx` implements the active study resources feature.

It receives the current chapter, simulation, labels, open state, and close handler from `App.jsx`.

The component maps each chapter to a local PDF:

- Oscillations uses `resources/oscillations.pdf`.
- Waves uses `resources/waves.pdf`.
- Optics uses `resources/optics.pdf`.

It also maps each simulation to a starting page. When the user opens the resource, the PDF is displayed inside an iframe with a page anchor. The user can also open the same PDF in a new browser tab.

The panel supports Escape key handling. Pressing Escape closes the embedded PDF first, then closes the panel if the PDF viewer is already closed.

## Asset Handling

Vite handles static imports for project assets. PDF files are imported into React components and resolved into usable browser URLs during development and production builds.

The project uses:

- A background video on the landing page.
- A workflow image on the landing page.
- Local PDF resources.
- Documentation diagrams under `physics_diagram/`.

Frontend assets are kept local to the project, so the active app does not require a network request to load core educational resources.

## Styling System

The project uses a single main stylesheet: `src/styles.css`.

The stylesheet controls:

- Landing page layout.
- Lab workspace layout.
- Top bar.
- Chapter and simulation selectors.
- Three-column oscillation layout.
- Wave and optics layouts.
- Canvas containers.
- 3D scene containers.
- Buttons and sliders.
- Calculation panels.
- Symbol guides.
- Modals.
- Guided tour overlay.
- Resources drawer.
- Responsive behavior.

The CSS is class-based and component-oriented. Components assign semantic class names, while styling decisions remain centralized in the stylesheet.

## Guided Tour Implementation

The guided tour is managed inside `App.jsx`.

Tour steps are stored as configuration objects. Each step includes a title, description, and a selector for the element that should be highlighted.

When the tour runs, the app finds the target element in the DOM, reads its position, and places a spotlight and tooltip around it. Window resize and scrolling are handled so the overlay stays aligned with the target.

The tour is currently focused on the oscillation lab interface because that layout has the richest multi-panel workspace.

## User Interaction Handling

The project uses different interaction patterns depending on the simulation type.

Oscillation simulations use:

- Stepper buttons.
- Play and pause button.
- Calculation row modal buttons.
- Symbol guide details.
- Guided tour controls.
- OrbitControls for camera movement.

Wave simulations use:

- Sliders.
- Play and pause button.
- Parameter info modals.
- Clickable diagram markers.
- Canvas animation loops.

Optics simulations use:

- Sliders.
- Drag interactions on canvas.
- Material preset modal.
- Reset buttons.
- Animated ray tracing.

Pointer events are used where direct dragging is needed, especially in optics scenes.

## Animation Strategy

The app avoids using React state for every animation frame. Instead, React state stores user-facing values, while animation loops use refs for values that change quickly.

This gives two benefits:

- The simulation can animate smoothly without triggering constant React re-renders.
- React still controls the visible UI state, selected options, and panel content.

Three.js scenes render through WebGL. Canvas scenes redraw using the 2D drawing context. SVG scenes update through React attributes.

## Component Responsibility Map

| File | Technical Responsibility |
| --- | --- |
| `src/main.jsx` | Mounts the React application. |
| `src/RootApp.jsx` | Switches between landing page and lab. |
| `src/App.jsx` | Controls lab state, scene selection, panels, modals, tour, and resources. |
| `src/components/LandingPage.jsx` | Provides entry page and simulation launch choices. |
| `src/components/SpringMassScene.jsx` | Renders the single spring-mass 3D scene. |
| `src/components/DoubleSpringMassScene.jsx` | Renders the double spring-mass 3D scene. |
| `src/components/PendulumScene.jsx` | Renders the pendulum 3D scene. |
| `src/components/WaveStaticMarkersScene.jsx` | Renders the SVG wave marker diagram. |
| `src/components/WaveCompareScene.jsx` | Renders Canvas views for transverse and longitudinal waves. |
| `src/components/WaveStandingScene.jsx` | Renders the Canvas standing wave simulation. |
| `src/components/RefractionScene.jsx` | Renders the interactive Canvas refraction scene. |
| `src/components/MirrorFormulaScene.jsx` | Renders the interactive Canvas mirror scene. |
| `src/components/TemplateResourcesPanel.jsx` | Displays chapter-specific PDF resources. |
| `src/styles.css` | Styles the full application. |

## Active Frontend Data Flow

The active app follows a unidirectional data flow:

1. The user interacts with controls.
2. A React state setter updates the relevant value.
3. `App.jsx` recomputes derived UI data where needed.
4. The active scene receives updated props.
5. The scene updates its rendered output.
6. Panels, readouts, notices, and modals reflect the latest state.

This makes the app predictable because the selected chapter, selected simulation, and parameter values all have clear owners.

## Optional Local RAG Backend

The repository also contains a local RAG backend under `rag_local/`.

Important files include:

- `rag_local/server.py`
- `rag_local/build_index.py`
- `rag_local/requirements.txt`
- `rag_local/knowledge/templates.json`
- `src/components/TemplateRagChat.jsx`

This backend is present in the repository, but it is not connected to the active main user interface. The visible app currently uses `TemplateResourcesPanel.jsx` for resources instead of the RAG chat component.

Technically, the RAG folder can be treated as an optional extension area. It is separate from the Vite frontend and would need its own Python environment and backend process if it were integrated later.

## Build System

The build system is defined in `package.json`.

Available scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Creates the production build in `dist/`. |
| `npm run preview` | Serves the production build locally for checking. |

The project uses ES modules, as shown by the package configuration.

## Dependency Summary

Runtime dependencies:

- `react`
- `react-dom`
- `three`
- `katex`

Development dependencies:

- `vite`
- `@vitejs/plugin-react`

The dependency set is intentionally small. Most application behavior is implemented directly with React, browser APIs, Three.js, Canvas, SVG, and CSS.

## Performance Considerations

The app includes several implementation choices that support performance:

- Animation loops use refs instead of React state for frame-by-frame values.
- Canvas scenes redraw only their own canvas areas.
- Three.js scenes dispose resources during cleanup.
- Device pixel ratio is capped when sizing renderers and canvases.
- Derived UI data is memoized where appropriate.
- Scene components are selected through configuration instead of large conditional rendering blocks inside every scene.

These choices help keep interaction smooth while still allowing rich visual simulations.

## Browser APIs Used

The frontend uses standard browser APIs such as:

- `requestAnimationFrame` for animation.
- `ResizeObserver` for responsive scene sizing.
- Pointer events for drag interaction.
- Keyboard events for closing panels.
- DOM measurements for guided tour positioning.
- iframe embedding for PDF viewing.

These APIs allow the app to remain fully browser-based without requiring a separate rendering engine.

## Current Technical Limitations

The current project has a few technical limitations:

- There is no automated test suite included.
- Canvas diagrams have limited accessibility compared with normal HTML content.
- The local RAG backend is not connected to the active UI.
- Some scene logic is large and could be split into helper modules later.
- The app relies on browser PDF support for embedded resource viewing.
- Complex simulations may need additional mobile layout tuning on smaller screens.

## Extension Possibilities

Future technical improvements could include:

- Connecting the existing RAG backend to the resources panel.
- Adding automated component and interaction tests.
- Splitting large scene components into smaller rendering utilities.
- Adding accessibility descriptions for Canvas scenes.
- Adding saved simulation presets.
- Adding export options for screenshots or experiment data.
- Adding more chapters through the existing configuration pattern.

## Conclusion

The project is technically centered on a React and Vite frontend. React manages the application state and interface, Three.js handles 3D simulations, Canvas handles animated 2D diagrams, SVG handles scalable static diagrams, KaTeX renders notation, and local PDF assets provide supporting study material.

The active app is modular: `RootApp.jsx` controls entry flow, `App.jsx` controls the lab, and individual scene components own their rendering method. This structure makes the project understandable, extendable, and suitable for adding more simulations in the future.
