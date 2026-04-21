---
name: bootstrap
description: Critical portal setup — installation, KineticLib entry point, CoreForm prerequisites, Vite dev proxy with process.env shim, and auth state machine.
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

The package exports 150+ components, but most are for Kinetic's internal admin consoles. **For portal development, use:**

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

`useData` is **not** exported by `@kineticdata/react` — it is a project-local hook that wraps fetch functions with `{ loading, response }` state. See the [Portal Patterns skill](../portal-patterns/SKILL.md#usedata-hook) for the implementation.

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
    <div id="app-panels" />
    <ConfirmationModal />
  </>
);
```

**State machine:**
1. `!initialized || !space` -> show Loading
2. `!loggedIn` -> PublicRoutes (login, reset-password)
3. `kapp && profile` loaded -> PrivateRoutes
4. `timedOut` (session expired while logged in) -> overlay dialog with Login

For context fetching (space, profile, kapp), kappSlug resolution, and routing structure, see the [Portal Patterns skill](../portal-patterns/SKILL.md).

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

`portal/src/setupEnv.cjs` creates `.env.development.local` with:
```
REACT_APP_PROXY_HOST=https://<space>.kinops.io
```

Run it once after cloning: `node src/setupEnv.cjs`.

Set `REACT_APP_PROXY_HOST` to the Kinetic base URL (e.g. `https://myspace.kinops.io`).
