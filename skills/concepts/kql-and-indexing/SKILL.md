---
name: kql-and-indexing
description: Kinetic Query Language (KQL) operators, form index definitions, compound indexes, range queries with compound indexes, and query gotchas for searching Kinetic Platform submissions.
---

# KQL and Indexing

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

### Querying Null Values

Use the literal `null` (unquoted) to match fields with no value:

```
# Find unassigned submissions:
q=values[Assigned To] = null

# Combine with other filters:
q=values[Status] = "Open" AND values[Assigned To] = null
```

`null` is a first-class expression symbol in KQL — it is not a string. This requires an index that covers the field being tested.

## Kapp-Level Queries: Kapp Fields and Kapp Indexes (Critical)

**Kapp-wide searches** (searching across all forms in a kapp without specifying a `form` slug) require **Kapp Fields** and **Kapp-level index definitions** — form-level indexes alone are NOT sufficient.

### How Kapp Fields Work

A "Kapp Field" declares a field name at the kapp level. When a form in the kapp has a field with the same name and type, that form is **automatically opted in** to the kapp index. This is what enables kapp-wide queries like `type IN ['Approval','Task'] AND values[Assigned Individual] = "user"`.

Without kapp fields, the query fails with: `"The query included one or more unexpected parts: values[Assigned Individual]"`

### Setting Up Kapp Fields

Create kapp fields via `PUT /kapps/{kappSlug}` with a `fields` array:

```
PUT /kapps/{kappSlug}
Content-Type: application/json

{
  "fields": [
    {"name": "Assigned Individual", "renderType": "text"},
    {"name": "Assigned Team", "renderType": "text"},
    {"name": "Requested For", "renderType": "text"}
  ]
}
```

Verify with: `GET /kapps/{kappSlug}?include=fields,indexDefinitions`

**IMPORTANT:** The PUT replaces ALL kapp fields. Always include existing fields alongside new ones.

### Setting Up Kapp-Level Index Definitions

After creating kapp fields, create kapp-level indexes (also via `PUT /kapps/{kappSlug}`):

```
PUT /kapps/{kappSlug}
Content-Type: application/json

{
  "indexDefinitions": [
    {"name": "type,values[Assigned Individual]", "parts": ["type", "values[Assigned Individual]"], "unique": false},
    {"name": "type,values[Assigned Team]", "parts": ["type", "values[Assigned Team]"], "unique": false},
    {"name": "type,coreState,values[Assigned Individual]", "parts": ["type", "coreState", "values[Assigned Individual]"], "unique": false},
    {"name": "type,coreState,values[Assigned Team]", "parts": ["type", "coreState", "values[Assigned Team]"], "unique": false}
  ]
}
```

**IMPORTANT:** The PUT replaces ALL kapp index definitions. Always include existing indexes alongside new ones.

### Building Kapp-Level Indexes

New kapp indexes have status `"New"` and return empty results until built. Trigger the build at the **kapp** level (not form level):

```
POST /kapps/{kappSlug}/backgroundJobs
Content-Type: application/json

{
  "type": "Build Index",
  "content": {
    "indexes": [
      "type,values[Assigned Individual]",
      "type,values[Assigned Team]",
      "type,coreState,values[Assigned Individual]",
      "type,coreState,values[Assigned Team]"
    ]
  }
}
```

Poll `GET /kapps/{kappSlug}?include=indexDefinitions` until all statuses are `"Built"`.

### Standard Kapp Index Pattern

For assignment-based kapp-wide queries (commonly used in self-service use cases where there are multiple forms that represent different types of requests), the proven index set is:

| Index | Used for |
|-------|----------|
| `type,values[Assigned Individual]` | Assignment filter without coreState |
| `type,values[Assigned Team]` | Team filter without coreState |
| `type,coreState,values[Assigned Individual]` | Assignment filter with status filter |
| `type,coreState,values[Assigned Team]` | Team filter with status filter |
| `type,coreState,submittedBy,createdBy,values[Requested For]` | Requester filter with status |
| `type,values[Requested For]` | Requester filter without status |

---

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

### Range Queries with Compound Indexes

Compound indexes support mixed equality + range queries. The leading field(s) use equality, and the **trailing field** can use a range operator with `orderBy`:

```
# Compound index: [values[Status], values[Created]]
# Equality on leading field, range on trailing field

q=values[Status]="Open" AND values[Created] >= "2026-03-01" AND values[Created] < "2026-03-15"
  &orderBy=values[Created]
  &limit=200
```

This reduces dashboard queries from many paginated calls to a **single API call**. For example, instead of using `collectByQuery` with `maxPages=40` (~20 seconds), a scoped range query with `limit=200` returns results in one round-trip.

**Rules:**
- Equality conditions must be on the **leading** index parts
- Range condition must be on the **trailing** index part
- `orderBy` must reference the range field
- Works with `>=`, `<`, `>`, `<=`, `BETWEEN`, `=*`

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

**Kapp-level indexes also need building.** The same backgroundJobs pattern works at the kapp level:

```
POST /kapps/{kapp}/backgroundJobs
Content-Type: application/json

{
  "type": "Build Index",
  "content": {
    "indexes": ["type", "coreState", "submittedBy"]
  }
}
```

Kapp-level indexes start as `"New"` and return **400 errors** (not empty results) when queried before building: `"The query requires that one or more of the following index definitions must be built"`. Always build kapp-level indexes after creating them.

## Kapp-Wide Searching (Cross-Form Queries)

When you omit the `form` parameter from a `searchSubmissions` call, the platform searches **all forms in the kapp**. This enables querying across multiple forms of the same type (e.g., all `Event Sign Up` forms).

Index definitions exist at **two levels**:

1. **Form-level indexes** — search within a single form: `GET /kapps/{kapp}/forms/{form}/submissions?q=...`
2. **Kapp-level indexes** — search across ALL forms in a kapp: `GET /kapps/{kapp}/submissions?q=...`

Kapp-level indexes enable cross-form queries. If multiple forms share a field name (e.g., "Status", "Requested By"), the kapp-level index covers submissions from ALL forms that have that field.

### How Kapp-Wide Opt-In Works

Forms automatically participate in kapp-wide searches when:
1. A **kapp-level field** with the same `name` and `renderType` exists on the kapp
2. The form has a field with that same name and field type (text, checkbox, etc.)

If the kapp field doesn't exist, kapp-wide queries on `values[FieldName]` will fail or return no results.

### Kapp-Level Fields

Kapp-level fields are defined on the kapp itself (not on a form type). Retrieve them with:

```
GET /kapps/{kappSlug}?include=fields,indexDefinitions
```

Returns `fields` (array of `{ name, renderType }`) and `indexDefinitions` (same shape as form-level).

Add a new kapp field by including the full fields array in a PUT:

```
PUT /kapps/{kappSlug}
Content-Type: application/json

{
  "fields": [
    { "name": "Existing Field", "renderType": "text" },
    { "name": "New Field", "renderType": "text" }
  ]
}
```

**IMPORTANT:** Like form indexes, the PUT replaces all fields. Always include the existing fields alongside new ones.

Available `renderType` values match form field types: `text`, `checkbox`, `dropdown`, `date`, etc.

### Kapp-Level Index Definitions

Kapp-wide queries also require **kapp-level compound indexes** — the same principle as form-level indexes but defined on the kapp. The `type` system property (form type name) is almost always the first part, since kapp-wide searches are typically scoped to a form type.

Add indexes via the same PUT:

```
PUT /kapps/{kappSlug}
Content-Type: application/json

{
  "indexDefinitions": [
    { "name": "type,values[Event ID]", "parts": ["type", "values[Event ID]"], "unique": false }
  ]
}
```

**IMPORTANT:** Always include all existing index definitions in the PUT — it replaces the entire array.

### Triggering a Kapp Index Build

New kapp indexes have status `"New"` and return empty results until built. Unlike form indexes (which use `/forms/{form}/backgroundJobs`), kapp indexes use the **kapp-level** background jobs endpoint:

```
POST /kapps/{kappSlug}/backgroundJobs
Content-Type: application/json

{
  "type": "Build Index",
  "content": {
    "indexes": ["type,values[Event ID]"]
  }
}
```

**Note:** This endpoint is not in the OAS spec but works at runtime. The space-level `GET /backgroundJobs` endpoint does not expose these jobs. Instead, poll the kapp's `indexDefinitions` until status changes from `"New"` to `"Built"`.

### Common Kapp-Level Index Pattern

```json
{
  "indexDefinitions": [
    {"parts": ["type", "coreState", "values[Requested By]"]},
    {"parts": ["type", "coreState", "submittedBy"]},
    {"parts": ["type", "createdBy"]}
  ]
}
```

The `type` part refers to the form's `type` property (e.g., "Service", "Approval", "Task"). Combined with `coreState`, this lets you query: "show me all Service submissions in Submitted state where Requested By = john.doe" — across every form in the kapp.

### Cross-Form Search

```bash
# Search across ALL forms in the services kapp
GET /kapps/services/submissions?include=details,values&q=type="Service" AND coreState="Submitted" AND values[Requested By]="john.doe"
```

This is how portals build unified request lists, approval inboxes, and dashboard views that span multiple forms.

### Practical Pattern: Querying by Form Type + Field Value

```js
// KQL: type = 'Event Sign Up' AND values[Event ID] = 'xxx'
const byTypeAndEventId = defineKqlQuery()
  .equals('type', 'formType')
  .equals('values[Event ID]', 'eventId')
  .end();

searchSubmissions({
  kapp: kappSlug,
  // No 'form' — searches all forms in the kapp
  search: {
    q: byTypeAndEventId({ formType: 'Event Sign Up', eventId }),
    include: ['details', 'values'],
    limit: 500,
  },
});
```

This requires:
- A kapp-level field `Event ID` with `renderType: "text"`
- A kapp-level compound index `["type", "values[Event ID]"]` — status `"Built"`
- The `serve-day-sign-up` (or any `Event Sign Up` form) to have an `Event ID` field with `renderType: "text"`

### Kapp-Level Index Gotchas (Critical)

**`values[FieldName]` indexes at the kapp level return "field was not found" via REST API PUT.** Attempting to add kapp-level indexes with `values[FieldName]` parts returns `"The 'FieldName' field was not found"` — even when forms in the kapp have that field defined and built at the form level. This is a confirmed platform limitation.

These indexes CAN exist on kapps (the `services` and `queue` kapps have them), but they were created via **template provisioning/import** (Ruby SDK `import_space`), not via individual REST API calls. This appears to be a platform limitation of the REST API for kapp-level index management. (Note: form-level `values[FieldName]` indexes work perfectly via REST API PUT on individual forms.)

**Workarounds:**
1. Use **system field indexes** at the kapp level — `coreState`, `submittedBy`, `createdBy`, `type` all work via REST API PUT
2. Use **form-level `values[FieldName]` indexes** + individual form queries instead of cross-form queries
3. Use the **Ruby SDK** `import_space` / template provisioning to set up kapp-level value indexes

**`type` field in KQL requires `formTypes` registration.** Even if `type` is indexed and "Built" at the kapp level, KQL queries like `type="Service"` return 0 results unless the kapp has `formTypes` registered:

```json
PUT /kapps/{kapp}
{
  "formTypes": [
    {"name": "Service"},
    {"name": "Approval"},
    {"name": "Task"}
  ]
}
```

After adding `formTypes`, rebuild the `type` index. Only then will `type` KQL queries work.

**Cross-form search without KQL always works.** `GET /kapps/{kapp}/submissions?include=details,values` returns submissions from all forms regardless of indexes — just without KQL filtering.

### When to Use Kapp vs Form Indexes

- **Form-level**: most queries — filtering within a single form; supports `values[FieldName]` via REST API
- **Kapp-level**: unified views — "My Requests" across all form types; limited to system fields via REST API unless provisioned via template import
- Kapp-level indexes have the same compound index rules as form-level

---

## KQL + Client Filter Strategy

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

## KQL Searchable Properties

Beyond `values[Field Name]`, these submission properties can be used in KQL queries:

| Property | Description | Example |
|----------|-------------|---------|
| `values[Field]` | Any form field (requires index) | `values[Status] = "Open"` |
| `closedBy` | Username that closed | `closedBy = "admin"` |
| `coreState` | Draft, Submitted, or Closed | `coreState = "Submitted"` |
| `createdBy` | Username that created | `createdBy = "john.doe"` |
| `handle` | Nearly-unique submission identifier | `handle = "617570"` |
| `sessionToken` | Anonymous submission token | `sessionToken = "abc123"` |
| `submittedBy` | Username that submitted | `submittedBy = "jane.doe"` |
| `type` | Form type (requires kapp formTypes) | `type = "Service"` |
| `updatedBy` | Username that last updated | `updatedBy = "admin"` |

System properties (`closedBy`, `createdBy`, `submittedBy`, `updatedBy`, `handle`) have built-in indexes on every form. Custom `values[Field]` properties require explicit index definitions.

## KQL Operators to Avoid in Paged UI
- `!=` is a **range operator** requiring `orderBy` — use client-side filter instead
- `OR` on different fields is unreliable — use client-side filter or separate queries
- `=*` (starts-with) requires `orderBy` — only use for dedicated search features

## KQL Gotchas Summary

- **Kapp-wide queries require Kapp Fields + Kapp-level indexes** — form-level indexes alone are not enough. Missing kapp fields causes `"The query included one or more unexpected parts: values[...]"`.
- KQL queries require form index definitions to exist for the fields being searched — **multi-field AND queries require compound (multi-part) indexes**, not just individual field indexes
- **KQL range operators (`=*`, `>`, `<`, `BETWEEN`) require `orderBy`** — see above
- **KQL `!=` is a range operator** — it requires `orderBy`, which forces a sort order incompatible with `pageToken` pagination. For "not equal" filters in paginated UIs, fetch without the filter and apply client-side.
- **KQL equality operators (`=`, `IN`) do NOT need `orderBy`** — always prefer these for filtering
- **KQL `OR` on different fields is unreliable** — `values[A]="x" OR values[B]="y"` may not work as expected. Use separate queries or client-side filtering instead.
