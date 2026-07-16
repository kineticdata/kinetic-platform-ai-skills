---
name: pagination
description: The single pattern for paging Core API submissions — limit=25 keyset cursor on createdAt. Golden rule, nextPageToken-as-boolean, Task API offset pagination, deletion paging, counting, and why the 1000-record cap is a non-issue if you follow the rule.
---

# Pagination

## There Is Only One Pattern

For every Core API submission query — client-side, server-side, dashboards, exports, deletion, counting — use the same loop:

1. `limit=25` (always — see Golden Rule below)
2. `include=details,values` so `createdAt` is present on each record
3. Treat `nextPageToken` as a **boolean only** — its presence means more records exist; its value is unreliable and must never be passed back
4. Cursor forward with KQL: `createdAt < "<lastCreatedAt-from-prior-page>"`
5. Stop when a page returns fewer than 25 records

This pattern is the **only** correct way to page the Core API. It works for any size dataset — 25 records, 25,000, or 250,000 — without special handling.

### The Canonical Loop

```js
async function walkSubmissions(formSlug, baseKql, onPage) {
  let lastCreatedAt = null;
  while (true) {
    let q = baseKql || "";
    if (lastCreatedAt) q = (q ? `(${q}) AND ` : "") + `createdAt < "${lastCreatedAt}"`;
    let path = `/kapps/${KAPP}/forms/${formSlug}/submissions?include=details,values&limit=25`;
    if (q) path += `&q=${encodeURIComponent(q)}`;
    const r = await api(path);
    const subs = r.submissions || [];
    await onPage(subs);
    if (subs.length < 25) break;
    lastCreatedAt = subs[subs.length - 1].createdAt;
  }
}
```

**Why it works.** Core API submissions are returned sorted by `createdAt` DESC. The last record on each page is the oldest one fetched so far. `createdAt < lastCreatedAt` is a fresh, self-contained query that returns the next-older window. No state on the server, no token chain, no cursor opacity.

### Variations Are All the Same Loop

| Task | What changes |
|------|--------------|
| Display a paginated UI (Prev/Next) | Keep a stack of each page's first `createdAt` to step backward |
| Filter / search | Add filter clauses to `baseKql`; the cursor `AND`s on top |
| Count records | Run the loop, increment a counter (see "Counting" below) |
| Server-side aggregation | Same loop, server-side, return computed JSON to the browser |
| Bulk delete | Walk forward, collect IDs, delete in parallel batches; repeat passes until clean |

### Combining KQL Filters with the Cursor

When paginating a filtered query (e.g., all "Open" tickets), combine the filter with the cursor using `AND`:

```
# Page 1 — filter only, no cursor
?q=values[Status]="Open"&orderBy=createdAt&limit=25&include=details,values

# Page 2 — add createdAt cursor from last record of page 1
?q=values[Status]="Open" AND createdAt < "2026-04-09T12:00:00.000Z"&orderBy=createdAt&limit=25&include=details,values
```

**Requirements:**
- The form must have a **compound index** covering both the filter field and `createdAt` (e.g., `[values[Status], createdAt]`), OR separate indexes for each
- `orderBy=createdAt` is required because `createdAt <` is a range operator
- Both clauses must be satisfied — the filter AND the cursor

### Important Notes

- **Use `include=details,values`** (not just `values`) so `createdAt` is on every record. Empty `include=` drops `createdAt` and breaks the cursor silently.
- **Use strict `<`** (not `<=`) to avoid re-fetching boundary records.
- **Deduplicate by `id`** as a safety measure — records bulk-created in the same millisecond can share a `createdAt`, and strict `<` will skip duplicates of that timestamp.
- **Don't pass `pageToken` back.** Ever. Use `nextPageToken` as a boolean only.

---

## Counting Records

To count records, run the canonical loop with a counter:

```js
async function countSubmissions(formSlug, kql) {
  let total = 0, lastCreatedAt = null;
  while (true) {
    let q = kql || "";
    if (lastCreatedAt) q = (q ? `(${q}) AND ` : "") + `createdAt < "${lastCreatedAt}"`;
    let path = `/kapps/${KAPP}/forms/${formSlug}/submissions?include=details&limit=25`;
    if (q) path += `&q=${encodeURIComponent(q)}`;
    const r = await apiGet(path);
    const subs = r.submissions || [];
    total += subs.length;
    if (subs.length < 25) break;
    lastCreatedAt = subs[subs.length - 1].createdAt;
  }
  return total;
}
```

**Don't use `?count=true`.** It caps at 1000 — matching sets ≤ 1000 return the true total, sets > 1000 return `1000` forever. `countPageToken` has been `null` in every observed response. The keyset loop is the only reliable count.

**This is expensive.** 100,000 records is 4,000 sequential calls. For dashboards, run this server-side and cache the result (5+ minute TTL is fine for most KPIs). Never count from the browser.

---

## Why the 1000-Record Cap Is a Non-Issue

The Core API caps any single query at **1000 total records**, regardless of `limit`. This is widely documented and frequently misunderstood.

**It only matters if you break the rules.** With `limit=25` and a `createdAt` cursor, you are never asking for more than 25 records in a single query, and each query is its own fresh window defined by the cursor. The 1000 cap is per-query, not per-walk. You can walk through 1,000,000 records in 40,000 fresh queries and never approach the cap.

People hit the cap because they widen `limit` (to 500, 1000) and then try to chase records *within* a window using `pageToken`. That path is broken in three ways at once:
1. `pageToken` value is unreliable (returns same/empty/skipped data)
2. Window-internal paging hits the 1000 cap and silently stops
3. Bigger `limit` violates the Golden Rule

The fix is not "work around the cap." The fix is: don't approach it. Use `limit=25` keyset.

### Verified: pageToken fixed in v7.0.0 (build 853d029, 2026-06-26)

The historic "pageToken is unreliable past 1000" bug was **re-tested and confirmed fixed** on the
v7.0.0 build. Following `nextPageToken` back as `pageToken` now walks an 8,118-record form
end-to-end — every record exactly once, crossing the 1000 boundary, terminating cleanly — at
`limit` = 25, 100, 500, **and 1000** (the exact config where the old bug stalled), including with a
KQL `q=` filter. Test: `skills/concepts/pagination/scripts/pagetoken-test.mjs` (ground-truth keyset vs. token-cursor diff).

This is a **version- and space-specific** result. Older builds may still have the broken token,
so the keyset cursor below remains the portable default. And the Golden Rule (`limit=25`) still
stands for its *other* reason — server load under concurrency — independent of the token bug.
Bottom line: keyset is still the recommended pattern; but on v7.0.0+ you can no longer assume
pageToken is broken — verify with the test script for the target space before relying on either.

---

## Golden Rule: limit=25, No Exceptions

**Never use `limit > 25` for Core API submission queries.** Not for export. Not for bulk operations. Not for server-side aggregation. Not "just this once because it's faster."

This rule exists because:
- `pageToken` value is unreliable, so larger pages don't compose — you can't reliably page within them
- The 1000-record cap structurally forbids large-window strategies
- Larger result sets degrade server performance under concurrent load
- `limit=25` has been validated as the safe operating point under real load

**For client-side ops** (Prev/Next UI, user-initiated exports): `limit=25`, ~1 second delay between pages, show progress, provide a Cancel button. Adaptive backoff if responses get slow (double delay if >2s, max 16s).

**For server-side ops** (dashboards, aggregations, scheduled jobs): same loop, no delay needed, but cache the result so you don't re-walk on every page load.

---

## Task API v2 — Different Beast

The Task API runs endpoint (`GET /runs`) uses standard `limit`/`offset` pagination and **does not have the 1000-record cap or `pageToken` problems**. Different rules apply:

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

Without `include=details`, run objects are missing `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy` — the `id` field is **completely absent**, not null. Always use `include=details` when fetching runs.

### Task API `count` Field

Every list response from the Task API includes a `count` field with the total matching record count, regardless of `limit`. Useful for:
- "Showing 1–25 of 2,689" headers
- Count-only queries — `limit=1` returns one record plus the true total
- **`limit=0` does NOT work** — it returns ALL matching records. Use `limit=1` for count-only.

### Task API vs Core API

| Feature | Core API (`/app/api/v1/`) | Task API (`/app/components/task/app/api/v2/`) |
|---------|--------------------------|----------------------------------------------|
| Pagination | `limit=25` + `createdAt` keyset cursor | `limit` + `offset` |
| 1000-record cap | Yes (per-query, irrelevant with keyset) | No |
| Count field | Not provided | `count` in every list response |
| `include=details` | Adds `createdAt` to submissions (required for keyset) | Adds `id` and timestamps to runs (required for anything useful) |

---

## Server-Side Aggregation Pattern

When dashboards or reports need metrics computed across multiple forms, don't load everything into the browser. Build a server endpoint that runs the canonical keyset loop internally and returns pre-computed JSON.

```js
async function collectByQuery(formSlug, kql, auth) {
  const all = [];
  let lastCreatedAt = null;
  while (true) {
    let q = kql || "";
    if (lastCreatedAt) q = (q ? `(${q}) AND ` : "") + `createdAt < "${lastCreatedAt}"`;
    let url = `/kapps/${KAPP}/forms/${formSlug}/submissions?include=details,values&limit=25`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    const r = await kineticRequest("GET", url, null, auth);
    const subs = r.data?.submissions || [];
    all.push(...subs);
    if (subs.length < 25) break;
    lastCreatedAt = subs[subs.length - 1].createdAt;
  }
  return all;
}
```

Use cases:
- **Dashboard KPIs:** open incidents + alerts + vulns → compute SLA breaches, severity counts, MTTC server-side
- **Report metrics:** MTTA, MTTC, MTTR from incident timestamps; vuln aging buckets
- **Computed filters:** SLA-at-risk (multiple boolean + date fields), overdue vulns — combinations that lack indexes and can't be KQL-queried

**Cache the result.** A 10k-record walk is 400 sequential calls. Cache the computed JSON for 5+ minutes; the browser makes a single fetch per dashboard load.

**Scope the query if you can.** A `createdAt >= startDate AND createdAt < endDate` filter (or any other indexed predicate) cuts the walk down. Pre-filtering on indexed fields is always better than walking the whole form.

---

## Client-Side Pagination Pattern

For UI lists with Prev/Next, use the canonical loop with a page-key stack:

```js
let data = [], page = 1, pageKeys = { 1: null }, hasNext = false;

async function loadPage() {
  const lastCreatedAt = pageKeys[page];
  let kql = '';
  if (lastCreatedAt) kql = `createdAt < "${lastCreatedAt}"`;
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
- `nextPageToken` is ONLY a boolean — never pass it back
- The cursor for page N+1 is the `createdAt` of the last record on page N; the cursor for page N-1 is `pageKeys[N-1]` from the stack

---

## Deletion Pagination

**Do not re-fetch page 1 after each deletion batch.** With cursor-based paging, that means re-walking the form from the newest record every time — slow, and it can re-encounter records that haven't been deleted yet.

**Correct approach:** walk forward with the canonical loop, collect IDs that match the deletion predicate, then delete in parallel batches. Repeat full passes until a clean pass finds nothing.

```js
async function bulkDelete(formSlug, predicate) {
  while (true) {
    const toDelete = [];
    let lastCreatedAt = null;
    while (true) {
      let q = lastCreatedAt ? `createdAt < "${lastCreatedAt}"` : "";
      let url = `/kapps/${KAPP}/forms/${formSlug}/submissions?include=details,values&limit=25`;
      if (q) url += `&q=${encodeURIComponent(q)}`;
      const r = await api(url);
      const subs = r.submissions || [];
      for (const s of subs) if (predicate(s)) toDelete.push(s.id);
      if (subs.length < 25) break;
      lastCreatedAt = subs[subs.length - 1].createdAt;
    }
    if (toDelete.length === 0) break;
    for (let i = 0; i < toDelete.length; i += 10) {
      await Promise.all(toDelete.slice(i, i + 10).map(id => deleteSubmission(id)));
    }
  }
}
```

---

## Pagination Gotchas

- **`pageToken` value was historically unreliable** — treat `nextPageToken` as a boolean and use `createdAt` keyset by default. **Exception:** verified fixed on v7.0.0 (build 853d029) — token-cursor walks 8k+ records cleanly there (see "Verified" note above). Confirm per-space with `skills/concepts/pagination/scripts/pagetoken-test.mjs` before relying on the token on any given build.
- **The 1000-record cap is per-query** — irrelevant with `limit=25` keyset. The cap only bites if you widen `limit` and try to page within a window.
- **`?count=true` caps at 1000** — gives the true total only when the matching set is ≤ 1000. Use the keyset count loop for anything larger.
- **Empty `include=`** silently drops `createdAt` from submissions — always use `include=details` (or `include=details,values`) when keyset paging.
- **Task API `limit=0`** returns ALL records. Use `limit=1` for count-only queries.
- **Task API uses `limit`/`offset`** — different API, different rules. No 1000 cap.
