# Portal Bootstrap and App Context

## Mandatory API Client Rule

Use `@kineticdata/react` as the API client for all Kinetic interactions in portal code. Bootstrap patterns must start with `KineticLib` and data access should use library primitives (`fetch*`, `searchSubmissions`). Only fall back to `bundle.apiLocation()` + `getCsrfToken()` if an endpoint has no exported helper.

`useData` is **not** exported by `@kineticdata/react` — it is a project-local hook that wraps fetch functions with `{ loading, response }` state. See the `useData` implementation below.

---

## Never Use React.StrictMode with CoreForm — Critical

`CoreFormComponent` is a React class component that tracks its unmounted state with `this._unmounted`. In React 18 development mode, `StrictMode` intentionally double-mounts every component — calling `componentDidMount`, then `componentWillUnmount`, then `componentDidMount` again.

This causes `_unmounted` to be permanently `true` after the first unmount cycle. The second (real) mount then silently drops all async state updates via `setStateSafe`, leaving the component permanently in `{ pending: true }` — which renders an invisible FontAwesome spinner. The form never appears, with no error in the console.

**Fix: never wrap a Kinetic portal in `<React.StrictMode>`.**

```jsx
// main.jsx — CORRECT
ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <KineticLib globals={globals} locale="en">
      {kineticProps => <App {...kineticProps} />}
    </KineticLib>
  </HashRouter>,
);

// WRONG — CoreForm will never render in dev mode
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <KineticLib ...>
        {kineticProps => <App {...kineticProps} />}
      </KineticLib>
    </HashRouter>
  </React.StrictMode>,
);
```

---

## CoreForm Requires Kinetic Bundle Scripts in `index.html` — Critical

`CoreForm` calls `window.K.load()` internally. `window.K` is set by Kinetic's bundle JavaScript — it is **never** set by the `@kineticdata/react` library itself. Without these scripts, `CoreForm` renders nothing and produces no error.

Add the following to `index.html` **before** the Vite entry point `<script>`:

```html
<head>
  <!-- Required for CommonJS compat in browser -->
  <script>
    window.global ||= window;
  </script>

  <!-- Kinetic Bundle — provides window.K (form engine), window.bundle, and form styles -->
  <link rel="stylesheet" href="/app/head.css" type="text/css" media="all" />
  <script src="/app/head.js"></script>
  <script src="/app/bundle.js"></script>
</head>
```

These files are served by the Kinetic server and proxied through Vite (they are not local files). The Vite dev proxy must be configured to forward requests to the Kinetic server for this to work.

---

## CoreForm Requires `globals` Prop — Critical

In addition to the bundle scripts above, `CoreForm` will not work unless `KineticLib` receives a `globals` prop. The `globals` prop must be a dynamic `import()` Promise that sets up jQuery, moment, and auth:

```js
// src/globals.js — minimal required setup
import jquery from "jquery";
import moment from "moment";

jquery.ajaxSetup({ xhrFields: { withCredentials: true } }); // sends auth cookies
window.$ = jquery;
window.jQuery = jquery;
window.moment = moment;
```

```jsx
// main.jsx
const globals = import("./globals.js");  // dynamic import — starts immediately

<KineticLib globals={globals} locale="en">
  {kineticProps => <App {...kineticProps} />}
</KineticLib>
```

`KineticLib` awaits the globals promise before the form engine initializes. Without it, `CoreForm` renders nothing. The `withCredentials: true` setting is required so Kinetic form AJAX calls send session cookies — without it, all form API requests return 401.

Install dependencies: `npm install jquery moment`

---

## index.jsx — Entry Point

`portal/src/index.jsx` wires together the three outer layers and kicks off globals asynchronously so the initial render is not blocked:

```jsx
import { KineticLib } from '@kineticdata/react';
import { App } from './App.jsx';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux.js';

// Async import — starts immediately, CoreForm waits for it to resolve
const globals = import('./components/kinetic-form/globals.jsx');

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

`KineticLib` injects `{ initialized, loggedIn, loginProps, timedOut, serverError }` as props into `App`.

---

## App.jsx — Auth State Machine

`portal/src/App.jsx` handles the full auth/load lifecycle and renders the correct subtree:

```jsx
// Render logic (inside App)
return (
  <>
    <div className="flex-c-st flex-auto overflow-auto">
      <header id="app-header" className="flex-none" />        {/* portal target */}
      <main id="app-main" className="flex-auto ...">
        {serverError || error ? (
          <Error error={serverError || error} header={true} />
        ) : !initialized || !space ? (
          <Loading />
        ) : !loggedIn ? (
          <PublicRoutes loginProps={loginProps} />
        ) : kapp && profile ? (
          <>
            <PrivateRoutes />
            {timedOut && <dialog open><Login {...loginProps} /></dialog>}
          </>
        ) : (
          <Loading />
        )}
        <Toaster />
      </main>
      <footer id="app-footer" />
    </div>
    <div id="app-panels" />     {/* portal target for side panels */}
    <ConfirmationModal />
  </>
);
```

**State machine:**
1. `!initialized || !space` → show Loading
2. `!loggedIn` → PublicRoutes (login, create-account, reset-password)
3. `kapp && profile` loaded → PrivateRoutes
4. `timedOut` (session expired while logged in) → overlay dialog with Login

---

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

The portal kapp slug is resolved from space attributes, with a hard-coded fallback:

```js
// helpers/lifecycle.js
export const PLATFORM_ONE_KAPP_SLUG = 'platform-one';
export const KAPP_SLUG_ATTRIBUTES = [
  'Lifecycle Kapp Slug',
  'Service Portal Kapp Slug',
];

// In appActions.setSpace:
state.kappSlug =
  KAPP_SLUG_ATTRIBUTES.map(name => getAttributeValue(space, name)).find(Boolean)
  || PLATFORM_ONE_KAPP_SLUG;
```

The portal checks `Lifecycle Kapp Slug` first, then `Service Portal Kapp Slug`, then falls back to `'platform-one'`.

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
├── /kapps/:kappSlug/forms/:formSlug/submissions/:submissionId  → redirect
├── /kapps/:kappSlug/forms/:formSlug/:submissionId?             → Form
├── /kapps/:kappSlug                                            → redirect to /
├── /actions/*         (role-gated — internal users only)       → Actions
├── /requests/*                                                 → Requests
├── /forms/:formSlug/:submissionId?                             → Form
├── /profile                                                    → Profile
├── /settings/*                                                 → SettingsRouting
├── /login             → redirect to /
└── /*                 → Home

PublicRoutes
├── /login             → Login
├── /create-account    → CreateAccount
├── /reset-password    → ResetPassword
└── /*                 → Login (catch-all)
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

See `react/state.md` for the full `appActions` and `themeActions` definitions.

---

## useData Hook

`useData` must be implemented in the project — it is not exported by `@kineticdata/react`. Place it in `src/hooks/useData.js`:

```js
import { useState, useEffect } from "react";

/**
 * Calls fetchFn(params) whenever params changes.
 * When params is null, the fetch is skipped and loading is false.
 * Returns { loading, response }.
 */
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

Gate fetches on previous data by passing `null` as params until prerequisites are ready (see App Context Fetching above). Use `useMemo` for param objects to keep referential stability.

---

## Vite Config — Dev Proxy

`portal/vite.config.js` proxies everything to the Kinetic Platform except local dev assets:

```js
server: {
  port: 3000,
  proxy: {
    // Proxy everything EXCEPT /@*, /src*, /node_modules*, /index.html, /
    '^(?!(/@|/src|/node_modules|/index.html|/$)).*$': {
      target: env.REACT_APP_PROXY_HOST,
      changeOrigin: true,
      secure: false,
      configure: proxy => {
        // Strip Secure and SameSite=None from cookies (required for http dev)
        proxy.on('proxyRes', (proxyRes, req) => {
          const setCookie = proxyRes.headers['set-cookie'];
          if (setCookie && req.protocol === 'http') {
            proxyRes.headers['set-cookie'] = Array.isArray(setCookie)
              ? setCookie.map(removeSecure).map(removeSameSiteNone)
              : removeSameSiteNone(removeSecure(setCookie));
          }
        });
      },
    },
  },
},
```

Set `REACT_APP_PROXY_HOST` in `.env.development.local` to the Kinetic base URL (e.g. `https://myspace.kinops.io`). `setupEnv.cjs` creates this file automatically.

**Origin header rewrite (required for login):** Browsers send `Origin: http://localhost:3000` on POST requests. Vite's `changeOrigin: true` only rewrites the `Host` header — Kinetic will reject the mismatched origin with "Invalid CORS request". Add an `onProxyReq` handler to rewrite it:

```js
configure: proxy => {
  proxy.on("proxyReq", proxyReq => {
    proxyReq.setHeader("origin", target);
  });
  // ... existing proxyRes cookie handler
},
```

**Required `define` shims:** `@kineticdata/react` is a CommonJS bundle that references Node.js globals (`process.env`, `global`) which don't exist in the browser. Add these to `vite.config.js`:

```js
define: {
  "process.env": {},
  global: "globalThis",
},
```

**Required extra dependency:** `isarray` is a missing transitive dependency of `@kineticdata/react` that Vite cannot resolve. Install it explicitly:

```bash
npm install isarray
```

**Vite plugins used:** `@vitejs/plugin-react`, `vite-plugin-svgr`, `@tailwindcss/vite`.

---

## Environment Configuration

`portal/src/setupEnv.cjs` creates `.env.development.local` with:
```
REACT_APP_PROXY_HOST=https://<space>.kinops.io
```

Run it once after cloning: `node src/setupEnv.cjs`.

---

## Project Folder Structure

Organize a Vite portal project as follows:

```
src/
├── App.jsx              ← thin router shell (auth state machine + data fetching)
├── main.jsx             ← ReactDOM.createRoot, KineticLib, HashRouter
├── styles.css
├── api/
│   └── kinetic.js       ← re-exports from @kineticdata/react + any custom fetch wrappers
├── components/          ← shared, reusable UI components (header, nav, avatar, etc.)
├── hooks/
│   └── useData.js       ← project-local data fetching hook
└── pages/               ← one file per route
```

Keep `App.jsx` as a thin shell: auth state machine, data fetching for space/kapp/profile, and `<Routes>`. Move all page JSX into `pages/`. Move shared UI into `components/`.

---

## `attributesMap` Values Are Arrays

Kinetic's `attributesMap` (returned when `include=attributesMap` is used) stores all attribute values as **arrays**, even single-value attributes:

```js
space.attributesMap["Lifecycle Kapp Slug"]  // → ["platform-one"], NOT "platform-one"
```

Always read a single value with `[0]`:

```js
// WRONG — passing an array as a React prop (e.g. <select value>) causes warnings
const slug = space.attributesMap["Lifecycle Kapp Slug"];

// CORRECT
const slug = space.attributesMap["Lifecycle Kapp Slug"]?.[0];
```

The `getAttributeValue` helper in `react/state.md` handles this automatically. Use it when available.

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
