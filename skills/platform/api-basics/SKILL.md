---
name: api-basics
description: Base URLs, authentication, Core API v1 and Task API v2 endpoints, response formats, submission PATCH, submission lifecycle (coreState transitions), bulk operations, and common gotchas for the Kinetic Platform REST API.
---

# Kinetic Core API Basics

## Base URL Patterns

- **Cloud-hosted (kinops):** `https://<space-slug>.kinops.io/app/api/v1`
- **Customer-managed:** `https://<server>[:port]/kinetic/<space-slug>/app/api/v1`
- **Task API (workflows):** `{baseUrl}/app/components/task/app/api/v2`

The Task API lives under a different path (`/app/components/task/app/api/v2`) than the Core API (`/app/api/v1`).

## Authentication

### Core & Task APIs — Basic Auth

- Uses **HTTP Basic Authentication**: `Authorization: Basic <base64(username:password)>`
- Verify auth works with `GET /app/api/v1/me`
- Other methods exist (LDAP, SAML SSO, OAuth) but Basic Auth is the standard for Core and Task REST APIs

### Integrator API — OAuth 2.0 Implicit Grant

The Integrator API (`/app/integrator/api`) does **not** accept Basic Auth. It requires an OAuth 2.0 bearer token obtained via the implicit grant flow:

1. Send a GET request with Basic Auth credentials to the authorize endpoint:
   ```
   GET {server}/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system
   Authorization: Basic <base64(username:password)>
   ```
2. The server responds with a **302/303 redirect**. The `Location` header contains the access token in the URL fragment:
   ```
   Location: ...#access_token=<token>&expires_in=43200&token_type=bearer
   ```
3. Extract `access_token` from the fragment and use it as a Bearer token:
   ```
   Authorization: Bearer <access_token>
   ```

**Key details:**
- Follow the redirect **manually** (`redirect: "manual"` in fetch) — do not let the HTTP client auto-follow
- Default token lifetime is 12 hours (`expires_in=43200`); cache and reuse with a ~30s expiry buffer
- The `client_id=system` is the built-in OAuth client
- The Ruby SDK (`KineticSdk::Integrator`) handles this internally when you pass `oauth_client_id` and `oauth_client_secret` in options

## Base URL Patterns — Integrator API

- **Integrator API:** `{server}/app/integrator/api`
- Endpoints: `/connections`, `/connections/{id}`, `/connections/{id}/operations`
- Requires OAuth bearer token (see Authentication above)

## Core API v1 Endpoints

| Resource | Method | Path |
|----------|--------|------|
| Current User | GET | `/app/api/v1/me` |
| Space | GET | `/app/api/v1/space` |
| Kapps List | GET | `/app/api/v1/kapps` |
| Kapp Detail | GET | `/app/api/v1/kapps/{kappSlug}` |
| Users List | GET | `/app/api/v1/users` |
| User Detail | GET | `/app/api/v1/users/{username}` |
| Teams List | GET | `/app/api/v1/teams` |
| Team Detail | GET | `/app/api/v1/teams/{slug}` |
| Forms List | GET | `/app/api/v1/kapps/{kappSlug}/forms` |
| Form Detail | GET | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}` |
| Submissions (by Form) | GET | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions` |
| Submissions (by Kapp) | GET | `/app/api/v1/kapps/{kappSlug}/submissions` |
| Submission Search (POST) | POST | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions-search` |
| Submission Detail | GET | `/app/api/v1/submissions/{submissionId}` |
| Create Submission | POST | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions` |
| Patch New Submission | PATCH | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions` |
| Patch Existing Submission | PATCH | `/app/api/v1/submissions/{submissionId}` |
| Update Submission | PUT | `/app/api/v1/submissions/{submissionId}` |
| Delete Submission | DELETE | `/app/api/v1/submissions/{submissionId}` |

## Submission PATCH (Setting Custom Timestamps)

The PATCH endpoints allow creating or updating submissions **with full control over system timestamps**. Unlike POST (create) or PUT (update), PATCH does **not** trigger field validations, evaluate core state conditions, or execute webhooks.

### PATCH New Submission

```
PATCH /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions
Content-Type: application/json

{
  "values": { "Field Name": "value", ... },
  "coreState": "Submitted",
  "createdAt": "2026-01-15T10:30:00.000Z",
  "submittedAt": "2026-01-15T10:30:00.000Z",
  "closedAt": "2026-01-20T14:00:00.000Z"
}
```

### PATCH Existing Submission

```
PATCH /app/api/v1/submissions/{submissionId}
Content-Type: application/json

{
  "values": { "Status": "Closed" },
  "closedAt": "2026-02-01T09:00:00.000Z"
}
```

### Patchable Fields

| Field | Required | Description |
|-------|----------|-------------|
| `values` | No | Form field values as key-value pairs |
| `coreState` | No | `"Draft"`, `"Submitted"`, or `"Closed"` |
| `createdAt` | No* | ISO 8601 timestamp — when the submission was created |
| `createdBy` | **Yes** | Username of the creator (e.g., `"admin"`) |
| `updatedAt` | **Yes** | ISO 8601 timestamp — last update time |
| `updatedBy` | **Yes** | Username of the last updater |
| `submittedAt` | No* | ISO 8601 timestamp — when the submission was submitted |
| `submittedBy` | Conditional | **Required when `coreState` is `"Submitted"` or `"Closed"`** |
| `closedAt` | No* | ISO 8601 timestamp — when the submission was closed |
| `closedBy` | Conditional | **Required when `coreState` is `"Closed"`** |

*`createdBy`, `updatedAt`, and `updatedBy` are always required. `submittedBy` is required when coreState is `"Submitted"` or `"Closed"`. `closedBy` is required when coreState is `"Closed"`. Omitting required fields returns a 400 error listing all missing fields.

### Key Behaviors

- **No validations**: Required fields, field patterns, etc. are not enforced
- **No webhooks**: No event triggers fire (unlike POST/PUT)
- **No core state evaluation**: State transitions are not validated
- **Ideal for**: data migrations, seeding test data, bulk imports, backfilling historical records

## Task API v2 Endpoints (Workflows)

| Resource | Method | Path |
|----------|--------|------|
| Trees (Workflows) | GET | `/app/components/task/app/api/v2/trees` |
| Tree Detail | GET | `/app/components/task/app/api/v2/trees/{title}` |
| Runs (Tree Executions) | GET | `/app/components/task/app/api/v2/runs` |
| Triggers (Task Steps) | GET | `/app/components/task/app/api/v2/triggers` |
| Trigger by ID | GET | `/app/components/task/app/api/v2/triggers/{id}` |
| Handlers | GET | `/app/components/task/app/api/v2/handlers` |
| Sources | GET | `/app/components/task/app/api/v2/sources` |

## Key Concepts

- **Kapp** = Kinetic Application. A container/folder of forms, workflows, and submissions.
- **Trees** = Top-level workflow definitions triggered by form submissions.
- **Routines** = Reusable workflow logic that can be embedded in multiple trees.
- **Handlers** = Connectors to external systems used in workflows.
- **Sources** = External system configurations for handlers.
- **Runs** = Tree-level execution instances. One run per tree invocation. Contains metadata about which tree ran, sourceId, status.
- **Triggers** = Individual task/node activations within a run. Each step in a tree creates a trigger.
  - **Infrastructure triggers**: Start, Return nodes — no real work performed, `results: {}`
  - **Task triggers**: Handler/routine steps where actual work is done — have `results` with `description`/`status`, `type: "Deferred"`, `action: "Complete"`
  - Use `runId` filter to get all task steps within a specific tree run
  - Use `GET /triggers/{id}` to fetch a single trigger (NOT `?id={id}` — query param is ignored)

## Query Parameters

- `include` - Comma-separated list of additional properties to return (e.g., `details`, `values`, `form`, `form.attributes`)
  - `values` returns form field values but **not** system fields like `createdAt`
  - `details` returns system fields (`createdAt`, `updatedAt`, `closedAt`, etc.)
  - Use `details,values` when you need both
- `limit` - Max results to return (see the Pagination skill for details)
- `pageToken` - For pagination (Core API) — see the Pagination skill
- `offset` - For pagination (Task API)
- `q` - Search using **Kinetic Query Language (KQL)**, similar to SQL WHERE clauses — see the KQL and Indexing skill
  - Example: `values[Status] = "Active"`
  - Example: `coreState = "Submitted"`
  - Example: `createdAt < "2026-02-12T04:03:31.194Z"`
- `coreState` - Filter submissions: `Draft`, `Submitted`, or `Closed`
- `orderBy` - **Only** needed with KQL range operators (`!=`, `=*`, `>`, `<`, `BETWEEN`). Must reference the same field as the range expression. Equality operators (`=`, `IN`) do NOT need `orderBy`. **Note:** `!=` is a range operator despite looking like equality.

### Sorting

- **`direction`** — `ASC` or `DESC` (default `DESC`). Use with `orderBy` to control sort order: `?orderBy=values[Name]&direction=ASC&q=values[Name] >= ""`
- Default sort is `createdAt DESC`

### Query Parameters That Do NOT Exist

The Core API submission endpoints do **not** support the `timeline` parameter. Passing it will cause a **400 error**.

## Response Format

All responses are JSON. Resources are wrapped in a key matching the resource type:
- `{ "kapps": [...] }` for lists
- `{ "kapp": {...} }` for single items
- `{ "submissions": [...], "nextPageToken": "..." }` for submission lists
- `{ "submission": {...} }` for single submission detail
- `{ "trees": [...] }` for workflow lists

### Submission List Response Fields
| Field | Description |
|-------|-------------|
| `submissions` | Array of submission objects |
| `nextPageToken` | Token for next page, or `null` if no more results |
| `count` | Total count (**Task API only** — Core API does not provide this) |

**Note:** Core API does NOT provide a total count. You cannot display "Page 1 of N" or "Showing X of Y" — only "Page N" with Next/Previous buttons.

## `/me` Endpoint Response Shape

The `/me` endpoint returns user properties at the **top level**, not nested under a `user` key:

```json
{
  "username": "second_admin",
  "displayName": null,
  "email": "user@example.com",
  "spaceAdmin": true,
  "enabled": true
}
```

Frontend login code should handle both shapes for safety:
```js
API.displayName = me.displayName || me.username || me.user?.displayName || me.user?.username || fallback;
```

## Submission Update

Two approaches for updating field values:

- **`PUT /submissions/{id}/values`** with `{ "Field": "NewValue" }` — updates only the specified field values. Body is a flat key-value object (NOT wrapped in `{ "values": ... }`). This is the preferred approach for partial field updates.
- **`PUT /submissions/{id}`** with `{ "values": { "Field": "NewValue" } }` — full submission update. Body wraps values under a `values` key. Can also update `coreState` and other submission-level properties.

Both are partial — only included fields change; omitted fields are untouched.

## Submission Lifecycle (coreState)

Submissions move through three states: **Draft** → **Submitted** → **Closed**. Understanding these transitions is critical for workflows, queries, and data management.

### States

| State | Meaning | Editable? | Triggers Workflow? |
|-------|---------|-----------|-------------------|
| **Draft** | Incomplete, may have missing required fields | Yes | "Submission Created" (on initial POST) |
| **Submitted** | Complete, ready for processing | Yes | "Submission Submitted" (on Draft→Submitted transition) |
| **Closed** | Finalized | **No** — locked from further edits | "Submission Closed" |

### Transitions

| Transition | How | Notes |
|-----------|-----|-------|
| Create as Draft | `POST .../submissions` with `{values:{...}}` | Default — no `coreState` needed |
| Create as Submitted | `POST .../submissions` with `{values:{...}, coreState:"Submitted"}` | Fires "Submission Created", NOT "Submission Submitted" |
| Draft → Submitted | `PUT /submissions/{id}` with `{coreState:"Submitted"}` | Auto-sets `submittedAt`/`submittedBy` |
| Submitted → Closed | `PUT /submissions/{id}` with `{coreState:"Closed"}` | Auto-sets `closedAt`/`closedBy`, locked from further edits |
| Draft → Closed | `PUT /submissions/{id}` with `{coreState:"Closed"}` | Skips Submitted; auto-sets `submittedAt` to match `closedAt` |

### Common Patterns

- **Lookup/reference tables** — stay Submitted forever (never close)
- **Tickets/requests** — normal lifecycle: Draft → Submitted → (workflow processes) → Closed
- **Approvals** — created as Draft by workflow, submitted by approver, closed after decision
- **Filter by state** — `?coreState=Submitted` query param (no KQL needed) or KQL `coreState="Submitted"` (needs coreState index)

### Important

- **Only spaceAdmin users can set `coreState` via the API.** Regular users receive `403: "Only space admins can change the core state of a submission"` when passing `coreState` in the request body. Regular users submit through the form page flow, which manages the lifecycle automatically. To create submissions as a regular user, omit `coreState` entirely — just send `{values:{...}}`.
- **`POST /submissions/{id}/submit` does NOT exist** (404) — use `PUT /submissions/{id}` with `{coreState:"Submitted"}` instead
- Creating with `coreState:"Submitted"` fires "Submission Created" — NOT "Submission Submitted". The "Submitted" event only fires on the explicit Draft→Submitted transition.

---

## No Batch Delete API

The platform only supports `DELETE /submissions/{id}` — one submission at a time. There is no bulk/batch delete endpoint.

For bulk deletes, use parallel requests:

```js
// Delete in batches of 10 concurrent requests (~10x faster than sequential)
for (let i = 0; i < ids.length; i += 10) {
  const batch = ids.slice(i, i + 10);
  await Promise.all(batch.map(id =>
    fetch(`/submissions/${id}`, { method: 'DELETE', headers: authHeaders })
  ));
}
```

---

## Uniqueness Violations Return 400

Both Core API (webApis) and Task API (trees) return HTTP **400** (not 409) for duplicate names:

```json
{"errorKey": "uniqueness_violation"}
```

When checking for duplicates programmatically, check both status codes:
```js
if (e.status === 400 && e.message?.includes('uniqueness_violation')) {
  // Already exists — handle accordingly
}
```

---

## Form and Submission Gotchas

### Field Must Exist on Form

Submitting a value for a field that is not defined on the form returns a **500 error**:

```
Error: The "Keywords" field is not defined on the "second > Knowledge Management > Articles" form.
```

Always verify form field names with `GET /kapps/{kapp}/forms/{form}?include=fields` before bulk-creating submissions.

### Bulk Submission Performance

When creating many submissions programmatically:
- **Concurrency of 15** works well — yields ~28 records/second
- Higher concurrency may trigger rate limits or licensing restrictions
- Licensing restrictions return: `400: "The application was temporarily stopped due to licensing restrictions"`
- The application auto-restarts from the admin console when this happens
- **Active trees fire on submission creation** — if a tree is bound to "Submission Created" events, bulk-creating submissions also generates bulk workflow runs

## General Gotchas

- **`include=values` does NOT return `createdAt`** — you must use `include=details` or `include=details,values` to get system timestamp fields
- **Task API `include=details` is required for run IDs** — without it, `id`, `createdAt`, etc. are completely absent from run objects
- Tree names/titles are used as identifiers in URLs, not slugs
- Submission search via POST exists for when query strings get too long
- The `include` parameter is important — without it, responses may be minimal
- **Do NOT pass `timeline` query parameter** — it doesn't exist in the Core API and will cause 400 errors
- **`direction` IS supported** — `ASC` or `DESC`, use with `orderBy` to control sort order
- **Never table-scan large forms** — always use KQL `values[Field] = "value"` or `IN ()` queries; forms may have millions of records
- **Submitting values for undefined fields returns 500** — verify field names first
- **Bulk submission creation triggers active workflows** — plan for this if trees are bound to submission events
- **`/me` response is flat** — properties are at top level (`me.username`), NOT nested under `me.user`
- **Seed data values may differ from plan labels** — always verify actual field values (e.g., "Prod" vs "Production") before hardcoding dropdown options or CSS class names
- **`POST /submissions/{id}/submit` does NOT exist** — returns 404. To submit a Draft, use `PUT /submissions/{id}` with `{ "coreState": "Submitted" }`

## Finding Workflows for a Kapp/Form

The Task API `/trees` endpoint's `source` parameter filters by `sourceName`, NOT by kapp slug. All kapp/form/space-bound trees have `sourceName: "Kinetic Request CE"`. **Do NOT use `source={kappSlug}`** — it will return zero results.

### Tree binding model

| `platformItemType` | Scope | `sourceGroup` format | How to identify |
|---------------------|-------|----------------------|-----------------|
| `Space` | All kapps | Random UUID v4 | `platformItemId` = space UUID |
| `Kapp` | All forms in a kapp | Random UUID v4 | `platformItemId` = kapp UUID |
| `Form` | Single form | Random UUID v4 | `platformItemId` = form UUID |
| `null` | WebAPI | `"WebApis > {kapp-slug}"` | Match kapp slug in `sourceGroup` |

### The UUID mapping problem

The Core REST API v1 does **not** expose internal UUIDs for kapps or forms. The `platformItemId` on trees is a UUID v1 (time-based) that encodes the entity's creation timestamp.

**Solution: match by timestamp.**

```javascript
function uuidV1ToMs(uuid) {
  const p = uuid.split('-');
  if (p[2]?.[0] !== '1') return 0; // not UUID v1
  const timeHex = p[2].slice(1) + p[1] + p[0];
  const ts = BigInt('0x' + timeHex);
  return Number((ts - 122192928000000000n) / 10000n);
}

function matchEntityByUUID(platformItemId, entities) {
  const targetMs = uuidV1ToMs(platformItemId);
  if (!targetMs) return null;
  for (const e of entities)
    if (Math.abs(targetMs - new Date(e.createdAt).getTime()) < 1000) return e;
  return null;
}
```

### Algorithm to find trees for a kapp

1. Fetch all trees: `GET /trees?source=Kinetic+Request+CE&include=details&limit=500`
2. Fetch all kapps with `include=details` (for `createdAt`)
3. Fetch forms for the target kapp with `include=details`
4. For each tree:
   - **WebAPI:** `sourceGroup` starts with `"WebApis > {kappSlug}"`
   - **Kapp-level:** `platformItemType === "Kapp"` and `matchEntityByUUID(platformItemId, kapps).slug === targetKapp`
   - **Form-level:** `platformItemType === "Form"` and `matchEntityByUUID(platformItemId, forms)` returns a match
