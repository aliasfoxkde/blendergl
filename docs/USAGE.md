# User Guide

**Category:** User Documentation
**Last Updated:** 2026-03-27
**Status:** Active

---

## Getting Started

Open the editor at the `/editor` route. The editor loads with an empty scene, a grid, and default lighting.

### Adding Objects

Click **Add** in the toolbar and select a primitive type:

- **Cube** — Box geometry
- **Sphere** — 32-segment sphere
- **Plane** — Ground plane
- **Cylinder** — 32-segment cylinder
- **Cone** — Cone with pointed top
- **Torus** — Donut shape

### Selecting Objects

Click on an object in the 3D viewport or in the Scene Hierarchy panel (left sidebar). Hold `Shift` to add to selection.

### Transforming Objects

Use the toolbar buttons or keyboard shortcuts:

| Shortcut | Mode | Gizmo |
|----------|------|-------|
| `W` | Translate | Move arrows |
| `E` | Rotate | Rotation rings |
| `R` | Scale | Scale handles |

Click and drag the gizmo handles to transform. The selected object's transform values update in the Properties Panel (right sidebar).

### Editing Properties

The Properties Panel shows:

- **Object** — Name, visibility toggle, lock toggle
- **Transform** — Position (X, Y, Z), Rotation (degrees), Scale
- **Material** — Color picker, metallic, roughness, emissive color, opacity

### Undo / Redo

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Y` | Redo |

### Saving

Press `Ctrl+S` to save the current scene to browser storage (IndexedDB). Scenes persist across sessions.

### Exporting

Export from the toolbar:

- **GLB** — Exports as glTF Binary (.glb), compatible with Blender, Unity, Unreal, and other 3D tools
- **JSON** — Exports scene data as JSON for programmatic use

### Scene Hierarchy

The left sidebar shows all objects in the scene. Each item shows:

- Visibility eye icon (toggle)
- Lock icon (toggle)
- Delete button (trash icon)

### Camera Controls

The viewport uses an arc-rotate camera:

- **Left click + drag** on empty space — Rotate view
- **Right click + drag** — Pan view
- **Scroll wheel** — Zoom in/out
- **Middle click + drag** — Pan view

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `W` | Translate mode |
| `E` | Rotate mode |
| `R` | Scale mode |
| `X` / `Delete` | Delete selected |
| `Ctrl+A` | Select all |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save scene |
| `Escape` | Deselect all |

---

## PWA Installation

BlenderGL can be installed as a Progressive Web App:

1. Open the editor in Chrome, Edge, or Safari
2. Click the install icon in the browser address bar (or "Add to Home Screen" on mobile)
3. The app installs and runs standalone

The service worker caches assets for offline use.
