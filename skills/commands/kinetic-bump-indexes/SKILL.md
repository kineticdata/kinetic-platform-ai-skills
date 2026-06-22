---
name: kinetic-bump-indexes
description: Analyze a Kinetic form's KQL queries and recommend the minimum compound indexes needed, then add and build them
argument-hint: "<kapp-slug> <form-slug> [--query \"kql expression\" | --analyze]"
user-invocable: true
---

# Recommend and Build Indexes

The user has a form returning `400` with "requires index definition" errors, or they're auditing a form before going to production. Parse the argument for kapp/form slug and an optional explicit `--query "<kql>"` to plan against, or `--analyze` to read all known query usages from the form's events and integrations.

> **Tooling:** straight Core REST API. See `concepts/kql-and-indexing` for index-definition semantics and the `=*` / range-operator rules that drive what's indexable; see `concepts/kapp-lifecycle` for kapp-level vs form-level indexes.

## Step 0: Read Reference

Read `concepts/kql-and-indexing` first. The recommendations below depend on understanding:

- Range operators (`!=`, `=*`, `<`, `>`, `BETWEEN`) require `orderBy` and need a *single-column* index on that field.
- Equality (`=`, `IN`) needs an index on every column in the query, joined as a compound.
- `AND`-combined predicates need a compound index with the columns in the same order, OR multiple single-column indexes the planner can intersect (intersection isn't always available — assume compound).
- Kapp-level indexes can only reference `coreState`, `createdBy`, `submittedBy`, `closedBy`, `updatedBy`, `handle`, `type`. Never `values[<field>]`.

## Step 1: Inspect the Form

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=fields,indexDefinitions,attributes,attributesMap
```

Capture:

- **Existing `indexDefinitions`** — `name`, `parts[]`, `unique`, `status`.
- **Field list** — to validate that proposed index columns reference real fields.
- **Form attributes** — sometimes a form attribute (`Search Fields`, `Default Sort`) hints at intended query shape.

## Step 2: Gather Queries

Three sources, depending on mode:

### `--query "<kql>"` mode

Use the explicit query the user provided. Single-query analysis.

### `--analyze` mode

Scan the form for likely queries:

- **Form events** — `events[].action` JS code referencing `searchSubmissions`, `K.api`, `bridgedResource`, raw `q=` strings.
- **Form `integrations`** — operations called with `inputMappings` like `q: "values[X] = ..."`.
- **Bound workflows** — `GET /kapps/{kapp}/forms/{form}/workflows`, then inspect each tree's nodes for `kinetic_core_api_v1` or `system_integration_v1` calls with submission-search Operations.
- **Front-end usage** — if a portal codebase is in scope, grep for `searchSubmissions({.*form: '{formSlug}'`.

Each source produces a normalized KQL string. Deduplicate, then plan a single index set that covers all of them.

## Step 3: Decompose Each Query

For each KQL string, identify:

| Element | What to record |
|---|---|
| Equality predicates (`=`, `IN`) | Field names, in the order they appear |
| Range predicates (`!=`, `=*`, `<`, `>`, `BETWEEN`) | The single field; needs `orderBy` |
| AND combinations | Group all AND-ed equalities together; range goes last in the compound |
| OR combinations | OR across the same field uses `IN`; OR across different fields requires TWO indexes and merge in code |
| `orderBy` field | Must be the trailing column of the index when a range operator is used |

Example:

```
values[Status] = "Open" AND values[Priority] IN ("High", "Urgent") AND createdAt > "2026-01-01"
orderBy=createdAt
```

Decomposes to: equality on `values[Status]`, IN on `values[Priority]`, range on `createdAt` (must be `orderBy`-aligned). Compound index needed: `(values[Status], values[Priority], createdAt)`.

## Step 4: Recommend Index Set

Apply these rules in order:

1. **One compound per distinct query shape.** Don't try to over-share; the planner doesn't reuse compounds across queries the way a SQL planner does.
2. **Column order matches query order:** equality columns first, range column last.
3. **Single-column indexes are appropriate** when the query has only one column, or when you want the field accessible in many compound positions and the data is small enough to scan after filter. Default: compound.
4. **Deduplicate exact prefix overlaps.** If you have `(A, B, C)`, you don't need `(A)` or `(A, B)` as separate indexes — the compound's prefix is usable for those queries too. Drop redundant prefixes.
5. **Cap at ~8–10 indexes per form.** Each index costs storage and write amplification. If the recommendation exceeds 10, surface that for the user to decide which queries to drop.

Output the recommendation as a diff against existing indexes:

```
Existing indexes:
  values[Status]                                  Built
  values[Status], values[Category]                Built

Recommended additions:
  + idx_status_priority_created  parts=[values[Status], values[Priority], createdAt]
       unique=false   reason="My Requests query (status + priority + range on createdAt)"
  + idx_assignee                 parts=[values[Assigned Individual]]
       unique=false   reason="Assigned-to-me view"

Recommended removals (redundant prefixes):
  - values[Status]   superseded by values[Status], values[Category]

Proceed? (y/n)
```

## Step 5: PUT the Updated `indexDefinitions`

**Always merge** — PUT replaces the array, so the body needs every existing index PLUS the additions MINUS the removals:

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=indexDefinitions
# Build merged list, then:
PUT /app/api/v1/kapps/{kappSlug}/forms/{formSlug}
{
  "indexDefinitions": [
    /* every kept-or-added index, in canonical order */
  ]
}
```

The PUT lands with new indexes in `status: "New"`. Verify:

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=indexDefinitions
# new indexes appear with status: "New"
```

## Step 6: Build the New Indexes

Trigger a background job for the additions only (existing built indexes don't need rebuilding):

```
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/backgroundJobs
{
  "type": "Build Index",
  "content": {
    "indexes": [
      { "name": "idx_status_priority_created" },
      { "name": "idx_assignee" }
    ]
  }
}
```

Poll the job and the form's `indexDefinitions[].status` until all targets show `"Built"`. Cap the poll at 5 minutes (medium forms build in seconds; very large forms can take longer — surface a warning if you hit the cap rather than looping forever).

## Step 7: Verify with the Original Query

Re-run each input query against the form:

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions?q=<urlencoded>&limit=1
```

Expected: HTTP 200 (even if zero results). HTTP 400 with "requires index definition" means the planner didn't pick up the new index — most often because column order in the compound doesn't match the query, or because the query uses a range operator without `orderBy`.

## Step 8: Report

```
Form: services / maintenance-request
  Existing indexes: 4
  Added:    2 (idx_status_priority_created, idx_assignee)
  Removed:  1 (values[Status] — redundant prefix of compound)
  Built:    2 (avg 1.8s each)

Queries validated:
  ✓ values[Status] = "Open" AND values[Priority] IN (...) AND createdAt > ... orderBy=createdAt
  ✓ values[Assigned Individual] = "username"

Net change: 4 → 5 indexes.
```

## Critical Rules

- **PUT replaces, doesn't merge.** Always GET indexDefinitions, then PUT the full set.
- **New indexes need building.** Definitions are metadata; queries 400 until the `Build Index` job completes.
- **`!=` is a range operator.** Often surprises people. Needs `orderBy` and a single-column index on the target.
- **`=*` is prefix-only.** "Starts with X." No `*X*` substring match.
- **Kapp-level `values[]` indexes don't work.** Anything indexing form field values must be at the form level.
- **Don't index everything.** Each index adds write cost. Audit periodically and remove unused.
- **A new index doesn't backfill until built.** Queries against newly-defined-but-not-built indexes return empty (or 400 — implementation depends on platform version).

## Related

- `commands/kinetic-indexes` — older command focused on listing/auditing indexes; this command extends it with query-driven recommendations.
- `commands/kinetic-kql` — generation-only KQL builder; pair when designing a new query.
- `concepts/kql-and-indexing` — the rules this command applies.
