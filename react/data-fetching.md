# Data Fetching

## `useData` — Single Fetch Hook

Fetches data once (or on dependency change). Pass `null` params to skip the fetch.

```js
// portal/src/helpers/hooks/useData.js
export function useData(fn, params) {
  const [[response, lastTimestamp], setData] = useState([null, null]);

  const executeQuery = useCallback(() => {
    if (params) {
      const timestamp = new Date().getTime();
      setData(([d]) => [d, timestamp]);
      fn(params).then(response => {
        setData(([d, ts]) => {
          // Ignore stale responses — only apply if timestamp matches
          if (ts === timestamp) return [response, null];
          else return [d, ts];
        });
      });
    } else {
      setData(([, ts]) => [null, ts]);
    }
  }, [fn, params]);

  useEffect(() => { executeQuery(); }, [executeQuery]);

  return useMemo(() => ({
    initialized: !!params,
    loading: !!params && (!response || !!lastTimestamp),
    response,
    actions: { reloadData: executeQuery },
  }), [params, response, lastTimestamp, executeQuery]);
}
```

**Returns:** `{ initialized, loading, response, actions: { reloadData } }`

- `initialized` — `true` when params are non-null (fetch has been triggered at least once)
- `loading` — `true` while waiting for the first response or a reload
- `response` — raw API response object (e.g. `{ submission, error }` or `{ submissions, nextPageToken, error }`)
- `actions.reloadData` — re-fetches with current params

**Race condition safety:** Timestamp-based stale response rejection — if params change before the previous fetch resolves, the old response is discarded.

**Usage:**
```jsx
const spaceParams = useMemo(
  () => initialized ? { include: 'attributesMap,kapps' } : null,
  [initialized],
);
const { initialized: spaceInit, loading, response } = useData(fetchSpace, spaceParams);
```

---

## `usePaginatedData` — Paginated List Hook

Wraps `usePagination` for `pageToken`-based cursor pagination. Use for any list that may exceed one page.

```js
// portal/src/helpers/hooks/usePaginatedData.js
export function usePaginatedData(fn, params) {
  const [[response, lastTimestamp], setData] = useState([null, null]);
  const { pageToken, setNextPageToken, resetPagination, pageNumber,
          previousPage, nextPage } = usePagination();

  // Reset response and pagination when params change
  useEffect(() => {
    setData(([, ts]) => [null, ts]);
    resetPagination();
  }, [params, resetPagination]);

  const executeQuery = useCallback(() => {
    if (params) {
      const timestamp = new Date().getTime();
      setData(([d]) => [d, timestamp]);
      fn({ ...params, pageToken }).then(response => {
        setData(([d, ts]) => {
          if (ts === timestamp) {
            setNextPageToken(response.nextPageToken);
            return [response, null];
          }
          else return [d, ts];
        });
      });
    } else {
      setData(([, ts]) => [null, ts]);
    }
  }, [fn, params, pageToken, setNextPageToken]);

  // useDeferredValue prevents double-firing when params + pageToken change together
  const executeQueryDeferred = useDeferredValue(executeQuery);
  useEffect(() => { executeQueryDeferred(); }, [executeQueryDeferred]);

  const reloadData = useCallback(() => {
    setData(([, ts]) => [null, ts]);
    if (pageToken) resetPagination();
    else executeQuery();
  }, [pageToken, resetPagination, executeQuery]);

  return useMemo(() => ({
    initialized: !!params,
    loading: !!params && (!response || !!lastTimestamp),
    response,
    pageNumber,
    actions: { previousPage, nextPage, reloadPage: executeQuery, reloadData },
  }), [params, response, lastTimestamp, pageNumber, previousPage, nextPage, executeQuery, reloadData]);
}
```

**Returns:** `{ initialized, loading, response, pageNumber, actions }`

| Action | Description |
|--------|-------------|
| `previousPage` | Go to previous page (`undefined` if on first page) |
| `nextPage` | Go to next page (`undefined` if no more pages) |
| `reloadPage` | Re-fetch the current page |
| `reloadData` | Re-fetch from page 1 (resets pagination) |

**Usage:**
```jsx
const params = useMemo(() => ({
  kapp: kappSlug,
  search: {
    q: defineKqlQuery().equals('createdBy', 'username').end()({ username }),
    include: ['details', 'form'],
    limit: 25,
  },
}), [kappSlug, username]);

const { initialized, loading, response, pageNumber, actions } =
  usePaginatedData(searchSubmissions, params);

// Render
<button onClick={actions.previousPage} disabled={!actions.previousPage}>Prev</button>
<span>Page {pageNumber}</span>
<button onClick={actions.nextPage} disabled={!actions.nextPage}>Next</button>
```

---

## `usePagination` — Pagination State

Internal hook used by `usePaginatedData`. Manages a stack of `pageToken` values for cursor-based forward/back navigation.

```js
// portal/src/helpers/hooks/usePagination.js
export function usePagination() {
  const [pagination, setPagination] = useState({
    pageToken: undefined,
    nextPageToken: undefined,
    previousPageTokens: [],
  });

  // Move to next page: push current token onto stack, advance to nextPageToken
  const next = useCallback(() => {
    setPagination(({ pageToken, nextPageToken, previousPageTokens }) => ({
      pageToken: nextPageToken,
      nextPageToken: undefined,
      previousPageTokens: [pageToken, ...previousPageTokens],
    }));
  }, []);

  // Move to previous page: pop from stack
  const prev = useCallback(() => {
    setPagination(({ pageToken: nextPageToken, previousPageTokens: [pageToken, ...previousPageTokens] }) => ({
      pageToken, previousPageTokens, nextPageToken,
    }));
  }, []);

  return {
    pageToken: pagination.pageToken,
    setNextPageToken: ...,          // called by usePaginatedData after each fetch
    pageNumber: pagination.previousPageTokens.length + 1,
    resetPagination: ...,
    previousPage: pagination.previousPageTokens.length > 0 ? prev : undefined,
    nextPage: pagination.nextPageToken ? next : undefined,
  };
}
```

`previousPage` and `nextPage` are `undefined` (not functions) when unavailable — use this to disable navigation buttons directly.

---

## `usePoller` — Exponential Backoff Polling

Polls a function at increasing intervals. Starts at 5 s, doubles each poll up to 60 s max.

```js
// portal/src/helpers/hooks/usePoller.js
export function usePoller(fn) {
  const poller = useRef({ id: null, counter: 1 });

  useEffect(() => {
    if (typeof fn === 'function') {
      const currentPoller = poller.current;
      startPoller(fn, currentPoller);
      return () => clearTimeout(currentPoller.id);
    }
  }, [fn]);
}

function startPoller(fn, state) {
  state.id = setTimeout(() => {
    fn();
    state.counter = Math.min(state.counter * 2, 12);  // max 12 × 5s = 60s
    startPoller(fn, state);
  }, state.counter * 5000);
}
```

**Poll schedule:** 5s → 10s → 20s → 40s → 60s → 60s → ...

**Usage — live activity timeline:**
```jsx
const { response, actions: { reloadData } } = useData(fetchSubmission, params);
usePoller(reloadData);  // Pass reloadData directly; poller stops if fn becomes undefined
```

Pass `undefined` to stop polling (e.g. when submission is closed).

---

## `defineKqlQuery` — KQL Builder

Builds type-safe KQL query strings. Chain operators, then call the result with values:

```js
import { defineKqlQuery } from '@kineticdata/react';

// Simple equality
const q = defineKqlQuery()
  .equals('createdBy', 'username')
  .end()({ username: 'john.doe' });
// → "createdBy = \"john.doe\""

// OR across same field
const q = defineKqlQuery()
  .in('type', 'types')
  .end()({ types: ['Service', 'Task'] });
// → "type IN (\"Service\", \"Task\")"

// Nested OR with AND
const q = defineKqlQuery()
  .in('type', 'types')
  .or()
    .equals('createdBy', 'username')
    .equals('values[Requested For]', 'username')
  .end()
  .end()({ types: ['Service'], username: 'john.doe' });
```

**KQL gotchas (see `platform/core-api.md` for full rules):**
- All queried fields require an **index** on the form — queries fail silently without one
- Range operators (`>`, `<`, `BETWEEN`, also `!=`) require `orderBy` on the same field
- Multi-field `AND` requires a **compound index**

---

## `searchSubmissions` — Standard Params

```js
import { searchSubmissions } from '@kineticdata/react';

const params = {
  kapp: kappSlug,       // required
  form: formSlug,       // optional — omit to search all forms in kapp
  search: {
    q: defineKqlQuery()...,
    include: ['details', 'values', 'form', 'form.attributesMap'],
    limit: 25,          // default 25, max 1000 per page
    orderBy: 'createdAt',
    direction: 'DESC',
  },
  // pageToken is injected by usePaginatedData automatically
};
```

**`include` values:**
- `details` — adds `createdAt`, `submittedAt`, `closedAt`, `coreState`, `createdBy`, etc.
- `values` — adds form field values (does NOT include `details`)
- `form` — adds `{ name, slug, kapp }` on each submission
- `form.attributesMap` — adds form attributes (e.g. `Icon`)

Note: `include=values` alone does **not** return `createdAt` — use `include=details,values`.

---

## Datastore Queries

Query a datastore (bridge) form directly:

```js
const params = {
  kapp: kappSlug,
  form: datastoreFormSlug,
  search: { include: ['details', 'values'], limit: 1000 },
};
const { response } = useData(searchSubmissions, params);
const records = response?.submissions || [];
```

Datastore forms use the same `searchSubmissions` API. The 1000-record cap still applies — use keyset pagination for large datastores.

---

## Fetch Single Submission

```js
import { fetchSubmission } from '@kineticdata/react';

const params = useMemo(
  () => submissionId
    ? { id: submissionId, include: 'details,values,activities,activities.details' }
    : null,
  [submissionId],
);
const { initialized, loading, response } = useData(fetchSubmission, params);
const submission = response?.submission;
const error = response?.error;
```

**Common `include` values for single submission:**
- `details` — timestamps, state, createdBy
- `values` — field values
- `activities` — activity/comment timeline entries
- `activities.details` — full activity data (required for work notes content)
