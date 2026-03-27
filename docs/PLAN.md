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

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Rendering | Babylon.js | Most complete WebGPU/WebGL API, built-in gizmos, physics |
| UI Framework | React 19 + TypeScript | Component ecosystem, type safety |
| Build Tool | Vite | Fast HMR, CSR-first, optimized static builds |
| State | Zustand + Immer | Lightweight, performant, immutable updates |
| Storage | IndexedDB (idb wrapper) | Persistent browser storage for scenes/assets |
| Routing | React Router | SPA routing for landing page + editor |
| Styling | Tailwind CSS | Utility-first, dark theme, responsive |
| Testing | Vitest + React Testing Library | Fast, ESM-native, Vite-integrated |
| Linting | ESLint + Prettier | Code quality |
| PWA | vite-plugin-pwa (Workbox) | Offline, installable |
| Deploy | Cloudflare Pages (Wrangler) | Global CDN, free tier, Git integration |

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
│  Scene Graph • Selection • History • Settings           │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Scene Graph Layer                           │
│  Entities • Components • Parent-Child • Transform Tree  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Geometry Engine                             │
│  Mesh Data • BVH • Raycasting • Operations              │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Rendering Engine (Babylon.js)               │
│  WebGL2/WebGPU • PBR Materials • Post-Processing        │
└─────────────────────────────────────────────────────────┘
```

---

## Phase Breakdown

### Phase 1: Project Foundation
- Vite + React + TypeScript scaffold
- Babylon.js, Zustand, Tailwind, Vitest, PWA plugin
- Project structure: `src/editor/`, `src/landing/`, `src/shared/`
- MIT License, CI config

### Phase 2: 3D Viewport + Editor Shell
- Babylon.js scene with arc-rotate camera, hemisphere light, grid
- Editor layout: toolbar (top), viewport (center), panels (sides)
- Zustand stores: scene, selection, history, settings
- IndexedDB save/load for scenes

### Phase 3: Scene Graph + Primitives
- Entity/component scene graph with parent-child
- 6 primitives: cube, sphere, plane, cylinder, cone, torus
- Scene hierarchy tree UI, raycast selection
- Add Object menu (toolbar + right-click)

### Phase 4: Transform Tools + Undo/Redo
- Move/Rotate/Scale gizmos via Babylon GizmoManager
- Axis constraints (X/Y/Z), snap toggle
- Properties panel with numeric transform inputs
- Command-pattern undo/redo stack

### Phase 5: Materials + File I/O
- PBR material editor with color picker
- Texture upload via file input
- GLB/glTF export (Babylon serializer)
- GLB/glTF import
- Asset browser panel

### Phase 6: Landing Page + PWA
- Modern landing page: hero, features, screenshots, CTA
- PWA manifest + service worker (Workbox)
- Installable on desktop and mobile
- Direct `/editor` URL, React Router

### Phase 7: Cloudflare Pages Deployment
- wrangler.toml configuration
- GitHub Actions auto-deploy on push to main
- Static CSR build verification
- Preview deployments for PRs

### Phase 8: Mesh Editing (Edit Mode)
- Object mode vs Edit mode (Blender paradigm)
- Vertex/edge/face selection with highlighting
- Extrude, inset, loop cut, bevel operations
- Half-edge data structure (BMesh reference)
- Wireframe + solid overlay rendering

### Phase 9: Advanced Editor Features
- Multi-object editing, duplication, grouping
- Viewport shading: wireframe, solid, material, textured
- Keyboard shortcuts system
- Context menus, grid/snap config
- Camera presets (front/back/left/right/top/perspective)

### Phase 10: AI Augmentation
- AI assistant panel in editor
- Generate objects from text prompts
- Mesh optimization suggestions
- Scene analysis and smart recommendations
- Backend API integration (OpenAI/Anthropic compatible)

---

## Blender3D Reference Architecture

Key Blender source modules informing design:
- `source/blender/makesrna/` — RNA property system → typed, animatable properties
- `source/blender/editors/` — Editor modes/tools → mode-based editing
- `source/blender/bmesh/` — BMesh kernel → half-edge mesh structure
- `source/blender/gpu/` — GPU abstraction → render state management
- `source/blender/windowmanager/` — Event system → operator/command pattern
- `source/blender/makesdna/` — DNA serialization → scene file format

### Design Decisions from Blender:
1. **Data/display separation** — Scene graph separate from render nodes
2. **Mode-based editing** — Object mode vs Edit mode
3. **Operator system** — All actions are operators (command pattern for undo)
4. **Property system** — Every entity has typed properties
5. **BMesh-like topology** — Half-edge data structure for mesh editing

---

## Key Constraints

- **CSR-only** — No SSR, no API server for core features
- **Static deploy** — Everything runs in the browser
- **IndexedDB storage** — All persistence is client-side
- **WebGL2/WebGPU** — Modern browser compatibility
- **Mobile responsive** — Touch controls for tablet/phone
- **PWA installable** — Works as installed app

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
- **Preview:** PRs get preview deployments
