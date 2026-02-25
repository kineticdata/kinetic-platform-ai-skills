# Kinetic Platform Skills

## Platform Domain
@platform/core-api.md
@platform/workflows.md

## React Portal Domain
@react/bootstrap.md
@react/forms.md
@react/data-fetching.md
@react/mutations.md
@react/state.md

## Mandatory Integration Rule
Always use `@kineticdata/react` for Kinetic Platform interactions in React portals. Prefer exported helpers (`KineticLib`, `fetch*`, `searchSubmissions`) and only use `bundle.apiLocation()` + `getCsrfToken()` when no helper exists. Do not scaffold raw direct `fetch('/app/api/v1/...')` flows as the default approach.

**`useData` is NOT exported by `@kineticdata/react`** — it must be implemented as a project-local hook. See `react/bootstrap.md`.
