# Quick Start Guide

**Category:** Developer Guide
**Last Updated:** 2026-03-27
**Status:** Active

---

## Prerequisites

- Node.js >= 22
- npm >= 10
- Git

## Setup

```bash
git clone https://github.com/aliasfoxkde/blendergl.git
cd blendergl
npm install
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Routes:

| URL | Page |
|-----|------|
| `/` | Landing page |
| `/editor` | 3D Editor |

## Building

```bash
npm run build
```

Outputs static files to `dist/`. Deployable to any static host.

## Testing

```bash
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

## Linting

```bash
npm run lint           # Check
npm run lint:fix       # Auto-fix
npm run format         # Format with Prettier
```

## Deployment

```bash
npm run pages:deploy
```

Pushes to Cloudflare Pages. Also triggered automatically on push to `main`.

## Project Structure

```
src/
  editor/         # 3D editor (components, stores, hooks, utils)
  landing/        # Marketing landing page
  App.tsx         # Router setup
  main.tsx        # Entry point + SW registration
__tests__/unit/   # Unit tests
docs/             # Documentation
public/           # Static assets (manifest, SW)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/editor/types/index.ts` | Core type definitions (Entity, Transform, Material, etc.) |
| `src/editor/stores/sceneStore.ts` | Scene entity state management |
| `src/editor/stores/selectionStore.ts` | Selection state (active entity, mode) |
| `src/editor/stores/historyStore.ts` | Undo/redo state |
| `src/editor/stores/materialStore.ts` | Material state per entity |
| `src/editor/utils/engine.ts` | Babylon.js engine/scene/camera/lights setup |
| `src/editor/utils/primitives.ts` | Entity factory for 6 primitive types |
| `src/editor/utils/gizmos.ts` | Transform gizmo controller |
| `src/editor/utils/undoRedo.ts` | Command pattern (Transform, Add, Delete) |
| `src/editor/utils/storage.ts` | IndexedDB persistence |
| `src/editor/utils/fileIO.ts` | GLB/JSON export |
| `src/editor/components/Viewport.tsx` | 3D canvas with entity-mesh sync |
| `src/editor/components/EditorShell.tsx` | Main editor layout |
| `src/editor/components/Toolbar.tsx` | Top toolbar with tools |
| `src/editor/components/PropertiesPanel.tsx` | Transform + material editor |
