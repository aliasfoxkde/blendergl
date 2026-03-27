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

### Phase 8: Mesh Editing (Edit Mode) — PLANNED
- Object mode vs Edit mode (Tab key toggle)
- Half-edge mesh data structure (BMesh reference)
- Vertex/edge/face selection with highlighting
- Extrude, inset, loop cut, bevel, merge, subdivide operations
- Wireframe + solid overlay rendering
- This is the hardest phase — requires custom mesh topology management

### Phase 9: Advanced Editor Features — PLANNED
- Multi-object editing with box select
- Group/ungroup entities
- Duplicate (Shift+D), parent/child linking (Ctrl+P)
- Viewport shading modes: wireframe, solid, material, textured, x-ray
- Configurable keyboard shortcuts
- Context menus (right-click)
- Grid/snap configuration
- Camera presets (numpad views: front, back, left, right, top, perspective)

### Phase 10: AI Augmentation — PLANNED
- Collapsible AI assistant panel in editor
- Chat interface for natural language commands
- Backend API integration (OpenAI/Anthropic compatible)
- "Generate object" from text → procedural geometry
- "Optimize mesh" → decimation, cleanup
- "Analyze scene" → stats, suggestions
- "Arrange objects" → auto-layout
- "Create material" → AI-generated PBR materials

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
