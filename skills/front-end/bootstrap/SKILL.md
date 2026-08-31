---
name: bootstrap
description: "Use when scaffolding a new Kinetic React portal or debugging its startup — installing @kineticdata/react (React 18 only, isarray quirk), wiring the KineticLib entry point and CoreForm prerequisites, configuring the Vite dev proxy with the process.env shim, or handling the login/auth state machine."
---

# Portal Bootstrap — Critical Setup

> For portal architecture patterns (routing, Redux, useData, project structure), see [`skills/front-end/portal-patterns/SKILL.md`](../portal-patterns/SKILL.md).

## Installation

`@kineticdata/react` is published on **public npm**:

```bash
npm install react@18 react-dom@18 @kineticdata/react
```

**React 18 is required** — `@kineticdata/react` is not compatible with React 19. Use `react@18` and `react-dom@18`.

**Missing transitive dependency:** You may need to install `isarray` separately (`npm install isarray`) if you get build errors about unresolved imports from `@kineticdata/react/lib/components/table/Table.redux.js`.

For new portals, the [momentum-portal](https://github.com/kineticdata/momentum-portal) is the reference project with everything pre-configured.

### What to use from the package

The package exports 815+ symbols, but most are for Kinetic's internal admin consoles. **For portal development, use:**

| Export | Purpose |
|--------|---------|
| `KineticLib` | Wraps the app — manages auth, provides render props |
| `CoreForm` | Renders Kinetic forms (the primary UI component) |
| `fetchSpace`, `fetchKapp`, `fetchProfile`, etc. | API fetch functions for reading data |
| `searchSubmissions`, `fetchSubmission` | Submission queries |
| `createSubmission`, `updateSubmission`, `deleteSubmission` | Submission mutations |
| `saveSubmissionMultipart` | File upload with submissions |
| `getCsrfToken` | CSRF token for custom fetch calls |
| `bundle` | Access to `bundle.apiLocation()`, `bundle.kappSlug()`, etc. |
| `generateKey` | Unique key generation |
| `defineKqlQuery`, `defineFilter` | Fluent query builders |
| `I18n`, `I18nProvider` | Internationalization |
| `Table`, `SimpleForm` | Optional — reusable data table and simple form components |

Components like `TreeBuilder`, `HandlerTable`, `EngineSettingsForm`, `SystemForm`, etc. are **admin-console-only** — not intended for customer portal use.

The SDK wraps the platform APIs so that if the underlying API changes, customers only need to bump to the latest SDK version rather than rewrite API calls.

## Mandatory API Client Rule

Use `@kineticdata/react` as the API client for all Kinetic interactions in portal code. Bootstrap patterns must start with `KineticLib` and data access should use library primitives (`fetch*`, `searchSubmissions`). Only fall back to `bundle.apiLocation()` + `getCsrfToken()` if an endpoint has no exported helper.

`useData` is **not** exported by `@kineticdata/react` — it is a project-local hook that wraps fetch functions with `{ initialized, loading, response, actions }` state (where `actions: { reloadData }`). See the [Data Fetching skill](../data-fetching/SKILL.md) for the canonical implementation, or the [Portal Patterns skill](../portal-patterns/SKILL.md#usedata-hook).

---

## Never Use React.StrictMode with CoreForm — Critical

`CoreFormComponent` is a React class component that tracks its unmounted state with `this._unmounted`. In React 18 development mode, `StrictMode` intentionally double-mounts every component — calling `componentDidMount`, then `componentWillUnmount`, then `componentDidMount` again.

This causes `_unmounted` to be permanently `true` after the first unmount cycle. The second (real) mount then silently drops all async state updates via `setStateSafe`, leaving the component permanently in `{ pending: true }` — which renders an invisible FontAwesome spinner. The form never appears, with no error in the console.

**Fix: never wrap a Kinetic portal in `<React.StrictMode>`.**

## Entry Point Ordering

The momentum-portal uses **Provider > KineticLib > HashRouter > App**, but the ordering depends on your implementation. The key constraint is that `KineticLib` must wrap any component that uses `CoreForm` or Kinetic fetch helpers:

```jsx
// index.jsx — CORRECT (matches momentum-portal)
import { KineticLib } from '@kineticdata/react';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux.js';

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

**Key constraint:** `KineticLib` must wrap any component using `CoreForm` or Kinetic fetch helpers. Beyond that, the ordering of `Provider`, `HashRouter`, etc. is up to your implementation. The only hard rule is no `<React.StrictMode>` (see above).

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
      <header id="app-header" className="flex-none" />
      <main id="app-main" className="flex-auto ...">
        {!initialized ? (
          <Loading />
        ) : serverError || error ? (
          <Error error={serverError || error} header={true} />
        ) : !loggedIn ? (
          <PublicRoutes loginProps={loginProps} />
        ) : !space ? (
          <Loading />
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
    <div id="app-panels" />
    <ConfirmationModal />
  </>
);
```

**State machine:**
1. `!initialized` -> show Loading (waiting for auth to initialize)
2. `serverError || error` -> Error
3. `!loggedIn` -> PublicRoutes (login, reset-password) — **does not wait on the space fetch**
4. `!space` -> Loading (logged in, still waiting on the space record)
5. `kapp && profile` loaded -> PrivateRoutes
6. `timedOut` (session expired while logged in) -> overlay dialog with Login

Note the order matters: a logged-out user reaches the login screen without waiting for the space record to load.

For context fetching (space, profile, kapp), kappSlug resolution, and the larger routing structure, see the [Portal Patterns skill](../portal-patterns/SKILL.md). The minimum boilerplate to reach a running portal is below.

---

## Zero-to-Running — Minimum Boilerplate

Everything below is the smallest set of files that boots a portal end-to-end from this skill alone. Each is a complete file (no `...` placeholders, no cross-skill detours). Drop these into a fresh Vite project to reach a logged-in `Home` route.

### `src/redux.js`

```js
import { configureStore, combineSlices, createSlice } from '@reduxjs/toolkit';

const init = createSlice({
  name: 'init',
  initialState: false,
  reducers: { regRedux: () => true },
});

const rootReducer = combineSlices(init);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['view/handleResize', 'confirm/open'],
        ignoredPaths: ['confirm.options.accept', 'confirm.options.cancel'],
      },
    }),
});

export const regRedux = (name, initialState, reducers) => {
  const slice = createSlice({
    name,
    initialState,
    reducers: Object.fromEntries(
      Object.entries(reducers).map(([k, v]) => [k, (state, { payload }) => v(state, payload)]),
    ),
  });
  rootReducer.inject(slice, { overrideExisting: true });
  store.dispatch(init.actions.regRedux());
  return Object.fromEntries(
    Object.entries(slice.actions).map(([k, v]) => [k, (...args) => store.dispatch(v(...args))]),
  );
};

// Minimum app state — extend in your own appActions file
export const appActions = regRedux(
  'app',
  { space: null, profile: null, kapp: null, kappSlug: null, error: null },
  {
    setSpace(state, { space, error }) { state.space = space; state.error = error ?? null; state.kappSlug = space?.attributesMap?.['Service Portal Kapp Slug']?.[0] ?? 'services'; },
    setProfile(state, { profile, error }) { state.profile = profile; state.error = error ?? null; },
    setKapp(state, { kapp, error }) { state.kapp = kapp; state.error = error ?? null; },
  },
);
```

### `src/helpers/hooks/useData.js`

```js
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useData(fn, params) {
  const [[response, lastTimestamp], setData] = useState([null, null]);

  const executeQuery = useCallback(() => {
    if (params) {
      const timestamp = new Date().getTime();
      setData(([d]) => [d, timestamp]);
      fn(params).then((response) => {
        setData(([d, ts]) => (ts === timestamp ? [response, null] : [d, ts]));
      });
    } else {
      setData(([, ts]) => [null, ts]);
    }
  }, [fn, params]);

  useEffect(() => { executeQuery(); }, [executeQuery]);

  return useMemo(
    () => ({
      initialized: !!params,
      loading: !!params && (!response || !!lastTimestamp),
      response,
      actions: { reloadData: executeQuery },
    }),
    [params, response, lastTimestamp, executeQuery],
  );
}
```

> Remember to `useMemo` the `params` object at the call site (see the param-identity hazard warning in `front-end/data-fetching`).

### `src/components/Loading.jsx` and `Error.jsx`

```jsx
// Loading.jsx
export const Loading = () => (
  <div role="status" aria-live="polite">Loading…</div>
);

// Error.jsx
export const Error = ({ error, header }) => (
  <div role="alert" className="p-4">
    {header && <h2>Error</h2>}
    <p>{String(error?.message ?? error)}</p>
  </div>
);
```

### `src/components/Toaster.jsx` (stub)

```jsx
// Replace with your real toast system later — this is the minimum to make App.jsx render.
export const Toaster = () => null;
```

### `src/components/ConfirmationModal.jsx` (stub)

```jsx
export const ConfirmationModal = () => null;
```

### `src/routes/PublicRoutes.jsx`

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';

export const Login = ({ onLogin }) => {
  const submit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onLogin?.({ username: form.get('username'), password: form.get('password') });
  };
  return (
    <form onSubmit={submit}>
      <label>Username <input name="username" autoComplete="username" /></label>
      <label>Password <input name="password" type="password" autoComplete="current-password" /></label>
      <button type="submit">Sign in</button>
    </form>
  );
};

export const PublicRoutes = ({ loginProps }) => (
  <Routes>
    <Route path="/login" element={<Login {...loginProps} />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
```

### `src/routes/PrivateRoutes.jsx`

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Home = () => {
  const profile = useSelector((s) => s.app.profile);
  const kapp = useSelector((s) => s.app.kapp);
  return (
    <div>
      <h1>Hello {profile?.displayName ?? profile?.username}</h1>
      <p>You are on the {kapp?.name ?? 'no'} kapp.</p>
    </div>
  );
};

export const PrivateRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
```

### `src/App.jsx`

```jsx
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { fetchSpace, fetchProfile, fetchKapp } from '@kineticdata/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loading } from './components/Loading';
import { Error as ErrorView } from './components/Error';
import { Toaster } from './components/Toaster';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PublicRoutes } from './routes/PublicRoutes';
import { PrivateRoutes } from './routes/PrivateRoutes';
import { Login } from './routes/PublicRoutes';
import { appActions } from './redux';
import { useData } from './helpers/hooks/useData';

export const App = ({ initialized, loggedIn, loginProps, timedOut, serverError }) => {
  const space = useSelector((s) => s.app.space);
  const profile = useSelector((s) => s.app.profile);
  const kapp = useSelector((s) => s.app.kapp);
  const kappSlug = useSelector((s) => s.app.kappSlug);
  const error = useSelector((s) => s.app.error);

  // Space
  const spaceParams = useMemo(
    () => initialized
      ? loggedIn ? { include: 'attributesMap,kapps' } : { public: true, include: 'attributesMap,kapps' }
      : null,
    [initialized, loggedIn],
  );
  const spaceQuery = useData(fetchSpace, spaceParams);
  useEffect(() => {
    if (spaceQuery.initialized && !spaceQuery.loading) appActions.setSpace(spaceQuery.response ?? {});
  }, [spaceQuery.initialized, spaceQuery.loading, spaceQuery.response]);

  // Profile (logged-in only)
  const profileParams = useMemo(
    () => initialized && loggedIn ? { include: 'profileAttributesMap,attributesMap,memberships' } : null,
    [initialized, loggedIn],
  );
  const profileQuery = useData(fetchProfile, profileParams);
  useEffect(() => {
    if (profileQuery.initialized && !profileQuery.loading) appActions.setProfile(profileQuery.response ?? {});
  }, [profileQuery.initialized, profileQuery.loading, profileQuery.response]);

  // Kapp (logged-in + kappSlug resolved)
  const kappParams = useMemo(
    () => initialized && loggedIn && kappSlug ? { kappSlug, include: 'attributesMap,categories' } : null,
    [initialized, loggedIn, kappSlug],
  );
  const kappQuery = useData(fetchKapp, kappParams);
  useEffect(() => {
    if (kappQuery.initialized && !kappQuery.loading) appActions.setKapp(kappQuery.response ?? {});
  }, [kappQuery.initialized, kappQuery.loading, kappQuery.response]);

  return (
    <>
      <div className="flex-c-st flex-auto overflow-auto">
        <header id="app-header" className="flex-none" />
        <main id="app-main" className="flex-auto">
          {serverError || error ? (
            <ErrorView error={serverError || error} header={true} />
          ) : !initialized || !space ? (
            <Loading />
          ) : !loggedIn ? (
            <PublicRoutes loginProps={loginProps} />
          ) : kapp && profile ? (
            <ErrorBoundary>
              <PrivateRoutes />
              {timedOut && <dialog open><Login {...loginProps} /></dialog>}
            </ErrorBoundary>
          ) : (
            <Loading />
          )}
          <Toaster />
        </main>
        <footer id="app-footer" />
      </div>
      <div id="app-panels" />
      <ConfirmationModal />
    </>
  );
};
```

### Final wiring — verify

After creating the seven files above plus the `index.html`, `main.jsx` / `index.jsx`, `globals.js`, and `vite.config.js` shown earlier:

```bash
node src/setupEnv.cjs                # or manually write .env.development.local
npm install
npm run dev                          # http://localhost:3000
```

Expected: login form renders, submit goes through the Vite proxy, on success you land on Home with your `displayName` and the kapp name. If any of these fail, the next sections (Vite Config, Environment Configuration, Production Build) cover the proxy/cookie/CORS issues you'll most likely hit.

The pieces above are the **minimum** — for a real portal extend `appActions` with the `themeActions`, `viewActions`, toast/confirm helpers, full `useData` poll wrapper, `usePaginatedData`, and route components from the dedicated skills:

- `front-end/portal-patterns` — full app context fetching, routing pattern, `attributesMap` reading
- `front-end/state` — full state module, theme/view actions, `getAttributeValue`
- `front-end/data-fetching` — `usePaginatedData`, `usePoller`, `defineKqlQuery`
- `front-end/mutations` — `createSubmission`/`updateSubmission`/`executeIntegration`, file uploads, optimistic UI
- `front-end/forms` — `<CoreForm>` and the widget system

---

## Error Boundaries — Catch Render Errors

The auth state machine above handles **load** errors (`serverError`/`error` from KineticLib). It does NOT catch **render** errors — a `CoreForm` crash, a malformed `searchSubmissions` response that throws inside a `.map()`, or a Redux selector that throws will blank the whole portal. Wrap route content in a React `ErrorBoundary` so a single component fault doesn't take down the page.

A minimal boundary you can paste into `portal/src/components/ErrorBoundary.jsx`:

```jsx
import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hook for your telemetry. Avoid throwing here.
    console.error('Render error:', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-4">
          <h2>Something went wrong</h2>
          <pre className="text-sm">{String(this.state.error?.message ?? this.state.error)}</pre>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap each major boundary in `App.jsx`:

```jsx
<ErrorBoundary>
  <PrivateRoutes />
</ErrorBoundary>
```

Layer multiple boundaries — one around the layout chrome, one inside each route — so a `CoreForm` crash on the request-detail page doesn't unmount the navigation. Routing libraries (React Router v6.4+) also expose route-level `errorElement` which can replace or complement this pattern.

**Don't** wrap the whole `<App>` in a single ErrorBoundary above the auth machine — auth/load errors are already handled there and a render boundary above them swallows the more specific error UI. Boundaries go inside, not above.

---

## Vite Config — Dev Proxy (Complete Example)

This is the **complete** `vite.config.js` for a Kinetic portal. It includes the proxy, `process.env` shim, origin header rewrite (required for login), and cookie handling — all in one file:

```js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tailwindcss from '@tailwindcss/vite';

const removeSecure = str => str.replace(/;\s*Secure/i, '');
const removeSameSiteNone = str => str.replace(/;\s*SameSite=None/i, '');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), svgr(), tailwindcss()],

    // Required: @kineticdata/react is a CommonJS bundle that references process.env
    define: {
      'process.env': env,
    },

    server: {
      port: 3000,
      proxy: {
        // Proxy everything EXCEPT Vite dev-server paths
        '^(?!(/@|/src|/node_modules|/index.html|/$)).*$': {
          target: env.REACT_APP_PROXY_HOST,
          changeOrigin: true,
          secure: false,
          configure: proxy => {
            proxy.on('error', err => console.log('proxy error', err));

            // Origin rewrite — required for login POST requests.
            // Browsers send Origin: http://localhost:3000, but Kinetic rejects
            // mismatched origins with "Invalid CORS request". changeOrigin only
            // rewrites Host, not Origin.
            proxy.on('proxyReq', proxyReq => {
              if (proxyReq.getHeader('origin')) {
                proxyReq.setHeader('origin', env.REACT_APP_PROXY_HOST);
              }
            });

            // Cookie handling — strip Secure and SameSite=None for http dev
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

    // Optional: if your project uses JSX in .js files (not .jsx)
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
    },
    optimizeDeps: {
      esbuildOptions: { loader: { '.js': 'jsx' } },
    },
  };
});
```

The `global` shimming is handled in `index.html` via `window.global ||= window;` (see the CoreForm bundle scripts section above).

---

## Environment Configuration

Vite expects env vars to be prefixed `VITE_` (anything else is filtered out of `import.meta.env`). The reference portal uses **`REACT_APP_*`** legacy names because it predates Vite; the `vite.config.js` above re-exposes them by reading via `loadEnv(mode, process.cwd(), '')` (the empty `prefixes` argument disables filtering) and shimming `process.env`. Two valid choices:

**Option A — Use VITE_ prefix (recommended for new portals):**

```
# .env.development.local
VITE_PROXY_HOST=https://<space>.kinops.io
```

Then change `vite.config.js` to read `env.VITE_PROXY_HOST` instead of `env.REACT_APP_PROXY_HOST`. Any source file that needs the host reads `import.meta.env.VITE_PROXY_HOST`.

**Option B — Keep REACT_APP_ for parity with the reference portal:**

```
# .env.development.local
REACT_APP_PROXY_HOST=https://<space>.kinops.io
```

The Vite config above already loads these via the empty-prefix `loadEnv` call and re-exports them through the `define: { 'process.env': env }` shim. Code can read `process.env.REACT_APP_PROXY_HOST` exactly as it would in a CRA app. The `portal/src/setupEnv.cjs` helper in the reference portal writes `.env.development.local` with this prefix automatically — run it once after cloning: `node src/setupEnv.cjs`.

Whichever you pick, **set the value to the Kinetic base URL** (e.g. `https://myspace.kinops.io`).

---

## Production Build & Deploy

`npm run build` produces a static bundle in `dist/` — `index.html`, hashed JS/CSS, source maps if enabled. There is no Node server requirement.

**Where to host the bundle:**

- **Same-origin (recommended).** Deploy the `dist/` contents into the Kinetic server's bundle root so the portal is served from the same origin as the API. This avoids the CORS/cookie complexity the Vite dev proxy works around — no `Origin` header rewriting, no `SameSite=None` stripping. Path conventions are deployment-specific (cloud kinops vs customer-managed); check with your platform team.
- **Different origin.** Serve the bundle from a CDN or separate host. You'll need (a) CORS enabled on the Kinetic server for that origin, (b) cookies set with `SameSite=None; Secure` and a valid HTTPS chain, (c) every API call in the portal pointed at the absolute Kinetic URL rather than a same-origin relative path. The same-origin path is significantly less work.

**Production environment variables.** The Vite build inlines values at build time — `.env.production` (committed defaults) or `.env.production.local` (gitignored secrets) supply the values. **Don't** put secrets in client-side env vars; anything in the bundle is public. The proxy host that mattered in dev is not used in production builds (the portal calls relative paths against the host it's served from).

**Source maps.** `npm run build` ships source maps by default. Strip them for production (`build.sourcemap: false` in `vite.config.js`) or upload them to a sourcemap-only error-reporting service rather than serving them publicly.

**Cache headers.** Hashed asset filenames let you set `Cache-Control: max-age=31536000, immutable` on `assets/*`. `index.html` should be `Cache-Control: no-cache` so a deploy is visible on the next request.
