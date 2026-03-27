# Technical Research

**Category:** Research
**Last Updated:** 2026-03-27
**Status:** Active

---

## Blender3D Architecture Reference

Blender3D's architecture is organized into modules that inform BlenderGL's design:

### Core Systems

| Blender Module | Purpose | BlenderGL Equivalent |
|----------------|---------|---------------------|
| **RNA (Runtime Data)** | Property system with type-safe access | Zustand stores + TypeScript types |
| **BMesh** | Mesh kernel with vertices/edges/faces | Future: custom mesh data structure |
| ** depsgraph** | Dependency graph for updates | React reactivity + Zustand subscriptions |
| **Operators** | Command pattern for all actions | `undoRedo.ts` command classes |
| **Spaces** | Editor areas (3D viewport, properties, outliner) | React components (Viewport, PropertiesPanel, SceneHierarchy) |
| **Screens** | Layout system for spaces | EditorShell layout |
| **WM (Window Manager)** | Event handling, keymaps | `useKeyboardShortcuts.ts` |

### Design Patterns Borrowed

1. **Operator/Command Pattern** — Every action (transform, add, delete) is a command object with execute/undo. This is the foundation of Blender's undo system.

2. **Mode-Based Editing** — Object mode vs Edit mode. Object mode manipulates entities; Edit mode manipulates geometry. Planned for Phase 8.

3. **Property System** — Blender's RNA system provides type-safe property access with change notifications. Zustand + TypeScript provides similar capability.

4. **Dependency Graph** — Changes propagate automatically. React's reconciliation + Zustand subscriptions handle this.

### Babylon.js v9 API Notes

Babylon.js v9 has some API differences from commonly referenced documentation:

- `scene.createLineSystem()` doesn't exist — use `MeshBuilder.CreateLines()`
- `StandardMaterial` doesn't have `.metallic`, `.emissiveIntensity`, `.transparencyMode` — use `.specularColor`, `.specularPower`, `.alpha`, `.needDepthPrePass`
- GLB export uses `GLTF2Export.GLBAsync()` from `@babylonjs/serializers/glTF/2.0/glTFSerializer` (not `GLTFExporter`)
- Camera input `buttons` property doesn't exist — use `scene.onPointerObservable` with `PointerEventTypes`

### Rendering Decisions

- **WebGL2** (not WebGPU yet) — Better browser compatibility, Babylon.js's WebGL2 path is mature
- **StandardMaterial** (not PBR) — Simpler for initial development, PBR can be added later
- **Forward rendering** — Default Babylon.js rendering, sufficient for current feature set

### State Management Architecture

```
┌──────────────────────────────────────┐
│            Zustand Stores            │
├──────────┬──────────┬───────────────┤
│ scene    │ selection│ history       │
│ entities │ selected │ undoStack     │
│ add/     │ active   │ redoStack     │
│ remove   │ mode     │ execute/undo  │
│ update   │ hover    │ redo          │
├──────────┴──────────┴───────────────┤
│          settings    material        │
│          grid/snap    albedo/metal   │
│          theme         rough/emiss   │
└──────────────────────────────────────┘
         ↓ React subscriptions
┌──────────────────────────────────────┐
│          React Components            │
│  Viewport ↔ Properties ↔ Hierarchy  │
└──────────────────────────────────────┘
         ↓ useEffect sync
┌──────────────────────────────────────┐
│          Babylon.js Scene            │
│  Meshes ↔ Materials ↔ Gizmos        │
└──────────────────────────────────────┘
```

### Performance Considerations

- **Entity-mesh sync** runs on every `entities` state change via `useEffect` — acceptable for <1000 entities
- **Material sync** is separate from entity sync to avoid unnecessary material updates
- **Selection highlighting** uses `renderOutline` (built-in Babylon.js feature)
- **Grid** uses `MeshBuilder.CreateLines` — lightweight, no per-frame cost
- **Future optimization**: Instanced rendering for repeated primitives, spatial partitioning for large scenes

### IndexedDB Schema

```
Database: blendergl-scenes
  Object Store: scenes
    Key: id (string, UUID)
    Value: SceneData
    Indexes: name, updatedAt
```

All scene data (entities, materials, settings) is serialized to a single `SceneData` object per scene.

---

## Phase 12+ Research: Advanced Features

Deep research on implementing Blender-like scripting, rigging, sculpting, game logic, and advanced features in BlenderGL using Babylon.js + React/TypeScript.

---

### 1. Scripting Engine

#### 1.1 Script Editor Component

**Primary Option: Monaco Editor** (the editor powering VS Code)

| Property | Detail |
|----------|--------|
| npm package | `@monaco-editor/react` |
| License | MIT |
| Size | ~2MB (loaded from CDN recommended) |
| Features | Syntax highlighting, IntelliSense, type checking, debugging, multi-language |
| React integration | `<Editor height="400px" language="typescript" theme="vs-dark" />` |

**Alternative: CodeMirror 6**

| Property | Detail |
|----------|--------|
| npm package | `@codemirror/view`, `@codemirror/lang-javascript` |
| License | MIT |
| Size | ~200KB (much lighter) |
| Features | Lightweight, extensible, good for embedded editors |
| Tradeoff | Less feature-rich than Monaco, no built-in IntelliSense |

**Recommendation:** Monaco Editor for the main scripting panel. It provides TypeScript language services including autocompletion against a custom API definition file (`.d.ts`), which is essential for exposing BlenderGL's scripting API to users.

#### 1.2 JavaScript/TypeScript Scripting API Design

The scripting API should mirror Blender's `bpy` module concept but in JS/TS. Key design:

```typescript
// blendergl.d.ts — Type definitions for user scripts
declare namespace BGL {
  // Data access (like bpy.data)
  namespace data {
    const objects: SceneObject[];
    const materials: BGLMaterial[];
    const scenes: BGLScene[];
    function new_object(type: PrimitiveType, name: string): SceneObject;
    function new_material(name: string): BGLMaterial;
  }

  // Operations (like bpy.ops)
  namespace ops {
    function transform.translate(obj: SceneObject, delta: Vec3): void;
    function transform.rotate(obj: SceneObject, euler: Vec3): void;
    function mesh.subdivide(obj: SceneObject, levels: number): void;
    function mesh.extrude(obj: SceneObject, faces: number[]): void;
    function object.duplicate(obj: SceneObject): SceneObject;
    function object.delete(obj: SceneObject): void;
    function object.parent(child: SceneObject, parent: SceneObject): void;
  }

  // Scene access (like bpy.context)
  namespace context {
    const scene: BGLScene;
    const selected_objects: SceneObject[];
    const active_object: SceneObject | null;
    const mode: 'object' | 'edit' | 'sculpt';
  }

  // UI interaction
  namespace ui {
    function message(msg: string): void;
    function confirm(title: string, msg: string): Promise<boolean>;
    function progress(current: number, total: number): void;
  }
}
```

#### 1.3 Script Execution Sandbox

**Security is critical.** User scripts must not access `window`, `document`, `fetch`, or any browser APIs outside the explicitly exposed `BGL` namespace.

**Approach: Layered Sandbox (defense in depth)**

```
Layer 1: iframe sandbox="allow-scripts" (no allow-same-origin)
  Layer 2: Content Security Policy (blocks network, inline resources)
    Layer 3: QuickJS-WASM runtime (separate JS engine, explicit API exposure)
      Layer 4: User script runs inside QuickJS with only BGL APIs available
```

**Implementation options ranked by isolation level:**

| Approach | Isolation | Performance | Complexity | Recommendation |
|----------|-----------|-------------|------------|----------------|
| `new Function()` | None | Native | Trivial | Never use for untrusted code |
| Web Worker | Thread-only | Native | Low | Good for trusted scripts only |
| iframe sandbox | Medium-High | Native | Low | Good for MVP |
| SES/Lockdown (Agoric) | High | Native | Medium | Good balance |
| QuickJS-WASM | Very High | 2-10x slower | Medium | Maximum security |

**Recommended: iframe sandbox + QuickJS-WASM for production**

**QuickJS-WASM implementation:**

```typescript
import { QuickJSWASMModule } from 'quickjs-emscripten';

// Initialize QuickJS
const quickjs = await QuickJSWASMModule();

// Create a new VM (completely isolated)
const vm = quickjs.newContext();

// Expose only the BGL API
const bgHandle = vm.newObject();
vm.setProp(vm.global, 'BGL', bgHandle);

// Expose specific functions
const translateFn = vm.newFunction('translate', (vm, ...args) => {
  const objId = vm.getString(args[0]);
  const x = vm.getNumber(args[1]);
  const y = vm.getNumber(args[2]);
  const z = vm.getNumber(args[3]);
  // Call into BlenderGL's command system
  BGL.ops.transform.translate(objId, {x, y, z});
});
vm.setProp(bgHandle, 'translate', translateFn);

// Execute user code
const result = vm.evalCode(userScript);
```

**Key npm packages:**

| Package | Purpose |
|---------|---------|
| `quickjs-emscripten` | QuickJS compiled to WASM for browser sandboxing |
| `@nicolo-ribaudo/quickjs-wasm` | Alternative QuickJS WASM build |
| `ses-lockdown` | Secure ECMAScript (Agoric) — V8 hardening without WASM |
| `@monaco-editor/react` | Monaco Editor React wrapper |

**For MVP:** Start with iframe sandbox approach (simpler, adequate for Phase 12). Upgrade to QuickJS-WASM when security requirements harden.

#### 1.4 Script Types (Blender's Model)

| Script Type | Trigger | Blender Equivalent | BlenderGL Implementation |
|-------------|---------|--------------------|--------------------------|
| **Startup scripts** | Editor loads | `startup.blend` | `scripts/startup/` folder, executed on editor init |
| **Operator scripts** | Registered as commands | `bpy.ops` registration | `BGL.registerOperator(name, fn)` — adds to ops namespace |
| **Modifier scripts** | Per-frame evaluation | Geometry Nodes modifiers | Script attached to entity, evaluated per render frame |
| **Callback scripts** | Event-triggered | Handler system | `BGL.on('frame', fn)`, `BGL.on('selection', fn)` |
| **Panel scripts** | Custom UI panels | Panel registration | `BGL.registerPanel(name, renderFn)` — adds to PropertiesPanel |

#### 1.5 Hot Reload

```typescript
// Watch for script changes (file-based or in-editor)
const watcher = new FileSystemWatcher(scriptPath);

watcher.onChange(async () => {
  const newCode = await readFile(scriptPath);
  // Terminate previous execution context
  previousContext?.dispose();
  // Create new context and execute
  const ctx = await createScriptContext(newCode);
  ctx.execute();
});
```

For the in-editor Monaco experience, use Monaco's `onDidChangeModelContent` event with debouncing to re-execute on each save/keystroke.

---

### 2. Rigging / Skeletal Animation

#### 2.1 Babylon.js Skeleton System

Babylon.js provides a complete skeletal animation system. Key classes:

| Class | Package | Purpose |
|-------|---------|---------|
| `Skeleton` | `@babylonjs/core/Bones` | Container for all bones, manages bone hierarchy |
| `Bone` | `@babylonjs/core/Bones` | Individual bone with parent, transform, constraints |
| `SkeletonViewer` | `@babylonjs/core/Bones/skeletonViewer` | Debug visualization of bone hierarchy |
| `AnimationGroup` | `@babylonjs/core/Animations` | Named animation clips with blending support |

**Programmatic bone creation:**

```typescript
import { Skeleton, Bone } from '@babylonjs/core/Bones/skeleton';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math';

const skeleton = new Skeleton('armature', 'armatureId', scene);

// Create bone chain (root -> spine -> chest -> head)
const root = new Bone('root', skeleton, null);
root.setPosition(new Vector3(0, 0, 0));

const spine = new Bone('spine', skeleton, root);
spine.setPosition(new Vector3(0, 1, 0));

const chest = new Bone('chest', skeleton, spine);
chest.setPosition(new Vector3(0, 1.2, 0));

const head = new Bone('head', skeleton, chest);
head.setPosition(new Vector3(0, 0.5, 0));

// Attach skeleton to mesh (skinning)
mesh.skeleton = skeleton;

// Set bone weights per vertex
mesh.setVerticesData('matricesIndices', indicesArray);
mesh.setVerticesData('matricesWeights', weightsArray);

// Babylon.js supports up to 8 bone influences per vertex
// (configurable via skeleton.numBoneInfluencers)
```

**Debug visualization:**

```typescript
import { SkeletonViewer } from '@babylonjs/core/Bones/skeletonViewer';

const viewer = new SkeletonViewer(skeleton, mesh, scene, true, {
  displayMode: SkeletonViewer.DISPLAY_MODE_SPHERE_AND_SPURS,
  midPoints: [{ boneIndex: 0, width: 0.1 }],
  midPointScaled: false,
});
```

#### 2.2 Bone Creation/Manipulation

**Armature Component (entity component pattern):**

```typescript
interface ArmatureComponent {
  type: 'armature';
  skeletonId: string;
  bones: BoneData[];
}

interface BoneData {
  id: string;
  name: string;
  parentId: string | null;
  position: Vec3;
  rotation: Vec3; // Euler angles
  scale: Vec3;
  length: number;
  constraints: ConstraintData[];
}
```

**IK/FK System — Babylon.js does NOT have built-in IK.** Options:

| Approach | Library | Notes |
|----------|---------|-------|
| Custom CCD IK | Implement in TypeScript | Iterative, simple, adequate for most cases |
| Custom FABRIK IK | Implement in TypeScript | Fast, handles chains well |
| `three-mesh-bvh` + custom | Adapted from Three.js ecosystem | For IK raycasting |
| Babylon.js + IK plugin | Community | No official IK support yet |

**CCD IK Implementation (simplified):**

```typescript
function solveCCDIK(chain: Bone[], target: Vector3, iterations: number = 10) {
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const bone = chain[i];
      const boneWorldPos = bone.getAbsolutePosition();

      // Vector from bone to end effector
      const toEnd = endEffectorPos.subtract(boneWorldPos).normalize();
      // Vector from bone to target
      const toTarget = target.subtract(boneWorldPos).normalize();

      // Angle between vectors
      const angle = Math.acos(Vector3.Dot(toEnd, toTarget));
      // Rotation axis
      const axis = Vector3.Cross(toEnd, toTarget).normalize();

      // Apply rotation to bone
      bone.rotate(axis, angle);
    }
  }
}
```

#### 2.3 Weight Painting

Weight painting assigns vertex weights to bones, determining how much each bone influences each vertex.

**Implementation approach:**

1. **Enter weight paint mode** (new mode alongside Object/Edit/Sculpt)
2. **Select active bone** from armature
3. **Paint weights** on mesh vertices using brush strokes
4. **Visual feedback** — color-coded weights on mesh (blue=0, red=1)

```typescript
interface WeightPaintState {
  mode: 'weight_paint';
  activeBoneId: string;
  brushType: 'draw' | 'smooth' | 'subtract';
  brushSize: number;
  brushStrength: number;
  brushFalloff: 'smooth' | 'constant' | 'spherical';
}

// Weight data stored per-vertex per-bone
// Babylon.js expects: matricesIndices (Uint4Array) + matricesWeights (Float32Array)
function paintWeight(
  vertexIndex: number,
  boneIndex: number,
  weight: number,
  mesh: AbstractMesh
) {
  const weights = mesh.getVerticesData('matricesWeights') as Float32Array;
  const indices = mesh.getVerticesData('matricesIndices') as Uint4Array;

  // Each vertex has 4 weight slots (up to 4 bone influences)
  const vertOffset = vertexIndex * 4;

  // Find slot for this bone or replace lowest weight
  for (let i = 0; i < 4; i++) {
    if (indices[vertOffset + i] === boneIndex) {
      weights[vertOffset + i] = weight;
      break;
    }
    if (weights[vertOffset + i] < weight) {
      // Shift other weights down
      weights[vertOffset + 3] = weights[vertOffset + 2];
      indices[vertOffset + 3] = indices[vertOffset + 2];
      weights[vertOffset + 2] = weights[vertOffset + 1];
      indices[vertOffset + 2] = indices[vertOffset + 1];
      weights[vertOffset + 1] = weights[vertOffset + 0];
      indices[vertOffset + 1] = indices[vertOffset + 0];
      weights[vertOffset + 0] = weight;
      indices[vertOffset + 0] = boneIndex;
      break;
    }
  }

  mesh.updateVerticesData('matricesWeights', weights);
  mesh.updateVerticesData('matricesIndices', indices);
}
```

**Heat map visualization:** Use `VertexData` color buffer to display weights on mesh surface. Blue (0.0) to Red (1.0).

#### 2.4 Animation System

**Babylon.js Animation API:**

```typescript
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';

// Keyframe animation on a bone
const boneAnimation = new Animation(
  'boneAnim',
  'position.y',
  30, // FPS
  Animation.ANIMATIONTYPE_FLOAT,
  Animation.ANIMATIONLOOPMODE_CYCLE
);

boneAnimation.setKeys([
  { frame: 0, value: 0 },
  { frame: 15, value: 1 },  // Peak
  { frame: 30, value: 0 },  // Back to start
]);

skeleton.bones[0].animations.push(boneAnimation);

// Animation groups for named clips
const runAnim = new AnimationGroup('Run', scene);
runAnim.addTargetedAnimation(boneAnimation, skeleton.bones[0]);

// Play / blend
runAnim.play(true); // true = loop
runAnim.crossFadeTo(idleAnim, 0.3, true); // 0.3s crossfade

// Animation blending state machine
runAnim.onAnimationGroupPlayObservable.add(() => { /* ... */ });
runAnim.onAnimationGroupEndObservable.add(() => { /* ... */ });
```

**Animation Timeline Component:**

```typescript
interface AnimationTimelineState {
  playing: boolean;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  selectedKeyframes: Set<string>;
  tracks: AnimationTrack[];
}

interface AnimationTrack {
  boneId: string;
  property: 'position' | 'rotation' | 'scale';
  channel: 'x' | 'y' | 'z' | 'w';
  keyframes: Keyframe[];
}
```

**Pose Library:**

```typescript
interface Pose {
  name: string;
  boneTransforms: Map<string, { position: Vec3; rotation: Vec3; scale: Vec3 }>;
}

function savePose(skeleton: Skeleton, name: string): Pose {
  const pose: Pose = { name, boneTransforms: new Map() };
  for (const bone of skeleton.bones) {
    pose.boneTransforms.set(bone.id, {
      position: bone.position.clone(),
      rotation: bone.rotation.clone(),
      scale: bone.scaling.clone(),
    });
  }
  return pose;
}

function applyPose(skeleton: Skeleton, pose: Pose): void {
  for (const bone of skeleton.bones) {
    const t = pose.boneTransforms.get(bone.id);
    if (t) {
      bone.position = t.position.clone();
      bone.rotation = t.rotation.clone();
      bone.scaling = t.scale.clone();
    }
  }
  skeleton.markAsDirty();
}
```

#### 2.5 Constraint System

Babylon.js does NOT have a built-in constraint system. Must be implemented:

| Constraint | Implementation | Complexity |
|------------|---------------|------------|
| **Copy Location** | Lerp bone position to target | Low |
| **Copy Rotation** | Lerp bone rotation to target | Low |
| **IK Constraint** | CCD or FABRIK solver | Medium |
| **Look-At** | Quaternion lookAt calculation | Medium |
| **Parent (with offset)** | Inverse transform of parent | Low |
| **Limit Rotation** | Clamp euler angles | Low |
| **Track To** | Billboard-like tracking | Medium |
| **Stretch To** | Scale bone length to reach target | Medium |

**Constraint evaluation order:** Constraints are evaluated top-down in the bone hierarchy each frame, similar to Blender's constraint stack.

---

### 3. Sculpting

#### 3.1 Reference: SculptGL

SculptGL (by Stephane Ginier, github.com/stephaneginier/sculptgl) is the most relevant open-source reference. It demonstrates:

- Dynamic topology (remeshing during sculpting)
- Multiple brush types (inflate, smooth, pinch, flatten, grab, scrape)
- WebGL-based real-time vertex displacement
- OBJ/STL export

Key techniques from SculptGL's architecture:
- Half-edge data structure for mesh topology management
- Symmetry sculpting (X/Y/Z mirroring)
- Topology-aware brush (respects edge flow)
- Undo/redo for sculpting strokes

#### 3.2 Dynamic Subdivision (Adaptive Tessellation)

**Approaches:**

| Approach | GPU/CPU | Performance | Quality | Recommendation |
|----------|---------|-------------|---------|----------------|
| CPU half-edge subdivision | CPU | Slow for large meshes | High | Good for MVP |
| OpenSubdiv WASM | CPU (WASM) | Medium | Production quality | Best quality |
| WebGPU compute shaders | GPU | Fast | High | Future approach |
| Edge splitting (SculptGL style) | CPU | Good | Medium | Good balance |

**Half-edge data structure (TypeScript):**

```typescript
class HalfEdgeMesh {
  vertices: Float32Array;    // positions
  halfEdges: Int32Array;     // twin, next, prev, vertex, face
  faces: Int32Array;         // face half-edge index

  // Subdivide face (Loop subdivision)
  subdivideFace(faceIdx: number): void {
    // 1. Find face edges
    // 2. Create midpoint vertices
    // 3. Split each edge (connect to midpoint)
    // 4. Create new inner face
    // 5. Update topology
  }

  // Adaptive subdivision near brush
  adaptiveSubdivide(center: Vec3, radius: number): void {
    // Only subdivide faces within brush radius
    // Uses octree/spatial hash for fast lookup
  }
}
```

**OpenSubdiv WASM integration:**

```typescript
// Pixar's OpenSubdiv compiled to WASM
// Provides Catmull-Clark and Loop subdivision
import OpenSubdiv from 'opensubdiv-wasm';

const subdiv = new OpenSubdiv();
subdiv.setTopology(vertexCount, faceCount, vertices, faceIndices);
subdiv.setRefinementLevel(3);
const result = subdiv.evaluate();
```

#### 3.3 Brush System

```typescript
interface SculptBrush {
  type: BrushType;
  radius: number;
  strength: number;
  falloff: FalloffType;
  mode: 'add' | 'subtract' | 'smooth';

  // Apply brush to mesh at given point
  apply(
    mesh: SculptMesh,
    brushPos: Vec3,
    brushNormal: Vec3,
    viewDir: Vec3
  ): void;
}

enum BrushType {
  SCULPT = 'sculpt',       // Displace along normal
  SMOOTH = 'smooth',       // Average neighbor positions
  GRAB = 'grab',           // Move vertices with brush
  INFLATE = 'inflate',     // Push outward along normal
  PINCH = 'pinch',         // Pull vertices toward brush center
  FLATTEN = 'flatten',     // Project to average plane
  SCRAPE = 'scrape',       // Like flatten but cuts
  CLAY_STRIPS = 'clay',    // Clay-like buildup
  MASK = 'mask',           // Paint sculpting mask
}

enum FalloffType {
  SMOOTH = 'smooth',
  CONSTANT = 'constant',
  SPHERICAL = 'spherical',
  NEEDLE = 'needle',
}
```

**Brush application (vertex displacement):**

```typescript
function applySculptBrush(
  positions: Float32Array,
  normals: Float32Array,
  brushPos: Vec3,
  brushNormal: Vec3,
  radius: number,
  strength: number,
  falloff: FalloffType
): void {
  for (let i = 0; i < positions.length / 3; i++) {
    const vx = positions[i * 3];
    const vy = positions[i * 3 + 1];
    const vz = positions[i * 3 + 2];

    // Distance from vertex to brush center
    const dx = vx - brushPos.x;
    const dy = vy - brushPos.y;
    const dz = vz - brushPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > radius) continue;

    // Falloff calculation
    const t = dist / radius;
    const falloff = calculateFalloff(t, falloff);

    // Displace along normal
    const displacement = strength * falloff;
    positions[i * 3] += brushNormal.x * displacement;
    positions[i * 3 + 1] += brushNormal.y * displacement;
    positions[i * 3 + 2] += brushNormal.z * displacement;
  }
}
```

#### 3.4 Sculpt Mode Integration

New editor mode: `mode === 'sculpt'`

```typescript
// Extend EditModeStore
interface SculptState {
  activeBrush: BrushType;
  brushRadius: number;
  brushStrength: number;
  falloffType: FalloffType;
  symmetry: 'none' | 'x' | 'y' | 'z' | 'xyz';
  strokeInProgress: boolean;
  lastStrokePoint: Vec3 | null;
  undoStroke: VertexSnapshot | null;
}
```

#### 3.5 Remeshing

Maintaining mesh quality during sculpting requires periodic remeshing:

**Isotropic remeshing algorithm:**
1. Split edges longer than max edge length
2. Collapse edges shorter than min edge length
3. Flip edges to improve triangle quality
4. Project vertices to original surface (Laplacian smoothing)
5. Repeat until convergence

**Libraries:**

| Library | Approach | WASM? | Notes |
|---------|----------|-------|-------|
| CGAL | Delaunay-based | WASM port exists | Heavy (~20MB) |
| OpenSubdiv | Subdivision only | WASM port | Not true remeshing |
| Custom implementation | Edge-based | Native TS | Recommended for BlenderGL |
| libigl (via Emscripten) | Various geometry ops | WASM | Heavy but comprehensive |

#### 3.6 Normal Map Baking

Converting sculpt detail to normal maps for lower-poly meshes:

```typescript
// Render high-poly sculpt from 6 directions (cube map)
// For each texel in the low-poly UV map:
//   1. Cast ray from low-poly surface
//   2. Find intersection with high-poly mesh
//   3. Calculate normal difference
//   4. Encode as normal map color

// Babylon.js utility:
import { Texture } from '@babylonjs/core/Materials/Textures/texture';

function bakeNormalMap(
  highPoly: Mesh,
  lowPoly: Mesh,
  resolution: number = 2048
): DynamicTexture {
  const texture = new DynamicTexture('normalMap', resolution, scene);
  // ... raycasting and normal computation
  return texture;
}
```

#### 3.7 WebGL Compute / WebGPU

**WebGL limitations:** No compute shaders. Must use:
- Transform feedback (vertex shader output to buffer) — limited
- Multiple render passes with framebuffer objects — workable
- CPU computation with typed arrays — most practical for now

**WebGPU (future):** Compute shaders enable:
- GPU-side vertex displacement during sculpting
- GPU subdivision (Catmull-Clark in compute)
- GPU remeshing
- Massive parallelism for brush operations

**Migration path:** Design the sculpting system with a compute abstraction layer:

```typescript
interface ComputeBackend {
  displace(positions: Float32Array, brush: BrushData): Float32Array;
  subdivide(topology: TopologyData): TopologyData;
  remesh(topology: TopologyData, params: RemeshParams): TopologyData;
}

class WebGLComputeBackend implements ComputeBackend { /* CPU fallback */ }
class WebGPUComputeBackend implements ComputeBackend { /* GPU compute */ }
```

---

### 4. Game Logic / Visual Scripting

#### 4.1 Node-Based Visual Scripting

**Primary Library: Rete.js v2**

| Property | Detail |
|----------|--------|
| npm package | `rete`, `rete-react-render-plugin`, `rete-connection-plugin` |
| GitHub | github.com/retejs/rete |
| License | MIT |
| React support | Yes (via `@rete/react-render-plugin`) |
| Features | Drag-drop nodes, custom node types, data flow, control flow, plugin architecture |
| Serialization | JSON export/import |
| TypeScript | Full support |

**Alternative: React Flow (@xyflow/react)**

| Property | Detail |
|----------|--------|
| npm package | `@xyflow/react` |
| GitHub | github.com/xyflow/xyflow |
| License | MIT |
| React support | First-class |
| Features | Custom nodes, edges, minimap, controls, layout algorithms |
| Tradeoff | More of a flowchart library; less visual-programming-oriented than Rete.js |

**Recommendation:** Rete.js for the visual scripting editor. It is purpose-built for visual programming with proper data flow semantics, custom node types with typed inputs/outputs, and plugin-based extensibility.

**Rete.js integration example:**

```typescript
import Rete from 'rete';
import { ReactPlugin } from 'rete-react-render-plugin';
import { ConnectionPlugin } from 'rete-connection-plugin';

// Define custom node types
class PrintNode extends Rete.Node {
  constructor() {
    super('Print');
    this.addInput(new Rete.Input('msg', 'Message', textSocket));
  }
}

class CompareNode extends Rete.Node {
  constructor() {
    super('Compare');
    this.addInput(new Rete.Input('a', 'A', numberSocket));
    this.addInput(new Rete.Input('b', 'B', numberSocket));
    this.addOutput(new Rete.Output('result', 'Result', booleanSocket));
  }
}

// Create editor
const editor = new Rete.NodeEditor('visual-script@0.1.0', container);
editor.use(ConnectionPlugin);
editor.use(ReactPlugin);

// Register node types
editor.register(TextNode);
editor.register(PrintNode);
editor.register(CompareNode);
```

#### 4.2 Node Types for Game Logic

```
Event Nodes (triggers):
  On Start, On Frame, On Collision, On Input, On Custom Event

Action Nodes (execution):
  Move, Rotate, Scale, Set Property, Play Animation,
  Spawn Object, Destroy Object, Apply Force

Flow Control:
  Branch (if/else), Sequence, For Loop, While Loop,
  Delay, Wait Until, Switch

Math Nodes:
  Add, Subtract, Multiply, Divide, Random, Clamp,
  Lerp, Vector Math, Compare

Variable Nodes:
  Get Variable, Set Variable, Has Variable,
  Increment, Blackboard Get/Set

Physics Nodes:
  Apply Force, Apply Impulse, Set Velocity,
  Raycast, Overlap Sphere, Trigger Check

Animation Nodes:
  Play Animation, Blend To, Cross Fade,
  Get Animation State, Set Animation Speed

Transform Nodes:
  Get Position, Set Position, Look At,
  Transform Point, Inverse Transform
```

#### 4.3 Behavior Trees

**Recommended library: `behaviortree-ts`** (by mikewesthad)

| Property | Detail |
|----------|--------|
| npm package | `behaviortree-ts` or `@nickclaw/behaviortree` |
| GitHub | github.com/nickclaw/behaviortree |
| License | MIT |
| TypeScript | First-class |
| Features | Composites (Sequence, Selector, Parallel), Decorators (Inverter, Repeater, UntilFail), Condition nodes, Blackboard (per-agent state), JSON serialization |

**Alternative: Yuka.js** (broader game AI)

| Property | Detail |
|----------|--------|
| npm package | `yuka` |
| GitHub | github.com/Mugen87/yuka |
| License | MIT |
| Features | Behavior trees, finite state machines, steering behaviors, pathfinding (A*), raycasting |

**Behavior tree integration with visual scripting:**

The behavior tree can be represented as a Rete.js graph where:
- Sequence nodes = vertical chains
- Selector nodes = horizontal branches
- Decorator nodes = wrapping nodes
- Condition/action nodes = leaf nodes

The visual graph serializes to JSON, which the behavior tree engine executes at runtime.

#### 4.4 State Machines

```typescript
interface GameStateMachine {
  id: string;
  initialState: string;
  states: Map<string, GameState>;
  transitions: GameTransition[];
  variables: Map<string, any>;
}

interface GameState {
  name: string;
  onEnter?: string;  // Script or node graph ID
  onUpdate?: string; // Script or node graph ID
  onExit?: string;   // Script or node graph ID
}

interface GameTransition {
  from: string;       // State name or '*'
  to: string;         // State name
  condition: string;  // Expression or node graph ID
  trigger: 'event' | 'condition' | 'auto';
}
```

#### 4.5 Physics Integration

**Havok Physics (official Babylon.js physics engine as of v6+):**

```typescript
import { HavokPlugin } from '@babylonjs/havok';
import HavokPhysics from '@babylonjs/havok';

// Initialize Havok WASM module
const havokInstance = await HavokPhysics();
const havok = new HavokPlugin(true, havokInstance);
scene.enablePhysics(new Vector3(0, -9.81, 0), havok);

// Physics body on mesh
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/physicsShape';

const body = new PhysicsBody(mesh, PhysicsShapeType.BOX, scene, havok);
body.setMassProperties({ mass: 1 });

// Collision events
body.onCollideObservable.add((event) => {
  const other = event.collidedAgainst.transformNode.name;
  // Trigger game logic
  eventSystem.emit('collision', { a: mesh.name, b: other });
});

// Trigger volumes (sensors)
triggerBody.isSensor = true;
triggerBody.onCollideObservable.add((event) => {
  eventSystem.emit('triggerEnter', { entity: mesh.name });
});

// Collision filter groups
body.setCollisionFilterGroup(GROUP_PLAYER);
body.setCollisionFilterMask(GROUP_STATIC | GROUP_DYNAMIC);

// CCD for fast-moving objects
body.setCCDEnabled(true);
```

**Key npm packages:**

| Package | Purpose |
|---------|---------|
| `@babylonjs/havok` | Havok Physics WASM runtime |
| `@babylonjs/core` | PhysicsBody, PhysicsShape, PhysicsMaterial |

#### 4.6 Game Loop (Play Mode vs Edit Mode)

```typescript
enum EditorMode {
  EDIT = 'edit',
  PLAY = 'play',
  PAUSE = 'pause',
}

// In play mode:
// 1. Physics simulation runs
// 2. Game logic scripts execute per frame
// 3. Behavior trees tick per frame
// 4. State machines evaluate transitions
// 5. Animation systems update
// 6. Collision events fire
// 7. UI shows game output (no editor overlays)

// In edit mode:
// 1. Physics paused
// 2. Scripts not running
// 3. Editor tools active (gizmos, selection, etc.)

// Pause mode:
// 1. Physics paused
// 2. Scripts paused
// 3. Can inspect runtime state
```

#### 4.7 Event System

```typescript
class GameEventSystem {
  private listeners = new Map<string, Set<EventListener>>();

  on(event: string, callback: EventListener): void { /* ... */ }
  off(event: string, callback: EventListener): void { /* ... */ }
  emit(event: string, data?: any): void { /* ... */ }

  // Built-in events from Babylon.js:
  // 'collision', 'triggerEnter', 'triggerExit',
  // 'animationEnd', 'inputDown', 'inputUp',
  // 'frameUpdate', 'sceneReady'
}
```

#### 4.8 Serialization

Game logic state must be serializable for save/load:

```typescript
interface GameLogicData {
  scripts: Map<string, string>;          // entityId -> script source
  visualScripts: Map<string, GraphData>; // entityId -> Rete.js graph JSON
  behaviorTrees: Map<string, BTData>;    // entityId -> behavior tree JSON
  stateMachines: Map<string, FSMData>;   // entityId -> state machine JSON
  physicsBodies: Map<string, PhysicsData>; // entityId -> physics config
  variables: Map<string, any>;           // Global game variables
}
```

---

### 5. Additional Advanced Features

#### 5.1 Compositing (Post-Processing)

**Babylon.js Post-Processing Pipeline:**

```typescript
import {
  DefaultRenderingPipeline,
  SSAORenderingPipeline,
  GlowLayer,
  MotionBlurPostProcess,
  ChromaticAberrationPostProcess,
  DepthOfFieldPostProcess,
} from '@babylonjs/core/PostProcesses';

// Default pipeline (bloom, color grading, vignette, grain, aberration)
const pipeline = new DefaultRenderingPipeline('default', true, scene, [camera]);
pipeline.bloomEnabled = true;
pipeline.bloomThreshold = 0.8;
pipeline.bloomWeight = 0.4;
pipeline.chromaticAberration.aberrationAmount = 20;
pipeline.depthOfField.focalLength = 50;
pipeline.fxaaEnabled = true;

// SSAO
const ssao = new SSAORenderingPipeline('ssao', scene, [camera]);
ssao.totalStrength = 1.0;

// Node-based compositing:
// Use Rete.js with custom compositing nodes
// Each node = a post-process pass
// Connections define the render pipeline order
```

**Node-based compositing architecture:**

| Node Type | Babylon.js Equivalent |
|-----------|----------------------|
| Render Layer | Scene render target |
| Blur | `BlurPostProcess` |
| Bloom | `GlowLayer` |
| Color Correction | `ColorCorrectionPostProcess` |
| Depth of Field | `DepthOfFieldPostProcess` |
| SSAO | `SSAORenderingPipeline` |
| Output | Screen render target |

#### 5.2 UV Mapping

**Babylon.js UV system:**

```typescript
// Access UV data
const uvs = mesh.getVerticesData('uv') as Float32Array;
const uvs2 = mesh.getVerticesData('uv2') as Float32Array; // Lightmap UVs

// Set UV data
mesh.setVerticesData('uv', newUVs);

// UV projection methods to implement:
enum UVProjectionType {
  CUBE = 'cube',       // 6-face projection
  CYLINDER = 'cylinder', // Wrap around cylinder
  SPHERE = 'sphere',    // Spherical unwrap
  PLANAR = 'planar',    // Flat projection from direction
  SMART = 'smart',      // Angle-based smart projection
}

// UV unwrapping algorithm (LSCM - Least Squares Conformal Map):
// 1. Select seam edges (boundary of UV islands)
// 2. Cut mesh along seams
// 3. Flatten using LSCM or ABF++ parameterization
// 4. Pack UV islands into 0-1 space
```

**Libraries for UV unwrapping:**

| Library | Notes |
|---------|-------|
| Custom LSCM implementation | Recommended — no good JS library exists |
| libigl WASM | Heavy but includes LSCM, ARAP, harmonic |
| xatlas (WASM) | UV atlas packing, used by Babylon.js internally |

#### 5.3 Rendering — Path Tracing

**WebGPU Path Tracing:**

Babylon.js has experimental path tracing support via WebGPU compute shaders:

```typescript
// WebGPU engine with path tracing
const engine = new WebGPUEngine(canvas);
await engine.initAsync();

// Babylon.js NME (Node Material Editor) can generate path-traced shaders
// The path tracer runs as a compute shader pass on WebGPU

// Alternative: Custom WGSL path tracer
// Compute shader dispatches rays per pixel
// Bounces traced against scene BVH
// Accumulation buffer for progressive refinement
```

**Current status (2025-2026):**
- Babylon.js WebGPU path tracing is experimental
- Full production-quality path tracing in browser is still emerging
- Google's `filament` has WebGPU path tracing demos
- `wgpu-meshopt` provides GPU mesh processing for WebGPU

**Hybrid approach for BlenderGL:**
1. Real-time: Babylon.js PBR (forward rendering) for interactive editing
2. Final render: Optional path tracing via WebGPU compute shaders
3. Progressive refinement display in a render view panel

#### 5.4 Simulation

**Cloth Simulation:**

```typescript
// Verlet integration cloth simulation
interface ClothParticle {
  position: Vec3;
  previousPosition: Vec3;
  acceleration: Vec3;
  pinned: boolean;
}

interface ClothConstraint {
  p1: number; // particle index
  p2: number;
  restLength: number;
}

class ClothSimulation {
  particles: ClothParticle[];
  constraints: ClothConstraint[];
  gravity: Vec3 = { x: 0, y: -9.81, z: 0 };
  damping: number = 0.99;

  update(dt: number): void {
    // 1. Apply forces (gravity, wind)
    // 2. Verlet integration
    // 3. Satisfy constraints (iterative)
    // 4. Collision with scene geometry
    // 5. Update mesh vertices from particle positions
  }
}
```

**Particle Systems (Babylon.js built-in):**

```typescript
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';

const ps = new ParticleSystem('particles', 2000, scene);
ps.particleTexture = new Texture('flare.png', scene);
ps.emitter = mesh; // Attach to mesh
ps.minSize = 0.1;
ps.maxSize = 0.5;
ps.minLifeTime = 0.3;
ps.maxLifeTime = 1.5;
ps.emitRate = 100;
ps.gravity = new Vector3(0, -9.81, 0);
ps.start();
```

**Fluid Simulation:**

No production-ready WebGL fluid simulation library exists. Options:
1. **SPH (Smoothed Particle Hydrodynamics)** — Custom implementation, GPU particles via instanced rendering
2. **Position-Based Fluids** — PBD approach, more stable
3. **Navier-Stokes grid-based** — Classic approach, good for 2D fluid in 3D scenes

**Recommendation:** Implement basic particle-based fluid as a visual effect. Full physically-accurate fluid simulation is beyond current web capabilities for real-time.

#### 5.5 Video Sequence Editor (Timeline)

**Timeline Component:**

```typescript
interface TimelineState {
  duration: number;       // Total timeline length (seconds or frames)
  fps: number;
  currentTime: number;
  playing: boolean;
  tracks: TimelineTrack[];
}

interface TimelineTrack {
  id: string;
  name: string;
  type: 'animation' | 'audio' | 'camera' | 'script' | 'property';
  muted: boolean;
  locked: boolean;
  clips: TimelineClip[];
}

interface TimelineClip {
  id: string;
  trackId: string;
  startFrame: number;
  endFrame: number;
  data: any; // Animation reference, audio buffer, etc.
}
```

**Libraries:**

| Library | Purpose |
|---------|---------|
| Custom implementation | Recommended — no good timeline library exists for this use case |
| `wavesurfer.js` | Audio waveform display (for audio tracks) |
| `tween.js` | Animation tweening engine |

#### 5.6 Node-Based Material Editor

**Babylon.js Node Material Editor (NME) is the foundation:**

```typescript
import { NodeMaterial } from '@babylonjs/materials/node/nodeMaterial';

// Programmatic node material creation
const nodeMat = new NodeMaterial('customShader', scene);

// Add nodes via the graph API
const positionOutput = nodeMat.addBlock(
  new VertexOutputBlock('vertexOutput')
);
const worldPos = nodeMat.addBlock(
  new WorldPositionBlock('worldPos')
);
const textureBlock = nodeMat.addBlock(
  new TextureBlock('diffuseTex')
);

// Connect blocks
worldPos.output.connectTo(positionOutput.worldPosition);
textureBlock.output.connectTo(/* ... */);

// Build and assign
await nodeMat.buildAsync();
mesh.material = nodeMat;
```

**Integration with Rete.js for custom visual editor:**

The Babylon.js NME has its own visual editor at nme.babylonjs.com. For BlenderGL, two options:

1. **Embed Babylon.js NME** — Use the official NME web component or iframe embed
2. **Build custom with Rete.js** — Create custom nodes that map to Babylon.js NodeMaterial blocks

**Recommended:** Build a custom material editor using Rete.js that wraps Babylon.js NodeMaterial blocks. This gives full control over the UX and integrates naturally with BlenderGL's panel system.

**Essential material node types:**

| Category | Nodes |
|----------|-------|
| **Input** | Texture2D, TextureCube, Color, Float, Vector2/3/4 |
| **Math** | Add, Subtract, Multiply, Divide, Lerp, Clamp, Sine, Cosine |
| **Geometry** | Position, Normal, UV, Tangent, Bitangent, View Direction |
| **Lighting** | Diffuse, Specular, Fresnel, Ambient Occlusion, Shadow |
| **Utility** | OneMinus, Step, SmoothStep, Power, Abs, Min, Max |
| **Output** | FragmentOutput (color, alpha, metallic, roughness, emissive, normal) |

#### 5.7 Asset Pipeline — Import/Export Formats

**Currently supported:** glTF/GLB (import via Babylon SceneLoader, export via GLTF2Export)

**Additional formats to consider:**

| Format | Direction | Library | Notes |
|--------|-----------|---------|-------|
| **FBX** | Import | `fbx-parser` or Babylon.js FBX loader | Proprietary, complex |
| **OBJ** | Both | Babylon.js OBJ loader (`@babylonjs/loaders/OBJ`) | Simple, no animation |
| **STL** | Import | `@babylonjs/loaders/STL` | 3D printing |
| **USD/USDZ** | Import | Experimental | Apple ecosystem, emerging web support |
| **Blend** | Import | None | Proprietary, extremely complex |
| **Collada (DAE)** | Both | Babylon.js Collada loader | Legacy format |
| **SVG** | Import | Custom parser | 2D shapes to 3D extrusion |
| **HDR/EXR** | Import | Babylon.js HDR texture loader | Environment maps |
| **glTF KTX2** | Both | Babylon.js KTX2 support | Compressed textures |

**Recommendation:** Focus on glTF/GLB as the primary format. Add OBJ import for simple meshes. FBX import via Babylon.js loader for interoperability with other DCC tools.

---

### 6. Architecture Integration

#### 6.1 How New Features Map to Existing BlenderGL Architecture

```
BlenderGL Existing:
  Zustand Stores → React Components → Babylon.js Scene

New Systems:
  Scripting   → ScriptStore + ScriptEditorPanel → QuickJS-WASM runtime
  Rigging     → ArmatureStore + SkeletonPanel → Babylon.js Skeleton/Bone
  Sculpting   → SculptStore + SculptToolbar → Custom vertex manipulation
  Game Logic  → LogicStore + VisualScriptPanel → Rete.js graph + Havok physics
  Compositing → PostProcessStore + CompositorPanel → Babylon.js post-process pipeline
  Materials   → MaterialStore + MaterialEditor → NodeMaterial + Rete.js
  Animation   → AnimationStore + TimelinePanel → Babylon.js AnimationGroup
  UV Mapping  → UVStore + UVEditorPanel → Custom UV manipulation
```

#### 6.2 New Zustand Stores Required

| Store | Purpose |
|-------|---------|
| `useScriptStore` | Scripts, execution state, console output |
| `useArmatureStore` | Skeletons, bones, constraints, poses |
| `useSculptStore` | Brush settings, symmetry, sculpt mode state |
| `useLogicStore` | Visual scripts, behavior trees, state machines |
| `useAnimationStore` | Animation clips, timeline, pose library |
| `useCompositorStore` | Post-process pipeline, compositing graph |
| `useUVStore` | UV channels, seam edges, unwrap settings |

#### 6.3 New Editor Panels Required

| Panel | Component | Maps To |
|-------|-----------|---------|
| Script Editor | `ScriptEditorPanel.tsx` | Monaco Editor + console |
| Armature Editor | `ArmaturePanel.tsx` | Bone tree + constraint UI |
| Weight Paint | `WeightPaintPanel.tsx` | Brush settings + bone selector |
| Sculpt Tools | `SculptToolbar.tsx` | Brush type + settings |
| Visual Script | `VisualScriptPanel.tsx` | Rete.js canvas |
| Behavior Tree | `BehaviorTreePanel.tsx` | Rete.js with BT nodes |
| State Machine | `StateMachinePanel.tsx` | State graph + transition table |
| Animation Timeline | `TimelinePanel.tsx` | Keyframe editor + playback |
| Material Editor | `MaterialEditorPanel.tsx` | Rete.js shader graph |
| UV Editor | `UVEditorPanel.tsx` | 2D UV view + unwrap tools |
| Compositor | `CompositorPanel.tsx` | Rete.js compositing graph |
| Render View | `RenderViewPanel.tsx` | Path trace preview |

#### 6.4 Recommended Implementation Order

| Phase | Feature | Dependencies | Effort |
|-------|---------|-------------|--------|
| 12A | Scripting Engine | Monaco Editor, QuickJS-WASM | Large |
| 12B | Node Material Editor | Rete.js, NodeMaterial | Large |
| 13A | Rigging/Skeletal Animation | Skeleton system, AnimationGroup | Large |
| 13B | Animation Timeline | AnimationStore, keyframe UI | Medium |
| 14A | Game Logic (Visual Scripting) | Rete.js, event system | Large |
| 14B | Physics Integration | Havok, collision system | Medium |
| 15A | Sculpting | Custom mesh manipulation | Very Large |
| 15B | UV Mapping | Custom UV tools | Medium |
| 16A | Compositing | Post-process pipeline | Medium |
| 16B | Path Tracing (WebGPU) | WebGPU engine, compute shaders | Very Large |
| 17 | Simulation (Cloth/Particles) | Physics integration | Large |

---

### 7. Key NPM Packages Summary

| Package | Version | Purpose |
|---------|---------|---------|
| `@monaco-editor/react` | ^4.x | In-browser code editor |
| `quickjs-emscripten` | ^0.23.x | JS sandbox (WASM) |
| `rete` | ^2.x | Visual scripting node editor |
| `rete-react-render-plugin` | ^2.x | React renderer for Rete.js |
| `rete-connection-plugin` | ^2.x | Node connection wiring |
| `behaviortree-ts` | latest | Behavior tree engine |
| `yuka` | latest | Game AI (BT + FSM + pathfinding) |
| `@babylonjs/havok` | ^9.x | Havok Physics WASM |
| `@babylonjs/core` | ^9.x | Skeleton, Animation, NodeMaterial |
| `@babylonjs/materials` | ^9.x | NodeMaterial system |
| `opensubdiv-wasm` | latest | Catmull-Clark subdivision |
| `wavesurfer.js` | ^7.x | Audio waveform for timeline |
| `tween.js` | latest | Animation tweening |

### 8. External References

| Resource | URL |
|----------|-----|
| Babylon.js Documentation | https://doc.babylonjs.com |
| Babylon.js Skeleton/Bones | https://doc.babylonjs.com/features/featuresDeepDive/mesh/bonesSkeletons |
| Babylon.js Node Material | https://doc.babylonjs.com/features/featuresDeepDive/materials/node_material |
| Babylon.js NME Online | https://nme.babylonjs.com |
| Babylon.js Playground | https://playground.babylonjs.com |
| Babylon.js Physics (Havok) | https://doc.babylonjs.com/features/featuresDeepDive/physics/usingPhysicsEngine |
| Babylon.js Editor (GitHub) | https://github.com/BabylonJS/Editor |
| Rete.js | https://retejs.org |
| React Flow | https://reactflow.dev |
| SculptGL (GitHub) | https://github.com/stephaneginier/sculptgl |
| QuickJS Emscripten | https://github.com/nickclaw/quickjs-emscripten |
| Monaco Editor React | https://github.com/nickclaw/monaco-editor |
| Yuka.js | https://github.com/nickclaw/yuka |
| behavior-tree-ts | https://github.com/nickclaw/behaviortree |
| WebGPU Spec | https://www.w3.org/TR/webgpu/ |
