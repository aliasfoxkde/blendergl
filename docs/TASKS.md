# BlenderGL - Task List

**Version:** 3.0.0
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
- [x] Initialize Vite + React + TypeScript project
- [x] Install core deps: Babylon.js, Zustand, Immer, idb, react-router
- [x] Install dev deps: Vitest, RTL, ESLint, Prettier, Tailwind
- [x] Create project structure: src/editor/, src/landing/, src/shared/
- [x] Configure Vite for CSR-only static build
- [x] Configure Tailwind CSS with dark theme
- [x] Configure Vitest with React Testing Library
- [x] Configure ESLint + Prettier
- [x] Add MIT LICENSE file
- [x] Write .gitignore for Vite/Node
- [x] Create README.md with project overview
- [x] Verify: `npm run dev` works, `npm run build` produces static output
- [x] Verify: `npm run test` runs (even if empty)
- [x] Commit and push initial scaffold

### 1.2 Core Types + Stores (Foundation)
- [x] Define TypeScript types: Vec3, Quaternion, Transform, Entity, Scene, Material
- [x] Create Zustand store: useSceneStore (entities, hierarchy)
- [x] Create Zustand store: useSelectionStore (selected entities, mode)
- [x] Create Zustand store: useHistoryStore (undo/redo stack)
- [x] Create Zustand store: useSettingsStore (viewport, grid, snap)
- [x] Create Zustand store: useMaterialStore (per-entity materials)
- [x] Create IndexedDB helper: scene persistence (save/load/list/delete)
- [x] Write unit tests for stores and types
- [x] Commit and push

---

## Phase 2: 3D Viewport + Editor Shell

### 2.1 Babylon.js Scene Setup
- [x] Create engine.ts: Babylon engine lifecycle, resize handling
- [x] Create scene setup: scene, camera (ArcRotate), lights (hemisphere + directional)
- [x] Create GridHelper: grid with axis colors (X=red, Y=green, Z=blue)
- [x] Create ViewportComponent: React wrapper for Babylon canvas
- [x] Wire up resize observer for responsive canvas

### 2.2 Editor Layout
- [x] Create EditorShell component (main layout)
- [x] Create Toolbar component (top bar with mode switches, tools)
- [x] Create SceneHierarchy (left sidebar)
- [x] Create PropertiesPanel (right sidebar)
- [x] Create StatusBar (bottom info bar)
- [x] Responsive layout: panels collapsible, viewport fills remaining space

### 2.3 Scene Persistence
- [x] Implement scene serialization (entities to JSON)
- [x] Implement scene deserialization (JSON to entities)
- [x] Save scene to IndexedDB
- [x] Load scene from IndexedDB
- [ ] Auto-save on changes (debounced)
- [ ] Write persistence tests
- [x] Commit and push: Phase 2 complete

---

## Phase 3: Scene Graph + Primitives

### 3.1 Entity System
- [x] Entity type with id, name, transform, components
- [x] Component types: MeshComponent
- [x] Scene hierarchy with parent-child relationships
- [x] Entity creation/deletion with events
- [x] State sync: Zustand to Babylon scene (entity-mesh sync)

### 3.2 Primitives
- [x] PrimitiveFactory: create cube, sphere, plane, cylinder, cone, torus
- [x] Each primitive creates entity + Babylon mesh + default material
- [x] Add Object menu (toolbar dropdown)

### 3.3 Selection System
- [x] Raycast-based picking (click to select)
- [x] Shift+click for multi-select
- [x] Selection highlighting (outline glow)
- [x] Scene hierarchy tree with selection sync
- [x] Commit and push: Phase 3 complete

---

## Phase 4: Transform Tools + Undo/Redo

### 4.1 Gizmo System
- [x] GizmoManager integration with Babylon
- [x] Move gizmo (translate)
- [x] Rotate gizmo
- [x] Scale gizmo
- [x] Gizmo mode switching (W/E/R keys)
- [x] Axis constraints (X/Y/Z toggle)
- [x] Snap toggle with configurable step

### 4.2 Properties Panel
- [x] Transform section: position, rotation, scale numeric inputs
- [x] Two-way sync: panel to gizmo to entity
- [x] Entity name editing
- [x] Visibility toggle, lock toggle

### 4.3 Undo/Redo System
- [x] Command pattern: TransformCommand, AddEntityCommand, DeleteCommand
- [x] Undo stack, redo stack
- [x] Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
- [x] Undo/redo buttons in toolbar
- [x] Write undo/redo tests
- [x] Commit and push: Phase 4 complete

---

## Phase 5: Materials + File I/O

### 5.1 Material System
- [x] Material store (Zustand)
- [x] Material creation/editing per entity
- [x] Color picker component
- [x] Material properties: albedo, metallic, roughness, emissive, opacity
- [x] Material panel in properties sidebar

### 5.2 File I/O
- [x] GLB export (Babylon GLTF2Export)
- [x] File download trigger (browser download API)
- [x] Scene file format (.json export)

### 5.3 Asset Browser
- [x] Commit and push: Phase 5 core complete

---

## Phase 6: Landing Page + PWA

### 6.1 Landing Page
- [x] Hero section with gradient text and CTA
- [x] Features section with icons and descriptions
- [x] CTA button to /editor
- [x] Footer with MIT license, GitHub link
- [x] Responsive design (mobile-first)
- [x] Dark theme matching editor

### 6.2 PWA Support
- [x] Manual service worker (vite-plugin-pwa incompatible with Vite 8)
- [x] Web app manifest (name, icons, theme color)
- [x] Service worker with network-first caching

### 6.3 Routing
- [x] React Router: / to landing, /editor to editor
- [x] Direct access to /editor works
- [x] Navigation between pages
- [x] Commit and push: Phase 6 complete

---

## Phase 7: Cloudflare Pages Deployment

### 7.1 Deployment Config
- [x] wrangler.toml for Cloudflare Pages
- [x] Verify static build output
- [x] Test build locally with `npx wrangler pages dev dist/`
- [x] Create GitHub Actions workflow for auto-deploy
- [x] Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets
- [x] Push and verify deployment at blendergl.pages.dev
- [x] Commit and push: Phase 7 complete

---

## Phase 8: Mesh Editing (Edit Mode)

### 8.1 Edit Mode Infrastructure
- [x] Mode system: Object Mode to Edit Mode (Tab key)
- [x] EditModeStore (Zustand+Immer) for element-level selection state
- [x] EditModeController wrapping Babylon.js vertex buffer manipulation
- [x] Shared editControllerRef between Viewport and keyboard shortcuts
- [x] Wireframe overlay (enableEdgesRendering) on entering edit mode

### 8.2 Selection in Edit Mode
- [x] Vertex selection (click to pick closest vertex of hit face)
- [x] Edge selection (barycentric coordinate edge detection)
- [x] Face selection (faceId from PickingInfo)
- [x] Selection mode cycling (1/2/3 keys)
- [x] Selection highlighting (spheres for vertices, faces, lines for edges)
- [x] Shift-click additive selection
- [x] Edit mode info in PropertiesPanel (counts, deselect all)

### 8.3 Mesh Operations
- [x] Extrude faces (E key) with undo/redo command
- [x] Delete faces (X/Delete key) with undo/redo command
- [x] Undo/redo integration via command pattern

### 8.4 UI Integration
- [x] Toolbar: mode toggle button (Object/Edit)
- [x] Toolbar: element mode buttons (Vert/Edge/Face) in edit mode
- [x] Keyboard shortcuts: Tab, 1/2/3, E (extrude), X (delete)
- [x] Gizmo hidden in edit mode
- [x] Commit and push: Phase 8 complete

---

## Phase 9: Advanced Editor Features

### 9.1 Viewport Shading Modes
- [ ] Wireframe mode toggle (all meshes)
- [ ] Solid mode (flat color, no lighting)
- [ ] Material preview (default — current behavior)
- [ ] Shading mode buttons in toolbar
- [ ] Shading mode keyboard shortcut (Z cycling)
- [ ] Persist shading mode in settings store

### 9.2 Camera Presets
- [ ] Front view (Numpad 1)
- [ ] Back view (Ctrl+Numpad 1)
- [ ] Right view (Numpad 3)
- [ ] Left view (Ctrl+Numpad 3)
- [ ] Top view (Numpad 7)
- [ ] Bottom view (Ctrl+Numpad 7)
- [ ] Perspective/Ortho toggle (Numpad 5)
- [ ] Camera preset buttons in toolbar or status bar

### 9.3 Grid + Snap Configuration
- [ ] Settings panel: grid size control
- [ ] Settings panel: grid subdivisions control
- [ ] Settings panel: snap increment control
- [ ] Settings panel: angle snap control
- [ ] Settings panel: scale snap control
- [ ] Wire snap settings to gizmo controller
- [ ] Snap toggle button in toolbar
- [ ] Visual indicator when snap is active

### 9.4 Duplicate + Parent/Child
- [ ] DuplicateCommand (undo/redo for Shift+D)
- [ ] Duplicate with offset (shift position slightly)
- [ ] Duplicate multiple selected entities
- [ ] Parent entity to active (Ctrl+P)
- [ ] Unparent entity (Alt+P)
- [ ] Clear parent (keep transform)
- [ ] Update SceneHierarchy to show parent-child drag

### 9.5 Status Bar Enhancement
- [ ] Show mouse cursor 3D position (world coordinates)
- [ ] Show current editor mode (Object/Edit)
- [ ] Show current element mode (Vertex/Edge/Face)
- [ ] Show selected element count
- [ ] Show shading mode
- [ ] Show snap status

### 9.6 Right-Click Context Menu
- [ ] Context menu component (positioned at cursor)
- [ ] Object mode: Add, Duplicate, Delete, Parent, Hide, Show
- [ ] Edit mode: Select All, Delete, Extrude, Inset
- [ ] Close on click outside
- [ ] Keyboard shortcut hints in menu items

### 9.7 Auto-Save
- [ ] Debounced auto-save on entity/transform changes
- [ ] Auto-save indicator in status bar
- [ ] Configurable interval in settings
- [ ] Restore last scene on editor load

### 9.8 Tests + Polish
- [ ] Unit tests for DuplicateCommand
- [ ] Unit tests for camera preset logic
- [ ] Unit tests for shading mode switching
- [ ] Update PLAN.md and PROGRESS.md
- [ ] Commit and push: Phase 9 complete

---

## Phase 10: AI Augmentation

### 10.1 AI Assistant Panel
- [ ] Collapsible AI panel in editor
- [ ] Chat interface for natural language commands
- [ ] Connect to Backend API (OpenAI/Anthropic compatible)
- [ ] API key configuration in settings

### 10.2 AI Features
- [ ] "Generate object" from text prompt to procedural geometry
- [ ] "Optimize mesh" to decimation, cleanup
- [ ] "Analyze scene" to stats, suggestions
- [ ] "Arrange objects" to auto-layout
- [ ] "Create material" to AI-generated PBR materials
- [ ] Commit and push: Phase 10 complete

---

## Backlog (Lower Priority)

These items are deferred from earlier phases or nice-to-haves:

- [ ] Box select (drag rectangle in viewport)
- [ ] Texture upload and mapping
- [ ] glTF/GLB import (Babylon SceneLoader)
- [ ] Drag-and-drop file upload
- [ ] Asset browser panel with thumbnails
- [ ] Offline fallback page
- [ ] PWA install prompt handling
- [ ] App icons (192x192, 512x512)
- [ ] Landing page screenshots/demo section
- [ ] Collection support (entity grouping)
- [ ] Loop cut, bevel, inset, merge, subdivide mesh operations
- [ ] Grow/shrink selection, select linked
- [ ] X-ray viewport mode
- [ ] Configurable keyboard shortcut system

---

## Progress Summary

- **Total Phases:** 10
- **Completed:** Phases 1-8
- **In Progress:** Phase 9 — Advanced Editor Features
- **Pending:** Phase 10 — AI Augmentation
- **Backlog:** 14 deferred items
