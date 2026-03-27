# BlenderGL - Task List

**Version:** 1.0.0
**Last Updated:** 2026-03-27
**Status:** Active

---

## Task Status Legend

- [ ] Pending
- [~] In Progress
- [x] Completed
- [!] Blocked

---

## Phase 1: Project Foundation

### 1.1 Project Scaffold
- [x] Create PLAN.md with architecture and tech decisions
- [x] Create TASKS.md with full breakdown
- [x] Create PROGRESS.md for tracking
- [~] Initialize Vite + React + TypeScript project
- [ ] Install core deps: Babylon.js, Zustand, Immer, idb, react-router
- [ ] Install dev deps: Vitest, RTL, ESLint, Prettier, Tailwind, vite-plugin-pwa
- [ ] Create project structure: src/editor/, src/landing/, src/shared/
- [ ] Configure Vite for CSR-only static build
- [ ] Configure Tailwind CSS with dark theme
- [ ] Configure Vitest with React Testing Library
- [ ] Configure ESLint + Prettier
- [ ] Add MIT LICENSE file
- [ ] Write .gitignore for Vite/Node
- [ ] Create README.md with project overview
- [ ] Verify: `npm run dev` works, `npm run build` produces static output
- [ ] Verify: `npm run test` runs (even if empty)
- [ ] Commit and push initial scaffold

### 1.2 Core Types + Stores (Foundation)
- [ ] Define TypeScript types: Vec3, Quaternion, Transform, Entity, Scene, Material
- [ ] Create Zustand store: useSceneStore (entities, hierarchy)
- [ ] Create Zustand store: useSelectionStore (selected entities, mode)
- [ ] Create Zustand store: useHistoryStore (undo/redo stack)
- [ ] Create Zustand store: useSettingsStore (viewport, grid, snap)
- [ ] Create IndexedDB helper: scene persistence (save/load/list/delete)
- [ ] Write unit tests for all stores and types
- [ ] Commit and push

---

## Phase 2: 3D Viewport + Editor Shell

### 2.1 Babylon.js Scene Setup
- [ ] Create EngineManager: Babylon engine lifecycle, resize handling
- [ ] Create SceneManager: scene, camera (ArcRotate), lights (hemisphere + directional)
- [ ] Create GridHelper: infinite grid with axis colors (X=red, Y=green, Z=blue)
- [ ] Create ViewportComponent: React wrapper for Babylon canvas
- [ ] Wire up resize observer for responsive canvas
- [ ] Write tests for scene setup

### 2.2 Editor Layout
- [ ] Create EditorShell component (main layout)
- [ ] Create Toolbar component (top bar with mode switches, tools)
- [ ] Create SidebarLeft (scene hierarchy)
- [ ] Create SidebarRight (properties panel)
- [ ] Create StatusBar (bottom info bar)
- [ ] Responsive layout: panels collapsible, viewport fills remaining space
- [ ] Write layout tests

### 2.3 Scene Persistence
- [ ] Implement scene serialization (entities → JSON)
- [ ] Implement scene deserialization (JSON → entities)
- [ ] Save scene to IndexedDB
- [ ] Load scene from IndexedDB
- [ ] Auto-save on changes (debounced)
- [ ] Write persistence tests
- [ ] Commit and push: Phase 2 complete

---

## Phase 3: Scene Graph + Primitives

### 3.1 Entity System
- [ ] Entity class with id, name, transform, components
- [ ] Component types: MeshComponent, MaterialComponent, LightComponent
- [ ] SceneGraph class with parent-child relationships
- [ ] Entity creation/deletion with events
- [ ] State sync: Zustand ↔ Babylon scene
- [ ] Write entity system tests

### 3.2 Primitives
- [ ] PrimitiveFactory: create cube, sphere, plane, cylinder, cone, torus
- [ ] Each primitive creates entity + Babylon mesh + default material
- [ ] Add Object menu (toolbar dropdown)
- [ ] Right-click context menu → Add Object
- [ ] Write primitive factory tests

### 3.3 Selection System
- [ ] Raycast-based picking (click to select)
- [ ] Shift+click for multi-select
- [ ] Box select (drag rectangle)
- [ ] Selection highlighting (outline glow)
- [ ] Scene hierarchy tree with selection sync
- [ ] Write selection tests
- [ ] Commit and push: Phase 3 complete

---

## Phase 4: Transform Tools + Undo/Redo

### 4.1 Gizmo System
- [ ] GizmoManager integration with Babylon
- [ ] Move gizmo (translate)
- [ ] Rotate gizmo
- [ ] Scale gizmo
- [ ] Gizmo mode switching (W/E/R keys)
- [ ] Axis constraints (X/Y/Z toggle)
- [ ] Snap toggle with configurable step

### 4.2 Properties Panel
- [ ] Transform section: position, rotation, scale numeric inputs
- [ ] Two-way sync: panel ↔ gizmo ↔ entity
- [ ] Entity name editing
- [ ] Visibility toggle, lock toggle

### 4.3 Undo/Redo System
- [ ] Command pattern: TransformCommand, AddEntityCommand, DeleteCommand
- [ ] Undo stack, redo stack
- [ ] Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
- [ ] Undo/redo buttons in toolbar
- [ ] Write undo/redo tests
- [ ] Commit and push: Phase 4 complete

---

## Phase 5: Materials + File I/O

### 5.1 Material System
- [ ] Material store (Zustand)
- [ ] PBR material creation/editing
- [ ] Color picker component
- [ ] Texture upload (file input → Babylon texture)
- [ ] Material properties: albedo, metallic, roughness, emissive, normal
- [ ] Material panel in properties sidebar
- [ ] Write material tests

### 5.2 File I/O
- [ ] GLB export (Babylon GLTFExporter)
- [ ] glTF/GLB import (Babylon SceneLoader)
- [ ] File download trigger (browser download API)
- [ ] File upload via drag-and-drop + file input
- [ ] Scene file format (.bgls JSON)
- [ ] Write file I/O tests

### 5.3 Asset Browser
- [ ] Asset panel: list saved scenes, imported models
- [ ] Thumbnail previews
- [ ] Delete/rename assets
- [ ] Commit and push: Phase 5 complete

---

## Phase 6: Landing Page + PWA

### 6.1 Landing Page
- [ ] Hero section with animated 3D preview (embedded Babylon scene)
- [ ] Features section with icons and descriptions
- [ ] Screenshots/demo section
- [ ] CTA button → /editor
- [ ] Footer with MIT license, GitHub link
- [ ] Responsive design (mobile-first)
- [ ] Dark theme matching editor

### 6.2 PWA Support
- [ ] vite-plugin-pwa configuration
- [ ] Web app manifest (name, icons, theme color)
- [ ] Service worker with Workbox (cache static assets)
- [ ] Offline fallback page
- [ ] Install prompt handling
- [ ] App icons (192x192, 512x512)
- [ ] Verify installable on Chrome, Firefox, Safari

### 6.3 Routing
- [ ] React Router: / → landing, /editor → editor
- [ ] Direct access to /editor works
- [ ] Navigation between pages
- [ ] Commit and push: Phase 6 complete

---

## Phase 7: Cloudflare Pages Deployment

### 7.1 Deployment Config
- [ ] wrangler.toml for Cloudflare Pages
- [ ] Verify static build output
- [ ] Test build locally with `npx wrangler pages dev dist/`
- [ ] Create GitHub Actions workflow for auto-deploy
- [ ] Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets
- [ ] Push and verify deployment at blendergl.pages.dev
- [ ] Commit and push: Phase 7 complete

---

## Phase 8: Mesh Editing (Edit Mode)

### 8.1 Edit Mode Infrastructure
- [ ] Mode system: Object Mode ↔ Edit Mode (Tab key)
- [ ] Half-edge mesh data structure (BMesh reference)
- [ ] Mesh ↔ half-edge conversion
- [ ] Vertex/edge/face buffer management

### 8.2 Selection in Edit Mode
- [ ] Vertex selection (click, box select)
- [ ] Edge selection
- [ ] Face selection
- [ ] Selection mode cycling (1/2/3 keys)
- [ ] Grow/shrink selection (Ctrl+Numpad+/-)
- [ ] Select all, select linked

### 8.3 Mesh Operations
- [ ] Extrude region (vertices/faces)
- [ ] Inset faces
- [ ] Loop cut
- [ ] Bevel
- [ ] Delete vertices/edges/faces
- [ ] Merge vertices
- [ ] Subdivide
- [ ] Write mesh operation tests
- [ ] Commit and push: Phase 8 complete

---

## Phase 9: Advanced Editor Features

### 9.1 Multi-Object Editing
- [ ] Multi-select with box select
- [ ] Group/ungroup entities
- [ ] Duplicate (Shift+D)
- [ ] Parent/child linking (Ctrl+P)
- [ ] Collection support

### 9.2 Viewport Modes
- [ ] Wireframe shading
- [ ] Solid shading
- [ ] Material preview
- [ ] Textured mode
- [ ] X-ray mode

### 9.3 Keyboard Shortcuts + UX
- [ ] Keyboard shortcut system (configurable)
- [ ] Context menus (right-click)
- [ ] Grid configuration (size, subdivisions)
- [ ] Snap configuration (increment, angle, scale)
- [ ] Camera presets (numpad views)
- [ ] Viewport navigation (orbit, pan, zoom)
- [ ] Commit and push: Phase 9 complete

---

## Phase 10: AI Augmentation

### 10.1 AI Assistant Panel
- [ ] Collapsible AI panel in editor
- [ ] Chat interface for natural language commands
- [ ] Connect to Backend API (OpenAI/Anthropic compatible)
- [ ] API key configuration in settings

### 10.2 AI Features
- [ ] "Generate object" from text prompt → procedural geometry
- [ ] "Optimize mesh" → decimation, cleanup
- [ ] "Analyze scene" → stats, suggestions
- [ ] "Arrange objects" → auto-layout
- [ ] "Create material" → AI-generated PBR materials
- [ ] Commit and push: Phase 10 complete

---

## Progress Summary

- **Total Tasks:** 10 phases, ~150 subtasks
- **Completed:** 0
- **In Progress:** Phase 1
- **Current Focus:** Project scaffold and foundation
