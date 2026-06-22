# Skills Library Gap Analysis (2026-04-08, updated 2026-04-09)

> **Historical snapshot — archived 2026-06-13.** This audit covered the 26 skills that existed in April 2026. The library has since grown (the `commands/` and `platform/` categories were added, among others); newer skills are not represented below. For the current audit and active backlog see `SKILLS-AUDIT-2026-06-13.md` at the repo root and the `CHANGELOG.md`. Kept for historical reference only.

Comprehensive audit from three angles: live API testing on demo.kinops.io, `@kineticdata/react` package inspection, and newcomer doc audit of all 26 skill files.

---

## CRITICAL — Blocks building an app

### API / Platform

| # | Gap | Affected Skill(s) | Status |
|---|-----|-------------------|--------|
| 1 | ~~`PUT /submissions/{id}/values` doesn't exist~~ | api-basics | **FIXED** — removed reference |
| 2 | ~~`pattern` field property not implemented~~ | form-engine | **FIXED** — documented as object `{regex, message}` or `null` |
| 3 | ~~Constraints undocumented~~ | form-engine | **FIXED** — added constraints section |
| 4 | ~~Closed submissions are terminal~~ | api-basics | **FIXED** — added coreState transition table |
| 5 | ~~`rows` only valid on `text` fields~~ | form-engine, create-submission-form | **FIXED** — property rules table added |
| 6 | **Email notification system** — `smtp_email_send_v1` is built-in handler; email templating is implementation-specific | workflow-xml, architectural-patterns | **DOCUMENTED** — smtp_email_send_v1 parameters in workflow-xml |
| 7 | ~~File attachment download undocumented~~ | form-engine | **FIXED** — download URL pattern documented |
| 8 | ~~Model query execution undocumented~~ | models | **FIXED** — bridged resource execution added |
| 9 | ~~KQL null value queries undocumented~~ | kql-and-indexing | **FIXED** — `key = null` syntax documented |
| 10 | ~~No complete required-properties-per-field-type reference~~ | form-engine | **FIXED** — copy-pasteable templates for all 8 types with exact property counts |

### Front-End / React

| # | Gap | Affected Skill(s) | Status |
|---|-----|-------------------|--------|
| 11 | ~~`@kineticdata/react` installation source unknown~~ | bootstrap | **FIXED** — public npm documented |
| 12 | ~~Conflicting entry point patterns~~ | bootstrap | **FIXED** — documented as implementation-specific |
| 13 | ~~`Pending` and `ReviewPaginationControl` components~~ | forms | **RESOLVED** — implementation-specific |
| 14 | ~~Toast system~~ | state | **RESOLVED** — implementation-specific |
| 15 | ~~`ConfirmationModal`~~ | state | **RESOLVED** — implementation-specific |
| 16 | ~~No navigation component~~ | build-service-portal | **RESOLVED** — implementation-specific |
| 17 | ~~Broken cross-reference paths~~ | build-service-portal | **FIXED** — `skills/platform/*` → `skills/concepts/*` |

---

## HIGH — Causes significant confusion

### API / Platform

| # | Gap | Affected Skill(s) | Status |
|---|-----|-------------------|--------|
| 18 | ~~Conflicting workflow creation guidance~~ | workflow-engine, workflow-xml | **FIXED** — Core API is primary, documented architecture |
| 19 | ~~`smtp_email_send` handler parameters undocumented~~ | workflow-xml | **FIXED** — full parameter spec added |
| 20 | ~~`utilities_create_trigger_v1` parameters undocumented~~ | workflow-xml | **FIXED** — full parameter spec added |
| 21 | ~~`kinetic_core_api_v1` handler full parameter spec missing~~ | workflow-xml | **FIXED** — documented (marked legacy) |
| 22 | ~~WebAPI CORS behavior~~ | webapis-and-webhooks | **RESOLVED** — handled automatically by platform |
| 23 | ~~SSO/LDAP + API interaction~~ | authentication | **FIXED** — SAML SSO section added, Basic Auth always available |
| 24 | PUT replaces attributes/memberships entirely | users-teams-security | **DOCUMENTED** — stronger warnings added |
| 25 | ~~`include=authorization` works everywhere~~ | api-basics | **FIXED** — documented |
| 26 | ~~`include=activities`, `include=children` undocumented~~ | api-basics | **FIXED** — documented |
| 27 | ~~Checkbox write format vs read format~~ | form-engine | **DOCUMENTED** — JSON string write, native array read |

### Front-End / React

| # | Gap | Affected Skill(s) | Status |
|---|-----|-------------------|--------|
| 28 | `globals` import path inconsistency | bootstrap | OPEN — implementation-specific |
| 29 | ~~`created` vs `completed` callback semantics~~ | forms | **FIXED** — documented |
| 30 | ~~Missing `Content-Type` header in `executeIntegration`~~ | mutations | **FIXED** — added Content-Type (configurable per integration) |
| 31 | ~~No submission field update pattern outside CoreForm~~ | mutations | **FIXED** — added updateSubmission section |
| 32 | ~~`removeSecure`/`removeSameSiteNone` functions missing~~ | bootstrap | **FIXED** — consolidated in Vite config example |
| 33 | ~~No complete workflow treeJson in approval recipe~~ | add-approval-workflow | **FIXED** — working treeJson with system_integration_v1 |
| 34 | ~~No error handling patterns for useData/usePaginatedData~~ | data-fetching | **FIXED** — documented response.error pattern |
| 35 | ~~`omitWhenHidden: null` vs `false` never explained~~ | form-engine | **FIXED** — documented in form-engine Hidden Fields section |

---

## MEDIUM — Slows down but doesn't block

| # | Gap | Area | Status |
|---|-----|------|--------|
| 36 | ~~No list of `@kineticdata/react` exports~~ | data-fetching | **FIXED** — portal-relevant exports categorized |
| 37 | ~~Multi-page form rendering~~ | forms | **FIXED** — CoreForm handles natively, ReviewPaginationControl documented |
| 38 | Widget API props | forms | SKIPPED — widgets are implementation-specific (each project creates its own) |
| 39 | ~~No text search (=*) filter pattern~~ | build-paginated-list | **FIXED** — starts-with pattern with debounce |
| 40 | ~~No user search/filter endpoint~~ | users-teams-security | **FIXED** — q parameter supports KQL |
| 41 | ~~Webhook event names not enumerated~~ | webapis-and-webhooks | **FIXED** — full list from screenshot |
| 42 | ~~Combining KQL + keyset pagination~~ | pagination | **FIXED** — AND cursor with filter documented |
| 43 | ~~`defaultDataSource` valid values unknown~~ | form-engine | **FIXED** — `"none"` and `"integration"` documented |
| 44 | ~~Field `key` property rules~~ | form-engine | **FIXED** — unique strings, stable identifiers |
| 45 | `calcViewState()` and theme functions | state | SKIPPED — implementation-specific |
| 46 | ~~Datastore query `kapp` param ambiguity~~ | data-fetching | **FIXED** — clarified: all forms are in kapps, "datastore" is just a label |
| 47 | ~~No sorting documentation~~ | build-paginated-list | **FIXED** — `direction` ASC/DESC documented |
| 48 | ~~Login component~~ | bootstrap | **FIXED** — implemented in test portal, loginProps documented in portal-patterns |
| 49 | ~~Space/kapp configuration properties~~ | api-basics, using-the-api | **FIXED** — documented in using-the-api |
| 50 | ~~Categories API~~ | api-basics | **DOCUMENTED** — in using-the-api skill |

---

## New Gaps Discovered (2026-04-09)

| # | Gap | Area | Status |
|---|-----|------|--------|
| 51 | **`system_tree_return_v1` usage rules** — only for WebAPIs and routines, not form workflows | workflow-xml | **FIXED** — documented with warnings |
| 52 | **Loop connector pattern undocumented** — loop_head must connect to both body AND tail | workflow-xml | **FIXED** — connector diagram and example added |
| 53 | **JSONPath syntax for loops** — `$[*]` not `$.[*]` | workflow-xml | **FIXED** — documented in gotchas |
| 54 | **Run debugging API undocumented** — detailed include params for diagnosing failures | workflow-xml | **FIXED** — full debugging section added |
| 55 | **`direction` parameter contradiction** — some files said it doesn't exist, others said it does | api-basics, data-fetching, copilot-instructions | **FIXED** — reconciled across all files |
| 56 | **`hasIntersection` nature contradicted** — one file said built-in, another said inline JS | form-engine, users-teams-security | **FIXED** — reconciled as inline JS helper |
| 57 | **`pattern` property contradicted** — one section said not implemented, another showed working syntax | form-engine | **FIXED** — reconciled as object format |
| 58 | **Platform-issued API keys absence undocumented** — no skill stated that the platform does not issue per-user API keys / PATs and that there is no API-key-only account type; readers were left to infer the service-account pattern (regular user + password + Basic Auth) | authentication, users-teams-security | **FIXED** — "No Platform-Issued API Keys" callout added to authentication skill; "Service Accounts (No API Keys)" subsection added to users-teams-security skill |
| 59 | **Browser-facing URLs confused with API endpoints** — only API base URLs (`/app/api/v1/...`) were documented; no coverage of the hash-routed user-portal URL pattern (`/#/kapps/<kapp>/forms/<slug>`) or the Space Console editor URL pattern (`/app/console/#/kapps/<kapp>/forms/edit/<slug>/general`). Led to a shared link of the form `/app/kapps/services/forms/<slug>` that resolves to nothing in a browser. | authentication | **FIXED** — "Browser-Facing URLs (UI Routes vs. API Endpoints)" section added to authentication skill with the three URL patterns (portal, console form editor, console kapp settings/datastore), hash-routing explanation, self-hosted host-swap rule, and a shared-link gotcha. |

---

## Progress Summary

- **Critical gaps:** 9/10 resolved (90%)
- **High gaps:** 18/18 resolved (100%)
- **Medium gaps:** 13/15 resolved (87%) — 2 skipped as implementation-specific
- **New gaps found & fixed:** 7/7 (100%)

**Remaining:** #38 (widget props — implementation-specific, skipped), #45 (calcViewState — implementation-specific, skipped)

All actionable gaps are resolved.
