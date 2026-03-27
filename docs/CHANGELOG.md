# Changelog

**Category:** Release Notes
**Last Updated:** 2026-03-27

---

## [0.1.0] - 2026-03-27

### Added

**Foundation (Phase 1)**
- Vite 8 + React 19 + TypeScript 5.9 project scaffold
- Tailwind CSS v4 with dark theme
- Vitest 4 + React Testing Library test framework
- ESLint + Prettier code quality tools
- MIT license

**3D Viewport (Phase 2)**
- Babylon.js v9 WebGL2 rendering engine
- Arc-rotate camera with mouse controls
- Hemisphere + directional lighting
- Color-coded grid (X=red, Y=green, Z=blue)
- Responsive canvas with ResizeObserver

**Editor Shell**
- EditorShell layout with toolbar, panels, status bar
- Toolbar with transform mode buttons and tools
- Scene hierarchy panel with visibility/lock/delete
- Properties panel with transform and material editors
- Keyboard shortcuts (W/E/R, Ctrl+Z, Delete, etc.)

**Scene Graph (Phase 3)**
- Entity system with parent-child relationships
- 6 primitive types: cube, sphere, plane, cylinder, cone, torus
- Selection system with raycast picking
- Shift-click multi-select
- Hover highlighting with cursor changes

**Transform & Undo (Phase 4)**
- Transform gizmos (translate, rotate, scale)
- Snap-to-grid support
- Axis constraint controls
- Command pattern undo/redo system
- TransformCommand, AddEntityCommand, DeleteEntityCommand

**Materials & File I/O (Phase 5)**
- Material editor (albedo, metallic, roughness, emissive, opacity)
- Per-entity material state management
- GLB export via Babylon.js GLTF2Export
- JSON scene export
- IndexedDB scene persistence (save/load/list/delete)

**Landing Page & PWA (Phase 6)**
- Modern landing page with gradient hero, feature cards, footer
- CTA to launch editor
- PWA manifest for installable app
- Service worker with network-first caching
- React Router v7 (`/` landing, `/editor` editor)

**Deployment (Phase 7)**
- Cloudflare Pages configuration (wrangler.toml)
- GitHub Actions CI/CD pipeline
- TypeScript checking, testing, and build in CI
- Automatic deploy on push to main

**Testing**
- 15 unit tests covering stores and undo/redo
- Scene store tests (add, remove, transform, lock, hierarchy)
- Undo/redo tests (execute, undo, redo, clear, max size)
