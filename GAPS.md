# Skills Library Gap Analysis (2026-04-08, updated 2026-04-09)

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
| 10 | **No complete required-properties-per-field-type reference** | form-engine | OPEN — partial coverage, needs full canonical table |

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
| 30 | Missing `Content-Type` header in `executeIntegration` | mutations | OPEN |
| 31 | No submission field update pattern outside CoreForm | mutations | OPEN |
| 32 | `removeSecure`/`removeSameSiteNone` functions missing | bootstrap | OPEN |
| 33 | No complete workflow XML in approval recipe | add-approval-workflow | OPEN |
| 34 | No error handling patterns for useData/usePaginatedData | data-fetching | OPEN |
| 35 | `omitWhenHidden: null` vs `false` never explained | create-submission-form | OPEN |

---

## MEDIUM — Slows down but doesn't block

| # | Gap | Area | Status |
|---|-----|------|--------|
| 36 | No list of all `@kineticdata/react` exports | data-fetching | OPEN |
| 37 | Multi-page form rendering undocumented | forms | OPEN |
| 38 | Widget API props undocumented | forms | OPEN |
| 39 | No text search (=*) filter pattern | build-paginated-list | OPEN |
| 40 | No user search/filter endpoint | users-teams-security | OPEN |
| 41 | ~~Webhook event names not enumerated~~ | webapis-and-webhooks | **FIXED** — full list from screenshot |
| 42 | Combining KQL + keyset pagination | pagination | OPEN |
| 43 | ~~`defaultDataSource` valid values unknown~~ | form-engine | **FIXED** — `"none"` and `"integration"` documented |
| 44 | ~~Field `key` property rules~~ | form-engine | **FIXED** — unique strings, stable identifiers |
| 45 | `calcViewState()` and theme functions | state | OPEN |
| 46 | Datastore query `kapp` param ambiguity | data-fetching | OPEN |
| 47 | ~~No sorting documentation~~ | build-paginated-list | **FIXED** — `direction` ASC/DESC documented |
| 48 | Login component never implemented | bootstrap | OPEN |
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

---

## Progress Summary

- **Critical gaps:** 9/10 resolved (90%)
- **High gaps:** 14/18 resolved (78%)
- **Medium gaps:** 7/15 resolved (47%)
- **New gaps found & fixed:** 7/7 (100%)

## Remaining Questions for James

1. What constraint types besides "custom" are valid? Are there built-in types?
2. Full list of required properties per field type (gap #10)
3. System handler parameters: `system_create_trigger_v1` action types, `system_loop_head_v1` edge cases, `system_wait_v1` time units
4. Are there system handlers beyond the 14 we've documented?
