# BlenderGL

> AI-native 3D creation for the web. Built with Babylon.js, React, and TypeScript.

**License:** MIT | **Status:** Active Development | **Live:** [blendergl.pages.dev](https://blendergl.pages.dev)

---

## Overview

BlenderGL is a Blender3D-inspired 3D editor that runs entirely in the browser. No installs, no plugins — just open and create. It's designed as an AI-native 3D creation system that leverages Blender3D's open-source architecture as reference while being built for the web from the ground up.

### Features

- **Full 3D Viewport** — Babylon.js WebGL2 rendering with arc-rotate camera
- **Entity System** — Scene graph with parent-child hierarchies
- **6 Primitives** — Cube, Sphere, Plane, Cylinder, Cone, Torus
- **Transform Gizmos** — Translate (W), Rotate (E), Scale (R) with snap support
- **Material Editor** — Albedo, metallic, roughness, emissive, opacity
- **Undo/Redo** — Command pattern with full history (Ctrl+Z / Ctrl+Shift+Z)
- **GLB Export** — Export scenes to glTF Binary format
- **JSON Export** — Save/load scene data as JSON
- **IndexedDB Storage** — Persistent scene storage in the browser
- **PWA Support** — Install as a native app on any device
- **Landing Page** — Modern marketing page with CTA to launch editor
- **Cloudflare Pages** — Global CDN deployment with CI/CD

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | Babylon.js v9 (WebGL2) |
| UI | React 19 + TypeScript 5.9 |
| Build | Vite 8 |
| State | Zustand 5 + Immer |
| Storage | IndexedDB (idb) |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Testing | Vitest 4 + React Testing Library |
| Deploy | Cloudflare Pages (Wrangler) |

---

## Quick Start

```bash
# Clone
git clone https://github.com/aliasfoxkde/blendergl.git
cd blendergl

# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Test
npm run test

# Preview production build
npm run preview
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint with ESLint |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run pages:dev` | Local Cloudflare Pages dev |
| `npm run pages:deploy` | Deploy to Cloudflare Pages |

---

## Project Structure

```
blendergl/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
├── src/
│   ├── editor/
│   │   ├── components/        # Editor UI components
│   │   │   ├── EditorShell.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   ├── Viewport.tsx
│   │   │   ├── SceneHierarchy.tsx
│   │   │   └── PropertiesPanel.tsx
│   │   ├── hooks/
│   │   │   └── useKeyboardShortcuts.ts
│   │   ├── stores/            # Zustand state stores
│   │   │   ├── sceneStore.ts
│   │   │   ├── selectionStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   ├── historyStore.ts
│   │   │   └── materialStore.ts
│   │   ├── types/
│   │   │   └── index.ts       # Core type definitions
│   │   └── utils/
│   │       ├── engine.ts      # Babylon.js scene setup
│   │       ├── primitives.ts   # Entity factory
│   │       ├── gizmos.ts       # Transform gizmo controller
│   │       ├── undoRedo.ts     # Command pattern
│   │       ├── storage.ts      # IndexedDB helper
│   │       └── fileIO.ts       # GLB/JSON export
│   ├── landing/
│   │   └── components/
│   │       └── LandingPage.tsx
│   ├── App.tsx                # Router configuration
│   └── main.tsx               # Entry point
├── __tests__/
│   └── unit/
│       ├── sceneStore.test.ts
│       └── undoRedo.test.ts
├── docs/                      # Documentation
├── .github/workflows/
│   └── deploy.yml             # CI/CD pipeline
├── wrangler.toml              # Cloudflare Pages config
├── vite.config.ts
├── vitest.config.ts
└── package.json
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [PLAN.md](docs/PLAN.md) | Architecture, tech stack, phase breakdown, Blender3D references |
| [TASKS.md](docs/TASKS.md) | Detailed task list (~150 subtasks across 10 phases) |
| [PROGRESS.md](docs/PROGRESS.md) | Session log and progress tracking |
| [BRAINSTORM.md](docs/BRAINSTORM.md) | Original project vision and feature brainstorm |
| [QUICKSTART.md](docs/QUICKSTART.md) | Developer getting started guide |
| [USAGE.md](docs/USAGE.md) | User guide for the editor |
| [RESEARCH.md](docs/RESEARCH.md) | Technical research and Blender3D architecture analysis |
| [CHANGELOG.md](docs/CHANGELOG.md) | Version history and release notes |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Contributing guidelines |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `W` | Translate mode |
| `E` | Rotate mode |
| `R` | Scale mode |
| `X` / `Delete` | Delete selected |
| `Ctrl+A` | Select all |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+S` | Save scene |
| `Escape` | Deselect all |
| `Shift+D` | Duplicate (planned) |

---

## Development Roadmap

### Completed (Phases 1-7)

- [x] Project foundation (Vite + React + TypeScript)
- [x] 3D viewport with Babylon.js (camera, lights, grid)
- [x] Editor shell (toolbar, panels, status bar)
- [x] Scene graph with entity system
- [x] 6 primitive types (cube, sphere, plane, cylinder, cone, torus)
- [x] Selection system with raycast picking
- [x] Transform gizmos (translate, rotate, scale)
- [x] Undo/redo with command pattern
- [x] Material editor (albedo, metallic, roughness, emissive, opacity)
- [x] GLB and JSON export
- [x] IndexedDB scene persistence
- [x] Landing page with modern design
- [x] PWA support (installable)
- [x] Cloudflare Pages deployment pipeline

### In Progress (Phase 8)

- [ ] Basic mesh editing (edit mode)
- [ ] Vertex/edge/face selection
- [ ] Extrude, bevel, inset operations

### Planned (Phases 9-10)

- [ ] Advanced editor features (multi-object, shading modes, context menus)
- [ ] AI augmentation (AI assistant, generate objects, optimize meshes)

---

## Deployment

BlenderGL deploys to Cloudflare Pages. Push to `main` triggers automatic build and deploy via GitHub Actions.

```bash
# Manual deploy
npm run pages:deploy
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
