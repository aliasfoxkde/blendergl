# Contributing Guide

**Category:** Contributing
**Last Updated:** 2026-03-27
**Status:** Active

---

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`

## Development Workflow

1. Create a feature branch: `git checkout -b feature/description`
2. Make changes
3. Run tests: `npm run test`
4. Type-check: `npx tsc -b`
5. Lint: `npm run lint`
6. Format: `npm run format`
7. Commit with descriptive message
8. Push and open a pull request

## Code Style

- TypeScript strict mode
- ESLint + Prettier (run `npm run lint:fix && npm run format` before committing)
- React functional components with hooks
- Zustand stores for state management
- Tailwind CSS for styling

## Testing

Write tests for new features. Place tests in `__tests__/unit/` mirroring the `src/` structure.

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## Commit Messages

Use conventional commits:

```
feat: add torus primitive type
fix: correct GLB export API usage
docs: update usage guide
refactor: simplify entity-mesh sync
test: add material store tests
```

## Architecture

- `src/editor/types/` — Core type definitions
- `src/editor/stores/` — Zustand state stores
- `src/editor/components/` — React UI components
- `src/editor/hooks/` — Custom React hooks
- `src/editor/utils/` — Utility functions (engine, primitives, file I/O)
- `src/landing/` — Landing page components

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
