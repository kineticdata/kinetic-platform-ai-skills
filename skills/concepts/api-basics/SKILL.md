---
name: api-basics
description: Base URLs, authentication, Core API v1 and Task API v2 endpoints, response formats, submission PATCH, and common gotchas for the Kinetic Platform REST API.
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

### Additional Core API Resources

| Resource | Method | Path |
|----------|--------|------|
| Create Form | POST | `/app/api/v1/kapps/{kappSlug}/forms` |
| Update Form | PUT | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}` |
| Delete Form | DELETE | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}` |
| Create Kapp | POST | `/app/api/v1/kapps` |
| Update Kapp | PUT | `/app/api/v1/kapps/{kappSlug}` |
| Delete Kapp | DELETE | `/app/api/v1/kapps/{kappSlug}` |
| Create User | POST | `/app/api/v1/users` |
| Update User | PUT | `/app/api/v1/users/{username}` |
| Delete User | DELETE | `/app/api/v1/users/{username}` |
| Create Team | POST | `/app/api/v1/teams` |
| Update Team | PUT | `/app/api/v1/teams/{slug}` |
| Delete Team | DELETE | `/app/api/v1/teams/{slug}` |
| Update Space | PUT | `/app/api/v1/space` |
| Update Profile | PUT | `/app/api/v1/me` |
| Workflows (Form) | GET/POST | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/workflows` |
| Workflow Detail | GET/PUT/DELETE | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/workflows/{id}` |
| WebAPIs | GET/POST | `/app/api/v1/kapps/{kappSlug}/webApis` (or space-level `/app/api/v1/webApis`) |
| Webhooks | GET/POST | `/app/api/v1/kapps/{kappSlug}/webhooks` (or space-level `/app/api/v1/webhooks`) |
| Security Policies | GET/POST | `/app/api/v1/kapps/{kappSlug}/securityPolicyDefinitions` |
| File Resources | GET/POST | `/app/api/v1/fileResources` |
| Version | GET | `/app/api/v1/version` |
| Activity Metrics | GET | `/app/api/v1/activity` |
| Notices | GET | `/app/api/v1/notices` |
| Background Jobs | GET | `/app/api/v1/backgroundJobs` |
| Memberships | POST/DELETE | `/app/api/v1/memberships` |
| User Preferences | GET/POST/DELETE | `/app/api/v1/userPreferences` |
| User Invitation Tokens | GET/POST/DELETE | `/app/api/v1/userInvitationTokens` |
| Translations | GET/POST/PUT/DELETE | `/app/api/v1/translations/*` |
| Attribute Definitions | GET/POST/PUT/DELETE | `/app/api/v1/spaceAttributeDefinitions` (and user/team/form variants) |
| Models (Data Views) | GET/POST/PUT/DELETE | `/app/api/v1/models` |
| Multipart Submission | POST | `/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions-multipart` |

### Data Models

Models define read-only data views backed by bridge adapters. Each model has:
- `name` — display name
- `status` — `"Active"` or `"Inactive"`
- `mappings` — array of bridge mappings with `bridgeSlug`, `structure`, and attribute field expressions
- `qualifications` — named queries with parameters and result type (`"Single"` or `"Multiple"`)

```
GET /app/api/v1/models          # List all models
GET /app/api/v1/models/{name}   # Get model detail
POST /app/api/v1/models         # Create model
PUT /app/api/v1/models/{name}   # Update model
DELETE /app/api/v1/models/{name}# Delete model
```

### Activity Metrics

Returns submission counts by kapp for the space. The response includes two arrays:
- `submissionBreakdown` — total submission counts per kapp (uses kapp `name` as `category`)
- `submissionVolume` — time-series data with per-kapp submission counts by date

```bash
GET /app/api/v1/activity
# Response:
# {
#   "submissionBreakdown": [{ "category": "Services", "value": 1000 }, ...],
#   "submissionVolume": [{ "category": "2026-03-10", "series": "Services", "value": 42 }, ...]
# }
```

### Platform Version

```bash
GET /app/api/v1/version
# Response: { "version": { "version": "6.1.7", "buildDate": "2026-02-12...", "buildNumber": "..." } }
```

### Notices

Platform health notices (e.g., missing routines, configuration issues):

```bash
GET /app/api/v1/notices
# Response: { "notices": [{ "component": "task", "key": "RoutineMissing", "message": "...", "data": {...} }] }
```

---

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

- `include` - Comma-separated list of additional properties to return. Supports **dot notation** for nested includes:
  - `values` — form field values (also returns `closedAt`, `closedBy`, `submittedAt`, `submittedBy`, `type` but NOT `createdAt`)
  - `details` — system fields (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`, etc.)
  - `details,values` — both timestamps and field values
  - `values.raw` — field values keyed by field key (not name), with metadata: `isMalformed`, `isUnexpected`, `name`, `rawValue`, `value`. Useful for debugging, accessing orphaned field values after field deletion, and troubleshooting type mismatches
  - `values[Field Name]` — selective include of specific field values (see below)
  - `activities` — submission activity records
  - `children` — child submissions (for parent-child relationships)
  - `descendants` — all descendant submissions (children, grandchildren, etc.)
  - `origin` — the originating submission (if this is a child)
  - `parent` — the direct parent submission
  - `authorization` — permission check: `{"Access": true, "Modification": true, "Support": true}`
  - `form` — embed the parent form definition inside each submission
  - `form.fields` — embed form definition WITH fields (avoids a separate API call)
  - `form.attributes` — embed form with attributes
  - `forms` — embed all forms when fetching a kapp
  - `forms.fields` — embed forms WITH their fields (one call gets kapp → forms → fields)
  - `forms.details` — embed forms with timestamps (required alongside `forms.fields` to get form metadata)
  - `forms.indexDefinitions` — embed forms with their index definitions
  
  **Selective value includes** — when loading many submissions from forms with lots of fields, request only the fields you need:
  ```
  # Only return Employee Name and Status values (not all 20+ fields):
  GET /kapps/{kapp}/forms/{form}/submissions?include=details,values[Employee Name],values[Status]
  ```
  This dramatically reduces response size for list views. Without this, `include=values` returns ALL field values for every submission.
  
  **Performance tip:** Use nested includes to build UIs with a single API call instead of N+1:
  ```
  # One call to get a kapp with ALL forms, their fields, and index definitions:
  GET /kapps/{slug}?include=details,attributes,forms.details,forms.fields,forms.indexDefinitions
  
  # One call to get submissions with their parent form's fields:
  GET /kapps/{slug}/forms/{form}/submissions?include=details,values,form.fields,form.attributes
  ```
  
  **Gotcha:** Using a nested include like `forms.fields` WITHOUT `forms.details` returns forms with ONLY the nested data — no form name, slug, status, etc. Always pair with `forms.details` when you need form metadata.
- `limit` - Max results to return (see the Pagination skill for details)
- `pageToken` - For pagination (Core API) — see the Pagination skill
- `offset` - For pagination (Task API)
- `q` - Search using **Kinetic Query Language (KQL)**, similar to SQL WHERE clauses — see the KQL and Indexing skill
  - Example: `values[Status] = "Active"`
  - Example: `coreState = "Submitted"`
  - Example: `createdAt < "2026-02-12T04:03:31.194Z"`
- `coreState` - Filter submissions: `Draft`, `Submitted`, or `Closed`
- `orderBy` - **Only** needed with KQL range operators (`!=`, `=*`, `>`, `<`, `BETWEEN`). Must reference the same field as the range expression. Equality operators (`=`, `IN`) do NOT need `orderBy`. **Note:** `!=` is a range operator despite looking like equality.

### Query Parameters That Do NOT Exist

The `direction` parameter controls sort order: `ASC` or `DESC` (default). Submissions are returned in `createdAt` descending order by default. The `direction` parameter works alongside `orderBy` to control sorting.

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

### Submission Object Properties (Always Present)

| Property | Type | Description |
|----------|------|-------------|
| `id` | UUID | Unique submission identifier |
| `handle` | string | Short identifier (last 6 chars of UUID, uppercase). Useful for human-readable references, but NOT guaranteed unique. |
| `coreState` | string | `"Draft"`, `"Submitted"`, or `"Closed"` |
| `currentPage` | string | Name of the page the submission is on (tracks UI progress, not data completeness) |
| `displayedPage` | object | `{index, name, type}` — the page shown to users |
| `label` | string | Auto-generated label (configured via `submissionLabelExpression` on the form) |
| `origin` | UUID or null | ID of the "origin" submission (for copied/cloned submissions) |
| `parent` | UUID or null | ID of the parent submission (for child submissions created by workflows) |
| `sessionToken` | string or null | Token for anonymous submission sessions |
| `type` | string | Form type (e.g., `"Service"`, `"Approval"`) |

Timestamps (`closedAt`, `closedBy`, `submittedAt`, `submittedBy`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`) require `include=details`.

### Error Response Formats

The API returns errors in varying formats depending on the context:

```json
// Most common — simple string error
{"error": "Unable to locate the 'X' kapp"}

// With correlation (server errors)
{"error": "message", "correlationId": "abc-123", "statusCode": 400}

// Uniqueness/validation errors
{"errorKey": "uniqueness_violation", "error": "Team names must be unique..."}
```

Always check for `error` (string) first, then optionally `errorKey` for programmatic handling.

## File Uploads (Multipart Submissions)

To create a submission with file attachments in a single request, use the multipart endpoint:

```
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions-multipart
Content-Type: multipart/form-data
```

The first part named `_submission` contains the JSON body. Subsequent parts contain file attachments:

```javascript
const formData = new FormData();
formData.append("_submission", JSON.stringify({ values: { Summary: "Bug report" } }));
formData.append("Screenshots", fileInput.files[0], "screenshot.png");
```

For updating an existing submission with attachments: `POST /app/api/v1/submissions-multipart/{submissionId}`

## Translations (i18n)

The Translations API manages locale-specific string overrides. Changes are staged then published by clearing the cache.

```bash
GET    /translations/settings/locales           # List enabled locales
POST   /translations/settings/locales           # Enable a locale: { "code": "fr" }
GET    /translations/contexts                    # List translation contexts
POST   /translations/entries                     # Import translations (CSV or JSON)
GET    /translations/entries?context=X&locale=Y  # Export translations
DELETE /translations/cache                       # Publish staged changes
```

Import accepts CSV (`Context,Locale,Key,Value`) or JSON arrays of `{ context, locale, key, value }`.

**Gotcha:** Deleting a context deletes ALL its translation entries. Edits are staged — you must clear the cache (`DELETE /translations/cache`) to publish.

---

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

Use `PUT /submissions/{id}` with `{ "values": { "Field": "NewValue" } }` to update field values. Can also update `coreState` and other submission-level properties in the same call.

Updates are **partial** — only included fields change; omitted fields are untouched.

**Note:** `PUT /submissions/{id}/values` does **NOT** exist (returns 404). Always use the main submission PUT endpoint with a `values` wrapper.

### Core State Transitions

The `coreState` follows a **one-way state machine**: `Draft` → `Submitted` → `Closed`

| Transition | Allowed | Notes |
|------------|---------|-------|
| Draft → Submitted | Yes | Enforces field validation (required, constraints) |
| Draft → Closed | Yes | Skips Submitted state |
| Submitted → Closed | Yes | |
| Closed → Submitted | **No** | Error: "Unable to put a closed submission in the 'Submitted' core state" |
| Closed → Draft | **No** | Same error |
| Submitted → Draft | **No** | Cannot go backwards |
| Create as Draft | Yes | Bypasses ALL validation (required, constraints) |
| Create as Submitted | Yes | Enforces validation |
| Create as Closed | Yes | Skips intermediate states |

Only three valid coreState values: `"Draft"`, `"Submitted"`, `"Closed"`. Custom statuses (Active, Pending, etc.) must be stored in a custom `values[Status]` field, not in `coreState`.

**Why Draft exists:** Draft lets workflows create submissions programmatically without triggering validation. Example: an approval workflow creates a submission with `coreState: "Draft"` pre-filled with the approver and request details. The "Decision" field is required, but since the record is a Draft, validation is skipped. When the approver opens the form and submits their decision, the coreState transitions to "Submitted" and validation fires — ensuring the Decision field is filled in.

Once Submitted, a submission can never return to Draft (only a space admin can do this via PATCH). **Closed** is typically set by workflow to mark a submission as done. Its usage is implementation-specific — some customers archive closed submissions after a retention period.

A space admin can use `PATCH /submissions/{id}` to force any state transition (including backwards), bypassing all validation and state rules. PATCH is the escape hatch for data corrections.

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
- **`direction` parameter** — `ASC` or `DESC` (default) on submission search endpoints. Works with `orderBy`.
- **`timeline` parameter** — only valid on the Task API triggers endpoint, NOT on Core API submission endpoints
- **Never table-scan large forms** — always use KQL `values[Field] = "value"` or `IN ()` queries; forms may have millions of records
- **Submitting values for undefined fields returns 500** — verify field names first
- **Bulk submission creation triggers active workflows** — plan for this if trees are bound to submission events
- **`/me` response is flat** — properties are at top level (`me.username`), NOT nested under `me.user`
- **Seed data values may differ from plan labels** — always verify actual field values (e.g., "Prod" vs "Production") before hardcoding dropdown options or CSS class names
- **`POST /submissions/{id}/submit` does NOT exist** — returns 404. To submit a Draft, use `PUT /submissions/{id}` with `{ "coreState": "Submitted" }`
- **Team slugs are auto-generated hashes** — the `slug` field you provide in team creation is IGNORED. The API generates its own hash slug. Always read the slug from the create response.
- **Dropdown fields need `choicesRunIf: null` AND `choicesResourceName: null`** — and do NOT support the `rows` property. Each renderType has its own required property set.
- **Button elements need `renderAttributes: {}`** — omitting this on submit buttons causes a 400 error
- **New kapp has 0 indexes** — kapp-level indexes must be explicitly created. System indexes (closedBy, createdBy, etc.) only appear on forms.
- **Kapp-level `values[FieldName]` indexes CANNOT be created via REST API** — they return "field was not found" for ANY form field. These only exist on kapps set up via template import. Use system field indexes (`coreState`, `submittedBy`, `type`) for cross-form search via REST API.
- **Kapp `formTypes` must be registered for `type` KQL** — `PUT /kapps/{kapp}` with `{"formTypes": [{"name": "Service"}]}` before `type` indexes return results
- **PUT on submission doesn't return values** — add `?include=values` to the PUT URL to see updated values in the response
- **Form type "Service" is a dependency placeholder** — if submission creation returns `"The 'Service' definition is a dependency placeholder"`, the form type definition is incomplete. Register formTypes on the kapp.
- **Task API sources endpoint returns `sourceRoots`** — not `sources`. The response key is `sourceRoots`, not `sources`.
- **WebAPI invocation URL differs from admin API** — invoke at `/app/kapps/{kapp}/webApis/{slug}`, NOT at `/app/api/v1/kapps/{kapp}/webApis/{slug}`. Pass `?timeout=N` for synchronous response.

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
