# State Management

## `regRedux` — Dynamic Slice Registration

`regRedux` registers a named Redux slice at runtime and returns dispatch-wrapped action functions. No `useDispatch` needed — actions can be called anywhere.

```js
// portal/src/redux.js
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
// Register a slice and get back callable action functions
export const myActions = regRedux('myFeature', { count: 0 }, {
  increment(state, amount) { state.count += amount; },
  reset(state)             { state.count = 0; },
});

// Call anywhere — no useDispatch, no import of store
myActions.increment(5);
myActions.reset();

// Read in components
const count = useSelector(state => state.myFeature.count);
```

---

## `appActions` — Global App State

Stores space, kapp, profile, and derived values. Populated during the App bootstrap sequence.

```js
// portal/src/helpers/state.js
export const appActions = regRedux(
  'app',
  {
    authenticated: false,
    space: null,
    kappSlug: null,      // resolved from space attributes
    kapp: null,
    profile: null,
    userRole: null,      // 'internal' | 'external'
    error: null,
  },
  {
    setAuthenticated(state, payload) {
      state.authenticated = payload;
    },
    setSpace(state, { error, space }) {
      if (error) state.error = error;
      else {
        state.space = space;
        // Resolve kapp slug from space attributes with fallback
        state.kappSlug =
          KAPP_SLUG_ATTRIBUTES.map(name => getAttributeValue(space, name)).find(Boolean)
          || PLATFORM_ONE_KAPP_SLUG;
      }
    },
    setKapp(state, { error, kapp }) {
      if (error) state.error = state.error || error;
      else state.kapp = kapp;
    },
    setProfile(state, { error, profile }) {
      if (error) state.error = state.error || error;
      else {
        state.profile = profile;
        state.userRole = inferUserRole(profile);
      }
    },
    updateProfile(state, profile) {
      Object.assign(state.profile, profile);  // merge partial update
    },
  },
);
```

**Selectors:**
```js
const kappSlug  = useSelector(state => state.app.kappSlug);
const profile   = useSelector(state => state.app.profile);
const userRole  = useSelector(state => state.app.userRole);
const spaceAdmin = useSelector(state => state.app.profile?.spaceAdmin);
```

---

## `themeActions` — Theme State

Stores parsed CSS variable values from the kapp `Theme` attribute.

```js
export const themeActions = regRedux(
  'theme',
  { ...themeState },   // default CSS variable values
  {
    setTheme(state, { kapp }) {
      // Reads Theme attribute from kapp, parses JSON, merges into state
      calculateThemeState(state, getAttributeValue(kapp, 'Theme'));
    },
    enableEditor(state)  { state.editor = true; },
    disableEditor(state) { state.editor = false; },
  },
);
```

Call `themeActions.setTheme({ kapp })` after fetching the kapp record.

---

## `viewActions` — Viewport State

Tracks window width and Tailwind breakpoint. Updated on `resize` (throttled 200ms).

```js
const viewActions = regRedux(
  'view',
  { ...calcViewState() },
  { handleResize(state) { calcViewState(state); } },
);
window.addEventListener('resize', throttle(viewActions.handleResize, 200));

// Breakpoints (Tailwind defaults):
// xs: 0–639, sm: 640–767, md: 768–1023, lg: 1024–1279, xl: 1280–1535, 2xl: 1536+
// mobile: xs|sm,  tablet: md|lg,  desktop: xl|2xl
```

**Selectors:**
```js
const mobile  = useSelector(state => state.view.mobile);
const tablet  = useSelector(state => state.view.tablet);
const desktop = useSelector(state => state.view.desktop);
const width   = useSelector(state => state.view.width);
const size    = useSelector(state => state.view.size);  // 'xs'|'sm'|'md'|'lg'|'xl'|'2xl'
```

---

## `getAttributeValue` — Attribute Reader

Reads the first value of a named attribute from any Kinetic record. Handles both `attributesMap` (from API with `include=attributesMap`) and `attributes` array formats.

```js
// portal/src/helpers/records.js
export const getAttributeValue = (record, attributeName, defaultValue) =>
  (record &&
    (record.attributesMap
      ? record.attributesMap?.[attributeName]?.[0]
      : record.attributes?.find(a => a.name === attributeName)?.values?.[0]))
  || defaultValue;
```

**Usage:**
```js
getAttributeValue(space, 'Lifecycle Kapp Slug')          // → 'platform-one' or undefined
getAttributeValue(form, 'Icon', 'forms')                 // → icon name, fallback 'forms'
getAttributeValue(kapp, 'Theme')                         // → JSON string or undefined
```

---

## Confirmation Modal

Redux-driven modal for user confirmation before destructive actions.

```js
// portal/src/helpers/confirm.js
export const openConfirm = options => { confirmActions.open(options); };
export const closeConfirm = () => { confirmActions.open(null); };
```

**Options:**
```js
openConfirm({
  title: 'Delete Record',
  description: 'This cannot be undone.',
  accept: async () => {
    await deleteSubmission({ id });
    reload();
  },
  acceptLabel: 'Delete',   // default 'Confirm'
  cancel: () => {},        // called on cancel/dismiss
  cancelLabel: 'Cancel',   // default 'Cancel'
});
```

The `ConfirmationModal` component reads `state.confirm.options` from redux and renders the dialog.

---

## Toast System

`@ark-ui/react/toast` based. Requires `<Toaster />` to be rendered in the app.

```js
// portal/src/helpers/toasts.js
import { initToaster, toastSuccess, toastError, clearToasts } from './toasts.js';

// Initialize (called once on app mount, or lazily)
initToaster();                          // default placement: top-middle
initToaster({ id: 'sidebar', placement: 'bottom-end' });

// Show toasts (callable from anywhere)
toastSuccess({ title: 'Saved.', description: 'Your changes were saved.' });
toastError({ title: 'Failed.', description: error.message });

// Clear all visible toasts
clearToasts();
```

**Toast options:**
| Option | Description |
|--------|-------------|
| `id` | Target a specific named `<Toaster>` instance |
| `title` | Primary toast message |
| `description` | Secondary detail text |
| `duration` | Auto-dismiss duration in ms |

---

## User Role Detection

```js
// portal/src/helpers/lifecycle.js
export const USER_ROLES = { EXTERNAL: 'external', INTERNAL: 'internal' };

const INTERNAL_TEAM_PATTERNS = [
  /platform one/i, /operations/i, /approvals?/i, /admin/i,
];

export const inferUserRole = profile => {
  if (profile?.spaceAdmin) return USER_ROLES.INTERNAL;
  const teams = (profile?.memberships || []).map(({ team }) => team?.name || '');
  const isInternal = teams.some(team =>
    INTERNAL_TEAM_PATTERNS.some(pattern => pattern.test(team))
  );
  return isInternal ? USER_ROLES.INTERNAL : USER_ROLES.EXTERNAL;
};

export const canAccessWorkQueue = profile =>
  inferUserRole(profile) === USER_ROLES.INTERNAL;
```

`userRole` is set on the `app` redux slice when profile is fetched. Read it anywhere:
```js
const userRole = useSelector(state => state.app.userRole);
const isInternal = userRole === 'internal';
```

---

## Theme System

The portal theme is stored as JSON in the kapp's `Theme` attribute. CSS variables are injected into `document.adoptedStyleSheets`.

```js
// portal/src/helpers/theme.js
export const THEME_SCHEMA = [
  { key: 'colorPrimary',   label: 'Primary Color',   type: 'color', cssVar: '--color-primary' },
  { key: 'colorSecondary', label: 'Secondary Color',  type: 'color', cssVar: '--color-secondary' },
  // ... additional schema entries
];

// calculateThemeState: parses JSON string from kapp attribute, merges into state
// buildStyleObject: converts state to { '--css-var': 'value' } object
// useDefaultTheme: returns the default theme values
```

**Updating theme (kapp attribute → CSS vars):**
```js
// After fetching kapp, inject theme CSS vars
themeActions.setTheme({ kapp });
```

The theme editor (`portal/src/pages/theme/index.jsx`) saves JSON back to the `Theme` attribute via `updateKapp`, then calls `themeActions.setTheme` to apply immediately.

---

## Utility Helpers

```js
// portal/src/helpers/index.js

// Wrap value in array if not already an array
asArray(value)
// → Array.isArray(value) ? value : [value]

// Call fn only if it is a function; otherwise return fallback
callIfFn(fn, returnIfNotFn, args = [])

// Parse Kinetic field values from URL query params: ?values[Field Name]=value
valuesFromQueryParams(searchParams)
// → { 'Field Name': 'value', ... }

// Human-readable relative time using date-fns
timeAgo(date)
// → "3 minutes ago", "2 days ago"

// Email validation
validateEmail(email)  // → match object or null

// Sort comparator by key or accessor function
[...items].sort(sortBy('createdAt'))
[...items].sort(sortBy(item => item.values['Priority']))

// Export array-of-objects to CSV download
downloadCSV(data, filename)

// Download any Blob
downloadBlob(blob, filename, extension)
```

---

## `useRouteChange` — Route Change Hook

Fires a callback whenever the route (pathname) changes.

```js
// portal/src/helpers/hooks/useRouteChange.js
const useRouteChange = (callback, dependencies = []) => {
  const { pathname, state } = useLocation();
  const fn = useCallback(callback, dependencies);
  useEffect(() => { fn(pathname, state); }, [pathname, state, fn]);
};
```

**Usage:**
```js
useRouteChange((pathname, state) => {
  if (!state?.persistToasts) clearToasts();
  closeConfirm();
}, []);
```

The `dependencies` array memoizes the callback (same semantics as `useCallback`).

---

## `useSwipe` — Touch Swipe Detection

Detects left/right swipes with configurable distance threshold.

```js
// portal/src/helpers/hooks/useSwipe.js
const { left, right, onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
  threshold: 64,                         // pixels required to trigger (default 64)
  onLeftSwipe:  () => goToNextItem(),
  onRightSwipe: () => goToPrevItem(),
});

// Apply handlers to the swipable element
<div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
     style={{ transform: left ? `translateX(${left}px)` : right ? `translateX(${right}px)` : '' }}>
  {content}
</div>
```

`left` and `right` are negative pixel offsets representing the swipe-in-progress distance, clamped to `-threshold`. Use them for visual drag feedback. Both are `undefined` when their respective callback is not provided.
