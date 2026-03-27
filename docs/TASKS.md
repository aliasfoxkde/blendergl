# BlenderGL - Task List

**Version:** 4.0.0
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
- [x] Auto-save on changes (debounced)
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
- [x] Settings panel: grid size control
- [x] Settings panel: grid subdivisions control
- [x] Settings panel: snap increment control
- [x] Settings panel: angle snap control
- [x] Settings panel: scale snap control
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
- [x] Update SceneHierarchy to show parent-child drag

### 9.5 Status Bar Enhancement
- [x] Show mouse cursor 3D position (world coordinates)
- [x] Show current editor mode (Object/Edit)
- [x] Show current element mode (Vertex/Edge/Face)
- [x] Show selected element count
- [x] Show shading mode
- [x] Show snap status

### 9.6 Right-Click Context Menu
- [x] Context menu component (positioned at cursor)
- [x] Object mode: Add, Duplicate, Delete, Parent, Hide, Show
- [x] Edit mode: Select All, Delete, Extrude, Inset
- [x] Close on click outside
- [x] Keyboard shortcut hints in menu items

### 9.7 Auto-Save
- [x] Debounced auto-save on entity/transform changes
- [x] Auto-save indicator in status bar
- [x] Configurable interval in settings
- [x] Restore last scene on editor load

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

## Phase 12: 3D Printing & Slicing

### 12.1 STL Export
- [x] Binary STL export (80-byte header, 50-byte triangles, little-endian)
- [x] ASCII STL export (human-readable format)
- [x] STL export button in File menu and toolbar
- [x] Export selected objects only option
- [x] Mesh triangulation check before export (ensure all faces are triangles)

### 12.2 3MF Format Support
- [ ] 3MF file structure (XML-based, OPC package format)
- [ ] 3MF export (mesh + materials + print settings)
- [ ] 3MF import (parse mesh from 3MF package)

### 12.3 Mesh Validation & Repair
- [x] Manifold check (detect non-manifold edges, open boundaries)
- [x] Watertight validation (volume calculation, inside/outside test)
- [ ] Hole filling (detect boundary loops, triangulate to close)
- [x] Normal repair (consistent winding order, face flip)
- [x] Degenerate face removal (zero-area faces, duplicate vertices)
- [x] Mesh analysis stats (volume, surface area, dimensions, vertex/face count)

### 12.4 Boolean Operations (CSG)
- [x] Integrate manifold-3d WASM for boolean operations
- [x] Boolean union (combine two meshes)
- [x] Boolean difference (subtract one mesh from another)
- [x] Boolean intersection (keep overlapping volume)
- [ ] Boolean modifier component (non-destructive, in entity components)
- [ ] CSG preview (wireframe of result before committing)

### 12.5 Print Preparation Panel
- [x] Print settings panel in PropertiesPanel (when no entity selected)
- [x] Printer profile selector (bed size, nozzle diameter)
- [x] Layer height input (0.1mm - 0.4mm)
- [x] Infill density slider (0% - 100%)
- [x] Infill pattern selector (grid, lines, triangles, gyroid, honeycomb)
- [x] Shell/wall thickness (number of perimeters)
- [x] Support generation toggle + overhang angle threshold
- [x] Adhesion type (brim, raft, skirt, none)
- [x] Print speed settings (outer wall, inner wall, infill, travel)
- [x] Temperature settings (extruder, heated bed)
- [x] Estimated print time calculation
- [x] Estimated material usage calculation

### 12.6 G-code Generation
- [x] Basic slicer: slice mesh at layer heights (triangle-plane intersection)
- [x] Perimeter generation (outer and inner walls)
- [x] Infill pattern generation (selected pattern within perimeters)
- [ ] Support generation (detect overhangs, generate support structures)
- [ ] Retraction and travel moves
- [x] G-code output (standard Marlin/RepRap format)
- [ ] G-code preview (layer-by-layer path visualization)
- [x] G-code download
- [ ] Printer profile presets (Ender 3, Prusa MK4, Bambu Lab, etc.)

### 12.7 Print Preview
- [ ] Layer visualization slider (scroll through sliced layers)
- [ ] Print time estimate display
- [ ] Material usage display (weight in grams, length in meters)
- [ ] Color-coded preview (perimeters, infill, supports in different colors)
- [ ] Commit and push: Phase 12 complete

---

## Phase 13: Scripting Engine

### 13.1 Scripting API Surface
- [x] Define `blendergl` global API object for user scripts
- [x] `blendergl.scene` — access entities, create/delete/modify
- [x] `blendergl.ops` — operator system (translate, rotate, scale, add primitive)
- [x] `blendergl.data` — access materials, settings, selection
- [x] `blendergl.utils` — math helpers (Vec3, degToRad, lerp, clamp, random)
- [x] API documentation strings (JSDoc for auto-complete)

### 13.2 Monaco Editor Integration
- [x] Install `@monaco-editor/react`
- [x] Script editor panel component (collapsible bottom panel in viewport)
- [x] JavaScript/TypeScript language support
- [x] Dark theme matching editor
- [ ] Auto-complete for `blendergl` API (deferred — requires custom Monaco type definitions)
- [ ] Error squiggles and inline diagnostics (deferred)
- [ ] Tab-based multi-file editing (deferred)
- [x] Split view (script editor overlays bottom of viewport)

### 13.3 Script Execution Sandbox
- [x] Script execution via `new Function()` with timeout
- [x] Restricted globals (blendergl API + console injected)
- [x] Script execution timeout (30s default, configurable)
- [x] Error capture and display (syntax errors, runtime errors with line/col)
- [x] Script output console (log, warn, error with color coding)

### 13.4 Script Types & Lifecycle
- [x] Startup scripts (type="startup", auto-run on load)
- [x] Operator scripts (type="operator", run on demand)
- [ ] Callback scripts (on selection change, on frame change, etc.) (deferred)
- [ ] Script enable/disable toggle per script (deferred)
- [ ] Script execution order control (deferred)

### 13.5 Script Library
- [x] Save scripts to IndexedDB
- [x] Script library browser (list/load/delete saved scripts)
- [x] Import/export scripts (.json files)
- [x] Built-in example scripts (hello world, grid, spheres, staircase, analyze, scale)
- [ ] Script templates (operator, callback, modifier) (deferred)
- [ ] Commit and push: Phase 13 complete

---

## Phase 14: Rigging & Animation

### 14.1 Skeleton/Armature System
- [x] Armature component type (entity component with bone data)
- [x] Bone creation mode (new editor mode: Pose Mode)
- [x] Bone creation: click to place bone, click again to set end
- [x] Bone editing: select, move, rotate bones
- [x] Bone hierarchy: parent/child bone chains
- [x] Bone visualization (wireframe bones in viewport)
- [x] Armature store (Zustand): bones, active bone, pose mode

### 14.2 Bone Constraints
- [ ] IK constraint (inverse kinematics solver — CCD or FABRIK)
- [ ] Look-at constraint (bone points at target)
- [ ] Parent constraint (bone follows parent transform)
- [ ] Track-to constraint (bone axis tracks target)
- [ ] Limit constraint (rotation limits per axis)
- [ ] Constraint stack (multiple constraints per bone, ordered evaluation)
- [ ] Constraint influence slider (0-1 blend)

### 14.3 Skinning
- [ ] Weight paint mode (new editor mode)
- [ ] Weight brush: paint vertex weights for active bone
- [ ] Weight visualization (heat map: blue=0, red=1)
- [ ] Auto-weight assignment (envelope-based, bone heat method)
- [ ] Weight normalize (ensure vertex weights sum to 1.0)
- [ ] Weight mirror (left-right symmetry)
- [ ] Babylon.js skinned mesh: apply skeleton to mesh
- [ ] Skinned mesh rendering (GPU skinning via Babylon.js)

### 14.4 Keyframe Animation
- [x] Animation store (Zustand): animations, active animation, playback state
- [x] Key types: position, rotation, scale, custom properties
- [x] Key insertion (I key in pose mode)
- [x] Key deletion
- [x] Key interpolation (linear, bezier easing)
- [x] Animation clip management (create, rename, delete clips)
- [ ] Animation blending (crossfade between clips)
- [ ] NLA editor (Non-Linear Animation — blend multiple clips)

### 14.5 Timeline & Playback
- [x] Timeline component (scrubable playback bar)
- [x] Playback controls: play, pause, stop, jump to start/end
- [x] Frame rate settings (24, 25, 30, 60 fps)
- [x] Frame step (forward/backward by frame)
- [ ] Play mode vs Edit mode (simulation toggle)
- [x] Looping toggle (loop, ping-pong, once)

### 14.6 Dope Sheet & Pose Library
- [x] Dope sheet editor (keyframe visualization per channel)
- [x] Key selection (click, box select, select all keys in range)
- [x] Key manipulation (move, scale, delete selected keys)
- [ ] Pose library: save current pose as named pose
- [ ] Pose library: restore/apply saved pose
- [ ] Pose library: blend between poses (slider)
- [ ] Animation export (glTF animation clips)
- [x] Commit and push: Phase 14 complete

---

## Phase 15: Sculpting

### 15.1 Sculpt Mode Infrastructure
- [x] Sculpt mode (new editor mode, toggle from Object/Edit)
- [x] Sculpt mode store (Zustand): active brush, brush settings, symmetry
- [x] Sculpt mode UI (toolbar brush selector, settings panel)
- [x] Raycast-to-mesh for brush (screen-space brush circle)
- [x] Brush cursor visualization (circle on mesh surface)
- [x] Keyboard shortcut: Tab to enter/exit sculpt mode

### 15.2 Brush Engine
- [x] Sculpt brush (push/pull vertices along normal)
- [x] Smooth brush (Laplacian smoothing of vertex positions)
- [x] Grab brush (translate vertices freely)
- [x] Inflate brush (push vertices outward from center)
- [x] Pinch brush (pull vertices toward brush center)
- [x] Flatten brush (project vertices to average plane)
- [x] Crease brush (sharpen edges along stroke)
- [ ] Clay strips brush (clay-like buildup)
- [x] Brush settings: radius (1-500px), strength (0.01-1.0), falloff (smooth/sharp/spike)
- [x] Brush spacing control (distance between dab applications)
- [x] Pressure sensitivity (PointerEvent pressure for stylus support)

### 15.3 Dynamic Topology
- [ ] Dyntopo toggle (adaptive tessellation during sculpting)
- [ ] Detail size slider (target edge length for subdivision)
- [ ] Subdivision while sculpting (split long edges)
- [ ] Collapse while sculpting (merge short edges)
- [ ] Remesh brush (uniform mesh density)

### 15.4 Multiresolution
- [ ] Multiresolution modifier (subdivision levels 0-N)
- [ ] Level selector (switch between detail levels)
- [ ] Sculpt at any level (detail propagates up/down)
- [ ] Subdivide to next level
- [ ] Apply multiresolution (bake detail to base level)

### 15.5 Sculpt Tools
- [ ] Sculpt mask (protect areas from brush strokes)
- [ ] Mask brush (paint mask on/off)
- [ ] Invert mask
- [ ] Clear mask
- [x] Symmetry (X, Y, Z axis mirror strokes)
- [ ] Face sets (mark regions for isolated operations)
- [ ] Hide/show face sets during sculpting

### 15.6 Detail Transfer
- [ ] Normal map baking (high-poly sculpt → low-poly mesh)
- [ ] Displacement map baking
- [ ] Ambient occlusion baking (cavity detection)
- [ ] Texture resolution settings (512, 1024, 2048, 4096)
- [ ] Bake preview (normal map applied to low-poly)
- [ ] Commit and push: Phase 15 complete

---

## Phase 16: Node Editor & Visual Scripting

### 16.1 Node Graph Framework
- [x] Node graph canvas component (pan, zoom, select)
- [x] Node rendering (title, inputs, outputs, body)
- [x] Connection rendering (bezier curves between ports)
- [x] Port data types: Float, Vector2, Vector3, Color, Texture, Mesh, Boolean, Any
- [x] Type-compatible connections (prevent mismatched connections)
- [x] Node selection (click, box select, marquee)
- [x] Node deletion (Delete key, backspace)
- [x] Connection creation (drag from output to input port)
- [x] Connection deletion (right-click on connection)

### 16.2 Shader Node Editor
- [x] Shader node graph type
- [x] Node types: Principled BSDF, Emission, Glossy BSDF, Mix Shader
- [x] Input nodes: Texture Image, Color, Value, Normal, UV
- [x] Math nodes: Add, Subtract, Multiply, Divide, Power, Mix, Clamp
- [x] Vector nodes: Combine XYZ, Separate XYZ, Vector Math, Map Range
- [x] Color nodes: Mix Color, RGB to HSV, HSV to RGB, Color Ramp
- [x] Texture nodes: Checker, Brick, Noise, Voronoi, Gradient
- [x] Output node: Material Output (connects to Babylon ShaderMaterial)
- [ ] Real-time preview (shader updates as nodes change)
- [ ] Shader preset library (metal, wood, marble, plastic, etc.)

### 16.3 Compositing Node Editor
- [ ] Compositor node graph type
- [ ] Input nodes: Render Layer, Image, Mask
- [ ] Process nodes: Blur, Sharpen, Brightness/Contrast, Color Balance, Hue/Sat
- [ ] Mix nodes: Alpha Over, Multiply, Screen, Add, Subtract
- [ ] Filter nodes: Glare, Bloom, DoF, Fog
- [ ] Output nodes: Viewer, Composite, File Output
- [ ] Compositing preset library (cinematic, stylized, vintage)

### 16.4 Geometry Node Editor
- [ ] Geometry node graph type
- [ ] Input nodes: Object Info, Collection Info, Mesh Primitive
- [ ] Transform nodes: Transform, Set Position, Set Rotation, Set Scale
- [ ] Mesh nodes: Subdivide, Extrude, Delete, Boolean, Merge
- [ ] Generate nodes: Grid, Circle, Curve, Instance on Points
- [ ] Math nodes: Float Math, Vector Math, Boolean
- [ ] Output nodes: Group Output, Set Material
- [ ] Spreadsheet viewer (inspect geometry data at each node)
- [ ] Geometry presets (array, random scatter, curve-based)

### 16.5 Game Logic Visual Scripting
- [ ] Logic node graph type (like Unreal Blueprints)
- [ ] Event nodes: On Start, On Update, On Collision, On Input
- [ ] Action nodes: Move, Rotate, Apply Force, Set Variable, Play Animation
- [ ] Flow control: Branch (if/else), For Loop, While Loop, Sequence, Delay
- [ ] Variable nodes: Get/Set (entity-scoped and global)
- [ ] Math nodes: Compare, Arithmetic, Trigonometry, Random
- [ ] Entity nodes: Get Property, Set Property, Find By Name, Spawn
- [ ] Debug nodes: Print, Watch, Breakpoint

### 16.6 Node System Features
- [ ] Node groups (collapse subgraph into reusable group)
- [ ] Node group inputs/outputs (expose selected ports)
- [ ] Node library (save/load node groups to IndexedDB)
- [ ] Node search (Ctrl+Space to find and add nodes)
- [ ] Node minimap (overview of large graphs)
- [ ] Frame nodes (organize related nodes visually)
- [ ] Copy/paste nodes (with connections)
- [ ] Undo/redo for node operations
- [ ] Commit and push: Phase 16 complete

---

## Phase 17: Game Logic & Physics

### 17.1 Physics Engine Integration
- [ ] Install Babylon.js physics plugin (Havok via WASM or Ammo.js)
- [ ] Physics engine initialization (gravity, time step)
- [ ] Rigid body component (mass, friction, restitution, linear/angular damping)
- [ ] Collision shapes: box, sphere, cylinder, capsule, convex hull, mesh
- [ ] Static vs dynamic body toggle
- [ ] Physics material (bounciness, friction)
- [ ] Physics debug visualization (wireframe colliders)

### 17.2 Collision & Triggers
- [ ] Collision event system (onCollisionEnter, onCollisionExit, onCollisionStay)
- [ ] Trigger volumes (invisible colliders that detect overlap)
- [ ] Physics layers / collision groups (which objects collide with which)
- [ ] Raycast API (physics raycast for gameplay)
- [ ] Sweep test (cast shape along path)
- [ ] Overlap test (check if shape overlaps any colliders)

### 17.3 Game Mode
- [ ] Play mode toggle (edit mode → play mode, separate from edit)
- [ ] Game loop (fixed time step update, variable render)
- [ ] Pause/resume in play mode
- [ ] Stop play mode (reset to pre-play state)
- [ ] Play mode indicator (border color change, status bar)
- [ ] Game settings panel (gravity vector, time step, max physics iterations)

### 17.4 Game Scripting
- [ ] Script component (attach script to entity)
- [ ] Script lifecycle: onInit, onUpdate, onCollision, onDestroy
- [ ] Entity API in scripts: getComponent, setProperty, getPosition, setPosition
- [ ] Input API in scripts: isKeyDown, isKeyPressed, getMousePosition
- [ ] Time API: deltaTime, timeSinceStart, fixedDeltaTime
- [ ] Transform API: translate, rotate, lookAt, getForward, getRight, getUp

### 17.5 Character Controller
- [ ] Basic character controller (WASD movement, mouse look)
- [ ] Jump mechanic (space bar, ground check via raycast)
- [ ] Gravity application
- [ ] Collision response (slide along walls, not get stuck)
- [ ] Slope handling (walk up/down slopes)

### 17.6 State Machine
- [ ] State machine component (visual state graph for entity behavior)
- [ ] States: Idle, Walk, Run, Jump, Fall, Attack, etc.
- [ ] Transitions: conditions for state changes
- [ ] State actions: onEnter, onUpdate, onExit callbacks
- [ ] State machine visualization (node graph showing states and transitions)
- [ ] Parameterized transitions (speed > threshold → Walk state)

### 17.7 Game Export
- [ ] Export as standalone HTML (embed scene + scripts in single file)
- [ ] Export game settings (physics, controls, resolution)
- [ ] Export scripts (inline into HTML)
- [ ] Minimal runtime (stripped-down Babylon.js for game playback)
- [ ] Commit and push: Phase 17 complete

---

## Phase 18: UV Mapping & Texturing

### 18.1 UV Unwrapping
- [ ] UV editor mode (2D canvas showing UV layout)
- [ ] UV editor component (separate panel or tab alongside viewport)
- [ ] Smart UV project (angle-based unwrapping)
- [ ] Cube projection (6-sided projection)
- [ ] Cylinder projection (wrap around cylinder)
- [ ] Sphere projection (spherical mapping)
- [ ] Camera projection (project from current view)
- [ ] Seam marking tool (mark edges as UV seams)

### 18.2 UV Editing
- [ ] UV selection (vertex, edge, face selection in UV space)
- [ ] UV move/rotate/scale (gizmo-like controls in 2D)
- [ ] UV pinning (pin UV vertices during unwrap)
- [ ] UV alignment (align to axis, distribute evenly)
- [ ] UV weld (merge coincident UV vertices)
- [ ] UV rip (split UV vertices at seams)
- [ ] UV snap (snap to grid, snap to other vertices)
- [ ] UV mirror (flip U or V axis)
- [ ] UV checker texture preview

### 18.3 UV Packing
- [ ] Island detection (connected UV regions)
- [ ] Island packing (arrange islands to minimize wasted space)
- [ ] Island rotation (align islands to U/V axes)
- [ ] Pack margin control (padding between islands)
- [ ] Pack target size (1024, 2048, 4096)
- [ ] Lock overlapping islands

### 18.4 Texture Painting
- [ ] Texture paint mode (paint directly on mesh in 3D viewport)
- [ ] Paint brush (color, size, opacity, falloff)
- [ ] Paint layers (base color, roughness, metallic, normal, emission)
- [ ] Layer blending (add, subtract, multiply, overlay)
- [ ] Paint tools: brush, fill, gradient, clone/stamp
- [ ] Undo/redo for paint strokes
- [ ] Stylus pressure support (size/opacity)
- [ ] Texture projection (project 2D image onto mesh)

### 18.5 Procedural Textures
- [ ] Noise texture generator (Perlin, Simplex, Worley/Voronoi)
- [ ] Pattern generators: checker, brick, wood grain, marble, fabric
- [ ] Procedural texture preview in material editor
- [ ] Texture size and tiling controls
- [ ] Color ramp for texture mapping
- [ ] Combine procedural textures (mix, multiply, blend)

### 18.6 Texture Baking
- [ ] Ambient occlusion baking (cavity and ambient shadow)
- [ ] Curvature baking (convex/concave edge detection)
- [ ] Thickness baking (wall thickness for 3D printing)
- [ ] Normal map baking (from high-poly to low-poly)
- [ ] Texture resolution settings (512-8192)
- [ ] Bake samples control (ray count for quality)
- [ ] Bake margin (bleed prevention at UV seams)
- [ ] Commit and push: Phase 18 complete

---

## Phase 19: Advanced Rendering

### 19.1 PBR Materials
- [ ] PBRMaterial integration (albedo, normal, metallic, roughness, AO, emissive)
- [ ] Material presets (metal, plastic, wood, stone, glass, fabric)
- [ ] Clearcoat support (car paint, lacquered surfaces)
- [ ] Sheen support (fabric, velvet)
- [ ] Subsurface scattering approximation
- [ ] Anisotropic reflections
- [ ] IOR (index of refraction) for transparent materials

### 19.2 Environment & Lighting
- [ ] HDRI environment loading (.hdr/.exr)
- [ ] Image-based lighting (IBL)
- [ ] Environment rotation/offset controls
- [ ] Environment intensity slider
- [ ] Studio lighting presets (3-point, dramatic, neutral)
- [ ] Area lights (rectangle, disc, sphere light types)
- [ ] Light linking (control which lights affect which objects)

### 19.3 Post-Processing
- [ ] Screen-space ambient occlusion (SSAO/GTAO)
- [ ] Screen-space reflections (SSR)
- [ ] Bloom/glow effect (threshold, intensity, diffusion)
- [ ] Depth of field (f-stop, focal distance, blade count)
- [ ] Motion blur (shutter speed, blur amount)
- [ ] Chromatic aberration
- [ ] Vignette effect
- [ ] Color grading (LUT, lift/gamma/gain, temperature)
- [ ] Anti-aliasing (FXAA, MSAA, TAA)
- [ ] Tone mapping (ACES, Reinhard, Filmic, Linear)

### 19.4 Shadows
- [ ] Shadow mapping (directional, point, spot light shadows)
- [ ] PCF soft shadows
- [ ] Cascaded shadow maps (CSM for large scenes)
- [ ] Shadow resolution control
- [ ] Shadow bias control (prevent shadow acne/peter-panning)
- [ ] Contact shadows (fake shadows for small objects)
- [ ] Shadow color tinting

### 19.5 Render Settings & Output
- [ ] Render settings panel (resolution, quality, samples)
- [ ] Screenshot capture (PNG/JPEG)
- [ ] Render to file (high-resolution export)
- [ ] Render region (render only selected area)
- [ ] Render layers (separate passes: diffuse, specular, depth, normal)
- [ ] Path tracing preview (WebGPU when available)
- [ ] Denoising (post-process render to reduce noise)
- [ ] Commit and push: Phase 19 complete

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

- **Total Phases:** 19
- **Completed:** Phases 1-11, 14 (core), 15 (core), 16 (16.1+16.2)
- **In Progress:** Phases 12, 15 (advanced), 16 (remaining)
- **Planned:** Phases 17-19
- **Backlog:** 14 deferred items
