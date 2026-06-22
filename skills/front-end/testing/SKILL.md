---
name: testing
description: "Use when writing tests for a Kinetic React portal — unit-testing components that call @kineticdata/react helpers, mocking fetchSubmission/searchSubmissions/executeIntegration, stubbing CoreForm renders, intercepting API calls with MSW, testing useData hooks, KQL query builders, or workflow XML generators. Covers Vitest setup, mock factories, and integration-test patterns against provisioned fixtures."
---

# Front-End Testing

This skill covers the testing patterns that work well for Kinetic React portals — what to mock, what to integration-test, and how to deal with the parts of `@kineticdata/react` that don't compose nicely with standard test runners.

**Stack assumption:** Vitest + React Testing Library + MSW. Substitute Jest if your project uses it (the patterns are identical; only the config differs).

---

## Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom msw
```

### `vite.config.js`

```js
export default defineConfig({
  // ... your existing config
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    css: false,                              // skip CSS loading in tests
  },
});
```

### `src/test/setup.js`

```js
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw-server';

// Stub the kinetic bundle globals that @kineticdata/react expects
globalThis.bundle = {
  apiLocation: () => 'http://localhost/app/api/v1',
  spaceLocation: () => 'http://localhost',
};

// MSW lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());
```

The `bundle` stub avoids `bundle is not defined` errors at module load — `@kineticdata/react` reads `bundle.apiLocation()` lazily, so giving it any function-returning-a-URL makes imports succeed.

---

## Mocking `@kineticdata/react`

Two approaches — pick based on whether your tests care about HTTP behavior or just call shape.

### Approach 1 — Module mock (fast, decoupled from HTTP)

Suits unit tests of component logic where you just care that `fetchSubmission` was called with the right params:

```js
// src/test/mocks/kineticdata.js
import { vi } from 'vitest';

export const fetchSubmission = vi.fn();
export const fetchSubmissions = vi.fn();
export const searchSubmissions = vi.fn();
export const createSubmission = vi.fn();
export const updateSubmission = vi.fn();
export const deleteSubmission = vi.fn();
export const executeIntegration = vi.fn();
export const fetchSpace = vi.fn();
export const fetchProfile = vi.fn();
export const fetchKapp = vi.fn();

export const defineKqlQuery = vi.fn(() => {
  const builder = {
    equals: vi.fn(() => builder),
    in:     vi.fn(() => builder),
    or:     vi.fn(() => builder),
    end:    vi.fn(() => (params) => `MOCK_QUERY(${JSON.stringify(params)})`),
  };
  return builder;
});

export const getCsrfToken = vi.fn(() => 'mock-csrf');
export const KineticLib   = ({ children, render }) =>
  render ? render({ initialized: true, loggedIn: true, loginProps: {} }) : children;
export const CoreForm     = vi.fn(() => null);   // stub renderer
```

Then in your test file:

```js
vi.mock('@kineticdata/react', () => import('./test/mocks/kineticdata'));

import { fetchSubmission } from '@kineticdata/react';
import { render, screen, waitFor } from '@testing-library/react';
import RequestDetail from './RequestDetail';

it('renders the submission summary', async () => {
  fetchSubmission.mockResolvedValueOnce({
    submission: { id: 'sub-1', values: { Summary: 'A bug' }, coreState: 'Submitted' },
  });

  render(<RequestDetail submissionId="sub-1" />);

  expect(await screen.findByText('A bug')).toBeInTheDocument();
  expect(fetchSubmission).toHaveBeenCalledWith({ id: 'sub-1', include: expect.any(String) });
});
```

### Approach 2 — MSW (HTTP-level fidelity)

Use when you want to test the real fetch path, the helper's response unwrapping, or behaviors that depend on a status code or header:

```js
// src/test/msw-server.js
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('*/app/api/v1/me', () =>
    HttpResponse.json({ username: 'tester', displayName: 'Tester', spaceAdmin: false }),
  ),
  http.get('*/app/api/v1/space', () =>
    HttpResponse.json({ space: { name: 'Test', attributesMap: { 'Service Portal Kapp Slug': ['services'] } } }),
  ),
);
```

In a specific test, override with a per-test handler:

```js
import { http, HttpResponse } from 'msw';
import { server } from './test/msw-server';

it('shows an empty state when there are no submissions', async () => {
  server.use(
    http.get('*/submissions', () => HttpResponse.json({ submissions: [], nextPageToken: null })),
  );
  render(<RequestList />);
  expect(await screen.findByText('No requests yet')).toBeInTheDocument();
});
```

Pick the approach per test file — there's no project-wide right answer.

---

## Testing `useData`

`useData` is project-local, so test it directly:

```jsx
import { renderHook, waitFor } from '@testing-library/react';
import { useData } from '../helpers/hooks/useData';

it('returns response after the fetch resolves', async () => {
  const fn = vi.fn().mockResolvedValueOnce({ submission: { id: '1' } });
  const { result } = renderHook(() =>
    useData(fn, useMemo(() => ({ id: '1' }), [])),
  );
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.response).toEqual({ submission: { id: '1' } });
});

it('discards stale responses when params change', async () => {
  let resolveFirst;
  const fn = vi.fn()
    .mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
    .mockResolvedValueOnce({ submission: { id: '2' } });

  const { result, rerender } = renderHook(({ p }) => useData(fn, p), {
    initialProps: { p: { id: '1' } },
  });

  // Change params before the first response resolves
  rerender({ p: { id: '2' } });
  resolveFirst({ submission: { id: '1' } });          // stale response

  await waitFor(() => expect(result.current.response?.submission?.id).toBe('2'));
});
```

The stale-response test is the load-bearing one — if the timestamp check breaks, every component that polls or re-fetches gets flaky data.

---

## Testing components that use `<CoreForm>`

The stub from Approach 1 (`CoreForm: vi.fn(() => null)`) renders nothing — that's usually fine; the test focuses on your component's behavior around the form, not the form itself. Assert that CoreForm received the right props:

```js
import { CoreForm } from '@kineticdata/react';

it('passes the right kappSlug/formSlug to CoreForm', () => {
  render(<RequestForm formSlug="new-request" />);
  expect(CoreForm).toHaveBeenCalledWith(
    expect.objectContaining({ kapp: 'services', form: 'new-request' }),
    expect.anything(),
  );
});
```

If you need a more realistic stub (to test the `created`/`completed`/`updated` callback wiring), implement the stub as a `useEffect`-firing fake:

```js
// src/test/mocks/kineticdata.js
export const CoreForm = vi.fn(({ created, completed, ...props }) => {
  // Expose handlers on the test global so the test can call them
  globalThis.__coreFormHandlers = { created, completed };
  return null;
});

// In a test:
render(<RequestForm formSlug="new-request" />);
await waitFor(() => expect(globalThis.__coreFormHandlers).toBeTruthy());
act(() => globalThis.__coreFormHandlers.completed({ submission: { id: 'sub-1' } }));
expect(mockNavigate).toHaveBeenCalledWith('/requests/sub-1');
```

Calling CoreForm's real renderer in tests is not generally worth the effort — it requires the `/app/bundle.js` scripts loaded in the page and a working DOM, and the platform doesn't ship a test harness for it.

---

## Testing KQL builders

If you have a centralized query module:

```js
// src/queries/myRequests.js
import { defineKqlQuery } from '@kineticdata/react';

export const myRequestsQuery = defineKqlQuery()
  .equals('createdBy', 'username')
  .end();
```

Mock the builder and assert the chain:

```js
// vi.mock('@kineticdata/react', ...) // module mock from Approach 1

it('builds a my-requests query keyed on username', () => {
  myRequestsQuery({ username: 'alice' });
  const builder = vi.mocked(defineKqlQuery).mock.results[0].value;
  expect(builder.equals).toHaveBeenCalledWith('createdBy', 'username');
  expect(builder.end).toHaveBeenCalled();
});
```

For higher fidelity, don't mock `defineKqlQuery` — call the real exported function and snapshot the output string:

```js
it('produces the expected KQL string', () => {
  expect(myRequestsQuery({ username: 'alice' })).toBe('createdBy = "alice"');
});
```

This catches subtle escaping bugs without needing HTTP at all.

---

## Testing workflow XML / treeJson generators

If your project builds workflow definitions programmatically (Python f-strings, Ruby `<<-XML`, JS template literals), test the output against the validator script in `concepts/workflow-xml/scripts/validate-workflow.mjs`:

```js
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildApprovalTree } from '../src/workflows/approval';

it('produces a tree that passes the validator', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tree-'));
  const file = join(dir, 'tree.xml');
  writeFileSync(file, buildApprovalTree({ approver: 'team-a' }));

  // Skip the live-handler check; static rules only
  const result = execSync(
    `node skills/concepts/workflow-xml/scripts/validate-workflow.mjs ${file} --no-handler-check`,
    { encoding: 'utf8' },
  );
  expect(result).toMatch(/OK|VALID/);
});
```

Validating against the same script the platform team uses prevents drift between what your generator emits and what the engine accepts.

---

## Integration tests against `tests/provision.sh`

For end-to-end recipe verification, the platform team provisions a known kapp/form/workflow set against a real space. From a portal project, point Cypress / Playwright at the provisioned environment:

```js
// playwright.config.js
export default defineConfig({
  use: { baseURL: 'https://demo.kinops.io' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 60_000,
  },
});
```

Then a test exercises the real backend:

```js
test('user can submit a request and see it in their queue', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name=username]', 'tester');
  await page.fill('input[name=password]', process.env.TEST_PASSWORD);
  await page.click('button[type=submit]');
  await page.goto('/forms/maintenance-request');
  await page.fill('text=Location', 'Building A');
  // ...
});
```

Keep these tests behind a `RUN_E2E=1` env gate so they don't run on every PR — they need a live environment and stable credentials.

---

## What NOT to test

- **`@kineticdata/react` internals.** The library has its own tests; you're not validating the SDK.
- **`CoreForm` rendering.** Requires the platform bundle, runs server-side, and the platform team owns the render behavior.
- **The Vite proxy.** You can't unit-test it; if it breaks, `npm run dev` blows up immediately and you notice.

Focus tests on **your portal's logic** — query building, conditional rendering, navigation after mutations, error handling, accessibility behaviors. Mock the platform; verify the portal.

---

## Related Skills

- `front-end/bootstrap` — what to mock (KineticLib, CoreForm prerequisites).
- `front-end/data-fetching` — what `useData` and friends should return; what behavior to test.
- `front-end/accessibility` — testing patterns for ARIA and focus management.
- `concepts/workflow-xml/scripts/` — the validator script you can run from CI.
