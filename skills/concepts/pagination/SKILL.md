---
name: pagination
description: Core API pageToken pagination, 1000-record cap, keyset pagination for large datasets, Task API offset pagination, server-side/client-side pagination patterns, golden rule (max 25 client-side), and deletion pagination gotchas.
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

### `pageToken` Is Unreliable For Client-Side Pagination

**`pageToken` does not work reliably for client-side page-by-page navigation.** Passing it back often returns the same data, empty results, or skips records unpredictably.

**For client-side pagination:** Use `nextPageToken` only as a boolean signal (more records exist?). Paginate with keyset cursor (`createdAt`) instead.

**For server-side aggregation (`collectByQuery`):** `pageToken` works adequately within small windows (limit=25, a few pages) because you're collecting all results, not navigating back and forth. Duplication or skips don't matter when you're just accumulating.

### How To Actually Paginate (Keyset / createdAt Cursor)

The correct client-side pagination pattern:

1. Fetch page 1: `?include=details,values&limit=25` (no cursor)
2. Check if `nextPageToken` exists → if yes, there are more pages (show Next button)
3. Store the `createdAt` of the **last record** on the current page
4. For the next page: re-query with `createdAt < "lastTimestamp"` added to KQL
5. For previous pages: store each page's first record's `createdAt` in a stack

**You MUST use `include=details`** (not just `values`) so that `createdAt` is available on each record.

```js
// Correct pagination pattern
let path = `/kapps/${KAPP}/forms/${form}/submissions?include=details,values&limit=25`;
const lastCreatedAt = pageKeys[currentPage];
if (lastCreatedAt) {
  const kql = `createdAt < "${lastCreatedAt}"`;
  path += '&q=' + encodeURIComponent(kql);
}
const res = await api(path);
const subs = res.submissions || [];
const hasNext = !!res.nextPageToken;
if (hasNext && subs.length) {
  pageKeys[currentPage + 1] = subs[subs.length - 1].createdAt;
}
```

**Why this works:** The Core API returns submissions sorted by `createdAt` DESC by default. Each page's last record has the oldest timestamp. Querying `createdAt < lastTimestamp` gives the next window of older records.

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

### Combining KQL Filters with Keyset Pagination

When paginating a filtered query (e.g., all "Open" tickets), combine the KQL filter with the keyset cursor using `AND`:

```
# Page 1 — filter only, no cursor
?q=values[Status]="Open"&orderBy=createdAt&limit=25&include=details,values

# Page 2 — add createdAt cursor from last record of page 1
?q=values[Status]="Open" AND createdAt < "2026-04-09T12:00:00.000Z"&orderBy=createdAt&limit=25&include=details,values
```

**Requirements:**
- The form must have a **compound index** covering both the filter field and `createdAt` (e.g., `[values[Status], createdAt]`), OR separate indexes for each
- `orderBy=createdAt` is required because `createdAt <` is a range operator
- The KQL `AND` combines the filter with the cursor — both must be satisfied

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

For apps displaying paginated lists, use createdAt-based keyset pagination:

```js
// State per tab
let data = [], page = 1, pageKeys = { 1: null }, hasNext = false;

async function loadPage() {
  const lastCreatedAt = pageKeys[page];
  let kql = '';
  if (lastCreatedAt) kql = `createdAt < "${lastCreatedAt}"`;
  // Combine with any active filters
  if (filterKql && kql) kql = `(${filterKql}) AND ${kql}`;
  else if (filterKql) kql = filterKql;

  let path = `/kapps/${KAPP}/forms/${form}/submissions?include=details,values&limit=25`;
  if (kql) path += '&q=' + encodeURIComponent(kql);
  const res = await api(path);
  data = res.submissions || [];
  hasNext = !!res.nextPageToken;
  if (hasNext && data.length) pageKeys[page + 1] = data[data.length - 1].createdAt;
  render();
}

function nextPage() { if (hasNext) { page++; loadPage(); } }
function prevPage() { if (page > 1) { page--; loadPage(); } }
function resetPage() { page = 1; pageKeys = { 1: null }; hasNext = false; loadPage(); }
```

**Key requirements:**
- `include=details,values` (NOT just `values`) — `createdAt` is in `details`
- `nextPageToken` is ONLY used to check if more records exist (boolean)
- Never pass `pageToken` back to the API — it's broken
- Store `createdAt` of last record as the cursor for the next page

## Golden Rule: Max 25 Per Client-Side Fetch

**Never load all records into the browser.** Never use `collectAll()` or loop through pages client-side. Always:

1. Fetch with `limit=25` and `pageToken`
2. Show one page at a time with Prev/Next buttons
3. Let the user paginate forward/backward

Server-side `collectByQuery()` for aggregation (dashboards, KPIs) is fine — the browser makes a single fetch to your server endpoint, and the server handles the pagination internally.

This rule has no exceptions — not even for export or bulk operations. Use `limit=25` with `pageToken`, add delays between pages, and implement backoff on errors.

---

## `collectByQuery` maxPages Performance Trap

Setting `maxPages=40` in server-side aggregation means up to 40 sequential API calls (~500ms each = **20 seconds**). For dashboard endpoints where you know the query scope:

**Better approach: KQL range queries with larger limits**

```js
// BAD: 40 sequential API calls
const all = await collectByQuery('incidents', 'values[Status]="Open"', auth, 40);

// GOOD: 1 API call with date-scoped range query
const kql = `values[Status]="Open" AND values[Created] >= "${startDate}" AND values[Created] < "${endDate}"`;
const r = await kineticRequest('GET',
  `/kapps/${kapp}/forms/incidents/submissions?include=values&limit=200&q=${encodeURIComponent(kql)}&orderBy=values[Created]`,
  null, auth);
```

`limit=200` is valid (hard cap is 1000). Reserve `collectByQuery` with high `maxPages` for truly unbounded aggregation (rollups, backfill).

---

## Deletion Pagination Gotcha

When bulk-deleting records, **do not re-fetch page 1 after each deletion batch**. The API returns records in `createdAt` descending order (newest first). If target records are on later pages, re-fetching page 1 keeps returning the same non-target records.

**Correct approach:** Paginate forward using `pageToken` through all pages, collecting IDs to delete. Then delete in batches. Do multiple full passes until a clean pass finds nothing.

```js
// Paginate forward, collect matching IDs
let pageToken = null;
const toDelete = [];
do {
  let url = `/kapps/${kapp}/forms/${form}/submissions?include=values&limit=25`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  const r = await fetch(url);
  const data = await r.json();
  for (const s of data.submissions) {
    if (shouldDelete(s)) toDelete.push(s.id);
  }
  pageToken = data.nextPageToken;
} while (pageToken);

// Delete in parallel batches of 10
for (let i = 0; i < toDelete.length; i += 10) {
  await Promise.all(toDelete.slice(i, i + 10).map(id => deleteSubmission(id)));
}
```

---

## Pagination Gotchas

- **`pageToken` IS BROKEN** — only use `nextPageToken` as a boolean to know if more records exist. Never pass it back to fetch the next page. Use `createdAt` keyset pagination instead.
- **Core API has a hard 1000-record cap per query** — use keyset pagination with KQL `createdAt` filters to get past it
- **Task API `limit=0` returns ALL records** — use `limit=1` for lightweight count queries
- The Task API has different pagination (limit/offset) vs Core API (limit/pageToken+keyset)
