---
name: build-paginated-list
description: Step-by-step recipe for building a paginated submission list in a React portal using @kineticdata/react hooks.
---

# Recipe: Build a Paginated List

This recipe walks through building a paginated submission list end-to-end in a React portal. The example uses a **request queue**, but the same pattern applies to any list: approval inboxes, search results, recruiting pipelines, incident queues, or any submission-driven view.

**Before reading this recipe, familiarise yourself with:**
- `skills/front-end/data-fetching/SKILL.md` — `useData`, `usePaginatedData`, `usePagination`, `usePoller`, `defineKqlQuery`
- `skills/front-end/bootstrap/SKILL.md` — KineticLib setup, project structure
- `skills/concepts/pagination/SKILL.md` — Core API pagination patterns, 1000-record cap
- `skills/concepts/kql-and-indexing/SKILL.md` — KQL query syntax, index requirements

---

## Overview

A complete paginated list has five pieces:

1. **Index definitions** on the form (required — KQL queries fail without them)
2. **KQL query builder** using `defineKqlQuery`
3. **`usePaginatedData` hook** wired to `searchSubmissions`
4. **List UI component** rendering rows and handling empty/loading/error states
5. **Filter and pagination controls** (dropdowns, search input, Prev/Next buttons)

Optional: add `usePoller` for real-time background refresh.

---

## Step 1 — Define Index Definitions on the Form

KQL queries require index definitions on the form. Without them, queries return a 400 error. Add indexes before writing any front-end code.

For this example, the form has `Status` and `Category` fields. Because the UI allows filtering by either field individually and by both together, you need single-field indexes and a compound index.

```
PUT /app/api/v1/kapps/{kappSlug}/forms/{formSlug}
Content-Type: application/json
Authorization: Basic <base64(username:password)>

{
  "indexDefinitions": [
    {"name": "idx_status",          "parts": ["values[Status]"],                        "unique": false},
    {"name": "idx_category",        "parts": ["values[Category]"],                      "unique": false},
    {"name": "idx_status_category", "parts": ["values[Status]", "values[Category]"],    "unique": false}
  ]
}
```

Trigger the build:

```
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/backgroundJobs
Content-Type: application/json

{
  "type": "Build Index",
  "content": {
    "indexes": ["values[Status]", "values[Category]", "values[Status],values[Category]"]
  }
}
```

Poll `GET /kapps/{kappSlug}/forms/{formSlug}?include=indexDefinitions` until all statuses are `"Built"` (typically ~5 seconds for 1000 records).

**See:** `skills/concepts/kql-and-indexing/SKILL.md` for the full index definition rules, compound index requirements, and gotchas.

---

## Step 2 — Define the KQL Query

Use `defineKqlQuery` (exported by `@kineticdata/react`) to build type-safe KQL strings. Chain operators and call the result with values — passing `undefined` for a value omits that clause.

```js
// src/pages/RequestQueue/query.js
import { defineKqlQuery } from '@kineticdata/react';

// Base query: filter by Status only
export const buildStatusQuery = defineKqlQuery()
  .equals('values[Status]', 'status')
  .end();

// Compound query: filter by Status AND Category
export const buildStatusCategoryQuery = defineKqlQuery()
  .equals('values[Status]', 'status')
  .equals('values[Category]', 'category')
  .end();
```

Call with values at runtime:

```js
// Status only → "values[Status] = \"Open\""
const q = buildStatusQuery({ status: 'Open' });

// Status + Category → "values[Status] = \"Open\" AND values[Category] = \"Hardware\""
const q = buildStatusCategoryQuery({ status: 'Open', category: 'Hardware' });
```

**Key rules:**
- Equality operators (`=`, `IN`) do NOT require `orderBy` and work cleanly with `pageToken` pagination.
- Range operators (`=*`, `>`, `<`, `BETWEEN`) require `orderBy` on the same field — use `=*` only for dedicated search features.
- `!=` is a range operator in KQL — avoid it in paginated UIs; filter client-side instead.
- Multi-field `AND` requires a compound index (not just individual indexes).

**See:** `skills/concepts/kql-and-indexing/SKILL.md` for the complete operator reference and gotchas.

### Text Search (Starts-With) Pattern

Use the `=*` operator for type-ahead search. It requires `orderBy` on the searched field:

```js
// Search by name prefix
const buildSearchQuery = ({ searchTerm }) =>
  searchTerm
    ? defineKqlQuery().startsWith('values[Summary]', searchTerm).end()
    : null;

// Or raw KQL:
const q = `values[Summary] =* "${searchTerm}"`;
// Must include: &orderBy=values[Summary]
```

**In the params:**
```js
const params = useMemo(() => ({
  kapp: kappSlug,
  form: formSlug,
  search: {
    q: searchTerm ? `values[Summary] =* "${searchTerm}"` : undefined,
    orderBy: searchTerm ? 'values[Summary]' : undefined,
    include: ['details', 'values'],
    limit: 25,
  },
}), [kappSlug, formSlug, searchTerm]);
```

**Gotchas:**
- `=*` is a range operator — requires `orderBy` on the same field and an index covering it
- `=*` is starts-with only, not contains. For contains search, filter client-side
- Debounce the search input (300-500ms) to avoid flooding the API on every keystroke
- An empty search term should omit the `q` and `orderBy` params entirely (return all results)

---

## Step 3 — Wire Up `usePaginatedData`

`usePaginatedData` is a **project-local hook** — it is NOT exported by `@kineticdata/react`. Place it in `src/hooks/usePaginatedData.js` (see `skills/front-end/data-fetching/SKILL.md` for the full implementation).

Build params with `useMemo` for referential stability. When filters change, `usePaginatedData` resets to page 1 automatically.

```jsx
// src/pages/RequestQueue/useRequestQueue.js
import { useMemo } from 'react';
import { searchSubmissions } from '@kineticdata/react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { buildStatusQuery, buildStatusCategoryQuery } from './query';

export function useRequestQueue({ kappSlug, formSlug, status, category }) {
  const params = useMemo(() => {
    // Choose query based on which filters are active
    let q;
    if (status && category) {
      q = buildStatusCategoryQuery({ status, category });
    } else if (status) {
      q = buildStatusQuery({ status });
    }
    // No q → unfiltered list

    return {
      kapp: kappSlug,
      form: formSlug,           // omit to search all forms in kapp
      search: {
        q,                      // undefined means no KQL filter
        include: ['details', 'values', 'form'],
        limit: 25,
      },
    };
  }, [kappSlug, formSlug, status, category]);

  return usePaginatedData(searchSubmissions, params);
}
```

**`include` gotcha:** `include=values` alone does NOT return `createdAt`. Use `include=details,values` (or `['details', 'values']`) to get timestamps, `coreState`, `createdBy`, and field values together.

**What `usePaginatedData` returns:**

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | boolean | `true` once params are non-null |
| `loading` | boolean | `true` while fetching |
| `response` | object | Raw API response: `{ submissions, nextPageToken, error }` |
| `pageNumber` | number | Current page (1-based) |
| `actions.previousPage` | function \| undefined | Navigate back; `undefined` on page 1 |
| `actions.nextPage` | function \| undefined | Navigate forward; `undefined` on last page |
| `actions.reloadPage` | function | Re-fetch the current page |
| `actions.reloadData` | function | Re-fetch from page 1 (resets pagination) |

`previousPage` and `nextPage` are `undefined` (not disabled functions) when unavailable — use this directly to disable buttons.

---

## Step 4 — Build the List UI Component

```jsx
// src/pages/RequestQueue/RequestQueue.jsx
import { useRequestQueue } from './useRequestQueue';

export function RequestQueue({ kappSlug, formSlug }) {
  const [status, setStatus] = useState('Open');
  const [category, setCategory] = useState('');

  const { initialized, loading, response, pageNumber, actions } =
    useRequestQueue({ kappSlug, formSlug, status, category });

  const submissions = response?.submissions ?? [];
  const error = response?.error;

  return (
    <div className="request-queue">
      <RequestQueueFilters
        status={status}
        category={category}
        onStatusChange={setStatus}
        onCategoryChange={setCategory}
      />

      {error && (
        <p className="error">Failed to load requests: {error.message}</p>
      )}

      {!initialized || loading ? (
        <p className="loading">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="empty">No requests found.</p>
      ) : (
        <table className="request-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Status</th>
              <th>Category</th>
              <th>Created</th>
              <th>Submitted By</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(sub => (
              <RequestRow key={sub.id} submission={sub} />
            ))}
          </tbody>
        </table>
      )}

      <PaginationControls
        pageNumber={pageNumber}
        onPrev={actions.previousPage}
        onNext={actions.nextPage}
        loading={loading}
      />
    </div>
  );
}

function RequestRow({ submission }) {
  const { label, values, createdAt, createdBy } = submission;
  return (
    <tr>
      <td>{label}</td>
      <td>{values['Status']}</td>
      <td>{values['Category']}</td>
      <td>{new Date(createdAt).toLocaleDateString()}</td>
      <td>{createdBy}</td>
    </tr>
  );
}
```

**Note:** `createdAt` is only present because `include` contains `'details'`. Without `details`, the field is absent from the response object entirely.

---

## Step 5 — Add Filter Controls

Filters are plain React state. When state changes, the `useMemo` in `useRequestQueue` produces new params, and `usePaginatedData` resets to page 1 automatically.

```jsx
// src/pages/RequestQueue/RequestQueueFilters.jsx
export function RequestQueueFilters({ status, category, onStatusChange, onCategoryChange }) {
  return (
    <div className="filters">
      <label>
        Status
        <select value={status} onChange={e => onStatusChange(e.target.value)}>
          <option value="">All</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </label>

      <label>
        Category
        <select value={category} onChange={e => onCategoryChange(e.target.value)}>
          <option value="">All</option>
          <option value="Hardware">Hardware</option>
          <option value="Software">Software</option>
          <option value="Network">Network</option>
        </select>
      </label>
    </div>
  );
}
```

**Important:** Combining `status` AND `category` in a single KQL `AND` query requires a compound index. If no compound index exists, keep one filter in KQL and apply the other client-side on the returned 25 rows:

```js
// Client-side fallback when compound index is not available
const filtered = submissions.filter(s =>
  !category || s.values['Category'] === category
);
```

---

## Step 6 — Add Pagination Controls

The Core API does NOT provide a total count of matching records. Pagination controls must use Prev/Next only — never show "Page X of Y" or a total item count.

```jsx
// src/pages/RequestQueue/PaginationControls.jsx
export function PaginationControls({ pageNumber, onPrev, onNext, loading }) {
  return (
    <div className="pagination">
      <button
        onClick={onPrev}
        disabled={!onPrev || loading}
      >
        Previous
      </button>

      <span>Page {pageNumber}</span>

      <button
        onClick={onNext}
        disabled={!onNext || loading}
      >
        Next
      </button>
    </div>
  );
}
```

`onPrev` and `onNext` come from `actions.previousPage` and `actions.nextPage` — both are `undefined` when the navigation is not available, so `disabled={!onPrev}` works directly.

**Pagination gotchas:**
- The Core API has a **hard 1000-record cap per query** — `pageToken` only paginates within that window. For lists that could exceed 1000 records, use keyset pagination (see `skills/concepts/pagination/SKILL.md`).
- Never show a total count — the API does not return one for Core API submission queries.

---

## Optional: Add Polling for Real-Time Updates

Use `usePoller` (project-local hook) to refresh the list in the background. Pass `actions.reloadData` to reset to page 1 on each poll cycle, or `actions.reloadPage` to silently refresh the current page.

`usePoller` is NOT exported by `@kineticdata/react`. Place it in `src/hooks/usePoller.js` (see `skills/front-end/data-fetching/SKILL.md` for the implementation).

```jsx
import { usePoller } from '../../hooks/usePoller';

// Inside RequestQueue component:
const { initialized, loading, response, pageNumber, actions } =
  useRequestQueue({ kappSlug, formSlug, status, category });

// Poll every 5s → 10s → 20s → 40s → 60s → 60s → …
usePoller(actions.reloadData);

// Or: only poll while the queue is open (stop when navigating away)
const isQueueOpen = status !== 'Closed';
usePoller(isQueueOpen ? actions.reloadData : undefined);
```

Passing `undefined` to `usePoller` stops polling. Use this to pause polling when the list is filtered to a terminal state (e.g., Closed records) or when the component is not visible.

**Poll schedule:** 5 s → 10 s → 20 s → 40 s → 60 s → 60 s → ...

---

## Complete File Layout

```
src/pages/RequestQueue/
├── RequestQueue.jsx         ← main component (filters + table + pagination)
├── RequestQueueFilters.jsx  ← dropdown filter controls
├── PaginationControls.jsx   ← prev/next buttons
├── query.js                 ← defineKqlQuery builders
└── useRequestQueue.js       ← usePaginatedData wrapper hook
```

---

## Gotchas Summary

| Gotcha | Detail |
|--------|--------|
| No total count | Core API does not return total matching records — use Prev/Next only |
| Indexes required | KQL queries return 400 without index definitions on the form |
| Compound indexes | Multi-field AND queries require a compound (multi-part) index, not individual indexes |
| `include=values` missing timestamps | Add `details` to include: `['details', 'values']` to get `createdAt`, `coreState`, `createdBy` |
| `!=` is a range operator | Avoid in paginated UIs — use client-side filtering instead |
| `=*` requires `orderBy` | Starts-with search requires `orderBy` on the same field |
| Project-local hooks | `usePaginatedData`, `useData`, `usePoller` are NOT exported by `@kineticdata/react` |
| 1000-record cap | `pageToken` paginates within one 1000-record window — use keyset pagination for larger datasets |
