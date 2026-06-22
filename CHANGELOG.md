# Changelog

Notable changes to the Kinetic Platform Skills library.

## 2026-06-13 — Audit-driven cleanup

Resolved findings from the 2026-06-13 critical audit (`SKILLS-AUDIT-2026-06-13.md`):

- Fixed CRITICAL path typo in `commands/kinetic-debug-run` (missing `/app/components/task/` prefix on stuck-run repair endpoint).
- Added credential-wipe warning to `api/integrator/connections.md` PUT/PATCH endpoints.
- Reconciled KSL syntax across `commands/kinetic-policy` and `concepts/security-policies` — KSL is JavaScript; use `&&`, `||`, `===`.
- Reconciled `kinetic_core_api_v1` stance between `CLAUDE.md` and `concepts/workflow-xml` — still widely used; prefer `system_integration_v1` for new external integrations where Integrator covers the auth pattern.
- Moved historical gap analysis to `docs/history/`.
- Added `docs/GLOSSARY.md` codifying canonical terminology (Tree/Workflow/Routine, KSL variants, treeJson vs treeXml, Deferred vs Work In Progress).
- Other fixes catalogued in `SKILLS-AUDIT-2026-06-13.md`.

## 2026-04-09 — Workflow-XML rule additions

- `system_tree_return_v1` usage rules (only for WebAPIs/routines).
- Loop connector pattern documented (head connects to body AND tail).
- JSONPath `$[*]` syntax for loops.

## 2026-04-08 — Initial gap analysis

See `docs/history/2026-04-08-gap-analysis.md` for the historical audit of the original 26 skills.
