# BlenderGL - Implementation Plan

**Category:** Architecture
**Last Updated:** 2026-03-27
**Status:** Active
**License:** MIT

---

## Quick Summary

BlenderGL is an AI-native 3D creation system for the web, built with Babylon.js + React + TypeScript. It deploys as a static CSR app to Cloudflare Pages with PWA support, IndexedDB persistence, and provides a Blender3D-inspired editing experience that's cross-device and cross-platform.

**Core Philosophy:** Not "Blender in the browser" — an AI-native 3D creation system that happens to resemble Blender, skipping legacy UX constraints while leveraging Blender3D's open-source architecture as reference.

---

## Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Rendering | Babylon.js | v9 | Most complete WebGL2 API, built-in gizmos, physics |
| UI Framework | React + TypeScript | 19 / 5.9 | Component ecosystem, type safety |
| Build Tool | Vite | v8 | Fast HMR, CSR-first, optimized static builds |
| State | Zustand + Immer | v5 / v11 | Lightweight, performant, immutable updates |
| Storage | IndexedDB (idb) | v8 | Persistent browser storage for scenes/assets |
| Routing | React Router | v7 | SPA routing for landing page + editor |
| Styling | Tailwind CSS | v4 | Utility-first, dark theme, responsive |
| Testing | Vitest + RTL | v4 | Fast, ESM-native, Vite-integrated |
| Linting | ESLint + Prettier | v9 / v3 | Code quality |
| PWA | Manual Service Worker | — | Offline, installable (vite-plugin-pwa incompatible with Vite 8) |
| Deploy | Cloudflare Pages | Wrangler | Global CDN, free tier, Git integration |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Landing Page                          │
│              (Marketing + CTA → Launch)                  │
└──────────────────────┬──────────────────────────────────┘
                       │ /editor
┌──────────────────────▼──────────────────────────────────┐
│                  Editor Shell (React)                     │
│  ┌─────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│  │ Toolbar  │ │    3D Viewport   │ │ Properties Panel │  │
│  │         │ │  (Babylon.js)    │ │                  │  │
│  ├─────────┤ │                  │ ├──────────────────┤  │
│  │ Scene   │ │                  │ │ Material Editor  │  │
│  │ Hierarchy│ │                  │ │                  │  │
│  └─────────┘ └──────────────────┘ └──────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Status Bar / AI Assistant               ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Editor State (Zustand)                      │
│  Scene Graph • Selection • History • Settings • Material│
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Scene Graph Layer                           │
│  Entities • Components • Parent-Child • Transform Tree  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Geometry Engine (Phase 8+)                  │
│  Half-Edge Mesh • BVH • Raycasting • Operations         │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Rendering Engine (Babylon.js)               │
│  WebGL2 • Standard Materials • Post-Processing          │
└─────────────────────────────────────────────────────────┘
```

### State Flow

```
User Input → React Component → Zustand Store → useEffect → Babylon.js Scene
                                     ↑                           |
                                     └──── Selection/Pick ────────┘
```

### Entity-Mesh Sync

The Viewport component maintains a `Map<string, AbstractMesh>` that mirrors the Zustand entity store:

1. **Entity added** → Create Babylon mesh, add to map
2. **Entity removed** → Dispose Babylon mesh, remove from map
3. **Transform changed** → Sync position/rotation/scaling to mesh
4. **Material changed** → Sync diffuse/specular/alpha to mesh material
5. **Selection changed** → Toggle outline rendering on mesh

---

## Phase Breakdown

### Phase 1: Project Foundation (COMPLETE)
- Vite 8 + React 19 + TypeScript 5.9 scaffold
- Babylon.js v9, Zustand v5, Immer, idb, react-router-dom v7
- Tailwind CSS v4, Vitest v4, ESLint v9, Prettier
- Project structure: `src/editor/`, `src/landing/`, `__tests__/`
- MIT License, .gitignore, tsconfig

### Phase 2: 3D Viewport + Editor Shell (COMPLETE)
- Babylon.js scene: arc-rotate camera, hemisphere + directional lights
- Color-coded grid (X=red, Y=green, Z=blue) via MeshBuilder.CreateLines
- Editor layout: toolbar (top), viewport (center), hierarchy (left), properties (right)
- ResizeObserver for responsive canvas
- Zustand stores: scene, selection, history, settings, material
- IndexedDB save/load for scenes

### Phase 3: Scene Graph + Primitives (COMPLETE)
- Entity/component type system with TypeScript interfaces
- 6 primitives via PrimitiveFactory: cube, sphere, plane, cylinder, cone, torus
- Scene hierarchy tree with visibility/lock toggles
- Raycast picking via scene.onPointerObservable
- Shift-click multi-select, hover highlighting

### Phase 4: Transform Tools + Undo/Redo (COMPLETE)
- TransformGizmoController wrapping Babylon GizmoManager
- Move (W), Rotate (E), Scale (R) keyboard shortcuts
- Axis constraints, snap toggle
- Properties panel: position/rotation/scale numeric inputs
- Command pattern: TransformCommand, AddEntityCommand, DeleteEntityCommand
- UndoRedoManager with max history size

### Phase 5: Materials + File I/O (COMPLETE)
- Material store per entity (albedo, metallic, roughness, emissive, opacity)
- Material panel in properties sidebar with color picker and sliders
- GLB export via GLTF2Export.GLBAsync from @babylonjs/serializers
- JSON scene export
- IndexedDB scene persistence (save/load/list/delete)

### Phase 6: Landing Page + PWA (COMPLETE)
- Modern landing page with gradient hero, feature cards, CTA
- PWA manifest (public/manifest.json)
- Manual service worker with network-first caching (public/sw.js)
- React Router: `/` → landing, `/editor` → editor
- SW registration in main.tsx

### Phase 7: Cloudflare Pages Deployment (COMPLETE)
- wrangler.toml configuration
- GitHub Actions CI/CD (.github/workflows/deploy.yml)
- Build: tsc + vite build → dist/
- Auto-deploy on push to main

### Phase 8: Mesh Editing (Edit Mode) — COMPLETE
- Object mode vs Edit mode (Tab key toggle)
- Direct vertex buffer manipulation (no half-edge structure)
- Vertex/edge/face selection with highlighting
- Extrude and delete face operations with undo/redo
- Wireframe overlay rendering
- Edit mode UI in toolbar and properties panel

### Phase 9: Advanced Editor Features — COMPLETE
- Viewport shading modes: wireframe, solid, material (Z key cycle)
- Camera presets (Numpad 1/3/7 for front/right/top, Ctrl for opposite)
- Perspective/Ortho toggle (Numpad 5)
- Grid + snap configuration panel (size, subdivisions, increment, angle)
- Snap toggle with visual indicator
- Duplicate entities (Shift+D) with undo/redo
- Parent/child linking (Ctrl+P, Alt+P)
- Enhanced status bar (coordinates, mode, selection count)
- Right-click context menus
- Auto-save with debounced persistence

### Phase 10: AI Augmentation — COMPLETE
- Collapsible AI assistant panel in editor
- Chat interface with streaming responses
- Anthropic and OpenAI API support (browser-direct, no backend)
- "Generate object" tool — create primitives from text
- "Set material" tool — apply properties to selected
- "Analyze scene" tool — return stats
- "Arrange objects" tool — grid layout
- AI settings UI (provider, API key, endpoint, model)
- localStorage persistence for API keys

### Phase 11: Feature Completion — COMPLETE
- glTF/GLB import via Babylon SceneLoader
- Asset browser (saved scenes from IndexedDB)
- Right-click context menu (object/edit mode items)
- Box select (drag rectangle selection)
- Grid/snap settings panel (size, subdivisions, snap, angle)
- Advanced mesh operations (subdivide, merge, inset)
- Texture upload component

### Phase 12: 3D Printing & Slicing — PLANNED
- STL export (binary + ASCII) from Babylon.js mesh geometry
- 3MF export/import (manufacturing format)
- Mesh manifold validation (watertight check, non-manifold edge detection)
- Mesh repair (fill holes, fix normals, remove degenerate faces)
- Boolean operations via CSG (union, difference, intersection)
- Print preparation panel (mesh analysis: volume, dimensions, estimated print time)
- Print settings: layer height, infill density/pattern, shell thickness, support generation
- G-code generation (basic FDM paths: perimeter, infill, support)
- Print preview (layer-by-layer visualization)
- Printer profile management (bed size, nozzle diameter, supported materials)

### Phase 13: Scripting Engine — PLANNED
- Monaco Editor integration for in-browser code editing (JavaScript/TypeScript)
- Scripting API surface: `blendergl.scene`, `blendergl.ops`, `blendergl.data`
- Script sandbox execution (Web Worker isolation, restricted globals)
- Script types: startup scripts, operator scripts, callback scripts
- Script console with output/error display
- Script editor panel (new editor space, tab alongside 3D viewport)
- Hot-reload on script save
- Script library browser (saved scripts in IndexedDB)
- Pre-built API examples and templates
- Auto-complete for scripting API

### Phase 14: Rigging & Animation — PLANNED
- Babylon.js Skeleton system integration (bones, bone hierarchy)
- Bone creation/editing mode (armature component on entities)
- Bone constraints: IK solver, look-at, parent, track-to
- Weight painting mode (vertex-to-bone weight assignment)
- Skinned mesh rendering (attach mesh to skeleton)
- Keyframe animation system (timeline, key insertion/deletion)
- Animation blending (crossfade between clips)
- Dope sheet editor (keyframe timeline visualization)
- Pose library (save/restore/apply named poses)
- Animation playback controls (play, pause, scrub, loop)
- Animation export (glTF animation clips)

### Phase 15: Sculpting — PLANNED
- Sculpt mode (new editor mode, like Object/Edit/Sculpt)
- Dynamic subdivision (Catmull-Clark, adaptive tessellation)
- Brush engine: Sculpt, Smooth, Grab, Inflate, Pinch, Flatten, Crease
- Brush settings: size, strength, falloff curve, spacing
- Multiresolution modifier (subdivision levels for detail)
- Sculpt mask (protect areas from brush strokes)
- Dyntopo (dynamic topology — remesh during sculpting)
- Normal map baking (high-poly to low-poly detail transfer)
- Symmetry (mirror strokes across axes)
- Face sets (isolated sculpting regions)
- Remeshing (maintain mesh quality after operations)

### Phase 16: Node Editor & Visual Scripting — PLANNED
- Node graph framework (react-flow or custom canvas-based)
- Shader node editor (PBR material graph → Babylon ShaderMaterial)
- Compositing node editor (post-processing pipeline)
- Geometry node editor (procedural mesh generation/modification)
- Visual scripting for game logic (like Unreal Blueprints)
- Node types: value, math, vector, color, texture, mesh, boolean, transform
- Node connections (typed ports, auto-conversion, validation)
- Node groups (collapse subgraphs into reusable groups)
- Node presets/library (saved node configurations)
- Real-time preview (node graph changes reflected in viewport)

### Phase 17: Game Logic & Physics — PLANNED
- Babylon.js physics integration (Havok or Ammo.js via WASM)
- Rigid body physics (collision shapes, mass, friction, restitution)
- Play mode (separate simulation mode from edit mode)
- Game object scripting (attach scripts to entities)
- Collision events (onCollisionEnter/Exit/Stay)
- Trigger volumes (invisible collision zones)
- Character controller (basic movement, jumping, gravity)
- State machine system (visual state graph for entity behavior)
- Game settings (gravity, time step, physics layers)
- Game export (standalone HTML with embedded scene + scripts)

### Phase 18: UV Mapping & Texturing — PLANNED
- UV unwrapping tools (smart project, cube project, cylinder project, sphere project)
- UV editor (2D viewport showing UV layout)
- Seam marking (edge selection in UV mode)
- UV packing (minimize wasted texture space)
- Texture painting (paint directly on mesh in viewport)
- Layer-based texture painting (base color, normal, roughness, metallic layers)
- Texture baking (ambient occlusion, curvature, thickness maps)
- Procedural textures (noise, checker, brick, wood patterns via nodes)
- Image texture import and management
- Texture atlas generation (combine multiple textures into one)

### Phase 19: Advanced Rendering — PLANNED
- PBR materials (PBRMaterial in Babylon.js)
- HDRI environment lighting (IBL)
- Screen-space reflections (SSR)
- Ambient occlusion (SSAO/GTAO)
- Bloom and glow post-processing
- Depth of field
- Motion blur
- Shadow mapping (PCF, VSM, cascaded)
- Path tracing preview (WebGPU when available)
- Render settings panel (resolution, samples, denoising)
- Screenshot/render to image

---

## Expanded Architecture (Phases 12-19)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Editor Shell (React)                         │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌───────────────────────┐│
│  │ Toolbar   │ │ 3D Viewport│ │ Node      │ │ Properties Panel     ││
│  │          │ │ (Babylon.js)│ │ Editor    │ │                      ││
│  ├──────────┤ │            │ │ (react-   │ │ Material • Physics    ││
│  │ Scene    │ │            │ │  flow)    │ │ Print • Animation     ││
│  │ Hierarchy│ │            │ │           │ │                       ││
│  ├──────────┤ ├────────────┤ ├──────────┤ ├───────────────────────┤│
│  │ Script   │ │ UV Editor  │ │ Timeline  │ │ AI Assistant          ││
│  │ Editor   │ │ (2D Canvas)│ │ (Dope     │ │                       ││
│  │ (Monaco) │ │            │ │  Sheet)   │ │                       ││
│  └──────────┘ └────────────┘ └──────────┘ └───────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Status Bar                                   ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                     Editor State (Zustand)                           │
│  Scene • Selection • History • Settings • Material • EditMode       │
│  Sculpt • Animation • Physics • Script • Print • UV                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                     Engine Layer                                     │
│  Geometry • Physics (Havok/Ammo) • Animation • Slicing              │
│  Scripting VM • Node Evaluation • Sculpt Engine                     │
└─────────────────────────────────────────────────────────────────────┘
```

### New Tech Dependencies (Phases 12-19)

| Library | Phase | Purpose |
|---------|-------|---------|
| `@monaco-editor/react` | 13 | In-browser code editor for scripting |
| `manifold-3d` | 12 | Boolean operations + mesh validation (WASM) |
| `reactflow` or custom | 16 | Node graph visualization |
| `@babylonjs/havok` | 17 | Physics engine (WASM) |
| Babylon.js Skeleton | 14 | Built-in bone/skinning system |
| Babylon.js Animation | 14 | Built-in keyframe animation |
| Babylon.js PBRMaterial | 19 | Physically-based rendering |

---

## Blender3D Reference Architecture

Key Blender source modules informing design:

| Blender Module | Purpose | BlenderGL Equivalent |
|----------------|---------|---------------------|
| `source/blender/makesrna/` | RNA property system | Zustand stores + TypeScript types |
| `source/blender/bmesh/` | BMesh kernel | Future: half-edge mesh data structure |
| `source/blender/depsgraph/` | Dependency graph | React reactivity + Zustand subscriptions |
| `source/blender/windowmanager/` | Event/keymap system | `useKeyboardShortcuts.ts` |
| `source/blender/editors/` | Editor spaces/tools | React components |
| `source/blender/makesdna/` | DNA serialization | JSON scene format |

### Design Patterns Borrowed from Blender

1. **Operator/Command Pattern** — Every action is a command with execute/undo (foundation of undo system)
2. **Mode-Based Editing** — Object mode vs Edit mode (planned for Phase 8)
3. **Property System** — Typed, reactive properties with change notifications
4. **Data/Display Separation** — Scene graph separate from render meshes
5. **Dependency Graph** — Changes propagate automatically through React

---

## Babylon.js v9 API Notes

Important API differences from commonly referenced documentation:

| Common Reference | Actual v9 API |
|-----------------|---------------|
| `scene.createLineSystem()` | `MeshBuilder.CreateLines()` |
| `StandardMaterial.metallic` | `.specularColor` + `.specularPower` |
| `StandardMaterial.emissiveIntensity` | Scale emissive color manually |
| `StandardMaterial.transparencyMode` | `.alpha` + `.needDepthPrePass` |
| `GLTFExporter.exportAsync()` | `GLTF2Export.GLBAsync()` from glTFSerializer |
| `scene.onPointerDown` | `scene.onPointerObservable` with `PointerEventTypes` |

---

## Key Constraints

- **CSR-only** — No SSR, no API server for core features
- **Static deploy** — Everything runs in the browser
- **IndexedDB storage** — All persistence is client-side
- **WebGL2** — Modern browser compatibility (WebGPU deferred)
- **Mobile responsive** — Touch controls for tablet/phone
- **PWA installable** — Works as installed app via manual service worker

---

## Performance Budgets

| Metric | Target | Maximum |
|--------|--------|----------|
| Initial load | < 2s | 5s |
| Viewport FPS | 60fps | 30fps |
| Scene with 100 objects | < 16ms frame | 33ms |
| Undo/redo | < 50ms | 200ms |
| File export (GLB) | < 1s | 5s |
| Total bundle (gzipped) | < 2MB | 5MB |

---

## Deployment

- **Platform:** Cloudflare Pages
- **Domain:** blendergl.pages.dev
- **Build:** `npm run build` → static output in `dist/`
- **Deploy:** Push to `main` → GitHub Actions → Wrangler
- **CI:** TypeScript check, Vitest, Vite build
- **Preview:** PRs get preview deployments
