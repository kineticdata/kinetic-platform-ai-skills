# TypeScript Starter Portal

A minimal TypeScript scaffold for a Kinetic React portal. Mirrors `portal/` (the JS reference) with typed `useData<T>`, typed Kinetic API helpers, and an example `@kineticdata/react` declaration file.

This is a **scaffold**, not a complete portal — pair it with the JS reference and the skills in `skills/front-end/` to fill out the application-specific pieces. It exists so TypeScript projects have a starting point that compiles cleanly under `--strict`.

## What's in here

| File | Purpose |
|---|---|
| `src/types/kineticdata-react.d.ts` | Hand-authored module declaration covering the exports the portal uses |
| `src/types/kinetic.ts` | Domain types — `Submission`, `Form`, `Kapp`, `Space`, `User`, `Team`, KQL params |
| `src/helpers/hooks/useData.ts` | Typed version of the project-local `useData` hook |
| `src/helpers/hooks/usePaginatedData.ts` | Typed paginated-list hook |
| `src/redux.ts` | Typed `regRedux` helper + minimum `appActions` |
| `src/App.tsx` | Minimum App component with the auth state machine |
| `tsconfig.json` | `--strict` + `bundler` module resolution + JSX preserve |
| `vite.config.ts` | Same proxy/define config as the JS portal, ported to TS |

## What's NOT here

Routes, page components, business logic — those are project-specific. Build them following the patterns in `skills/front-end/portal-patterns`, `skills/front-end/forms`, and `skills/recipes/build-service-portal`.

## Caveat — `@kineticdata/react` does not ship types

The library is plain JS. The `.d.ts` file in `src/types/` is a hand-authored declaration that covers what the reference portal actually calls. Two consequences:

1. **It's not exhaustive.** Functions and properties the reference portal doesn't use are absent. Add them when you need them.
2. **It can drift.** If `@kineticdata/react` adds, renames, or removes an export, the `.d.ts` won't notice. Treat it as best-effort and keep an eye on runtime errors that look like "function expected but got undefined."

A long-term fix would be a `@types/kineticdata__react` package or the library itself adding TS — until then, this declaration file is the gap-bridge.

## Getting started

```bash
cd portal/ts
npm install
node src/setupEnv.cjs           # writes .env.development.local; copy from the JS portal
npm run dev                     # http://localhost:3000
```

Production build:

```bash
npm run build                   # type-checks + bundles to dist/
npm run typecheck               # standalone type check (CI use)
```

## Compatibility notes

- **TypeScript ≥ 5.0** for the `moduleResolution: 'bundler'` setting.
- **React 18** — `@kineticdata/react` 6.x is React 18-only.
- **Redux Toolkit ≥ 2.0** for `combineSlices().inject` used in `redux.ts`.

See `skills/front-end/bootstrap` "Zero-to-Running" for the full file list and explanations; this directory translates that minimum into TS.
