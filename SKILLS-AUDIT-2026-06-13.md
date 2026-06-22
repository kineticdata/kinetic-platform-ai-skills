# Kinetic Platform Skills — Critical Audit & Improvement Plan

**Date:** 2026-06-13
**Scope:** All files under `skills/` plus `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `README.md` / `.cursor/rules/*.mdc` / `.github/copilot-instructions.md` / `docs/` / `GAPS.md`.

This audit is intentionally adversarial. It records what is broken, missing, redundant, or designed sub-optimally. Praise has been omitted.

---

## Part 1 — Findings

Severity legend: **CRITICAL** (silent breakage or wrong output), **HIGH** (significant confusion / repeated rework), **MEDIUM** (slows readers), **LOW** (style / polish).

### 1.1 Structural problems with the library as a whole

**CRITICAL — `api/core/`, `api/integrator/`, `api/task/` are invisible.** Seventeen reference files exist with no frontmatter, no `name`, no `description`, and no entries in any index. The Common Errors table, the `using-the-api` skill, and the recipes all assume readers reach these files, but the only mention is a buried sentence in `using-the-api/SKILL.md:10`. An LLM running with progressive disclosure will never find them.

**CRITICAL — Two parallel documentation layers are forking.** `concepts/task-api-reference` (414 lines) restates content that lives in `api/task/*.md`. `concepts/api-basics` (552 lines) restates content that lives in `api/core/*.md`. The auto-generated layer is incomplete (no `errors.md`, no `triggers.md`, no `sources.md` despite all three being used in troubleshooting), the narrative layer is opinionated, and there is no canonical source of truth. They will drift.

**HIGH — `.cursor/rules/*.mdc` imports every skill unconditionally** (28 `@`-imports across two files) while `CLAUDE.md` documents an "on-demand" loading model. Cursor users get the entire library in every prompt regardless of task — the opposite of what the design intends. Either Cursor users get tag-filtered rules, or the on-demand model is fiction for them.

**HIGH — `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `README.md` are hand-mirrored.** The README contributing guide says so explicitly: "AGENTS.md and GEMINI.md mirror CLAUDE.md … add the same row." This is a known-stale-by-design pattern. One source, generated mirrors.

**HIGH — Terminology drift across skills.**
- "Tree" vs "Workflow" vs "Routine" — `workflow-creation` calls them "workflow trees"; `task-api-reference` calls everything "trees"; nothing nails down that a Core API "workflow" maps to a Task API "tree."
- "Deferred" vs "Work In Progress" — `workflow-engine:394` says deferred tasks are `Deferred`; `workflow-engine:497-498` says they show as `Work In Progress`; `task-api-reference:213` lists `New / Deferred / Closed`. Pick one.
- "KSL" — `kinetic-policy` and `security-policies` disagree about whether KSL is its own language or just JavaScript expressions. The same name labels JS for Core policies and Ruby for Task engine policies.
- "treeJson" vs "treeXml" — `workflow-creation:100` says use treeJson, `workflow-creation:207` uses treeXml, `webapis-and-webhooks:86` uses treeXml, `connect-external-system` uses raw XML inline. No single canonical answer.

**HIGH — `CLAUDE.md` Mandatory Rules contradict skill bodies.** CLAUDE.md says `kinetic_core_api_v1` is "in heavy active use … a sensible choice." `workflow-xml/SKILL.md:553` labels it "Legacy — Avoid. Do NOT use for new workflows." Either the rules or the skill is wrong; readers see both.

**HIGH — `GAPS.md` is a historical artifact that still reads as current.** The header concedes this is a 2026-04-08 snapshot of 26 skills, but the bulk of the file is a forensic table that a reader will mistake for an active backlog. Either trim it to a CHANGELOG or move to `docs/history/`.

**HIGH — `momentum-portal`-specific implementation leaks into "generic" skills.** `portal-patterns/SKILL.md:99-120` lists `/theme`, `/actions/*`, `/settings/*` routes that are particular to one reference app; `bootstrap/SKILL.md:240` casually assumes Tailwind v4's `@tailwindcss/vite` plugin; `state/SKILL.md:155-170` hardcodes Tailwind breakpoints. The README explicitly forbids this ("Document the approach, not specific implementations").

**MEDIUM — No version compatibility matrix.** React 18 only is stated, but no skill pins `@kineticdata/react` (only `^6.1.1` in passing), React Router, Redux Toolkit, Tailwind, Vite, or Node. Bootstrap skill uses RTK's `combineSlices().inject` (recent), Tailwind v4 plugin, and Vite — all without minimums.

**MEDIUM — TypeScript completely absent.** Zero skills mention TS, no example is `.tsx`, no `.d.ts` guidance for `@kineticdata/react`, no example of typing `useData<T>`. For a 2026 portal library this is a baseline omission.

**MEDIUM — No testing strategy.** Nothing on mocking `@kineticdata/react`, stubbing `CoreForm`, testing `useData`, KQL builders, workflow XML, or handlers. The library indexes the `engineering:testing-strategy` skill (Anthropic) but provides no Kinetic-specific guidance.

**MEDIUM — No accessibility guidance.** `build-paginated-list:336-356` has no `aria-label` / `aria-current` / `role="status"`. `build-service-portal:362-388` has the same gap. `state/SKILL.md` theme system permits arbitrary user-chosen colors with no contrast check. Nothing on focus traps, skip-to-content, screen-reader announcements on route change.

**MEDIUM — No error boundary guidance.** `App.jsx` in `bootstrap:185-211` handles auth/load errors but not render errors. A `CoreForm` crash or a malformed `searchSubmissions` response that throws in `.map()` blanks the whole portal. No skill shows `<ErrorBoundary>` around route content.

**MEDIUM — No build/deploy guidance.** Bootstrap covers `npm install` and the Vite dev proxy. Nothing on production build, deployment to the Kinetic server, source maps, env-per-environment config, or how the proxied `/app/bundle.js` works in production.

---

### 1.2 Workflow cluster — the worst-affected area

Five files cover workflows: `workflow-engine` (669), `workflow-xml` (948), `workflow-creation` (342), `task-api-reference` (414), and `workflow-xml/PITFALLS.md` (207). Many sections are restated 2–3 times across these files.

**CRITICAL — Duplication:**
- Connector type semantics (Complete/Create/Update) appear in `workflow-engine:52-63`, `workflow-xml:136-165`, and partially in `architectural-patterns`.
- `system_tree_return_v1`'s `headers_json` requirement appears verbatim in `workflow-xml:332-351`, `webapis-and-webhooks:110-122`, and `workflow-engine`.
- "Run status is misleading" lives in `workflow-engine:623-633`, `task-api-reference:156-160`, and `workflow-xml:875`.
- Queue Task / deferral pattern appears in `workflow-engine:408-451`, `architectural-patterns:66-97`, and `workflow-xml:487-500`.
- `workflow-xml/PITFALLS.md` is ~90% redundant with the SKILL.md it sits next to.

**HIGH — `workflow-engine/SKILL.md` mixes concepts with reference and patterns.** ERB context tables (also in workflow-xml), JSON.parse rescue patterns, "Dynamic email templates pattern" (L126-155), `routine_merge_submission_and_descendant_values` reliability notes, `String#include?` substring bug (L168-183), Ruby hash literal editing patterns (L198-220) — these are author-of-treeJson concerns, not engine-execution concepts.

**HIGH — `workflow-xml/SKILL.md` is 948 lines and contains a "MANDATORY — Gate Scripts" preface (L15-43) that asserts external scripts must be run before any workflow work.** Readers on a different machine without `~/.claude/settings.json` are simply told things are mandatory that they cannot do.

**HIGH — `kinetic-debug-run/SKILL.md:66` contains a path typo** — `/app/api/v2/runs/...` is missing the `/app/components/task/` prefix that the same file uses correctly on L33. A copy-paste fix attempt will fail.

**HIGH — `add-approval-workflow/SKILL.md` is internally inconsistent.**
- L184-206 describes the deferral and approval-creation as separate nodes.
- L252-259 corrects that to "place 'Create Approval Submission' as the very first node reached via the deferral node's Create connector."
- L416-427 shows a treeJson where the deferral and approval-creation are the *same node* (`Create Approval` with `defers: true`).
The result key referenced in L271-277 (`@results['Deferral Node']['Decision']`) doesn't match the node name (`Create Approval`) used in the worked example.

**HIGH — `add-approval-workflow:595` uses `POST /app/components/task/app/api/v2/runs/task/{deferralToken}` to complete a deferral.** This is undocumented in `task-api-reference` (which only documents `/triggers`). Either the endpoint is correct and the reference is missing it, or the recipe is wrong. Cannot tell from the library.

---

### 1.3 Per-skill defects (selected)

**`api-basics/SKILL.md` (552 lines).** Mixed-abstraction sprawl. The `uuidV1ToMs` algorithm (L520-552) is workflow-discovery code that belongs in `workflow-creation`, not "API Basics." The Gotchas section (L482-506) restates KQL, Form Engine, and pagination gotchas already covered in their own skills.

**`form-engine/SKILL.md` (597 lines).** Gotchas section (L546-593) is 50% of the file and mixes form-engine concerns with workflow concerns ("all active workflows matching source/event fire" L561). Field templates (L199-303) — 100+ lines of mechanical schema — should be `REFERENCE.md`. Page navigation / `currentPage` vs `displayedPage` not covered systematically.

**`security-policies/SKILL.md` (607 lines).** Contains three unrelated concepts: security policy definitions (L9-242), attribute definitions (L244-396), submission activities (L398-451). Plus Task Engine policy rules (L453-502) which use Ruby, not the JS the Core policies use. Should be three skills.

**`integrations/SKILL.md` (727 lines).** Mixes Connections/Operations, Integrator REST schema, Bridges (also in `models`), Handlers (also in `platform/handler-development`), File Resources, LogHub, Handler Import gotchas. The LogHub section is wholly unrelated to integrations.

**`users-teams-security/SKILL.md` (407 lines).** Name promises security; content is users + teams + memberships only. Discoverability is harmed because the AI loads it expecting policy info and finds none.

**`bootstrap/SKILL.md` (307 lines).** Does NOT take a reader from `npm create vite` → running portal. App.jsx shown is render-only; redux.js, `useData`, `PublicRoutes`, `PrivateRoutes`, `Login`, `Error`, `Loading`, `Toaster` are referenced but not defined here. They live in `portal-patterns`. A reader can't paste this into a fresh project and boot. The `isarray` install workaround (L20) papers over an SDK bug rather than fixing it. The "Never use React.StrictMode" rule (L55-61) has no tracking link or remediation path.

**`forms/SKILL.md` (421 lines).** Widget system (L344-421) is dense with no worked example of writing a widget. Multi-page forms get one short section. Submission Locking (L277-298) lists no failure modes. File uploads (`saveSubmissionMultipart`) get no example anywhere despite being a critical CoreForm interaction.

**`mutations/SKILL.md` (231 lines).** Missing optimistic UI, mutation status (`idle/pending/success/error`), debouncing, retry, request deduplication, undo, 409 conflict handling. Every example is `await mutate(); if (error) toast()`. Multipart submission has no example.

**`data-fetching/SKILL.md` (361 lines).** Truncated implementations — `usePagination:194-195` shows `setNextPageToken: ...` (literal ellipsis). The `useData` `useCallback` depends on `params` (an object); without `useMemo` discipline by callers, fetches re-run every render and only a timestamp stale-check saves the developer. `usePoller` resets its schedule on every param change because `reloadData` is a new callback each time params change — unflagged.

**`handler-development/SKILL.md` (407 lines).** "Testing" section (L332-350) is 18 lines and says approximately nothing actionable. No mention of how to install handlers in a dev engine, no CLI invocation, no log discovery. JWT example (L197-219) references `Base64.getUrlEncoder` without importing `java.util.Base64` — copy-paste yields NameError.

**`known-bugs/SKILL.md` (106 lines).** No "last verified" date on any bug. Bug 5 has no actual workaround, only a prevention recommendation. Several documented bugs are missing here that exist elsewhere: webhookJobs status filter ignored (in `troubleshooting`), `validationErrors: []` empty on userInvitationTokens (in `using-the-api`), Task API run.id absent without `include=details` (in `using-the-api`).

**`troubleshooting/SKILL.md` (235 lines).** Not a decision tree — a flat list. A reader hitting "ENGINE Run Error" has no triage entry point. Lines 231-235 ("Known Platform Bugs" narrative summary) duplicates `known-bugs/SKILL.md` headers.

**`kinetic-new-app/SKILL.md`.** Description says "scaffold an application — forms, indexes, seed data, **and UI**," and Step 3 includes `index.html`. But implementation guidance assumes a non-existent "portal" with shared chrome and a launcher (L53-62). It is coupled to an unnamed reference portal.

**`kinetic-migrate/SKILL.md`.** Step 4 implies indexes created in the form-create body will auto-build. They will not. The order (create form → create index definitions → POST build → poll) is buried.

**`kinetic-report/SKILL.md`.** The only command in the library that depends on **project-local** code (`reports/report-style.mjs`). The skill makes no concession for projects that don't have that module — it will silently fail.

**`api/core/forms.md`, `kapps.md`, etc.** Description columns are truncated mid-sentence with `…` (forms.md L35-46 is the worst). The auto-generator output is broken.

**`api/integrator/connections.md`.** PUT/PATCH endpoints documented with no warning about the credential-wipe behavior — the loudest cross-cutting rule in the library, and missing from the exact file where someone learning the API will land.

---

### 1.4 Cross-skill duplication map

| Topic | Authoritative home should be | Currently duplicated in |
|---|---|---|
| Connector type semantics | `workflow-engine` | `workflow-xml`, `architectural-patterns` |
| Deferral / Queue Task pattern | `architectural-patterns` | `workflow-engine`, `workflow-xml` |
| `system_tree_return_v1` headers_json | `workflow-xml` | `webapis-and-webhooks`, `workflow-engine` |
| "Closure Is Not a Write Lock" | `architectural-patterns:340-352` | `api-basics:453-459`, `workflow-xml:587` |
| Run status misleading | `task-api-reference` | `workflow-engine`, `workflow-xml` |
| ERB context table | `workflow-xml` | `workflow-engine` |
| Core endpoint table | `api/core/*.md` (auto-generated) | `api-basics:56-112` |
| Task endpoint table | `api/task/*.md` (auto-generated) | `task-api-reference:46-110` |
| Bridge architecture | `models` | `integrations:409-467` |
| Handler authoring | `platform/handler-development` | `integrations:470-533`, `kinetic-workflow:57-66` |
| KQL gotchas | `kql-and-indexing` | `api-basics:482-506`, `kinetic-kql` |
| Form engine gotchas | `form-engine` | `api-basics:482-506` |

---

## Part 2 — Remediation Plan

Organized by phase. Each item has an owner-effort estimate (S = ≤½ day, M = 1–2 days, L = >2 days).

### Phase 1 — Stop the bleeding (1 week)

| # | Action | Effort | Severity unblocked |
|---|---|---|---|
| 1 | Fix path typo `kinetic-debug-run:66` (`/app/api/v2/runs/` → `/app/components/task/app/api/v2/runs/`) | S | CRITICAL |
| 2 | Add credential-wipe warning to `api/integrator/connections.md` PUT/PATCH endpoints | S | CRITICAL |
| 3 | Resolve KSL = JavaScript contradiction across `kinetic-policy`, `security-policies`, `users-teams-security` — pick one phrasing, sweep all files | S | HIGH |
| 4 | Resolve `kinetic_core_api_v1` legacy-vs-current contradiction between `CLAUDE.md` mandatory rules and `workflow-xml` — pick one stance | S | HIGH |
| 5 | Verify the deferral-completion endpoint in `add-approval-workflow:595` against the live API; correct whichever side is wrong; cross-link from `task-api-reference` | M | HIGH |
| 6 | Reconcile `add-approval-workflow` internal contradiction — pick one shape (deferral-as-its-own-node vs deferred-create-node), rewrite L184-440 to match, fix the result-key name | M | HIGH |
| 7 | Move `GAPS.md` into `docs/history/` and replace top-level with a 10-line CHANGELOG | S | MEDIUM |

### Phase 2 — Eliminate duplication and fix the workflow cluster (2–3 weeks)

| # | Action | Effort |
|---|---|---|
| 8 | Define and publish a canonical glossary (`docs/GLOSSARY.md`) — Tree/Workflow/Routine, Deferred/Work-In-Progress, KSL-JS/KSL-Ruby, treeJson/treeXml. Sweep all skills against it | M |
| 9 | Reorganize the workflow cluster: `workflow-engine` = execution semantics; `workflow-xml` = schema + handler reference; `workflow-creation` = CRUD lifecycle; `task-api-reference` = endpoint-only quick lookup. Move duplicate content to its canonical home; replace duplicates with one-line links | L |
| 10 | Delete `workflow-xml/PITFALLS.md` (or repurpose as `scripts/README.md` describing what the validator enforces) | S |
| 11 | Split `security-policies/SKILL.md` into three: `security-policies` (KSL definitions + CRUD), `attribute-definitions` (new), `submission-activities` (new) | M |
| 12 | Split `integrations/SKILL.md`: keep Connections/Operations + Integrator REST schema; extract `loghub-api`, `file-resources`, link Bridges to `models`, link Handlers to `platform/handler-development` | M |
| 13 | Rename `users-teams-security` → `users-and-teams`; update index files | S |
| 14 | Move the `uuidV1ToMs` algorithm out of `api-basics` into `workflow-creation` (or a new `workflow-discovery` skill) | S |
| 15 | Decide canonical home for "Closure Is Not a Write Lock" (recommend `architectural-patterns`); replace others with link | S |
| 16 | Generate `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `README.md` skill tables from a single `skills.yaml` source via a build script | M |

### Phase 3 — Make the API reference layer real (2 weeks)

| # | Action | Effort |
|---|---|---|
| 17 | Add `SKILL.md` frontmatter to `api/core/`, `api/integrator/`, `api/task/` index files. Each index lists endpoints in its directory with one-line descriptions and "Use when…" triggers | M |
| 18 | Add `CLAUDE.md` table rows for the 17 reference files, grouped by resource | S |
| 19 | Fix the generator that produces truncated description columns in `api/core/forms.md` etc. — output complete or footnoted descriptions | M |
| 20 | Add missing Task API ref files: `api/task/errors.md`, `api/task/triggers.md`, `api/task/sources.md`. Cross-link from `troubleshooting` and `kinetic-debug-run` | M |
| 21 | Surface critical gotchas at point-of-use: no-`/submit`-endpoint, 30s WebAPI timeout, 500-poisoning, value-update wipes-event, missing index gotchas, 405 on `/forms`/`/kapps` PATCH. Add as alert boxes inside the relevant `api/core/*.md` and `api/task/*.md` | M |
| 22 | Pick one source of truth between auto-generated `api/*` and narrative `concepts/api-basics` + `concepts/task-api-reference`. Recommend: API ref files own endpoint shapes; concept skills own behavior, contracts, gotchas, examples. Strip duplicated tables from the concept skills | M |

### Phase 4 — Tighten the recipes and front-end skills (2–3 weeks)

| # | Action | Effort |
|---|---|---|
| 23 | Decide whether `build-service-portal` is a meta-index or a full walkthrough. If index, slim it to ~150 lines of cross-references; if walkthrough, inline the steps from `bootstrap` / `portal-patterns` so it stands alone | M |
| 24 | Make `bootstrap/SKILL.md` self-contained: include the redux.js boilerplate, `PublicRoutes`/`PrivateRoutes` skeletons, `useData` hook implementation, `Login`/`Error`/`Loading` minimal components. A reader should be able to follow only this file and reach a running portal | M |
| 25 | Add complete, runnable `treeJson` to `add-approval-workflow` that exercises Approve / Deny branching as the prose claims | M |
| 26 | Fix the "representative PUT body" in `create-submission-form:96-157` so it is actually valid | S |
| 27 | Pick one canonical workflow format (treeJson vs treeXml) for recipes; sweep `connect-external-system`, `add-approval-workflow`, `webapis-and-webhooks` accordingly | S |
| 28 | Replace momentum-portal-specific paths (`/theme`, `/actions/*`, `/settings/*`) in `portal-patterns` with pattern-level examples; move momentum-specific content to an explicit "Reference Implementation" appendix | M |
| 29 | Add accessibility callouts to `build-paginated-list`, `build-service-portal`, `bootstrap`, `state` (focus management, ARIA, color contrast) | M |
| 30 | Add `React.ErrorBoundary` guidance to `bootstrap` (around route content) and `forms` (around `CoreForm` instances) | S |
| 31 | Add a complete file-upload section to `mutations` covering `saveSubmissionMultipart`, MIME limits, multipart submission flow | M |
| 32 | Add optimistic UI, status tracking, retry, debounce, 409-conflict patterns to `mutations` | M |
| 33 | Show full implementations (no `...` elisions) of `usePagination`, `usePoller`, and toast helpers; flag the param-object identity hazard in `useData` prominently | S |
| 34 | Pin compatible versions for React, `@kineticdata/react`, Redux Toolkit, React Router, Vite, Tailwind, Node, in a `bootstrap/COMPAT.md` | S |

### Phase 5 — Standards & process (ongoing)

| # | Action | Effort |
|---|---|---|
| 35 | Add `last_verified: YYYY-MM-DD` frontmatter to every `known-bugs` entry; add a CI check that fails on entries >180 days stale | M |
| 36 | Rewrite `troubleshooting/SKILL.md` as a decision tree starting from observed symptom; link out to detailed sections | M |
| 37 | Tighten frontmatter descriptions to "Use when…" triggers (the README rule); audit every skill against that wording | M |
| 38 | Add a linter to CI: forbid skill bodies >500 lines without an opt-in tag; require `last_verified` on bug entries; verify every cross-reference resolves; verify `name:` matches folder | M |
| 39 | Replace hand-mirrored CLAUDE.md / AGENTS.md / GEMINI.md / README.md / .cursor/ / .github/ with a build script that generates all of them from `skills.yaml` | M |
| 40 | Configure `.cursor/rules/*.mdc` to use tag-based imports so on-demand loading actually applies in Cursor | M |

---

## Part 3 — Valuable Additions / Enhancements

Twelve concrete proposals, prioritized.

### 3.1 New skills

1. **`concepts/kapp-lifecycle/SKILL.md`** — Kapp create/update/delete, kapp `fields` array, `formTypes`, `indexDefinitions`, kapp categories, kapp attributes vs space attributes, kapp security. Currently scattered across `api-basics`, `kql-and-indexing`, `build-service-portal:42-54`. Build with: form-type registration recipes, the silent merge-behavior-on-PUT, indexes-must-be-built workflow.

2. **`concepts/file-resources-and-attachments/SKILL.md`** — End-to-end file lifecycle: upload via `submissions-multipart`, retrieval URLs, the kapp-level `fileResources`, MIME and size constraints, virus scanning hooks if any, download authorization. `form-engine` references attachments; nothing covers the full lifecycle. Build with: a multipart fetch example, a programmatic batch-upload pattern, a multipart-update-existing-submission pattern.

3. **`concepts/attribute-definitions/SKILL.md`** (extracted from `security-policies`) — All seven attribute scopes (space, kapp, form, user, userProfile, team, category) and the AllowsMultiple semantics, plus the PUT-replaces-everything caveat. Reference-grade with worked examples for read/write at each scope.

4. **`concepts/submission-activities/SKILL.md`** — `/submissions/{id}/activities` CRUD, activity types, programmatic activity writes from workflows, `include=activities` shape. Currently embedded in `security-policies:398-451` and unfindable.

5. **`concepts/webhook-jobs-and-retries/SKILL.md`** — Webhook job lifecycle (Queued / Running / Succeeded / Failed), retry semantics, the `?status=Failed` filter bug, the bulk-resolve flow, the `webhookJobs` CRUD endpoints. Currently scattered between `webapis-and-webhooks`, `troubleshooting`, and `api/core/kapps.md`.

6. **`concepts/workflow-discovery/SKILL.md`** — Finding trees for a kapp/form, the `platformItemType` / `sourceGroup` / `platformItemId` model, the UUID-v1-timestamp matching algorithm, listing trees by event. Currently shoved into `api-basics:507-552`. Pairs well with a new `/kinetic-find-workflows` command.

7. **`front-end/file-uploads/SKILL.md`** — `saveSubmissionMultipart`, programmatic uploads outside CoreForm, progress UI, retry, file-type validation, accessibility.

8. **`front-end/testing/SKILL.md`** — Vitest + RTL setup, mocking `@kineticdata/react`, MSW for KineticLib fixtures, snapshot strategy for `CoreForm`-bound components, integration testing with `tests/provision.sh` fixtures.

9. **`front-end/accessibility/SKILL.md`** — ARIA patterns specific to Kinetic UI (pagination, form lists, status announcements, theming/contrast). Tied to a checklist `a11y-checklist.md`.

10. **`platform/sso-and-identity/SKILL.md`** — SAML/SSO configuration, JIT user provisioning, IdP-managed user lifecycle, attribute-based role mapping. Currently scraped together from `authentication` and `users-teams-security`.

### 3.2 New commands

11. **`/kinetic-create-connection`** — Walk creating a Connection + paired Operations (the canonical Integrator workflow). Today `kinetic-workflow` references `system_integration_v1` but no command sets up the prerequisite Connection.

12. **`/kinetic-export-form`** — Export a single form (with its events, indexes, integrations, attributes) to JSON for version control. Today only the whole-space template export exists.

13. **`/kinetic-test-workflow`** — Take a workflow + a synthetic submission payload, invoke it, return run status + per-node results. Closes the gap between `/kinetic-workflow` (create) and `/kinetic-debug-run` (diagnose post-failure).

14. **`/kinetic-create-handler`** — Scaffold a custom handler from the `platform/handler-development` patterns: directory layout, `node.xml`, `init.rb`, Gemfile, parameter declarations, packaging script.

15. **`/kinetic-bump-indexes`** — Read a form's KQL queries (or take a query as arg), recommend the minimum compound indexes, generate the PUT body and the build POST.

16. **`/kinetic-audit-permissions`** — For a kapp or form, print resolved security: who can submit, who can read which submissions, which policy definitions evaluate, which attributes are checked. Closes a real operational gap.

### 3.3 Library-wide enhancements

17. **CI lint suite** — folder-name / `name:` match, frontmatter `description` length, cross-reference resolution, max body length (500-line warning), `known-bugs` `last_verified` freshness, broken-link detection, no duplicated section heads.

18. **`skills.yaml` source-of-truth + build script** — generate `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md` skills table, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`. Eliminates the hand-mirroring problem.

19. **Glossary + terminology sweep** — `docs/GLOSSARY.md` codifying Tree/Workflow/Routine, KSL-JS/KSL-Ruby, treeJson canonical-vs-XML, Deferred-vs-Work-In-Progress, and a CI check that flags drift.

20. **"Last verified" pipeline for `known-bugs`** — automation that exercises each documented bug against `tests/` infrastructure on a schedule; auto-bumps `last_verified` on pass, opens an issue on resolution.

21. **TypeScript starter portal under `portal/ts/`** — mirrors the existing `portal/` JS reference but in `.tsx`, with typed `useData<T>`, typed `searchSubmissions` wrappers, an example `.d.ts` for `@kineticdata/react`. The skills can then cite TS examples without forking everything.

22. **End-to-end recipe verification** — for each recipe, a script under `tests/recipes/<recipe-name>/` that follows the recipe verbatim against a provisioned fixture and asserts the expected outcome. Recipe bit-rot is the highest-impact failure mode in this kind of library; current `tests/verify.sh` covers fixtures but not the recipe instructions.

---

## Closing note

The library has done the hardest work — picking the right boundaries (concepts / recipes / front-end / api / platform / commands) and writing dense, specific content. The cracks are visible because the depth is real: contradictions only show up when there are enough words for them to contradict. The remediation plan is mostly editing and reorganization, with a smaller engineering effort to make the index machine-generated and the bug data fresh. Phases 1–2 capture roughly 70% of the value at roughly 30% of the cost.
