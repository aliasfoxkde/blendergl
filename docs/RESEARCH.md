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
