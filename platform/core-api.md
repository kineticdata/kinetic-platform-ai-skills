# Kinetic Platform API - Lessons Learned

## Base URL Patterns

- **Cloud-hosted (kinops):** `https://<space-slug>.kinops.io/app/api/v1`
- **Customer-managed:** `https://<server>[:port]/kinetic/<space-slug>/app/api/v1`
- **Task API (workflows):** `{baseUrl}/app/components/task/app/api/v2`

The Task API lives under a different path (`/app/components/task/app/api/v2`) than the Core API (`/app/api/v1`).

## Authentication

- Uses **HTTP Basic Authentication**: `Authorization: Basic <base64(username:password)>`
- Verify auth works with `GET /app/api/v1/me`
- Other methods exist (LDAP, SAML SSO, OAuth) but Basic Auth is the standard for REST API

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
| Submit Submission | POST | `/app/api/v1/submissions/{submissionId}/submit` |
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
- `limit` - Max results to return (see pagination section below)
- `pageToken` - For pagination (Core API) — see pagination section
- `offset` - For pagination (Task API)
- `q` - Search using **Kinetic Query Language (KQL)**, similar to SQL WHERE clauses
  - Example: `values[Status] = "Active"`
  - Example: `coreState = "Submitted"`
  - Example: `createdAt < "2026-02-12T04:03:31.194Z"`
- `coreState` - Filter submissions: `Draft`, `Submitted`, or `Closed`
- `orderBy` - **Only** needed with KQL range operators (`!=`, `=*`, `>`, `<`, `BETWEEN`). Must reference the same field as the range expression. Equality operators (`=`, `IN`) do NOT need `orderBy`. **Note:** `!=` is a range operator despite looking like equality — see Gotchas.

### Query Parameters That Do NOT Exist

The Core API submission endpoints do **not** support `timeline` or `direction` parameters. Passing these will cause a **400 error**. Submissions are returned in `createdAt` descending order by default. There is no way to change the sort order except via `orderBy` (which is only valid with range queries).

## Server-Side Pagination Strategy

For apps displaying paginated lists, **always use server-side KQL queries instead of loading all records**:

1. **Initial load**: Fetch page 1 with `limit=25` (no `q` parameter) — fast, no blocking
2. **Filters**: Build KQL with equality operators and re-fetch page 1:
   - `q=values[Status] = "Active"` — no `orderBy` needed
   - `q=values[Status] = "Active" AND values[Category] = "Hardware"` — combine with `AND`
   - `q=values[Status] IN ("Active", "Maintenance")` — multiple values with `IN`
3. **Search**: Use `=*` (starts-with) with `orderBy`:
   - `q=values[Asset Name] =* "laptop"&orderBy=values[Asset Name]`
   - Can combine with equality filters: `q=values[Status] = "Active" AND values[Asset Name] =* "laptop"&orderBy=values[Asset Name]`
4. **Pagination**: Use `pageToken` from response to fetch next page
5. **Aggregates/dashboards**: Lazy-load the full dataset only when the user navigates to a tab that needs it

## Core API Pagination (Critical)

The Core API submission endpoints have a **hard cap of 1000 total results per query**, regardless of how you paginate within that query. Understanding this is essential for retrieving large datasets.

### How `pageToken` Works

When a query returns results, the response may include a `nextPageToken` field. This token signals that **more records exist within the current query's 1000-record window**. You pass it back on the next request to get the next page of results within that window.

- Token format: `<queryId>.<offset>` (e.g., `674018a0-07cd-11f1-8941-d708bf046e91.500`)
- Pass it via `&pageToken=<token>` to get the next page
- When `nextPageToken` is `null`, there are no more results **in this query window**

### The 1000-Record Cap

Even with `pageToken` pagination, the API will **never return more than 1000 total records per query**. For example:
- `limit=500` → Page 1: 500 results + token → Page 2: 500 results + null token → **Done at 1000**
- `limit=1000` → Page 1: 1000 results + null token → **Done at 1000**

If a form has more than 1000 submissions, the API silently stops at 1000 without any indication that more records exist.

### Keyset Pagination (Getting Past 1000)

To retrieve all records from a form with >1000 submissions, use **keyset pagination** by shifting the query window with KQL:

1. **Fetch the first window** (no KQL filter): get up to 1000 records using `pageToken` paging
2. **Note the `createdAt` of the last record** (results are sorted by `createdAt` DESC, so the last record has the oldest timestamp)
3. **Re-query with** `q=createdAt < "lastTimestamp"`: this gives a fresh 1000-record window starting from before that timestamp
4. **Repeat** until a batch returns fewer than 1000 new records

```
Window 1:  ?include=details,values&limit=500          → 500 records
           ?...&limit=500&pageToken=<token>            → 500 records (1000 total)
           Last record createdAt = "2026-02-12T04:03:31.194Z"

Window 2:  ?...&limit=500&q=createdAt < "2026-02-12T04:03:31.194Z"  → 500 records
           ?...&limit=500&pageToken=<token>&q=...                    → 500 records (1000 total)
           Last record createdAt = "2026-02-12T04:03:21.964Z"

Window 3:  ?...&limit=500&q=createdAt < "2026-02-12T04:03:21.964Z"  → 214 records
           nextPageToken = null, batch < 1000 → DONE
```

### Important Notes

- **Use `include=details,values`** (not just `values`) so that `createdAt` is available for keyset pagination
- **Use strict `<`** (not `<=`) to avoid re-fetching boundary records; millisecond-precision timestamps are generally unique enough for non-overlapping windows
- **Deduplicate by `id`** as a safety measure in case records share the exact same `createdAt` timestamp (common with bulk-created data)
- **Use `limit=500`** (not 1000) for the per-page size so `pageToken` works within each window — requesting `limit=1000` returns the full cap in one shot with no token
- The Task API (`/app/components/task/app/api/v2/`) uses standard `limit`/`offset` pagination and does **not** have this 1000-record cap behavior

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

## KQL (Kinetic Query Language) — Lessons Learned

### Range Operators Require `orderBy`

The `=*` (starts-with), `BETWEEN`, `>`, `>=`, `<`, `<=` operators are classified as **range expressions**. When using any of these in the `q` parameter, you **must** also provide an `orderBy` parameter referencing the same field.

```
# FAILS with 400 error:
GET /submissions?q=values[Full Name] =* "John"

# WORKS:
GET /submissions?q=values[Full Name] =* "John"&orderBy=values[Full Name]
```

Error message: `"When executing a search query that includes a range expression... the 'orderBy' parameter must be specified and include the field referenced by the range expression."`

### OR with Multiple Range Fields

Combining range operators on **different fields** with `OR` is problematic because `orderBy` can only reference one field. Use separate queries instead:

```
# BAD — can't orderBy two different fields:
q=values[Full Name] =* "John" OR values[Email] =* "John"

# GOOD — two separate queries:
Query 1: q=values[Full Name] =* "John"&orderBy=values[Full Name]
Query 2: q=values[Email] =* "John"&orderBy=values[Email]
```

### Equality Operators Don't Need `orderBy`

Standard equality (`=`, `IN`) does NOT require `orderBy`:

```
# Works without orderBy:
q=values[Category]="Hardware"
q=values[Status] IN ("New", "Open")
```

**Warning:** `!=` looks like equality but is classified as a **range operator** by Kinetic. It requires `orderBy` and disrupts `pageToken` pagination. For "not equal" filters in paginated UIs, omit it from KQL and filter client-side.

## Form Index Definitions (Critical for KQL)

**KQL queries will NOT work without index definitions** on the form. Even simple equality queries like `values[Status] = "Active"` return a 400 error if the field lacks an index. The error message is explicit: `"The query requires one of the following index definitions to exist: values[Status]"`.

### Viewing Current Indexes

```
GET /kapps/{kapp}/forms/{form}?include=indexDefinitions
```

Returns `indexDefinitions` array with `name`, `parts`, `status` ("New" or "Built"), `unique`.

### Adding Index Definitions

```
PUT /kapps/{kapp}/forms/{form}
Content-Type: application/json

{
  "indexDefinitions": [
    {"name": "idx_status", "parts": ["values[Status]"], "unique": false},
    {"name": "idx_category", "parts": ["values[Category]"], "unique": false}
  ]
}
```

**IMPORTANT:** The PUT replaces ALL index definitions. Always include the existing system indexes (`closedBy`, `createdBy`, `handle`, `submittedBy`, `updatedBy`) alongside your new ones, or they will be removed.

### Compound (Multi-Part) Indexes

When a KQL query uses `AND` to combine multiple fields (e.g., `values[Status] = "Active" AND values[Category] = "Hardware"`), Kinetic requires a **compound index** covering those fields together. Single-field indexes are NOT sufficient for multi-field AND queries.

The error message is explicit: `"The query requires one of the following index definitions to exist: values[Category],values[Status] values[Status],values[Category]"`

Create compound indexes by putting multiple fields in the `parts` array:

```json
{
  "indexDefinitions": [
    {"name": "idx_status", "parts": ["values[Status]"], "unique": false},
    {"name": "idx_category", "parts": ["values[Category]"], "unique": false},
    {"name": "idx_status_category", "parts": ["values[Status]", "values[Category]"], "unique": false}
  ]
}
```

**Note:** Kinetic auto-names compound indexes by joining parts with commas (e.g., `values[Status],values[Category]`), regardless of the `name` you provide. The `name` field is ignored for compound indexes.

For N filterable fields, you need indexes for all combinations used in queries:
- 2 fields combined: `[A,B]`
- 3 fields combined: `[A,B]`, `[A,C]`, `[B,C]`, `[A,B,C]`

Build compound indexes the same way as single-field indexes — reference them by their auto-generated name in the backgroundJobs call:

```json
{
  "type": "Build Index",
  "content": {
    "indexes": ["values[Status],values[Category]", "values[Status],values[Asset Name]"]
  }
}
```

### Building Indexes

New indexes have status `"New"` and return **empty results** (not errors) until built. Trigger the build with:

```
POST /kapps/{kapp}/forms/{form}/backgroundJobs
Content-Type: application/json

{
  "type": "Build Index",
  "content": {
    "indexes": ["values[Status]", "values[Category]", "values[Asset Name]"]
  }
}
```

Valid job types: `"Build Index"`, `"Cleanup Index"`, `"Populate Index"`, `"Reindex System"`.

Poll the form's `indexDefinitions` until all statuses change from `"New"` to `"Built"`. With 1000 records this takes ~5 seconds.

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

### Submission Update

Two approaches for updating field values:

- **`PUT /submissions/{id}/values`** with `{ "Field": "NewValue" }` — updates only the specified field values. Body is a flat key-value object (NOT wrapped in `{ "values": ... }`). This is the preferred approach for partial field updates.
- **`PUT /submissions/{id}`** with `{ "values": { "Field": "NewValue" } }` — full submission update. Body wraps values under a `values` key. Can also update `coreState` and other submission-level properties.

Both are partial — only included fields change; omitted fields are untouched.

## Task API v2 — Query Parameters & Filtering

The Task API runs endpoint (`GET /runs`) supports these server-side filter parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `limit` | Max results per page (default 100) | `limit=25` |
| `offset` | Skip N records for pagination | `offset=25` |
| `include` | Additional properties to return | `include=details` |
| `tree` | Filter by tree name (short name, not full title) | `tree=test1` |
| `source` | Filter by source name | `source=Kinetic+Request+CE` |
| `start` | Filter runs created on or after this date (ISO 8601) | `start=2026-02-12T00:00:00Z` |
| `end` | Filter runs created before this date (ISO 8601) | `end=2026-02-13T00:00:00Z` |

### Task API `include=details` (Critical)

**The Task API `include=details` parameter is essential.** Without it, run objects are missing key fields:

- **Without `include=details`**: Only returns `status`, `sourceId`, `tree` (partial), `source` (partial)
- **With `include=details`**: Also returns `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`

The `id` field is **completely absent** (not null) without `include=details`. This means you cannot identify, sort, or drill into individual runs without it. **Always use `include=details` when fetching runs.**

### Task API `count` Field

Every list response from the Task API includes a `count` field with the **total matching record count**, regardless of `limit`. This is useful for:
- Showing "Showing 1–25 of 2,689" without loading all data
- Getting record counts without fetching records (use `limit=1` — see below)

### Lightweight Count Queries

To get just the count of matching records without transferring data, use `limit=1`:

```
GET /runs?limit=1&start=2026-02-12T00:00:00Z
→ { "count": 1984, "runs": [{ ... }] }  // count=1984 but only 1 run returned
```

**`limit=0` does NOT work as expected** — it returns ALL matching records instead of zero. Always use `limit=1` for count-only queries.

### Task API vs Core API Pagination

| Feature | Core API (`/app/api/v1/`) | Task API (`/app/components/task/app/api/v2/`) |
|---------|--------------------------|----------------------------------------------|
| Pagination style | `pageToken` (cursor-based) | `offset` (numeric) |
| Hard record cap | 1000 per query window | No cap (offset works fully) |
| Getting past cap | Keyset pagination with KQL `createdAt` filters | Standard offset pagination |
| Count field | Not provided | `count` in every list response |
| `include=details` | Returns system fields on submissions | Returns `id`, timestamps on runs |

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

## Server-Side Aggregation Pattern

When dashboards or reports need metrics computed across multiple forms (counts, averages, cross-entity joins), don't load everything into the browser. Instead, create server-side endpoints that page through the Kinetic API internally:

```js
async function collectByQuery(formSlug, kql, auth, maxPages = 8) {
  const all = [];
  let pageToken = null;
  for (let i = 0; i < maxPages; i++) {
    let url = `/kapps/${KAPP}/forms/${formSlug}/submissions?include=values&limit=25`;
    if (kql) url += `&q=${encodeURIComponent(kql)}`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const r = await kineticRequest("GET", url, null, auth);
    const subs = r.data?.submissions || [];
    all.push(...subs);
    pageToken = r.data?.nextPageToken;
    if (!pageToken || subs.length < 25) break;
  }
  return all;
}
```

Use cases:
- **Dashboard KPIs:** collect open incidents + alerts + vulns, compute SLA breaches / severity counts / MTTC server-side
- **Report metrics:** MTTA, MTTC, MTTR from incident timestamps; vuln aging buckets from First Seen dates
- **Computed filters:** SLA-at-risk (check multiple boolean + date fields), overdue vulns (Due Date < now) — fields that lack indexes and can't be KQL-queried

The server returns pre-computed JSON; the frontend makes a single fetch per dashboard load.

## Client-Side Pagination Pattern

For apps displaying paginated lists, use the PAGER infrastructure:

```js
function makePager() {
  return { items: [], pageTokens: [null], pageIndex: 0,
           nextPageToken: null, hasNext: false, hasPrev: false };
}
```

Each tab follows: **load → applyFilters(direction) → render**
- `'reset'` — new query, go to page 1
- `'next'` / `'prev'` — navigate using stored pageToken stack
- omitted — re-fetch current page (after write actions)

### KQL + Client Filter Strategy

Only combine fields in KQL `AND` if a compound index exists. Extra filters become client-side filters on the 25 returned items:

```js
function buildAlertKql() {
  // Use compound [Status,Severity] index
  if (subtab === 'triage' && filters.severity) {
    return { kql: 'values[Status]="New" AND values[Severity]="' + filters.severity + '"', cf: {} };
  }
  // No compound index for Status+Source+Category — push extras to client filter
  if (subtab === 'triage' && filters.source) {
    return { kql: 'values[Status]="New"', cf: { Source: filters.source } };
  }
}
```

### KQL Operators to Avoid in Paged UI
- `!=` is a **range operator** requiring `orderBy` — use client-side filter instead
- `OR` on different fields is unreliable — use client-side filter or separate queries
- `=*` (starts-with) requires `orderBy` — only use for dedicated search features

## Gotchas

- **Core API has a hard 1000-record cap per query** — `pageToken` only paginates within that cap; use keyset pagination with KQL `createdAt` filters to get past it (see pagination section above)
- **`include=values` does NOT return `createdAt`** — you must use `include=details` or `include=details,values` to get system timestamp fields
- **Task API `include=details` is required for run IDs** — without it, `id`, `createdAt`, etc. are completely absent from run objects
- **Task API `limit=0` returns ALL records** — use `limit=1` for lightweight count queries
- The Task API has different pagination (limit/offset) vs Core API (limit/pageToken+keyset)
- Tree names/titles are used as identifiers in URLs, not slugs
- Submission search via POST exists for when query strings get too long
- The `include` parameter is important — without it, responses may be minimal
- KQL queries require form index definitions to exist for the fields being searched — **multi-field AND queries require compound (multi-part) indexes**, not just individual field indexes
- **KQL range operators (`=*`, `>`, `<`, `BETWEEN`) require `orderBy`** — see KQL section above
- **KQL `!=` is a range operator** — it requires `orderBy`, which forces a sort order incompatible with `pageToken` pagination. For "not equal" filters in paginated UIs, fetch without the filter and apply client-side.
- **KQL equality operators (`=`, `IN`) do NOT need `orderBy`** — always prefer these for filtering
- **KQL `OR` on different fields is unreliable** — `values[A]="x" OR values[B]="y"` may not work as expected. Use separate queries or client-side filtering instead.
- **Do NOT pass `timeline` or `direction` query parameters** — they don't exist in the Core API and will cause 400 errors
- **Never table-scan large forms** — always use KQL `values[Field] = "value"` or `IN ()` queries; forms may have millions of records
- **Submitting values for undefined fields returns 500** — verify field names first
- **Bulk submission creation triggers active workflows** — plan for this if trees are bound to submission events
- **`/me` response is flat** — properties are at top level (`me.username`), NOT nested under `me.user`
- **Seed data values may differ from plan labels** — always verify actual field values (e.g., "Prod" vs "Production") before hardcoding dropdown options or CSS class names

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
