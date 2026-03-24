---
name: kinetic-kql
description: Build KQL queries with index awareness for the Kinetic Platform
argument-hint: "<natural language query description>"
user-invocable: true
---

# Build a KQL Query

The user describes a query in natural language. Generate the correct KQL string AND the index definitions required to support it.

## Step 1: Read Reference

Read the **KQL & Indexing** platform skill for the full KQL operator reference, index management, and pagination rules. Also see the **Pagination** platform skill for pagination patterns.

## Step 2: Generate the Query

Translate the user's description into KQL syntax. Output:

1. **The KQL string** — ready to use in `?q=` parameter
2. **Required indexes** — individual and compound index definitions
3. **Warnings** — any pitfalls with the query

### KQL Operator Rules

| Operator | Example | Needs `orderBy`? | Notes |
|---|---|---|---|
| `=` | `values[Status]="Open"` | No | Exact match |
| `IN` | `values[Status] IN ("Open","Pending")` | No | Multi-value match |
| `=*` | `values[Name]=*"john"` | **Yes** | Starts-with / prefix match |
| `>`, `>=`, `<`, `<=` | `values[Date]>="2026-01-01"` | **Yes** | Range query |
| `!=` | `values[Status]!="Closed"` | **Yes** | **WARNING: This is a RANGE operator.** Requires orderBy, breaks pagination. Recommend client-side filtering instead. |

### Combining Conditions

- **AND** — `values[A]="x" AND values[B]="y"` — requires a **compound index** with both fields
- **OR on same field** — `values[Status]="Open" OR values[Status]="Pending"` — use `IN` instead
- **OR across different fields** — **UNRELIABLE.** Use separate queries or client-side filtering.

### Index Requirements

Every `values[FieldName]` in a KQL query **must have a search index** on the form. Without it, the query returns a 400 error.

- Single-field queries need individual indexes: `{"parts":["values[Status]"]}`
- Multi-field AND queries need compound indexes: `{"parts":["values[Status]","values[Priority]"]}`
- Range queries on trailing field of compound index work: `values[A]="x" AND values[B] >= "start"` with `orderBy=values[B]`

**5 system indexes must always be preserved** when updating index definitions:
`closedBy`, `createdBy`, `handle`, `submittedBy`, `updatedBy`

**New indexes return empty results (not errors) until built** — easy to miss! Always build after creating.

## Step 3: Output Format

```
KQL:       values[Status] = "Open" AND values[Priority] = "High"
orderBy:   (none needed)
limit:     25

Required indexes:
  - Compound: {"parts": ["values[Status]", "values[Priority]"]}

Pagination: Use pageToken for next page (max 25 per client fetch).
            Hard cap: 1000 records per query. Use keyset pagination for larger datasets.

Warnings: (any applicable)
```

## Pitfalls to Always Mention

- **1000-record hard cap** per query — use keyset pagination (`pageToken`) to get past it
- **Client-side golden rule:** max 25 records per fetch, show one page at a time with Prev/Next
- **`!=` is a range operator** — avoid it, filter client-side instead
- **New indexes need building** — `POST /forms/{form}/backgroundJobs` then poll until "Built"
- **`OR` across different fields is unreliable** — use separate queries
- **`coreState` filtering** — use `?coreState=Submitted` query param (no KQL needed, no index needed)
