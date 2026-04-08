---
name: build-service-portal
description: End-to-end recipe for building a self-service portal on the Kinetic Platform — from project setup through service catalog, request forms, approval queues, and request tracking.
---

# Recipe: Build a Service Portal

This recipe walks through building a complete self-service portal on the Kinetic Platform — a React SPA that lets users browse available services, submit requests, and track their submissions through resolution. The architecture is **domain-agnostic**: the same pattern works for an IT service catalog, a recruiting portal, a facilities management system, a field service app, or any other submission-driven workflow.

The reference production implementation is [momentum-portal](https://github.com/kineticdata/momentum-portal).

**Before reading this recipe, read these foundational skills:**
- `skills/front-end/bootstrap/SKILL.md` — KineticLib, Vite config, auth state machine, project structure
- `skills/front-end/forms/SKILL.md` — CoreForm, KineticForm wrapper, globals.jsx
- `skills/front-end/data-fetching/SKILL.md` — useData, usePaginatedData, defineKqlQuery
- `skills/front-end/mutations/SKILL.md` — executeIntegration, submission CRUD
- `skills/front-end/state/SKILL.md` — regRedux, appActions, toasts, confirmation modal

---

## Overview

A service portal has six main concerns:

1. **Platform setup** — a kapp with service forms and a workflow tree
2. **React project setup** — Vite + `@kineticdata/react` + routing
3. **Service catalog** — listing available forms grouped by category
4. **Request form page** — rendering forms with `KineticForm`
5. **Request list** — paginated, filterable submission history
6. **Request detail** — single submission with activity timeline

---

## Part 1 — Platform Setup

### 1.1 Create the Kapp

Create a kapp to hold service request forms. See `skills/platform/api-basics/SKILL.md` for endpoint details.

```
POST /app/api/v1/kapps
Content-Type: application/json
Authorization: Basic <base64(username:password)>

{
  "name": "Service Portal",
  "slug": "service-portal",
  "displayType": "Display Page",
  "displayValue": "/"
}
```

Set a space attribute so the portal can resolve the kapp slug at runtime:

```
PUT /app/api/v1/space
{
  "attributesMap": {
    "Service Portal Kapp Slug": ["service-portal"]
  }
}
```

### 1.2 Create Service Forms

Each service in the catalog is a form in the kapp. See `skills/recipes/create-submission-form/SKILL.md` for the full form-creation recipe.

Best-practice form setup for a service catalog:

| Property | Value |
|----------|-------|
| `type` | `"Service"` — used to filter catalog listing |
| `status` | `"Active"` |
| `anonymous` | `false` (authenticated submissions) |
| Form attribute `Icon` | icon name string (e.g. `"laptop"`) — displayed in the catalog |
| Form attribute `Description` | Short description shown in the catalog tile |
| Form attribute `Category` | Category name for grouping (alternative to kapp categories) |

Define indexes for any field used in KQL filters — at minimum `values[Status]`. See `skills/platform/kql-and-indexing/SKILL.md`.

### 1.3 Assign Forms to Categories

Use the Kinetic Console to create kapp categories and assign forms. When fetching the kapp with `include=categories,categories.attributesMap`, each form carries a `categories` array.

Alternatively, store a `Category` attribute on each form and group client-side — simpler to manage but requires fetching all forms at once.

### 1.4 Workflow

Attach a workflow tree to each service form to handle submission processing, approvals, and notifications. See `skills/platform/workflow-engine/SKILL.md` and `skills/platform/architectural-patterns/SKILL.md` for approval and fulfillment patterns.

---

## Part 2 — React Project Setup

### 2.1 Scaffold

```bash
npm create vite@latest portal -- --template react
cd portal
npm install @kineticdata/react react-router-dom react-redux @reduxjs/toolkit
npm install jquery moment
npm install -D @vitejs/plugin-react vite-plugin-svgr @tailwindcss/vite
```

### 2.2 `index.html` — Bundle Scripts

`CoreForm` requires Kinetic's bundle JavaScript. Add before the Vite entry `<script>`:

```html
<head>
  <script>window.global ||= window;</script>
  <link rel="stylesheet" href="/app/head.css" type="text/css" media="all" />
  <script src="/app/head.js"></script>
  <script src="/app/bundle.js"></script>
</head>
```

These files are served by the Kinetic server and proxied through Vite — they are not local files. See `skills/front-end/bootstrap/SKILL.md` for why this is required.

### 2.3 `vite.config.js` — Dev Proxy

```js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env': env,  // @kineticdata/react references process.env
    },
    server: {
      port: 3000,
      proxy: {
        '^(?!(/@|/src|/node_modules|/index.html|/$)).*$': {
          target: env.REACT_APP_PROXY_HOST,
          changeOrigin: true,
          secure: false,
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (proxyReq.getHeader('origin')) {
                proxyReq.setHeader('origin', env.REACT_APP_PROXY_HOST);
              }
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              const setCookie = proxyRes.headers['set-cookie'];
              if (setCookie && req.protocol === 'http') {
                const strip = c => c.replace(/;\s*Secure/gi, '').replace(/;\s*SameSite=None/gi, '');
                proxyRes.headers['set-cookie'] = Array.isArray(setCookie)
                  ? setCookie.map(strip) : strip(setCookie);
              }
            });
          },
        },
      },
    },
  };
});
```

Set `REACT_APP_PROXY_HOST=https://yourspace.kinops.io` in `.env.development.local`.

### 2.4 `src/globals.js` — Form Engine Environment

```js
import jquery from 'jquery';
import moment from 'moment';

jquery.ajaxSetup({ xhrFields: { withCredentials: true } });
window.$ = jquery;
window.jQuery = jquery;
window.moment = moment;
```

### 2.5 `src/main.jsx` — Entry Point

**Never wrap in `React.StrictMode`** — it permanently breaks `CoreForm` in development. See `skills/front-end/bootstrap/SKILL.md` for the explanation.

```jsx
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { KineticLib } from '@kineticdata/react';
import { store } from './redux.js';
import { App } from './App.jsx';

const globals = import('./globals.js');

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <KineticLib globals={globals} locale="en">
      {kineticProps => (
        <HashRouter>
          <App {...kineticProps} />
        </HashRouter>
      )}
    </KineticLib>
  </Provider>,
);
```

Use `HashRouter` (not `BrowserRouter`) to avoid Vite proxy intercepting deep-path hard refreshes.

### 2.6 `src/redux.js` — Store

```js
import { configureStore, combineSlices, createSlice } from '@reduxjs/toolkit';

const init = createSlice({ name: 'init', initialState: false,
  reducers: { regRedux: () => true } });
const rootReducer = combineSlices(init);

export const store = configureStore({
  reducer: rootReducer,
  middleware: gDM => gDM({
    serializableCheck: {
      ignoredActions: ['view/handleResize', 'confirm/open'],
      ignoredPaths: ['confirm.options.accept', 'confirm.options.cancel'],
    },
  }),
});

export const regRedux = (name, initialState, reducers) => {
  const slice = createSlice({
    name, initialState,
    reducers: Object.fromEntries(
      Object.entries(reducers).map(([k, v]) => [
        k, (state, { payload }) => v(state, payload),
      ]),
    ),
  });
  rootReducer.inject(slice, { overrideExisting: true });
  store.dispatch(init.actions.regRedux());
  return Object.fromEntries(
    Object.entries(slice.actions).map(([k, v]) => [
      k, (...args) => store.dispatch(v(...args)),
    ]),
  );
};
```

See `skills/front-end/state/SKILL.md` for `appActions`, `themeActions`, `viewActions`.

### 2.7 `src/App.jsx` — Auth State Machine

```jsx
import { useMemo, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchSpace, fetchKapp, fetchProfile } from '@kineticdata/react';
import { useData } from './hooks/useData.js';
import { appActions } from './helpers/state.js';
import { Catalog } from './pages/Catalog.jsx';
import { RequestForm } from './pages/RequestForm.jsx';
import { Requests } from './pages/Requests.jsx';
import { RequestDetail } from './pages/RequestDetail.jsx';
import { Login } from './pages/Login.jsx';
import { Loading } from './components/Loading.jsx';

export function App({ initialized, loggedIn, loginProps, timedOut, serverError }) {
  const { space, kappSlug, kapp, profile, error } = useSelector(s => s.app);

  // 1. Fetch space (public=true when not logged in)
  const spaceParams = useMemo(
    () => initialized
      ? { include: 'attributesMap,kapps', ...(loggedIn ? {} : { public: true }) }
      : null,
    [initialized, loggedIn],
  );
  const { loading: spaceLoading, response: spaceData } = useData(fetchSpace, spaceParams);
  useEffect(() => {
    if (!spaceLoading && spaceData) appActions.setSpace(spaceData);
  }, [spaceLoading, spaceData]);

  // 2. Fetch profile (authenticated only)
  const profileParams = useMemo(
    () => initialized && loggedIn
      ? { include: 'profileAttributesMap,attributesMap,memberships' }
      : null,
    [initialized, loggedIn],
  );
  const { loading: profileLoading, response: profileData } = useData(fetchProfile, profileParams);
  useEffect(() => {
    if (!profileLoading && profileData) appActions.setProfile(profileData);
  }, [profileLoading, profileData]);

  // 3. Fetch kapp (requires kappSlug from space)
  const kappParams = useMemo(
    () => initialized && loggedIn && kappSlug
      ? { kappSlug, include: 'attributesMap,categories,categories.attributesMap' }
      : null,
    [initialized, loggedIn, kappSlug],
  );
  const { loading: kappLoading, response: kappData } = useData(fetchKapp, kappParams);
  useEffect(() => {
    if (!kappLoading && kappData) appActions.setKapp(kappData);
  }, [kappLoading, kappData]);

  if (serverError || error) return <div>Error loading portal</div>;
  if (!initialized || !space) return <Loading />;
  if (!loggedIn) return <Login {...loginProps} />;
  if (!kapp || !profile) return <Loading />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/forms/:formSlug" element={<RequestForm />} />
        <Route path="/forms/:formSlug/:submissionId" element={<RequestForm />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/requests/:submissionId" element={<RequestDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {timedOut && (
        <dialog open>
          <Login {...loginProps} />
        </dialog>
      )}
    </>
  );
}
```

**Auth state machine:**
1. `!initialized || !space` → Loading
2. `!loggedIn` → Login page
3. `!kapp || !profile` → Loading (bootstrapping after login)
4. Ready → render routes; `timedOut` → overlay dialog re-login

---

## Part 3 — Service Catalog

The catalog lists all active service forms in the kapp, grouped by category. It is the portal home page.

### 3.1 Fetching Forms

```js
import { fetchForms } from '@kineticdata/react';

// portal/src/api/catalog.js
export const fetchCatalogForms = params =>
  fetchForms({
    kappSlug: params.kappSlug,
    include: 'attributesMap,categories',
  });
```

### 3.2 `src/pages/Catalog.jsx`

```jsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchForms } from '@kineticdata/react';
import { useData } from '../hooks/useData.js';
import { getAttributeValue } from '../helpers/records.js';

export function Catalog() {
  const kappSlug = useSelector(s => s.app.kappSlug);

  const params = useMemo(
    () => kappSlug ? { kappSlug, include: 'attributesMap,categories' } : null,
    [kappSlug],
  );
  const { loading, response } = useData(fetchForms, params);
  const forms = response?.forms ?? [];

  // Group by the first category name; ungrouped forms fall into 'Other'
  const grouped = useMemo(() => {
    const groups = {};
    forms
      .filter(f => f.status === 'Active')
      .forEach(form => {
        const category = form.categories?.[0]?.name ?? 'Other';
        (groups[category] ??= []).push(form);
      });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [forms]);

  if (loading) return <div>Loading services…</div>;

  return (
    <main>
      <h1>Service Catalog</h1>
      {grouped.map(([category, categoryForms]) => (
        <section key={category}>
          <h2>{category}</h2>
          <ul className="catalog-grid">
            {categoryForms.map(form => (
              <li key={form.slug}>
                <Link to={`/forms/${form.slug}`}>
                  <span className="icon">{getAttributeValue(form, 'Icon', 'file')}</span>
                  <strong>{form.name}</strong>
                  <p>{getAttributeValue(form, 'Description', '')}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
```

**Key points:**
- `fetchForms` is exported from `@kineticdata/react`
- Filter to `status === 'Active'` client-side — the API returns all forms regardless
- `getAttributeValue(form, 'Icon', 'file')` reads a form-level attribute; always use the helper because `attributesMap` values are arrays
- Group by `form.categories[0].name` when using kapp categories, or by a `Category` form attribute if you chose that approach in Part 1

---

## Part 4 — Request Form Page

The form page renders the selected service form using `KineticForm`. It handles both new submissions and resuming drafts.

### 4.1 `src/components/KineticForm.jsx`

```jsx
import { memo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CoreForm } from '@kineticdata/react';
import { toastSuccess } from '../helpers/toasts.js';

// Parse ?values[Field Name]=value query params into { 'Field Name': 'value' }
function valuesFromQueryParams(searchParams) {
  const values = {};
  for (const [key, value] of searchParams.entries()) {
    const match = key.match(/^values\[(.+)\]$/);
    if (match) values[match[1]] = value;
  }
  return values;
}

export const KineticForm = memo(
  ({ kappSlug, formSlug, submissionId, values, components = {}, ...props }) => {
    const [searchParams] = useSearchParams();
    const paramValues = valuesFromQueryParams(searchParams);
    const navigate = useNavigate();

    const handleCreated = useCallback(response => {
      const { submission } = response;
      // Navigate to submission route if not yet submitted or has a confirmation page
      if (
        submission.coreState !== 'Submitted' ||
        submission.displayedPage?.type === 'confirmation'
      ) {
        navigate(submission.id, { state: { persistToasts: true } });
      }
      if (submission.coreState === 'Draft') {
        toastSuccess({ title: 'Draft saved.' });
      }
    }, [navigate]);

    const handleUpdated = useCallback(response => {
      if (response.submission.coreState === 'Draft') {
        toastSuccess({ title: 'Draft saved.' });
      }
    }, []);

    return (
      <CoreForm
        kapp={kappSlug}
        form={formSlug}
        submission={submissionId}
        values={values ?? paramValues}
        created={handleCreated}
        updated={handleUpdated}
        components={components}
        {...props}
      />
    );
  },
);
```

See `skills/front-end/forms/SKILL.md` for the full `generateFormLayout` factory to add a heading, back button, and admin link around the form.

### 4.2 `src/pages/RequestForm.jsx`

```jsx
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { KineticForm } from '../components/KineticForm.jsx';

export function RequestForm() {
  const { formSlug, submissionId } = useParams();
  const kappSlug = useSelector(s => s.app.kappSlug);

  return (
    <main>
      <KineticForm
        kappSlug={kappSlug}
        formSlug={formSlug}
        submissionId={submissionId}  // undefined for new; string for draft resume
      />
    </main>
  );
}
```

**How submission routing works:**

1. User navigates to `/forms/it-request` → `KineticForm` renders with `formSlug` only → new submission
2. On `created`, `handleCreated` navigates to `/forms/it-request/{submissionId}` (relative push)
3. If the user returns to their request list and clicks a draft, they land at `/forms/it-request/{submissionId}` → `KineticForm` loads the existing draft via `submission={submissionId}`
4. If the submission is fully submitted on page 1 with no confirmation page, `handleCreated` does nothing (user stays on the current route with form in submitted state)

---

## Part 5 — Request List

The request list shows the current user's submissions. It must be paginated because users accumulate requests over time.

### 5.1 `src/pages/Requests.jsx`

```jsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { searchSubmissions, defineKqlQuery } from '@kineticdata/react';
import { usePaginatedData } from '../hooks/usePaginatedData.js';

// KQL: submitted by the current user
const myRequestsQuery = defineKqlQuery()
  .equals('createdBy', 'username')
  .end();

export function Requests() {
  const kappSlug = useSelector(s => s.app.kappSlug);
  const username = useSelector(s => s.app.profile?.username);

  const params = useMemo(
    () => kappSlug && username
      ? {
          kapp: kappSlug,
          search: {
            q: myRequestsQuery({ username }),
            include: ['details', 'values', 'form', 'form.attributesMap'],
            limit: 25,
          },
        }
      : null,
    [kappSlug, username],
  );

  const { loading, response, pageNumber, actions } =
    usePaginatedData(searchSubmissions, params);

  const submissions = response?.submissions ?? [];

  return (
    <main>
      <h1>My Requests</h1>

      {loading && <div>Loading…</div>}

      {!loading && submissions.length === 0 && (
        <p>You have no requests yet. <Link to="/">Browse the catalog</Link></p>
      )}

      <ul>
        {submissions.map(sub => (
          <li key={sub.id}>
            <Link to={`/requests/${sub.id}`}>
              <strong>{sub.label || sub.form?.name}</strong>
              <span>{sub.values?.['Status'] ?? sub.coreState}</span>
              <time>{new Date(sub.createdAt).toLocaleDateString()}</time>
            </Link>
          </li>
        ))}
      </ul>

      <nav aria-label="Pagination">
        <button
          onClick={actions.previousPage}
          disabled={!actions.previousPage}
        >
          Previous
        </button>
        <span>Page {pageNumber}</span>
        <button
          onClick={actions.nextPage}
          disabled={!actions.nextPage}
        >
          Next
        </button>
      </nav>
    </main>
  );
}
```

**KQL notes:**
- `createdBy` is a system field — it does not require an `indexDefinitions` entry
- To filter by a form value field (e.g. `values[Status]`), the form must have an index for that field. See `skills/platform/kql-and-indexing/SKILL.md`
- `usePaginatedData` injects `pageToken` automatically on each page change — do not add it to `params` manually

For a full paginated list recipe including filtering and sorting, see `skills/recipes/build-paginated-list/SKILL.md` (if available).

---

## Part 6 — Request Detail Page

The detail page shows the full submission — field values, current status, and an activity timeline.

### 6.1 `src/pages/RequestDetail.jsx`

```jsx
import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSubmission } from '@kineticdata/react';
import { useData } from '../hooks/useData.js';
import { usePoller } from '../hooks/usePoller.js';
import { KineticForm } from '../components/KineticForm.jsx';
import { useSelector } from 'react-redux';

export function RequestDetail() {
  const { submissionId } = useParams();
  const kappSlug = useSelector(s => s.app.kappSlug);

  const params = useMemo(
    () => submissionId
      ? { id: submissionId, include: 'details,values,form,activities,activities.details' }
      : null,
    [submissionId],
  );

  const { loading, response, actions } = useData(fetchSubmission, params);
  const submission = response?.submission;

  // Poll for updates on open submissions; stop polling when closed
  const pollFn = submission?.coreState !== 'Closed' ? actions.reloadData : undefined;
  usePoller(pollFn);

  if (loading || !submission) return <div>Loading…</div>;

  const isDraft = submission.coreState === 'Draft';

  return (
    <main>
      <nav><Link to="/requests">← Back to Requests</Link></nav>

      <h1>{submission.label || submission.form?.name}</h1>
      <dl>
        <dt>Status</dt>
        <dd>{submission.values?.['Status'] ?? submission.coreState}</dd>
        <dt>Submitted</dt>
        <dd>{submission.submittedAt
          ? new Date(submission.submittedAt).toLocaleString()
          : 'Not yet submitted'}</dd>
      </dl>

      {/* Draft: let user continue filling in the form */}
      {isDraft ? (
        <KineticForm
          kappSlug={kappSlug}
          formSlug={submission.form?.slug}
          submissionId={submissionId}
        />
      ) : (
        /* Submitted: render in review (read-only) mode */
        <KineticForm
          kappSlug={kappSlug}
          formSlug={submission.form?.slug}
          submissionId={submissionId}
          review={true}
        />
      )}

      {/* Activity timeline */}
      <section>
        <h2>Activity</h2>
        <ActivityTimeline activities={submission.activities ?? []} />
      </section>
    </main>
  );
}

function ActivityTimeline({ activities }) {
  if (activities.length === 0) return <p>No activity yet.</p>;
  return (
    <ul>
      {[...activities].reverse().map(activity => (
        <li key={activity.id}>
          <time>{new Date(activity.createdAt).toLocaleString()}</time>
          <strong>{activity.label}</strong>
          {activity.details?.content && <p>{activity.details.content}</p>}
        </li>
      ))}
    </ul>
  );
}
```

**Key patterns:**
- `include: 'activities,activities.details'` — `activities.details` is required for work note content; without it, `activity.details` is `null`
- `usePoller(pollFn)` polls with exponential backoff (5s → 10s → 20s → 60s max). Pass `undefined` to stop polling when the request is closed
- `review={true}` on `CoreForm` / `KineticForm` renders the form in read-only mode
- Draft submissions get a live form so users can continue editing; submitted/closed ones get review mode

---

## Part 7 — Recommended Route Structure

```
/                          → Catalog (home — service listing)
/forms/:formSlug           → New request form
/forms/:formSlug/:id       → Resume draft or view submitted form
/requests                  → My request list (paginated)
/requests/:submissionId    → Request detail + activity timeline
/profile                   → User profile (optional)
/login                     → Login (public)
/reset-password/:token?    → Password reset (public)
```

**App.jsx route config:**

```jsx
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login {...loginProps} />} />
  <Route path="/reset-password/:token?" element={<ResetPassword />} />

  {/* Private routes — rendered only when loggedIn && kapp && profile */}
  <Route path="/" element={<Catalog />} />
  <Route path="/forms/:formSlug" element={<RequestForm />} />
  <Route path="/forms/:formSlug/:submissionId" element={<RequestForm />} />
  <Route path="/requests" element={<Requests />} />
  <Route path="/requests/:submissionId" element={<RequestDetail />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

## Part 8 — Project Folder Structure

```
portal/
├── index.html                   ← bundle scripts + Vite entry
├── vite.config.js
├── .env.development.local       ← REACT_APP_PROXY_HOST (gitignored)
└── src/
    ├── main.jsx                 ← ReactDOM.createRoot, KineticLib, HashRouter, Provider
    ├── App.jsx                  ← auth state machine, space/kapp/profile fetch, Routes
    ├── globals.js               ← jQuery, moment — passed to KineticLib globals prop
    ├── redux.js                 ← configureStore, regRedux helper
    ├── api/
    │   └── kinetic.js           ← re-exports + executeIntegration wrapper
    ├── components/
    │   ├── KineticForm.jsx      ← CoreForm wrapper with created/updated handlers
    │   ├── Loading.jsx
    │   └── kinetic-form/
    │       ├── globals.jsx      ← form engine globals (widgets, date pickers)
    │       └── widgets/         ← custom widget implementations
    ├── helpers/
    │   ├── state.js             ← appActions, themeActions via regRedux
    │   ├── records.js           ← getAttributeValue
    │   ├── toasts.js            ← toastSuccess, toastError, clearToasts
    │   └── confirm.js           ← openConfirm, closeConfirm
    ├── hooks/
    │   ├── useData.js           ← single fetch hook (NOT exported by @kineticdata/react)
    │   ├── usePaginatedData.js  ← cursor-paginated list hook
    │   ├── usePagination.js     ← pageToken stack (used by usePaginatedData)
    │   └── usePoller.js         ← exponential backoff polling
    └── pages/
        ├── Catalog.jsx          ← service catalog home
        ├── RequestForm.jsx      ← new/resume form page
        ├── Requests.jsx         ← paginated request list
        ├── RequestDetail.jsx    ← single request + timeline
        ├── Login.jsx
        └── Profile.jsx
```

---

## Common Gotchas

| Gotcha | Fix |
|--------|-----|
| `CoreForm` renders nothing in dev mode | Remove `<React.StrictMode>` — it double-mounts and permanently breaks `_unmounted` |
| Form always stuck in spinner (`{ pending: true }`) | Missing `StrictMode` fix above, OR missing bundle scripts in `index.html`, OR missing `globals` prop on `KineticLib` |
| Login POST rejected with "Invalid CORS request" | Add `proxyReq` handler to rewrite `Origin` header to `REACT_APP_PROXY_HOST` |
| `useData` not found in `@kineticdata/react` | It is a project-local hook — implement it in `src/hooks/useData.js` |
| Form query param values not pre-populating | `valuesFromQueryParams` must parse `?values[Field Name]=value` format |
| Draft saves don't navigate to submission URL | `KineticForm.handleCreated` must call `navigate(submission.id, ...)` on `coreState !== 'Submitted'` |
| Activity `details` is null | Include `activities.details` in the `fetchSubmission` include string |
| Catalog showing inactive forms | Filter client-side: `forms.filter(f => f.status === 'Active')` |
| KQL query returns 400 on submission list | Add `indexDefinitions` to the form for any value field used in `q=` filters |
| `attributesMap` value passed directly to a React prop | Always read with `?.[0]` or `getAttributeValue` — values are arrays |
| `fetchProfile` returns the user at `response.profile`, not `response` | Shape is `{ profile: userObject }` — use `response?.profile` |

---

## Cross-References

- `skills/front-end/bootstrap/SKILL.md` — full KineticLib config, Vite proxy, auth state machine, `HashRouter` rationale
- `skills/front-end/forms/SKILL.md` — `generateFormLayout`, widget system, `bundle.config` overrides, review mode
- `skills/front-end/data-fetching/SKILL.md` — full `useData` and `usePaginatedData` implementations, `usePoller`, `defineKqlQuery`
- `skills/front-end/mutations/SKILL.md` — `executeIntegration`, `deleteSubmission`, `updateProfile`
- `skills/front-end/state/SKILL.md` — `regRedux`, `appActions`, toast system, confirmation modal, `getAttributeValue`
- `skills/platform/kql-and-indexing/SKILL.md` — KQL operators, index definitions, compound indexes
- `skills/platform/workflow-engine/SKILL.md` — workflow trees, deferrals, approval patterns
- `skills/platform/architectural-patterns/SKILL.md` — approval loops, SLA tracking, fulfillment patterns
- `skills/recipes/create-submission-form/SKILL.md` — step-by-step form creation with fields and indexes
- [momentum-portal](https://github.com/kineticdata/momentum-portal) — production reference implementation
