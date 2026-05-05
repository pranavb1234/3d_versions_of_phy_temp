# System Workflow

This workflow gives a high-level view of how a learner moves through the physics simulation app, from opening the web app to exploring simulations, reading calculations, and using resources.

```mermaid
flowchart TD
    A[User Opens Web App] --> B[Selects Chapter]
    B --> C{Chapter Type}

    C -->|Oscillations| D[Selects Oscillation Simulation]
    C -->|Waves| E[Selects Wave Simulation]
    C -->|Optics| F[Selects Optics Simulation]

    D --> G[Render Selected Simulation Scene]
    E --> G
    F --> G

    G --> H[User Interacts With Simulation]

    H --> I{Interaction Type}
    I -->|Change Parameters| J[Update Mass, Spring Constant, Amplitude, or Angle]
    I -->|Play or Pause| K[Toggle Simulation Motion]
    I -->|Open Calculation| L[Display Formula Details and Steps]
    I -->|Open Symbol Guide| M[Display Concept Explanation]
    I -->|Open Resources| N[Show Template Resources Panel]
    I -->|Start Tour| O[Show Guided Walkthrough]

    J --> P[Recalculate Physics Values]
    P --> Q[Update Scene, Calculations, and Notices]
    Q --> H

    K --> G
    L --> H
    M --> H
    N --> H
    O --> H

    H --> R{User Changes Chapter or Simulation?}
    R -->|Yes| B
    R -->|No| S{User Continues Exploring?}

    S -->|Yes| H
    S -->|No| T[User Leaves App or Returns Home]
```

## Workflow Notes

- The user first chooses a chapter: Oscillations, Waves, or Optics.
- Each chapter has its own simulation options.
- The selected simulation renders in the main scene area.
- For oscillation simulations, the user can adjust parameters and see formulas, values, explanations, and the scene update together.
- The resources panel provides supporting learning material for the selected chapter and simulation.
- The guided tour helps new users understand the main areas of the interface.
- The user can keep switching chapters and simulations without restarting the app.

## App-Specific Flow

```mermaid
flowchart TD
    A[Open Simulation Lab] --> B[Choose Chapter]
    B --> C[Choose Simulation]
    C --> D[Load Interactive Scene]
    D --> E[Show Supporting Panels]

    E --> F[Calculations Panel]
    E --> G[Simulation Viewer]
    E --> H[Parameter Controls]
    E --> I[What To Notice]
    E --> J[Resources Panel]

    H --> K[User Adjusts Values]
    K --> L[Physics Formulas Recompute]
    L --> M[Visual Scene Updates]
    L --> N[Calculated Results Update]
    L --> O[Effect Highlight Appears]

    F --> P[User Opens Calculation Modal]
    P --> Q[View Formula, Substitution Steps, and Explanation]
    Q --> F

    J --> R[User Reads Related Content]
    R --> D

    M --> S{Continue Learning?}
    N --> S
    O --> S
    S -->|Try More Changes| H
    S -->|Select Another Simulation| C
    S -->|Select Another Chapter| B
    S -->|Finish| T[Exit or Back to Main Page]
```

## Technical Architecture

This section explains what happens inside the app when the user changes values and the simulation updates.

### React State and Derived Data Flow

```mermaid
flowchart LR
    A[User Input Controls] --> B[React State in App.jsx]

    B --> B1[chapterId]
    B --> B2[templateId]
    B --> B3[waveSimId]
    B --> B4[opticsSimId]
    B --> B5[mass]
    B --> B6[springConstant]
    B --> B7[amplitude]
    B --> B8[isPlaying]

    B1 --> C[Active Chapter Config]
    B2 --> D[Active Simulation Config]
    B3 --> D
    B4 --> D

    B5 --> E[useMemo: calculations]
    B6 --> E
    B7 --> E
    B2 --> E

    B5 --> F[useMemo: effects]
    B6 --> F
    B7 --> F
    B2 --> F

    B --> G[useEffect: detect changed parameter]
    G --> H[canvasNotice]
    G --> I[activeEffectKey]

    D --> J[Selected Scene Component]
    B5 --> J
    B6 --> J
    B7 --> J
    B8 --> J

    E --> K[Calculations Panel]
    F --> L[What To Notice Panel]
    H --> M[Scene Toast Notice]
    I --> L
    J --> N[Rendered Three.js or Interactive Scene]
```

### Parameter Change Sequence

```mermaid
sequenceDiagram
    actor User
    participant Controls as Parameter Controls
    participant App as App.jsx State
    participant Memo as useMemo Calculations
    participant Effect as useEffect Change Detector
    participant Scene as Active Scene Component
    participant UI as Panels and Toasts

    User->>Controls: Click + or - button
    Controls->>App: setMass / setSpringConstant / setAmplitude
    App->>Memo: Recompute formulas and derived values
    App->>Effect: Compare previous params with current params
    Effect->>App: Set activeEffectKey and canvasNotice
    App->>Scene: Pass updated props
    Scene->>Scene: Recalculate omega, position, velocity, force
    Scene->>UI: Render updated canvas objects
    Memo->>UI: Render updated calculation rows
    App->>UI: Show highlighted effect and toast
```

### Simulation Render Loop

The oscillation scene components create a Three.js scene once, then update object positions during animation. When React props change, the scene effect runs with the latest values.

```mermaid
flowchart TD
    A[Scene Component Receives Props] --> B[Create Three.js Scene]
    B --> C[Create Camera, Lights, Floor, Labels, Arrows, Meshes]
    C --> D[Calculate Physics Constants]

    D --> D1[omega = sqrt(k / m)]
    D --> D2[position = equilibrium + A * sin(theta)]
    D --> D3[velocity = A * omega * cos(theta)]
    D --> D4[force = -k * displacement]

    D --> E{isPlaying?}
    E -->|Yes| F[Advance theta using delta time]
    E -->|No| G[Keep current phase]

    F --> H[Update Mesh Positions]
    G --> H

    H --> I[Update Spring Scale and Anchors]
    I --> J[Update Velocity and Force Arrows]
    J --> K[Update Labels and Checkpoint Text]
    K --> L[renderer.render scene camera]
    L --> E

    A --> M{Props Changed?}
    M -->|mass, k, amplitude, or play state changed| N[Cleanup old scene resources]
    N --> B
```

### Oscillation Formula Pipeline

```mermaid
flowchart TD
    A[Current Input Values] --> B[Clamp to Safe Values]
    B --> C{Selected Oscillation Template}

    C -->|Single Spring-Mass| D[k_eff = k]
    C -->|Double Spring-Mass| E[k_eff = 2k]
    C -->|Simple Pendulum| F[Use length and gravity model]

    D --> G[omega = sqrt(k_eff / m)]
    E --> G
    G --> H[T = 2 * pi * sqrt m / k_eff]
    G --> I[v_max = omega * A]
    G --> J[a_max = omega^2 * A]
    D --> K[Energy = 1/2 * k_eff * A^2]
    E --> K

    F --> L[theta_0 from amplitude control]
    L --> M[omega = sqrt(g / L)]
    M --> N[T = 2 * pi * sqrt L / g]
    M --> O[v_max = theta_0 * omega * L]
    M --> P[Energy approximation from angular motion]

    H --> Q[Calculation Rows]
    I --> Q
    J --> Q
    K --> Q
    N --> Q
    O --> Q
    P --> Q

    Q --> R[Calculation Panel]
    Q --> S[Calculation Detail Modal]
```

### Component Responsibility Map

```mermaid
flowchart TB
    A[App.jsx] --> B[Top Bar]
    A --> C[Chapter and Simulation Selection]
    A --> D[Oscillation Layout]
    A --> E[Waves or Optics Layout]
    A --> F[TemplateResourcesPanel]
    A --> G[Tour Overlay]

    D --> H[Calculations Panel]
    D --> I[Active Oscillation Scene]
    D --> J[Parameter Controls]
    D --> K[What To Notice Panel]
    D --> L[Calculation Modal]

    I --> M[SpringMassScene]
    I --> N[DoubleSpringMassScene]
    I --> O[PendulumScene]

    E --> P[WaveStaticMarkersScene]
    E --> Q[WaveCompareScene]
    E --> R[WaveStandingScene]
    E --> S[RefractionScene]
    E --> T[MirrorFormulaScene]

    F --> U[Study Resources Drawer]
    G --> V[Guided Step Highlighting]
```

### Data Ownership Summary

| Area | Owner | Purpose |
| --- | --- | --- |
| Chapter selection | `App.jsx` | Decides which chapter view is active. |
| Simulation selection | `App.jsx` | Decides which scene component should render. |
| Physics inputs | `App.jsx` | Stores values such as mass, spring constant, amplitude, and play state. |
| Calculated values | `useMemo` in `App.jsx` | Recomputes formula rows whenever inputs change. |
| Effect messages | `useMemo` and `useEffect` in `App.jsx` | Highlights what changed and displays notices. |
| 3D object motion | Scene components | Uses current props to update meshes, springs, arrows, and labels. |
| Resources panel | `TemplateResourcesPanel.jsx` | Opens and closes the study resources drawer. |
