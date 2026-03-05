---
name: kql-and-indexing
description: Kinetic Query Language (KQL) operators, form index definitions, compound indexes, and query gotchas for searching Kinetic Platform submissions.
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

## KQL Operators to Avoid in Paged UI
- `!=` is a **range operator** requiring `orderBy` — use client-side filter instead
- `OR` on different fields is unreliable — use client-side filter or separate queries
- `=*` (starts-with) requires `orderBy` — only use for dedicated search features

## KQL Gotchas Summary

- KQL queries require form index definitions to exist for the fields being searched — **multi-field AND queries require compound (multi-part) indexes**, not just individual field indexes
- **KQL range operators (`=*`, `>`, `<`, `BETWEEN`) require `orderBy`** — see above
- **KQL `!=` is a range operator** — it requires `orderBy`, which forces a sort order incompatible with `pageToken` pagination. For "not equal" filters in paginated UIs, fetch without the filter and apply client-side.
- **KQL equality operators (`=`, `IN`) do NOT need `orderBy`** — always prefer these for filtering
- **KQL `OR` on different fields is unreliable** — `values[A]="x" OR values[B]="y"` may not work as expected. Use separate queries or client-side filtering instead.
