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
- [x] Wireframe mode toggle (all meshes)
- [x] Solid mode (flat color, no lighting)
- [x] Material preview (default — current behavior)
- [x] Shading mode buttons in toolbar
- [x] Shading mode keyboard shortcut (Z cycling)
- [x] Persist shading mode in settings store

### 9.2 Camera Presets
- [x] Front view (Numpad 1)
- [x] Back view (Ctrl+Numpad 1)
- [x] Right view (Numpad 3)
- [x] Left view (Ctrl+Numpad 3)
- [x] Top view (Numpad 7)
- [x] Bottom view (Ctrl+Numpad 7)
- [x] Perspective/Ortho toggle (Numpad 5)
- [x] Camera preset buttons in toolbar or status bar

### 9.3 Grid + Snap Configuration
- [ ] Settings panel: grid size control
- [ ] Settings panel: grid subdivisions control
- [ ] Settings panel: snap increment control
- [ ] Settings panel: angle snap control
- [ ] Settings panel: scale snap control
- [x] Wire snap settings to gizmo controller
- [x] Snap toggle button in toolbar
- [x] Visual indicator when snap is active

### 9.4 Duplicate + Parent/Child
- [x] DuplicateCommand (undo/redo for Shift+D)
- [x] Duplicate with offset (shift position slightly)
- [x] Duplicate multiple selected entities
- [x] Parent entity to active (Ctrl+P)
- [x] Unparent entity (Alt+P)
- [x] Clear parent (keep transform)
- [ ] Update SceneHierarchy to show parent-child drag

### 9.5 Status Bar Enhancement
- [ ] Show mouse cursor 3D position (world coordinates)
- [x] Show current editor mode (Object/Edit)
- [x] Show current element mode (Vertex/Edge/Face)
- [x] Show selected element count
- [x] Show shading mode
- [x] Show snap status

### 9.6 Right-Click Context Menu
- [ ] Context menu component (positioned at cursor)
- [ ] Object mode: Add, Duplicate, Delete, Parent, Hide, Show
- [ ] Edit mode: Select All, Delete, Extrude, Inset
- [ ] Close on click outside
- [ ] Keyboard shortcut hints in menu items

### 9.7 Auto-Save
- [x] Debounced auto-save on entity/transform changes
- [ ] Auto-save indicator in status bar
- [x] Configurable interval in settings
- [ ] Restore last scene on editor load

### 9.8 Tests + Polish
- [ ] Unit tests for DuplicateCommand
- [ ] Unit tests for camera preset logic
- [ ] Unit tests for shading mode switching
- [ ] Update PLAN.md and PROGRESS.md
- [ ] Commit and push: Phase 9 complete

---

## Phase 10: AI Augmentation

### 10.1 AI Settings
- [x] Extend settingsStore with AI config (provider, apiKey, endpoint, model)
- [x] Persist API keys in localStorage
- [x] AI config types in types/index.ts

### 10.2 AI API Client
- [x] Fetch-based streaming client (no SDK dependency)
- [x] Anthropic API support (POST /v1/messages)
- [x] OpenAI-compatible API support (POST /v1/chat/completions)
- [x] Error handling (401, 429, network errors)

### 10.3 AI Store + Panel
- [x] AI chat store (messages, streaming state, errors)
- [x] Collapsible AI panel component (right sidebar)
- [x] Chat messages UI (user/assistant bubbles)
- [x] Text input + send button
- [x] Streaming response display

### 10.4 AI Tool Execution
- [x] Parse AI responses for action blocks
- [x] Generate object tool (create primitives from text)
- [x] Set material tool (apply properties to selected)
- [x] Analyze scene tool (return stats)

### 10.5 AI Settings UI + Integration
- [x] AI settings in PropertiesPanel (provider, key, endpoint, model)
- [x] AI panel in EditorShell layout
- [x] Keyboard shortcut (F3 to toggle AI panel)
- [x] Commit and push: Phase 10 complete

---

## Phase 11: Feature Completion

### 11.1 glTF/GLB Import
- [x] Import via Babylon SceneLoader.ImportMeshAsync
- [x] File input button in toolbar
- [ ] Drag-and-drop onto viewport
- [ ] Undo/redo command for import

### 11.2 Asset Browser
- [x] List saved scenes from IndexedDB
- [x] Load/delete/rename scenes

### 11.3 Context Menu
- [x] Right-click context menu component
- [x] Object mode items (Add, Duplicate, Delete, Parent, Hide)
- [x] Edit mode items (Select All, Delete, Extrude)
- [x] Close on click outside / Escape

### 11.4 Box Select
- [x] Drag rectangle selection in viewport
- [x] Select entities within rectangle via bounding boxes

### 11.5 Grid/Snap Settings Panel
- [x] Grid size, subdivisions sliders
- [x] Snap increment, angle snap inputs

### 11.6 Advanced Mesh Operations
- [x] Subdivide faces
- [x] Merge vertices
- [x] Inset faces
- [ ] Bevel edges

### 11.7 Texture Upload + Mapping
- [x] File input for texture images
- [ ] Assign to material diffuseTexture (base64 stored in material)
- [ ] Remove texture button

---

## Backlog (Lower Priority)

These items are deferred from earlier phases or nice-to-haves:

- [ ] Auto-save indicator in status bar
- [ ] Restore last scene on editor load
- [ ] Mouse cursor 3D position in status bar
- [ ] SceneHierarchy parent-child drag UI
- [ ] Drag-and-drop file upload
- [ ] Offline fallback page
- [ ] PWA install prompt handling
- [ ] App icons (192x192, 512x512)
- [ ] Landing page screenshots/demo section
- [ ] Collection support (entity grouping)
- [ ] Grow/shrink selection, select linked
- [ ] X-ray viewport mode
- [ ] Configurable keyboard shortcut system
- [ ] Unit tests for Phase 9 features (DuplicateCommand, camera presets, shading)

---

## Progress Summary

- **Total Phases:** 11
- **Completed:** Phases 1-10, Phase 11 (nearly complete — 1 item deferred)
- **Backlog:** 11 deferred items
