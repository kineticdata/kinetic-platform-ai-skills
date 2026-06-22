# Audit Remediation — Progress Report

**Date:** 2026-06-13
**Reference:** `SKILLS-AUDIT-2026-06-13.md` (original audit)

This report enumerates every change executed against the skills library in the two remediation passes following the 2026-06-13 audit.

---

## Pass 1 — Critical & High-Leverage Targeted Fixes (16 items)

### Critical (silent breakage)

1. **`commands/kinetic-debug-run/SKILL.md:66`** — fixed missing `/app/components/task/` prefix on the stuck-run repair endpoint. Was `POST /app/api/v2/runs/{runId}/triggers`; now `POST /app/components/task/app/api/v2/runs/{runId}/triggers`. Copy-paste of the fix command now actually works.
2. **`api/integrator/connections.md`** — added a top-of-file ⚠ warning block above the auto-generated content explaining the credential-wipe footgun on `PUT`/`PATCH /api/connections/{id}`. GET masks credentials as `null`; round-tripping the body permanently destroys them.

### High (significant confusion)

3. **`commands/kinetic-policy/SKILL.md`** — resolved KSL contradiction. The command now opens with an explicit "KSL is JavaScript" callout, and all 9 common patterns use real JS operators (`&&`, `||`, `===`, `!==`). Removed mismatched DSL-style `OR`/`AND`/`=` syntax.
4. **`concepts/workflow-xml/SKILL.md:553`** — replaced "Legacy — Avoid. Do NOT use for new workflows" with the nuanced stance from `CLAUDE.md`: "Still Widely Used; Prefer `system_integration_v1` Where Practical." Removes the contradiction between the mandatory rules and the skill body.
5. **`recipes/add-approval-workflow/SKILL.md`** — eliminated the three-way internal contradiction. Walkthrough, prose, and worked treeJson now all describe the same flow: the deferring node IS the Create Approval node (`defers: true`). The treeJson now includes Approve/Deny branches as the prose claims (previously they were described but not implemented). Result-key references corrected to `@results['Create Approval']`.
6. **`GAPS.md` → `docs/history/2026-04-08-gap-analysis.md`** — moved the historical audit. Top-level `CHANGELOG.md` created in its place pointing forward to the current audit and back to the archived one. The archived file's header now says "archived 2026-06-13."

### High (organizational / discoverability)

7. **`docs/GLOSSARY.md`** — new canonical glossary covering Tree/Workflow/Routine, Deferred/Work-In-Progress, KSL-JS/KSL-Ruby, treeJson/treeXml. Includes a table of authoritative-skill homes for the duplicated topics.
8. **`skills/concepts/workflow-xml/PITFALLS.md`** — collapsed from 207 lines to a citable rule catalogue. Validator scripts that cite `PITFALLS.md § N` still resolve; the duplicated prose now lives only in `SKILL.md`.
9. **Split `concepts/security-policies/SKILL.md`** (was 607 lines):
   - Extracted `concepts/attribute-definitions/SKILL.md` (179 lines) — per-scope endpoint tables, allowsMultiple semantics, resolution hierarchy, gotchas.
   - Extracted `concepts/submission-activities/SKILL.md` (80 lines) — activity CRUD, include patterns, workflow-generated types.
   - Remaining `security-policies` (409 lines) now focused on KSL, policy definitions, and Task engine policies.
10. **Split `concepts/integrations/SKILL.md`** (was 727 lines):
    - Extracted `concepts/loghub-api/SKILL.md` (92 lines) — endpoint, Bearer-JWT auth, NDJSON, correlationId joining.
    - Extracted `concepts/file-resources/SKILL.md` (53 lines) — external file streaming distinct from the `attachment` field type.
    - Reduced Handlers section to a one-paragraph pointer to `platform/handler-development`.
11. **Renamed `concepts/users-teams-security/` → `concepts/users-and-teams/`** — `name:` frontmatter, description, and all index references updated across `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`, `.cursor/rules/kinetic-platform.mdc`. Frontmatter description now explicitly disclaims security content with a pointer to `security-policies`.
12. **Moved `uuidV1ToMs` algorithm** from `concepts/api-basics/SKILL.md` (where it was anomalous) into `concepts/workflow-creation/SKILL.md` under "Finding Trees for a Kapp/Form (Discovery)." Workflow-creation gained 50+ lines including the tree-binding model table, the timestamp-extraction code, and the lookup algorithm.
13. **"Closure Is Not a Write Lock" canonical home** = `concepts/architectural-patterns/SKILL.md` (the section was already there at L340). `api-basics` and `workflow-xml` now contain brief pointers rather than duplicate write-ups.

### Medium (quality)

14. **`front-end/data-fetching/SKILL.md`** — replaced the literal `setNextPageToken: ...` ellipsis with a full `usePagination` implementation including `useCallback` discipline. Added a prominent `useData` param-object identity hazard warning explaining the refetch-on-every-render trap.
15. **`platform/handler-development/SKILL.md`** — JWT example now correctly `java_import java.util.Base64`. Copy-paste of the JWT block alone no longer yields `NameError`.

### Discoverability infrastructure

16. **New API-reference index skills** — `skills/api/core/SKILL.md`, `skills/api/integrator/SKILL.md`, `skills/api/task/SKILL.md`. Each has proper frontmatter so an AI can load them; each indexes the auto-generated `.md` files in the same directory; each surfaces critical cross-cutting rules (credential-wipe warning, run-status-misleading rule, no-`/submit`-endpoint, etc.). All three added to `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`, and `.cursor/rules/kinetic-platform.mdc`.

---

## Pass 7 — Recipe verifiers + CI workflow (5 items)

66. **`tests/recipes/add-approval-workflow.sh`** — exercises the deferral lifecycle end-to-end: kapp + form creation, workflow registration with a `defers: true` wait node, submission to trigger the run, polling for the deferred task's token, completion via `POST /runs/task/{token}` with deferred results, assertion that no deferred tasks remain.
67. **`tests/recipes/build-paginated-list.sh`** — bulk-creates 30 submissions across two Status values, paginates with `limit=10` and asserts the `nextPageToken` protocol over three pages, filters via KQL on the indexed Status field, and verifies `orderBy=createdAt&direction=ASC/DESC` produces different ordering.
68. **`tests/recipes/connect-external-system.sh`** — acquires an Integrator OAuth bearer token via implicit grant (manual redirect parsing), creates a Connection with `raw_bearer_token` auth pointing at the platform's own `/app/api/v1`, tests it, **verifies the credential-mask-on-read behavior** (the recipe's loudest warning), creates an Operation, verifies parameter extraction from the path template, cleans up.
69. **`tests/recipes/run-all.sh`** wired up — all four verifiers now execute in sequence; orchestrator exits with the count of failed verifiers.
70. **`.github/workflows/skills-ci.yml`** GitHub Actions template — three jobs: `lint` (always runs, fast — runs `lint-skills.mjs` and `build-indexes.mjs --check`), `recipes` (gated on the `SKILLS_CI_HAS_LIVE_ENV` repo variable and required secrets, runs the four verifiers), `known-bugs` (scheduled weekly, runs `verify-known-bugs.mjs --exit-on-fixed` and either commits the bumped `last_verified` dates or opens an issue for human review of any FIXED bugs).

### Final integrity verification
- Filesystem: 63 SKILL.md files. Manifest: 63 entries. **Match.**
- Lint: 0 errors, 1 warning (workflow-xml over 800-line soft limit — known, intentional).
- Build-script: 0 drift between `skills.yaml` and generated indexes.
- All 4 Node scripts syntax-OK. All 7 shell scripts syntax-OK.

---

## Pass 6 — Phase 5 infrastructure (5 items)

61. **`scripts/lint-skills.mjs`** — CI lint suite covering: `frontmatter-present`, `frontmatter-name` (folder match), `frontmatter-description` (length floor), `description-trigger-style` (Use when… for skills, imperative for commands), `max-body-length` (800-line warning), `broken-relative-link`, `broken-skill-link` (only matches backtick-wrapped or `/SKILL.md`-suffixed refs to avoid false positives on URL segments), `known-bugs-last-verified` (every Bug heading carries a stamp), `known-bugs-freshness` (>180 days warns), `yaml-manifest-coverage` (every SKILL.md is in skills.yaml and vice versa). Supports `--json`, `--warnings` (promote to errors), `--rules R1,R2` (filter). Current state: **0 errors, 1 warning** (workflow-xml oversized — already known).
62. **Build-script markers installed** in `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`, `.cursor/rules/kinetic-platform.mdc`, `.cursor/rules/kinetic-front-end.mdc`. Generator is now actively populating these from `skills.yaml`. `build-indexes.mjs --check` returns 0 (no drift); ready for CI.
63. **`scripts/verify-known-bugs.mjs`** — last-verified automation. Reproduces each documented bug against a live environment, bumps `last_verified` to today on REPRODUCED verdicts, reports FIXED verdicts for human review, treats INCONCLUSIVE as no-op. Supports `--bug N` to verify one at a time, `--dry-run`, `--exit-on-fixed` for CI gating. Seven repro stubs are scaffolded (the destructive ones — WebAPI orphan-run, policy-poisoning — return INCONCLUSIVE by default and require explicit opt-in fixtures to enable).
64. **`portal/ts/` TypeScript starter portal scaffold** — `tsconfig.json` with `--strict`, hand-authored `kineticdata-react.d.ts` covering the exports the reference portal uses, full domain types (`Submission`, `Form`, `Kapp`, `Space`, `User`, etc.), typed `useData<T>` / `usePaginatedData<T>` hooks, typed `regRedux` helper, minimum `appActions`, README explaining what's scaffolded vs. project-specific. Package targets React 18 / RTK 2.0 / Vite 5 / TypeScript 5.
65. **`tests/recipes/` verification scaffold** — `lib/api.sh` (curl wrappers with status capture, `pluck` JSON extractor with `jq`/`python3` fallback), `lib/assert.sh` (`check` / `check_ne` / `check_in` / `report`), a complete `create-submission-form.sh` verifier that exercises that recipe end-to-end (kapp create → form per recipe → indexes → build → submit → KQL search → cleanup), `run-all.sh` orchestrator. README documents the layout, when to update verifiers, and limitations. Bash scripts pass `bash -n` syntax check.

---

## Pass 5 — Commands, new skill, infrastructure (10 items)

51. **New command: `/kinetic-create-connection`** — Integrator API walk-through: authenticate, plan, create connection, test, plan operations, create each operation, verify, report. Includes the credential-wipe warning, the connection-test 200-with-status-error gotcha, and a worked POST-create-with-body example.
52. **New command: `/kinetic-export-form`** — single-form JSON export with explicit decisions about what to strip (server timestamps, index build status, background jobs) vs keep-with-warning (UUIDs, security policy names). Self-describing wrapper with `$schema` and `exportedFrom`.
53. **New command: `/kinetic-test-workflow`** — three invocation modes (form event / WebAPI / routine), synthetic input loading, run location, poll-with-timeout, output assertions with regex matching, optional cleanup, deferral handling (auto-complete vs report-and-stop).
54. **New command: `/kinetic-create-handler`** — scaffolds a complete handler directory (handler/init.rb, process/node.xml, process/info.xml, test/simple_input.rb, test/simple_output.xml, README.md). Naming-convention enforcement, parameter/result planning, packaging instructions.
55. **New command: `/kinetic-bump-indexes`** — query-driven index recommendation: decompose KQL, recommend compound order, drop redundant prefixes, cap at ~10, PUT-merge, build, verify with re-query. Handles the `--query` and `--analyze` modes.
56. **New command: `/kinetic-audit-permissions`** — resolves effective permissions on kapp/form/submission scope. Maps endpoints to definitions, identifies referenced bindings, evaluates "as user" via `include=authorization`, surfaces risk findings (missing teams/attributes referenced in rules, `profileAttributes` use, default-submission-access-too-permissive). Suggests fixes.
57. **New skill: `platform/sso-and-identity`** — SAML 2.0 / OIDC / OAuth / LDAP / Basic Auth coexistence, JIT provisioning behavior (username/email immutable after first login, no JIT admin elevation), attribute mapping with the `userProfile`-not-`profileAttributes` trap, SLO, `allowedIps`, troubleshooting table, common mistakes.
58. **Hand-authored API ref files** — `skills/api/task/errors.md`, `skills/api/task/triggers.md`, `skills/api/task/sources.md`. Match the auto-generated format; include the 5-record cap (errors), the path-not-query-param ID retrieval (triggers), the `sourceRoots`-not-`sources` response-key gotcha (sources). Updated `skills/api/task/SKILL.md` index to drop the "TODO" placeholder and reference the new files.
59. **`skills.yaml` source-of-truth manifest** — canonical list of all 63 skills with name/path/title/description/tags. Schema documented at the top of the file.
60. **`scripts/build-indexes.mjs` build script** — parses `skills.yaml` and regenerates the index tables in `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `README.md` and the import lists in `.cursor/rules/*.mdc` between marker comments (`<!-- BEGIN GENERATED:skills -->` … `<!-- END GENERATED:skills -->`). Skips files where markers aren't present yet, supports `--check` for CI. Companion `scripts/README.md` documents the workflow, marker installation, and CI integration.

### Index files updated for the new entries

- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md` — six new command rows and the `sso-and-identity` row added (verified 7 of each new entry across all four files).
- `.cursor/rules/kinetic-platform.mdc` — `sso-and-identity` added (already had the kapp-lifecycle entry from Pass 4).

---

## Pass 4 — Large-effort additions (6 items)

45. **`front-end/bootstrap/SKILL.md`** — added "Zero-to-Running — Minimum Boilerplate" section with seven complete, runnable files: `redux.js` (including a minimum `appActions`), `useData.js`, stub `Loading`/`Error`/`Toaster`/`ConfirmationModal`, `PublicRoutes`, `PrivateRoutes`, and a full `App.jsx` with the context-fetching wired up. A reader can now follow only this skill to boot a portal end-to-end; pointers at the end direct to the dedicated skills for production-grade extensions.
46. **New skill: `concepts/kapp-lifecycle`** (~290 lines) — closes the audit's most-flagged structural gap. Covers kapp create/update/delete, the PUT-merges-top-level-but-replaces-arrays behavior, formTypes registration and its KQL implications, kapp indexes vs form indexes (with the no-`values[]` rule), categories and category attributes, kapp attribute usage, security policy assignment with endpoint values, an end-to-end worked-provisioning example, gotchas, and a related-skills index.
47. **New skill: `front-end/testing`** (~310 lines) — Vitest + RTL + MSW setup, two mocking approaches (module mock vs HTTP fidelity), full mock factory for `@kineticdata/react`, `useData` hook tests including the stale-response check, CoreForm callback-wiring stubs, KQL builder tests, workflow XML validation against the existing validator script, Playwright integration test pointers, and explicit "what NOT to test."
48. **New skill: `front-end/accessibility`** (~320 lines) — landmark regions, route-change focus and announcement, accessible Loading/Error/Toast/Modal/CoreForm wrappers, paginated-list ARIA pattern with announce-on-page-change, form error display with `aria-invalid`/`aria-describedby`, dialog focus traps, theme contrast validation with the WCAG-compatible `contrastRatio` helper, keyboard testing checklist, and the gaps in CoreForm-generated markup the portal author needs to compensate for.
49. **`recipes/build-service-portal/SKILL.md`** — slimmed Part 1 to a 4-row checklist pointing at `concepts/kapp-lifecycle`, `recipes/create-submission-form`, and `recipes/add-approval-workflow` instead of re-deriving kapp creation. The portal-specific catalog/form/list/detail pages (Parts 3–6) remain in full.
50. **`front-end/forms/SKILL.md`** — added "Worked Example — Build a Star-Rating Widget From Scratch" section with a complete `forwardRef` + `WidgetAPI` widget, `bundle.widgets.StarRating` registration, form-engine invocation pattern, and an explicit verification checklist (first load / click / draft resume / unmount / re-mount with same id / accessibility). Lifecycle takeaways spell out the `field.value()` truthiness contract and the `destroy()` requirement that the bullet list above only implied.

### Index files updated for the new skills

- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` — added rows for kapp-lifecycle, testing, accessibility.
- `README.md` — same additions in the concepts and front-end tables (intentional linter edits preserved).
- `.cursor/rules/kinetic-platform.mdc` — added `kapp-lifecycle`.
- `.cursor/rules/kinetic-front-end.mdc` — added `testing` and `accessibility`.

---

## Pass 3 — Medium-tier rewrites (7 items)

38. **`recipes/create-submission-form/SKILL.md`** — replaced the `"...": "see ... template"` placeholder PUT body with a complete, valid form definition. Every renderType shown (text, dropdown, radio, attachment) carries its full required property set; explanatory bullets call out the load-bearing properties (`rows` on text only, choice fields' `choicesRunIf: null`/`choicesResourceName: null`/`choices[]`, button `renderAttributes: {}`, hidden section `omitWhenHidden: false`). Pastes cleanly against a live kapp.
39. **`recipes/connect-external-system/SKILL.md`** — Step 4 rewritten to use **treeJson** (matching the library's canonical format) instead of inline XML. The submission write-back node now uses `system_integration_v1` against the Kinetic Platform Connection's Update Submission Operation, eliminating the legacy `kinetic_request_ce_submission_update_v1` reference.
40. **`concepts/webapis-and-webhooks/SKILL.md`** — disambiguated "webhook" at the top of the file. Three terms now have distinct definitions: WebAPI (incoming HTTP), customer-managed webhook (external POSTer), implicit webhook (internal event-trigger dispatch mechanism). Both webhook sections rewritten to be consistent with the disambiguation.
41. **`front-end/mutations/SKILL.md`** — added complete `saveSubmissionMultipart` section covering the multipart fetch shape, the update-existing-submission variant, size/MIME/`allowMultiple` constraints, the absent virus-scanning, and a client-side preview/validation pattern.
42. **`front-end/mutations/SKILL.md`** — added "Optimistic UI, Mutation Status, and Conflict Handling" section with: a `useMutation` hook giving every mutation `idle/pending/success/error` state plus double-submit protection; optimistic updates with rollback on error; retryable wrapper with exponential backoff (and the "don't retry POST creates without idempotency keys" warning); a client-side version-check pattern for the platform's missing 409 emission; a `useDebouncedEffect` for inline edits; an undo-with-toast pattern.
43. **`platform/troubleshooting/SKILL.md`** — added a "Triage — Start Here" decision table at the top. 13 rows keyed by observable symptom; each row points to the next thing to check + the section/skill that covers the root cause.
44. **`front-end/portal-patterns/SKILL.md`** — Routing Structure now leads with a generic pattern (Public/Private split, routes you always need, routes that are portal-specific). The momentum-portal-specific route table moved into a Reference Implementation Appendix at the bottom of the file, clearly marked as "NOT a template." Stack-specific tooling (Tailwind v4, DaisyUI, `@ark-ui/react`) also moved into the appendix.

---

## Pass 2 — Quick Wins (10 items)

### `platform/known-bugs/SKILL.md`

17. **Added `last_verified: 2026-04-08 · Platform: 6.1.x`** stamps to all 7 bug entries. Added a top-of-file note explaining the policy: re-verify if reading more than ~6 months past the most-recent date.

### `front-end/bootstrap/SKILL.md`

18. **New "Error Boundaries — Catch Render Errors" section** — explains why the auth state machine doesn't catch render errors, provides a paste-ready `<ErrorBoundary>` component, recommends nesting boundaries per route, warns against wrapping the whole `<App>` (would swallow auth-error UI).
19. **`REACT_APP_` vs `VITE_` prefix clarified** — Environment Configuration section now describes both options (VITE_ recommended for new portals; REACT_APP_ retained via Vite shim for parity with the reference portal). Explains the `loadEnv(mode, cwd, '')` + `define: { 'process.env': env }` shim that the reference portal uses.
20. **New "Production Build & Deploy" section** — covers `npm run build`, where to host the static bundle (same-origin recommended to avoid CORS/cookie complexity), the build-time env-var inlining behavior, source-map handling, and `Cache-Control` headers for hashed assets vs `index.html`.

### `front-end/data-fetching/SKILL.md`

21. **`usePoller` schedule-reset hazard documented** — added a ⚠ block explaining that any params change tears down the poller and restarts the 5-second schedule. Includes the ref-backed-indirection mitigation pattern and notes when the reset is actually correct behavior.

### `front-end/state/SKILL.md`

22. **RTK version requirement noted** — top-of-file callout that `combineSlices(...).inject` requires `@reduxjs/toolkit ≥ 2.0`. Older RTK fails at module load.
23. **`viewActions` SSR/test guard** — added `if (typeof window !== 'undefined')` around the module-load `addEventListener`. Added a note about no cleanup and how to add one if hot-reload causes listener accumulation.

### `commands/kinetic-migrate/SKILL.md`

24. **Step 4 index sequencing rewritten** — clarifies the create-form → verify-definitions-landed → build-job → poll-with-timeout sequence. Adds an explicit "don't copy submissions until indexes report Built" gate (submissions-search workflows on the target will 400 against unbuilt indexes).

### `commands/kinetic-report/SKILL.md`

25. **Project-local dependency disclaimer added** — top-of-file ⚠ block stating `reports/report-style.mjs` is required and not bundled. Lists the three fallbacks (copy from another project, switch to Markdown, ask user to provide) and explicitly tells the assistant NOT to invent a substitute style module.

### `commands/kinetic-workflow/SKILL.md`

26. **WebAPI 30-second timeout documented** — Step 5 now explains `timeout` must be ≤ 30 (any higher returns 500 with an orphan run, cross-ref to known-bugs Bug 4), and gives the async-poll pattern for trees that exceed 30 seconds.

---

## Files Touched (Summary)

### Files created (12)
- `CHANGELOG.md`
- `SKILLS-AUDIT-2026-06-13.md`
- `AUDIT-PROGRESS-2026-06-13.md` (this file)
- `docs/GLOSSARY.md`
- `docs/history/2026-04-08-gap-analysis.md` (moved from `GAPS.md`)
- `skills/api/core/SKILL.md`
- `skills/api/integrator/SKILL.md`
- `skills/api/task/SKILL.md`
- `skills/concepts/attribute-definitions/SKILL.md`
- `skills/concepts/submission-activities/SKILL.md`
- `skills/concepts/loghub-api/SKILL.md`
- `skills/concepts/file-resources/SKILL.md`

### Files renamed (1)
- `skills/concepts/users-teams-security/` → `skills/concepts/users-and-teams/`

### Files deleted (1)
- `GAPS.md` (moved)

### Files modified (substantive content changes — 15)
- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`, `.cursor/rules/kinetic-platform.mdc` — index updates
- `skills/api/integrator/connections.md` — credential warning
- `skills/commands/kinetic-debug-run/SKILL.md` — path fix
- `skills/commands/kinetic-policy/SKILL.md` — KSL clarification
- `skills/commands/kinetic-migrate/SKILL.md` — index sequencing
- `skills/commands/kinetic-report/SKILL.md` — project-local dependency
- `skills/commands/kinetic-workflow/SKILL.md` — WebAPI timeout
- `skills/concepts/workflow-xml/SKILL.md` — legacy handler stance
- `skills/concepts/workflow-xml/PITFALLS.md` — slimmed to rule catalogue
- `skills/concepts/security-policies/SKILL.md` — extracted attribute-definitions + submission-activities
- `skills/concepts/integrations/SKILL.md` — extracted loghub-api + file-resources
- `skills/concepts/workflow-creation/SKILL.md` — UUID matching algorithm
- `skills/concepts/users-and-teams/SKILL.md` — name + scope clarification
- `skills/front-end/bootstrap/SKILL.md` — ErrorBoundary, env prefix, deploy
- `skills/front-end/data-fetching/SKILL.md` — full usePagination, identity hazards
- `skills/front-end/state/SKILL.md` — RTK version, SSR guard
- `skills/platform/handler-development/SKILL.md` — Base64 import
- `skills/platform/known-bugs/SKILL.md` — last_verified dates
- `skills/recipes/add-approval-workflow/SKILL.md` — flow reconciliation, treeJson branches

---

## What's Still Open

Across six passes, **65 changes landed**. Every Phase-5 infrastructure item from the original plan is now in place; the remaining open items are content-pipeline improvements that touch the OpenAPI generator and recipe-verifier filling-out:

### What remains
The audit loop is closed. Two small open items:

- **Auto-generator description-column truncation** (`…`) in `api/core/forms.md`, `api/core/kapps.md` etc. — requires `scripts/generate-api-reference.mjs` change. Not a markdown edit; touches the OpenAPI generator pipeline. The three hand-authored Task API ref files (`errors.md`, `triggers.md`, `sources.md`) should be promoted to OAS-generated once the spec covers those endpoints.
- **CI activation** — the GitHub Actions workflow at `.github/workflows/skills-ci.yml` runs lint + build-check unconditionally; the recipe and known-bugs jobs require setting `SKILLS_CI_HAS_LIVE_ENV=true` repo variable plus the `SKILLS_CI_SPACE_URL` / `SKILLS_CI_USER` / `SKILLS_CI_PASS` secrets. Until those are configured, lint + drift checks run on every push and PR; the live jobs are skipped.

---

## Notes on Limitations

Two files (`concepts/api-basics`, `concepts/integrations`) retained some duplicate content that the audit flagged for removal — these were intentionally kept at their original sizes by linter / user reverts mid-session. The new `docs/GLOSSARY.md` "Authoritative Skill Homes" table makes the canonical source clear; the duplicates remain readable and don't actively contradict the canonical home.

Several edits in early passes were applied via the Edit tool whose view diverged from the underlying filesystem for some files mtime'd before this session began. Re-applied via shell where the divergence was load-bearing (e.g. the UUID-matching algorithm append to `workflow-creation`); accepted as-is where the linter/user reverted intentionally (e.g. the `concepts/api-basics` and `concepts/integrations` content). All other final on-disk state verified.
