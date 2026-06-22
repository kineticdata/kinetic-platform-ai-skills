---
name: build-service-portal
description: "Use when building a complete self-service portal on the Kinetic Platform (IT catalog, recruiting, facilities, field service) — a React SPA with kapp/workflow setup, @kineticdata/react + Vite + routing, a service catalog, KineticForm request pages, paginated request lists, and request-detail tracking."
---

# Recipe: Build a Service Portal

This recipe walks through building a complete self-service portal on the Kinetic Platform — a React SPA that lets users browse available services, submit requests, and track their submissions through resolution. The architecture is **domain-agnostic**: the same pattern works for an IT service catalog, a recruiting portal, a facilities management system, a field service app, or any other submission-driven workflow.

The reference production implementation is [momentum-portal](https://github.com/kineticdata/momentum-portal).

**Before reading this recipe, read these foundational skills:**
- `skills/front-end/bootstrap/SKILL.md` — Vite scaffold/install, dev proxy, KineticLib entry point, CoreForm prerequisites, auth state machine
- `skills/front-end/portal-patterns/SKILL.md` — routing, Redux/regRedux, useData, App-context fetching, kappSlug resolution, project structure
- `skills/front-end/forms/SKILL.md` — CoreForm, KineticForm wrapper, globals.jsx
- `skills/front-end/data-fetching/SKILL.md` — useData, usePaginatedData, defineKqlQuery
- `skills/front-end/mutations/SKILL.md` — executeIntegration, submission CRUD
- `skills/front-end/state/SKILL.md` — regRedux, appActions, toasts, confirmation modal

---

## Overview

A service portal has six main concerns:

1. **Platform setup** — a kapp with service forms and a workflow tree
2. **React project setup** — Vite + `@kineticdata/react` + Redux + routing (in `bootstrap` and `portal-patterns`; not repeated here)
3. **Service catalog** — listing available forms grouped by category
4. **Request form page** — rendering forms with `KineticForm`
5. **Request list** — paginated, filterable submission history
6. **Request detail** — single submission with activity timeline

This recipe documents only the **portal-specific** layers (1, 3, 4, 5, 6). The shared React scaffold (concern 2) lives in the foundational skills above — this recipe references it rather than duplicating it.

---

## Part 1 — Platform Setup

The platform side is covered by other skills — this section is a checklist with pointers, not a duplicate walkthrough.

| Step | What you're doing | Read |
|---|---|---|
| 1.1 | Create the kapp shell with formTypes, kapp-level indexes, categories, attributes, and security policies | `concepts/kapp-lifecycle` (end-to-end worked example) — or run `/kinetic-new-app` |
| 1.2 | Create one form per service in the catalog | `recipes/create-submission-form` — the complete valid PUT body is in there |
| 1.3 | Set a space attribute pointing the portal at the kapp | `PUT /app/api/v1/space` with `attributesMap: { "Service Portal Kapp Slug": ["service-portal"] }`. The portal's `appActions.setSpace` reads this to resolve `kappSlug`. |
| 1.4 | Attach approval / fulfillment workflows | `recipes/add-approval-workflow` (deferral pattern) and `concepts/architectural-patterns` (fulfillment, SLA tracking) |

**Service-portal-specific form conventions:**

| Property | Value |
|---|---|
| `type` | `"Service"` (must be registered in the kapp's `formTypes` — see `concepts/kapp-lifecycle`) |
| `status` | `"Active"` |
| `anonymous` | `false` |
| Form attribute `Icon` | Icon name string (e.g. `"laptop"`) — displayed in the catalog tile |
| Form attribute `Description` | Short description shown in the catalog tile |
| Form attribute `Category` | Category name for grouping (optional alternative to kapp categories) |
| Index: `values[Status]` | Required for KQL queries on the request list and request detail pages |

For everything in Part 1 other than the "kapp slug space attribute" pointer, the linked skills are authoritative — this recipe doesn't re-derive them.

---

## Part 2 — React Project Setup

> Project setup (Vite scaffold, dev proxy, `@kineticdata/react` install, `index.html` bundle scripts, `globals.js`, the `KineticLib` entry point, and the no-`StrictMode` auth state machine) is in `skills/front-end/bootstrap/SKILL.md`.

> Routing, the Redux store + `regRedux`, the `useData` hook, App-context fetching (space/profile/kapp), and kappSlug resolution are in `skills/front-end/portal-patterns/SKILL.md`.

Build `index.html`, `vite.config.js`, `src/globals.js`, `src/main.jsx`, `src/redux.js`, and the `App.jsx` auth state machine per those two skills. The only portal-specific addition is the **private route table** below, which wires this recipe's pages into the App shell once `loggedIn && kapp && profile` are ready.

### 2.1 Private Routes

These are the authenticated routes rendered by `App.jsx` after the auth state machine reaches the ready state (see the `portal-patterns` routing section for where this `<Routes>` block sits in the shell):

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Catalog } from './pages/Catalog.jsx';
import { RequestForm } from './pages/RequestForm.jsx';
import { Requests } from './pages/Requests.jsx';
import { RequestDetail } from './pages/RequestDetail.jsx';

<Routes>
  <Route path="/" element={<Catalog />} />
  <Route path="/forms/:formSlug" element={<RequestForm />} />
  <Route path="/forms/:formSlug/:submissionId" element={<RequestForm />} />
  <Route path="/requests" element={<Requests />} />
  <Route path="/requests/:submissionId" element={<RequestDetail />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

`Catalog`, `RequestForm`, `Requests`, and `RequestDetail` are the portal-specific pages defined in Parts 3–6. `Login`, `Profile`, and `ResetPassword` (referenced in the full route table in Part 7) are standard portal pages — see `bootstrap` (login/auth) and `portal-patterns` (public routes); they are out of scope for this recipe.

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
- To filter by a form value field (e.g. `values[Status]`), the form must have an index for that field. See `skills/concepts/kql-and-indexing/SKILL.md`
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
- `usePoller(pollFn)` polls with exponential backoff (5s → 10s → 20s → 40s → 60s max). Pass `undefined` to stop polling when the request is closed
- `review={true}` on `CoreForm` / `KineticForm` renders the form in read-only mode
- Draft submissions get a live form so users can continue editing; submitted/closed ones get review mode

---

## Part 7 — Route Structure

> The full route structure (public + private routing, where `<Routes>` sits in the App shell) is in `skills/front-end/portal-patterns/SKILL.md`. The private routes for this recipe's pages are in Part 2.1.

Portal-specific path → page mapping:

```
/                          → Catalog (home — service listing)
/forms/:formSlug           → New request form
/forms/:formSlug/:id       → Resume draft or view submitted form
/requests                  → My request list (paginated)
/requests/:submissionId    → Request detail + activity timeline
```

`/login`, `/reset-password/:token?`, and `/profile` are standard portal routes — out of scope here (see `bootstrap` and `portal-patterns`).

---

## Part 8 — Project Folder Structure

> The base Vite portal layout (`index.html`, `vite.config.js`, `main.jsx`, `App.jsx`, `redux.js`, `globals.js`, `api/`, `components/`, `helpers/`, `hooks/`) is in `skills/front-end/portal-patterns/SKILL.md`. This recipe adds the portal-specific pages and the `KineticForm` wrapper:

```
src/
├── components/
│   └── KineticForm.jsx      ← CoreForm wrapper with created/updated handlers (Part 4)
├── hooks/
│   └── usePoller.js         ← exponential backoff polling (used by RequestDetail; see data-fetching)
└── pages/
    ├── Catalog.jsx          ← service catalog home (Part 3)
    ├── RequestForm.jsx      ← new/resume form page (Part 4)
    ├── Requests.jsx         ← paginated request list (Part 5)
    └── RequestDetail.jsx    ← single request + activity timeline (Part 6)
```

---

## Common Gotchas

> Setup-level gotchas (`StrictMode` breaking `CoreForm`, the spinner / bundle-scripts / `globals` issues, the "Invalid CORS request" Origin rewrite, `useData` being project-local) are in `bootstrap` and `portal-patterns`. The rows below are portal-specific.

| Gotcha | Fix |
|--------|-----|
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
- `skills/front-end/portal-patterns/SKILL.md` — routing, Redux/`regRedux`, `useData`, App-context fetching, kappSlug resolution, project structure
- `skills/front-end/forms/SKILL.md` — `generateFormLayout`, widget system, `bundle.config` overrides, review mode
- `skills/front-end/data-fetching/SKILL.md` — full `useData` and `usePaginatedData` implementations, `usePoller`, `defineKqlQuery`
- `skills/front-end/mutations/SKILL.md` — `executeIntegration`, `deleteSubmission`, `updateProfile`
- `skills/front-end/state/SKILL.md` — `regRedux`, `appActions`, toast system, confirmation modal, `getAttributeValue`
- `skills/concepts/kql-and-indexing/SKILL.md` — KQL operators, index definitions, compound indexes
- `skills/concepts/workflow-engine/SKILL.md` — workflow trees, deferrals, approval patterns
- `skills/concepts/architectural-patterns/SKILL.md` — approval loops, SLA tracking, fulfillment patterns
- `skills/recipes/create-submission-form/SKILL.md` — step-by-step form creation with fields and indexes
- [momentum-portal](https://github.com/kineticdata/momentum-portal) — production reference implementation
