# 🧠 PROJECT: “Web Blender Lite” (AI-Built, Browser-Only)

## 🎯 Core Objective

Build a **browser-native 3D editor** (Blender-inspired) that:

* Runs fully client-side (CSR-first)
* Deploys on Cloudflare Pages
* Uses persistent browser storage
* Evolves via AI-driven iteration cycles

---

# 🧩 0. SYSTEM PHILOSOPHY (IMPORTANT FOR YOUR AI)

### Rules for the AI system:

1. **Never attempt full Blender parity**
2. Build **vertical slices** (end-to-end usable features)
3. Prefer **working systems over perfect abstractions**
4. Each iteration must:

   * Build → Test → Analyze → Reflect → Improve

---

# 🏗️ 1. CORE TECH STACK

## Rendering Engine (choose ONE)

* Primary: Babylon.js
* Alternative: PlayCanvas

👉 Recommendation: **Babylon.js**

* More complete API surface
* Better low-level access (you’ll need this for modeling)

---

## App Framework

* Next.js (CSR-only mode)
* OR Vite (simpler, often better for this use case)

👉 Recommendation for AI:

> Start with **Vite + React** → fewer constraints than Next.js

---

## State Management

* Zustand (preferred)
* Optional: Immer for immutable updates

---

## Storage Layer

* IndexedDB (primary persistence)
* localStorage (settings/cache)

Libraries:

* idb (lightweight IndexedDB wrapper)

---

## Math / Geometry

* gl-matrix
* custom mesh structures (required)

---

## File Formats

* glTF (primary)
* GLB (binary export)

---

# 🧱 2. HIGH-LEVEL ARCHITECTURE

```id="8l7k2x"
[ UI Layer (React) ]
        ↓
[ Editor State (Zustand) ]
        ↓
[ Scene Graph Layer ]
        ↓
[ Geometry Engine ]
        ↓
[ Rendering Engine (Babylon.js) ]
```

---

# 🧠 3. AI EXECUTION MODEL

Each task should follow this loop:

```id="ai-loop"
1. PLAN
2. IMPLEMENT
3. RUN (in browser)
4. VALIDATE (functional tests)
5. ANALYZE (what worked / failed)
6. REFLECT (store insights)
7. ITERATE
```

Store:

* Failures
* Performance issues
* UX friction points

---

# 🧩 4. PHASED DEVELOPMENT PLAN

---

## 🚀 PHASE 1 — FOUNDATION (Editor Shell)

### Goal:

A working 3D scene with UI + persistence

### Tasks:

* Initialize Vite + React project
* Integrate Babylon.js scene
* Add:

  * Camera controls (orbit, pan, zoom)
  * Grid + axis helper
* Build UI:

  * Toolbar
  * Scene hierarchy panel
  * Properties panel

### Persistence:

* Save/load scene JSON via IndexedDB

### Deliverable:

✅ Open app → create cube → save → reload → persists

---

## 🧱 PHASE 2 — SCENE GRAPH SYSTEM

### Goal:

Internal representation of objects

### Implement:

* Entity system:

  ```ts
  {
    id,
    name,
    transform: { position, rotation, scale },
    mesh,
    material
  }
  ```

* Scene tree:

  * Parent/child relationships

### Sync:

* State ↔ Babylon scene

---

## 🎮 PHASE 3 — TRANSFORM TOOLS (CRITICAL)

### Goal:

User can manipulate objects

### Features:

* Move / Rotate / Scale gizmos
* Axis constraints (X/Y/Z)
* Snapping (basic)

Use:

* Babylon GizmoManager (extend it)

---

## 🧊 PHASE 4 — PRIMITIVES + OBJECT SYSTEM

### Add:

* Cube
* Sphere
* Plane
* Cylinder

### UI:

* “Add Object” menu

---

## 💾 PHASE 5 — FILE SYSTEM

### Implement:

* Export:

  * GLB (via Babylon exporter)
* Import:

  * glTF / GLB

---

## ✏️ PHASE 6 — BASIC MESH EDITING (HARD PART BEGINS)

### Goal:

Minimal “edit mode”

### Features:

* Vertex selection
* Face selection
* Move vertices
* Simple extrude

### Requires:

Custom mesh structure:

```ts
{
  vertices: Float32Array,
  indices: Uint32Array
}
```

👉 AI NOTE:
This is where most attempts fail. Expect multiple iterations.

---

## 🎨 PHASE 7 — MATERIAL SYSTEM

### Add:

* Basic materials
* Color picker
* Texture support

---

## 🧠 PHASE 8 — AI AUGMENTATION LAYER

This is where your system shines.

### Add:

* “Generate object” prompt
* “Optimize mesh” command
* “Analyze scene” tool

AI should:

* Inspect scene graph
* Suggest improvements
* Auto-refactor structures

---

## ⚡ PHASE 9 — PERFORMANCE LAYER

### Optimize:

* Geometry batching
* Lazy loading
* Web Workers for heavy ops

---

## 🌐 PHASE 10 — DEPLOYMENT

### Target:

* Cloudflare Pages

### Requirements:

* Static build
* No server dependencies

### Storage:

* IndexedDB only
* Optional:

  * Export/import files manually

---

# 🧠 5. AI TASK STRUCTURE (IMPORTANT)

Each task should be defined like this:

```json
{
  "goal": "Implement object transform gizmos",
  "inputs": ["scene graph", "selected object"],
  "constraints": [
    "must run in browser",
    "no server calls"
  ],
  "success_criteria": [
    "object moves correctly",
    "updates persist"
  ],
  "validation": [
    "manual interaction test",
    "state consistency check"
  ]
}
```

---

# 🔁 6. SELF-IMPROVEMENT SYSTEM

Your idea is the real differentiator.

### AI should log:

* Execution time
* Errors
* UI friction (heuristics)
* Code complexity

### Then derive:

* “Patterns that worked”
* “Common failure points”

---

# 🧠 Suggested Reflection Schema

```json
{
  "task": "...",
  "result": "success | partial | failure",
  "issues": [...],
  "insights": [...],
  "next_actions": [...]
}
```

---

# ⚠️ 7. KNOWN HARD PROBLEMS

Make sure your AI is aware:

### Extremely hard:

* Mesh editing
* Undo/redo system
* State synchronization
* Performance at scale

### Medium:

* UI complexity
* Scene graph consistency

### Easy:

* Rendering
* Primitives
* File import/export

---

# 🔥 8. MVP DEFINITION (IMPORTANT)

Your AI should aim for this:

### “Blender Lite MVP”

* Scene editor ✅
* Transform tools ✅
* Primitive objects ✅
* Save/load ✅
* Import/export ✅

👉 NOT:

* Sculpting
* Rigging
* Full node system

---

# 🚀 9. FUTURE EXTENSIONS (AFTER MVP)

* Procedural geometry (huge for AI)
* Node-based materials
* Animation timeline
* Physics

---

# 💡 Final strategic insight

What you’re really building is NOT:

> “Blender in the browser”

It’s:

> **An AI-native 3D creation system that happens to resemble Blender**

That distinction matters, because:

* You can skip legacy UX constraints
* AI can become the primary interface
* You can leapfrog traditional tools in some areas

---

# ⚡ If you want next step

I can:

* Generate a **starter repo structure**
* Create **first 10 AI tasks pre-defined**
* Or design the **self-reflection + learning loop architecture** in detail

Just tell me how autonomous you want your system to be.
