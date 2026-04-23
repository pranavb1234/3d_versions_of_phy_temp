# Physics Lab - Interactive Lab for physics simulations

## Abstract
Physics Lab is a web-based interactive simulator that visualizes core concepts from oscillations and waves. It combines real-time 3D motion with math-driven readouts so learners can see how parameters change the motion and equations. The goal is to make abstract physics relationships intuitive through direct experimentation.

## Project Overview
This application is organized into two chapters: Oscillations and Waves. The Oscillations chapter includes spring-mass and pendulum systems rendered in 3D, while the Waves chapter focuses on visualizing wave parameters and displacement. Users can change parameters, pause/play motion, and read the corresponding formulas and calculations to connect theory with visuals.

## Features
- Single spring-mass SHM simulation in 3D
- Double spring-mass system in 3D
- Simple pendulum simulation in 3D
- Wave parameter snapshot with interactive markers
- Progressive wave displacement view with space and time graphs
- Real-time calculation panel with formula steps rendered via KaTeX
- Parameter controls and play/pause for simulations
- Legends, "what to notice" insights, and a guided tour overlay

## Tech Used
- React 18
- Three.js
- Vite
- KaTeX
- JavaScript, HTML, CSS

## Current Progress / Work Done
- Core UI shell with chapter switching and simulation selection
- Oscillations chapter implemented with three 3D scenes (single spring, double spring, pendulum)
- Calculation panel and modal details for physics formulas
- Wave static marker snapshot for parameter explanations
- Wave displacement y(x,t) simulation with controls and readouts
- Play/pause controls, parameter steppers, and guided tour highlights

## Future Scope / Pending Work
- Add transverse and longitudinal wave simulations (currently listed as coming soon)
- Expand adjustable parameters (for example, pendulum length and gravity)
- Add damping or driven oscillation modes and energy-time graphs
- Add measurement tools or exportable data for lab-style analysis

## Local Offline RAG (ChromaDB + Local Embeddings)

This repo now includes a fully local retrieval pipeline:
- Local embeddings via `sentence-transformers`
- Local vector storage via `ChromaDB` persistent directory
- Template-scoped chat API (`chapterId` + `templateId` filters)
- Optional local generation with Ollama if `OLLAMA_MODEL` is set

### 1) Start frontend
```bash
npm install
npm run dev
```

### 2) Start local RAG API
```bash
cd rag_local
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python build_index.py
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

The UI chat panel calls `http://127.0.0.1:8001` by default.

### 3) Optional local LLM generation (still offline)
If you use Ollama locally:
```bash
set OLLAMA_MODEL=llama3.1
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

Without `OLLAMA_MODEL`, the API still runs in retrieval-only mode and returns answer snippets from indexed local chunks.
