---
name: portal-patterns
description: Portal architecture patterns — routing, Redux setup, useData hook, context fetching, kappSlug resolution, project structure, and reference implementation.
---

# Portal Patterns — Architecture and Reference

> For critical setup (installation, KineticLib, CoreForm prerequisites, Vite proxy, auth state machine), see [`skills/front-end/bootstrap/SKILL.md`](../bootstrap/SKILL.md).

## App Context Fetching

`App.jsx` fetches space, profile, and kapp using `useData` with `useMemo` params. Each fetch is gated on the previous one completing:

```jsx
// 1. Space — fetched immediately; public=true when not logged in
const spaceParams = useMemo(
  () =>
    initialized
      ? loggedIn
        ? { include: 'attributesMap,kapps' }
        : { public: true, include: 'attributesMap,kapps' }
      : null,
  [initialized, loggedIn],
);
const { initialized: spaceInit, loading: spaceLoading, response: spaceData } =
  useData(fetchSpace, spaceParams);
useEffect(() => {
  if (spaceInit && !spaceLoading) appActions.setSpace(spaceData);
}, [spaceInit, spaceLoading, spaceData]);

// 2. Profile — only when logged in
const profileParams = useMemo(
  () =>
    initialized && loggedIn
      ? { include: 'profileAttributesMap,attributesMap,memberships' }
      : null,
  [initialized, loggedIn],
);

// 3. Kapp — only when logged in AND kappSlug is set (derived from space)
const kappParams = useMemo(
  () =>
    initialized && loggedIn && kappSlug
      ? { kappSlug, include: 'attributesMap,categories,categories.attributesMap' }
      : null,
  [initialized, loggedIn, kappSlug],
);
```

**Key `include` values:**
- Space: `'attributesMap,kapps'`
- Profile: `'profileAttributesMap,attributesMap,memberships'`
- Kapp: `'attributesMap,categories,categories.attributesMap'`

---

## kappSlug Resolution

The portal kapp slug is resolved from a space attribute, with a hard-coded fallback:

```js
// In appActions.setSpace (helpers/state.js):
state.kappSlug = getAttributeValue(space, 'Service Portal Kapp Slug', 'service-portal');
```

The attribute name and fallback are project-specific. Configure the space attribute in the Kinetic Console to point to the correct kapp slug. See the State Management skill for the full `appActions` definition.

---

## Layout DOM Portals

Three DOM elements are used as portal targets for rendering into specific layout positions:

```html
<header id="app-header" />    <!-- rendered into by HeaderPortal -->
<footer id="app-footer" />    <!-- rendered into by FooterPortal -->
<div id="app-panels" />       <!-- rendered into by Panel component -->
```

---

## Route Clearing on Navigation

`useRouteChange` clears toasts and the confirmation modal on every route change. Pass `{ persistToasts: true }` in `navigate()` state to suppress this:

```jsx
// In App.jsx
useRouteChange((pathname, state) => {
  if (!state?.persistToasts) clearToasts();
  closeConfirm();
}, []);

// In other components — persist toasts across navigation
navigate('/requests', { state: { persistToasts: true } });
```

---

## Routing Structure

```
PrivateRoutes
├── /theme                    (spaceAdmin only)                 -> Theme
├── /kapps/:kappSlug/forms/:formSlug/submissions/:submissionId  -> redirect
├── /kapps/:kappSlug/forms/:formSlug/:submissionId?             -> Form
├── /kapps/:kappSlug                                            -> redirect to /
├── /actions/*                                                  -> Actions
├── /requests/*                                                 -> Requests
├── /forms/:formSlug/:submissionId?                             -> Form
├── /profile                                                    -> Profile
├── /settings/*                                                 -> SettingsRouting
├── /login             -> redirect to /
└── /*                 -> Home

PublicRoutes
├── /public/*          -> Placeholder (for public-facing content)
├── /reset-password/:token?  -> ResetPassword
├── /login             -> Login
└── /*                 -> Login (catch-all)
```

---

## Redux Store Setup

`portal/src/redux.js` uses `@reduxjs/toolkit` with dynamically injectable slices:

```js
import { configureStore, combineSlices, createSlice } from '@reduxjs/toolkit';

const init = createSlice({ name: 'init', initialState: false,
  reducers: { regRedux: () => true } });
const rootReducer = combineSlices(init);

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['view/handleResize', 'confirm/open'],
        ignoredPaths: ['confirm.options.accept', 'confirm.options.cancel'],
      },
    }),
});

// Helper: register a named slice, return dispatch-wrapped action functions
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

**Usage:**
```js
export const appActions = regRedux('app', initialState, {
  setSpace(state, { error, space }) { /* immer mutation */ },
  setProfile(state, { error, profile }) { ... },
});

// Call anywhere (no useDispatch needed):
appActions.setSpace({ space });
```

See the State Management skill for the full `appActions` and `themeActions` definitions.

---

## useData Hook

`useData` must be implemented in the project — it is not exported by `@kineticdata/react`. Place it in `src/hooks/useData.js`:

See the Data Fetching skill for the full `useData` implementation with timestamp-based stale response rejection and `actions.reloadData`. The simplified version below shows the core concept:

```js
import { useState, useEffect } from "react";

export function useData(fetchFn, params) {
  const [state, setState] = useState({ loading: params !== null, response: null });

  useEffect(() => {
    if (params === null) {
      setState({ loading: false, response: null });
      return;
    }

    let active = true;
    setState({ loading: true, response: null });

    fetchFn(params).then(response => {
      if (active) setState({ loading: false, response });
    });

    return () => { active = false; };
  }, [fetchFn, params]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
```

The production version in the Data Fetching skill adds `initialized`, `actions.reloadData`, and race condition safety via timestamps. Use that version in real projects.

Gate fetches on previous data by passing `null` as params until prerequisites are ready (see App Context Fetching above). Use `useMemo` for param objects to keep referential stability.

---

## Project Folder Structure

Organize a Vite portal project as follows:

```
src/
├── App.jsx              <- thin router shell (auth state machine + data fetching)
├── main.jsx             <- ReactDOM.createRoot, KineticLib, HashRouter
├── styles.css
├── api/
│   └── kinetic.js       <- re-exports from @kineticdata/react + any custom fetch wrappers
├── components/          <- shared, reusable UI components (header, nav, avatar, etc.)
├── hooks/
│   └── useData.js       <- project-local data fetching hook
└── pages/               <- one file per route
```

Keep `App.jsx` as a thin shell: auth state machine, data fetching for space/kapp/profile, and `<Routes>`. Move all page JSX into `pages/`. Move shared UI into `components/`.

---

## `attributesMap` Values Are Arrays

Kinetic's `attributesMap` (returned when `include=attributesMap` is used) stores all attribute values as **arrays**, even single-value attributes:

```js
space.attributesMap["Service Portal Kapp Slug"]  // -> ["service-portal"], NOT "service-portal"
```

Always read a single value with `[0]`:

```js
// WRONG — passing an array as a React prop (e.g. <select value>) causes warnings
const slug = space.attributesMap["Service Portal Kapp Slug"];

// CORRECT
const slug = space.attributesMap["Service Portal Kapp Slug"]?.[0];
```

The `getAttributeValue` helper in the State Management skill handles this automatically. Use it when available.

---

## `fetchProfile` — Response Shape

`fetchProfile` (exported from `@kineticdata/react`) returns `{ profile: userObject }`, not the raw user object:

```js
const { response } = useData(fetchProfile, params);
const me = response?.profile;  // NOT response itself
```

---

## `loginProps` — Shape from `KineticLib`

`KineticLib` injects `loginProps` into its render-prop child when `loggedIn` is `false`. The shape is:

```js
{
  username: string,
  password: string,
  error: string | null,       // authentication error message
  pending: boolean,           // true while login request is in flight
  onChangeUsername: EventHandler,
  onChangePassword: EventHandler,
  onLogin: FormSubmitHandler, // call as form onSubmit
  onSso: Function | undefined // only present when SSO is configured
}
```

Bind these directly to form inputs — do not manage username/password in local state. `onLogin` is an event handler suitable for `<form onSubmit={onLogin}>`.

---

## `HashRouter` vs `BrowserRouter`

Use `HashRouter` (not `BrowserRouter`) for Vite-proxied portals. With `BrowserRouter`, navigating to a deep path like `/profile` and then refreshing causes Vite's proxy to intercept the path and try to forward it to the Kinetic server instead of serving `index.html`.

`HashRouter` keeps all client-side paths after `#`, so Vite only ever sees `/` on hard refresh:

```jsx
// main.jsx
<HashRouter>
  <KineticLib locale="en">
    {kineticProps => <App {...kineticProps} />}
  </KineticLib>
</HashRouter>
```

---

## Reference Implementation: momentum-portal

The [momentum-portal](https://github.com/kineticdata/momentum-portal) is the canonical reference for building Kinetic Platform React portals. Key architectural patterns:

### Tech Stack
- `@kineticdata/react` ^6.1.1, React 18, React Router v6 (HashRouter)
- `@reduxjs/toolkit` with dynamic slice injection via `regRedux()`
- Tailwind CSS v4 + DaisyUI v5 + custom CSS variables for theming
- Ark UI headless components (Popover, Combobox, Toast, Portal)
- Vite build with proxy to Kinetic server

### Key Patterns

**Kapp slug from space attribute:** The portal kapp slug comes from the space attribute `"Service Portal Kapp Slug"`, defaulting to `"service-portal"`.

**Dynamic Redux slices:** `regRedux(name, initialState, reducers)` creates a Redux Toolkit slice, injects it into the root reducer, and returns pre-bound action dispatchers (no `dispatch()` needed):
```jsx
const appActions = regRedux('app', { space: null, profile: null }, {
  setSpace: (state, action) => { state.space = action.payload; },
});
appActions.setSpace(data); // dispatches automatically
```

**Responsive design via Redux:** A `view` slice tracks `{ width, size, mobile, tablet, desktop }` via resize listener, consumed with `useSelector(s => s.view.mobile)`.

**Portal-based layout:** Header/footer render into placeholder DOM elements via Ark UI `<Portal>`:
```html
<header id="app-header" />
<main id="app-main"><!-- React renders here --></main>
<footer id="app-footer" />
```

**Theme system:** Theme config stored as JSON in a kapp attribute `"Theme"`, parsed at runtime, converted to CSS variables, and applied via `document.adoptedStyleSheets`.

**Widget system:** Standalone React mini-apps rendered inside CoreForm fields via `bundle.widgets.Search(...)`. Widgets: Markdown, Search, Signature, Subform, Table.

**Form lifecycle callbacks:**
- `created` -> navigate to submission route + toast
- `updated` -> toast "save successful"
- `completed` -> navigate away
- `loaded` -> capture form reference

**URL -> field values:** `valuesFromQueryParams(searchParams)` parses `?values[Field Name]=value` from URL into `{ "Field Name": "value" }` for pre-filling forms.

**Confirmation modal:** Global `ConfirmationModal` at root, triggered via `openConfirm({ title, description, accept, cancel })` from anywhere.

**Toast system:** Ark UI `createToaster` wrapper with `toastSuccess({ title })` / `toastError({...})` helpers.
