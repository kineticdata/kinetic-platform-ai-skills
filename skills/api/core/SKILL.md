---
name: core
description: "Use when you need the authoritative endpoint shape for a Kinetic Core API v1 resource — URL, HTTP method, path parameters, query parameters, request-body presence, and success status — for forms, kapps, spaces, submissions, users, teams, attributes, categories, webapis, webhooks, or security policy definitions. This index points to the auto-generated per-resource reference files. For behavior, error shapes, worked examples, and gotchas, read the `concepts/api-basics` or `concepts/using-the-api` skills instead."
---

# Core API v1 — Endpoint Reference Index

The files in this directory are **auto-generated from the OpenAPI spec** (`oas/core.json`). They list every endpoint with its URL, method, path/query parameters, and success response code. They are the source of truth for endpoint *shape*.

For behavior, error shapes, examples, and gotchas, the narrative skills (`concepts/api-basics`, `api/using-the-api`, and the various concept skills) own the explanations.

## Files

| File | Resources covered |
|------|-------------------|
| [`attributes.md`](attributes.md) | Attribute definitions across all scopes — space, kapp, form, user, userProfile, team, category |
| [`categories.md`](categories.md) | Category CRUD and categorization endpoints |
| [`forms.md`](forms.md) | Forms CRUD, indexes, events, integrations, workflows attached to forms, repair |
| [`kapps.md`](kapps.md) | Kapps CRUD, kapp formTypes, kapp index definitions, kapp categories, kapp webhooks/webhook jobs |
| [`security.md`](security.md) | Security policy definitions (CRUD only — for KSL expression syntax, see `concepts/security-policies`) |
| [`spaces.md`](spaces.md) | Space-level endpoints including space updates, datastore-form-equivalent space resources |
| [`submissions.md`](submissions.md) | Submission CRUD, search, PATCH (timestamp control), submission activities, multipart |
| [`teams.md`](teams.md) | Teams CRUD, team memberships |
| [`users.md`](users.md) | Users CRUD, user profile, memberships, user preferences, user invitation tokens |
| [`webapis.md`](webapis.md) | Custom WebAPI definition CRUD, WebAPI export |
| [`webhooks.md`](webhooks.md) | Webhooks (external POSTers) CRUD and webhook jobs |

## Cross-cutting rules that every Core API caller must know

- **Authentication.** Basic Auth for Core; OAuth implicit for Integrator. See `api/authentication`.
- **`include` parameter.** Most GETs return minimal payloads — add `include=details`, `include=values`, `include=attributes`, etc. to get useful data. See `concepts/api-basics`.
- **KQL.** Submission search uses `q=` with Kinetic Query Language. Range operators require `orderBy`. See `concepts/kql-and-indexing`.
- **Pagination.** Core uses `pageToken` (forward-only cursor); 1000-record hard cap. See `concepts/pagination`.
- **Submission `coreState`.** One-way state machine: `Draft → Submitted → Closed`. Closed records are NOT write-locked — see `concepts/architectural-patterns` "Closure Is Not a Write Lock."
- **PUT replaces, PATCH partial-updates.** PUT on a kapp's `indexDefinitions` array replaces the entire array. Be careful merging GET-then-PUT.
- **There is no `POST /submissions/{id}/submit`.** To transition Draft → Submitted, PUT the submission with `{ "coreState": "Submitted" }`.

## When to read which skill

- **"What endpoints exist for X?"** → this directory.
- **"What does field Y mean?"** → `concepts/api-basics` or the resource's concept skill (e.g., `concepts/form-engine` for form schema).
- **"Why am I getting error Z?"** → `platform/troubleshooting` and `platform/known-bugs`.
- **"How do I structure my call to do W?"** → the relevant recipe (`recipes/*`).
