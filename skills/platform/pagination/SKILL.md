---
name: pagination
description: Core API pageToken pagination, 1000-record cap, keyset pagination for large datasets, Task API offset pagination, and server-side/client-side pagination patterns.
---

# Pagination

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

## Pagination Gotchas

- **Core API has a hard 1000-record cap per query** — `pageToken` only paginates within that cap; use keyset pagination with KQL `createdAt` filters to get past it
- **Task API `limit=0` returns ALL records** — use `limit=1` for lightweight count queries
- The Task API has different pagination (limit/offset) vs Core API (limit/pageToken+keyset)
