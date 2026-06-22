---
name: mutations
description: "Use when creating/updating/deleting Kinetic submissions or profile/kapp/space records from a React portal — the executeIntegration helper for calling integrations, submission CRUD writes, file uploads via saveSubmissionMultipart, and why updateSubmission won't transition coreState."
---

# Mutations

## `executeIntegration` — Kinetic Integration Caller

POSTs to a Kinetic integration endpoint. The integration runs server-side (workflow, script, or handler) and returns a JSON response.

```js
// portal/src/helpers/api.js
import { bundle, getCsrfToken } from '@kineticdata/react';

const handleResponse = async response => {
  const data = await response.json();
  if (!response.ok) throw data;
  return data;
};

const handleError = error => {
  if (typeof error === 'object') {
    const { error: m1, errorKey: key = null, message: m2, ...rest } = error;
    const message = m1 || m2 || 'Unexpected error occurred.';
    return { error: { ...rest, message, key } };
  }
  return { error: { message: 'Unexpected error occurred.' } };
};

export const executeIntegration = ({ kappSlug, formSlug, integrationName, parameters, contentType = 'application/json' }) =>
  fetch(
    [
      `${bundle.apiLocation()}/integrations/kapps/${kappSlug}`,
      formSlug && `/forms/${formSlug}`,
      `/${integrationName}`,
    ].filter(Boolean).join(''),
    {
      method: 'POST',
      body: contentType === 'application/json' ? JSON.stringify(parameters) : parameters,
      headers: {
        'Content-Type': contentType,
        'X-XSRF-TOKEN': getCsrfToken(),
      },
    },
  )
  .then(handleResponse)
  .catch(handleError);
```

**URL patterns:**
- Kapp-level: `/integrations/kapps/{kappSlug}/{integrationName}`
- Form-level: `/integrations/kapps/{kappSlug}/forms/{formSlug}/{integrationName}`

**Content-Type depends on the integration.** Most integrations expect `application/json` (the default above), but some may expect `application/x-www-form-urlencoded`, `multipart/form-data`, or other types. Match the Content-Type to what the server-side integration endpoint expects. Without the correct Content-Type, the server returns `400: "Unable to parse JSON content."` or similar.

**Response shape:**
On success: the parsed JSON body from the integration.
On error: `{ error: { message, key, ...rest } }` — always an object, never throws.

**Error contract** — integrations should return:
```json
{ "error": "string", "errorKey": "string", "message": "string" }
```

---

## Named Integration Wrappers (Project-Specific Pattern)

For projects with many named integrations, create curried wrappers to avoid repeating integration names:

```js
// Example pattern — adapt integration names to your project
const executeNamedIntegration =
  integrationName =>
  ({ kappSlug, formSlug, parameters }) =>
    executeIntegration({ kappSlug, formSlug, integrationName, parameters });

// Create project-specific wrappers
export const executeCreateTicket = executeNamedIntegration('Create Ticketing Record');
export const executeSendNotification = executeNamedIntegration('Send Notification');
```

---

## Submission Create / Fetch / Delete

### Create (public — unauthenticated)

```jsx
import { createSubmission } from '@kineticdata/react';

// In CreateAccount.jsx — public=true bypasses auth
<CoreForm
  kapp={kappSlug}
  form="create-account"
  public={true}
  created={({ submission }) => navigate('/login')}
/>
```

`createSubmission` with `public: true` in params also works for non-form flows.

### Fetch

```js
import { fetchSubmission } from '@kineticdata/react';

const { response } = useData(fetchSubmission, {
  id: submissionId,
  include: 'details,values,activities,activities.details',
});
const submission = response?.submission;
```

### Update (field values outside CoreForm)

Use `updateSubmission` to modify field values without rendering a form. This is the pattern for inline edits, status changes, notes, and any update that doesn't require the full form UI.

```js
import { updateSubmission } from '@kineticdata/react';

// Update specific field values — omitted fields are untouched (partial update)
const { submission, error } = await updateSubmission({
  id: submissionId,
  values: { Status: 'Closed', Resolution: 'Fixed in latest release' },
  include: 'values',  // return updated values in response
});

if (error) {
  console.error('Update failed:', error);
} else {
  console.log('Updated:', submission.values.Status);
}
```

**coreState transition:**

`updateSubmission` updates field **values** only — it sends just `{ values }`. A `coreState`/`submission` argument is silently ignored, so the state never transitions. To change `coreState` outside a CoreForm:

- Let CoreForm's `completed`/save flow set the state (the normal path), or
- Issue a direct `PUT /app/api/v1/submissions/{id}` with the target state:

```js
// Transition coreState via the Core API directly (NOT updateSubmission)
await fetch(`${bundle.apiLocation()}/submissions/${submissionId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrfToken() },
  body: JSON.stringify({ coreState: 'Submitted' }),
});
```

See the API Basics skill for the full `coreState` transition rules (Draft → Submitted enforces required fields including attachments).

### Delete (with confirmation)

```jsx
import { deleteSubmission } from '@kineticdata/react';
import { openConfirm } from '../../helpers/confirm.js';

openConfirm({
  title: 'Delete Draft',
  description: 'Are you sure you want to delete this draft?',
  accept: async () => {
    const { error } = await deleteSubmission({ id: submissionId });
    if (error) toastError({ title: 'Failed to delete.' });
    else navigate(-1);
  },
  acceptLabel: 'Delete',
});
```

---

## Profile Update

```jsx
import { updateProfile } from '@kineticdata/react';

const handleSubmit = async () => {
  if (!validateEmail(email)) {
    setError('Invalid email address.');
    return;
  }
  const { error } = await updateProfile({
    profile: { displayName, email, ...(password ? { password } : {}) },
  });
  if (error) toastError({ title: error.message });
  else {
    appActions.updateProfile({ displayName, email });
    toastSuccess({ title: 'Profile updated.' });
  }
};
```

`appActions.updateProfile` merges the update into redux state so UI updates immediately without a full refetch.

---

## Kapp Update (Theme / Settings)

```js
import { updateKapp } from '@kineticdata/react';

// Save theme JSON to kapp attribute
const { error } = await updateKapp({
  kappSlug,
  kapp: {
    attributesMap: { Theme: [JSON.stringify(themeValues)] },
  },
});
if (!error) {
  themeActions.setTheme({ kapp: { ...kapp, attributesMap: { ...kapp.attributesMap, Theme: [JSON.stringify(themeValues)] } } });
  toastSuccess({ title: 'Theme saved.' });
}
```

---

## Space Update (Kapp Slug)

```js
import { updateSpace } from '@kineticdata/react';

// Attribute name is project-specific — match what's used in kappSlug resolution
const { error } = await updateSpace({
  space: {
    attributesMap: { 'Service Portal Kapp Slug': [newKappSlug] },
  },
});
```

---

## File Uploads — `saveSubmissionMultipart`

For forms with `attachment` fields, the platform exposes a multipart-submission endpoint that handles the JSON body and the file uploads in a single request. `@kineticdata/react` wraps it as `saveSubmissionMultipart`.

```js
import { saveSubmissionMultipart, getCsrfToken } from '@kineticdata/react';
import { bundle } from '@kineticdata/react';

async function submitWithAttachments({ kappSlug, formSlug, values, files }) {
  // files is { [fieldName]: File | File[] }, e.g. { Screenshots: [file1, file2] }
  const formData = new FormData();
  formData.append('_submission', JSON.stringify({
    values,
    coreState: 'Submitted',
  }));

  for (const [fieldName, fileOrList] of Object.entries(files)) {
    const list = Array.isArray(fileOrList) ? fileOrList : [fileOrList];
    for (const file of list) {
      formData.append(fieldName, file, file.name);
    }
  }

  const response = await fetch(
    `${bundle.apiLocation()}/kapps/${kappSlug}/forms/${formSlug}/submissions-multipart`,
    {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-XSRF-TOKEN': getCsrfToken() },
      body: formData,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return { error: text || `HTTP ${response.status}` };
  }
  return { submission: (await response.json()).submission };
}
```

If `@kineticdata/react` exports `saveSubmissionMultipart` in your version (check the Bootstrap skill's export list), use that helper — the manual fetch above is the fallback when the helper isn't available or you need custom progress tracking.

### Updating an existing submission with attachments

```js
POST /app/api/v1/submissions-multipart/{submissionId}
```

Same multipart shape — the first part is `_submission` with the JSON body, subsequent parts are files by field name.

### Constraints and gotchas

- **Size limit.** Platform default is **20 MB per file** (configurable per environment). Files larger than the limit return `413 Payload Too Large` with no partial success — the entire submission fails.
- **MIME validation is form-level.** If the attachment field has `renderAttributes.allowedTypes` set (e.g., `"image/*,application/pdf"`), uploads of disallowed types return 400 with `"The file type 'X' is not allowed for field 'Y'"`.
- **`allowMultiple` is a renderAttribute string, not boolean.** Set `"allowMultiple": "true"` (string). When false, only the first file in the FormData entries for that field is kept.
- **Cancelling a submission mid-upload orphans nothing.** The submission record is created only after all parts upload; an aborted multipart request leaves no DB rows.
- **No native progress event in the helper.** For an upload progress bar, drop down to `XMLHttpRequest` (which exposes `xhr.upload.onprogress`) — `fetch` doesn't surface upload progress in browsers. Or use a library like `axios` that wraps `XHR`.
- **Virus scanning is not exposed.** The platform doesn't run client-visible AV scanning; if you need that, gate uploads through a separate scanning Operation before submission.

### Client-side preview / validation pattern

Reject invalid files before submission so the user gets immediate feedback rather than a server roundtrip:

```jsx
const MAX_SIZE_MB = 20;
const ALLOWED = ['image/png', 'image/jpeg', 'application/pdf'];

function validateFile(file) {
  if (!ALLOWED.includes(file.type)) {
    return `File type ${file.type} is not allowed`;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File is larger than ${MAX_SIZE_MB} MB`;
  }
  return null;
}

function FileInput({ onChange }) {
  const [error, setError] = useState(null);
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    setError(err);
    if (!err) onChange(file);
  };
  return (
    <>
      <input type="file" onChange={handleChange} accept={ALLOWED.join(',')} />
      {error && <p role="alert">{error}</p>}
    </>
  );
}
```

---

## Optimistic UI, Mutation Status, and Conflict Handling

The patterns above use the bare `await mutate(); if (error) toastError()` shape, which is fine for fire-and-forget actions. For interactive UIs — submit buttons, inline edits, undoable actions — track a status state and apply optimistic updates so the UI feels instant.

### Mutation status hook

A small wrapper that gives every mutation a status state — `idle | pending | success | error` — and prevents double-submit:

```js
// portal/src/helpers/hooks/useMutation.js
import { useCallback, useRef, useState } from 'react';

export function useMutation(fn) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const inflight = useRef(false);

  const mutate = useCallback(async (...args) => {
    if (inflight.current) return { skipped: true };
    inflight.current = true;
    setStatus('pending');
    setError(null);
    try {
      const result = await fn(...args);
      if (result?.error) {
        setError(result.error);
        setStatus('error');
        return { error: result.error };
      }
      setStatus('success');
      return result;
    } catch (err) {
      setError(err);
      setStatus('error');
      return { error: err };
    } finally {
      inflight.current = false;
    }
  }, [fn]);

  return { mutate, status, error, isPending: status === 'pending' };
}
```

Usage:

```jsx
const { mutate, isPending } = useMutation(updateSubmission);

<button disabled={isPending} onClick={() => mutate({ id, values: {...} })}>
  {isPending ? 'Saving…' : 'Save'}
</button>
```

`inflight` ref blocks double-click submission; `disabled={isPending}` mirrors that in the UI. The hook handles the common case without dragging in a state library.

### Optimistic updates

Apply the change to local state immediately, then reconcile when the server responds:

```jsx
const [comments, setComments] = useState(initialComments);
const { mutate } = useMutation(createSubmission);

async function addComment(text) {
  const optimistic = { id: `tmp-${Date.now()}`, values: { Comment: text }, pending: true };
  setComments(prev => [...prev, optimistic]);

  const result = await mutate({
    kappSlug, formSlug: 'comments',
    values: { Comment: text, 'Parent ID': parentId },
    completed: true,
  });

  setComments(prev => {
    if (result?.error) {
      // Rollback: drop the optimistic entry, show error
      toastError({ title: 'Could not save comment', description: result.error });
      return prev.filter(c => c.id !== optimistic.id);
    }
    // Replace the temp entry with the server-returned one
    return prev.map(c => c.id === optimistic.id ? result.submission : c);
  });
}
```

Render `pending: true` items at half opacity (`className={c.pending ? 'opacity-50' : ''}`) so users see they aren't committed yet.

### Retry with exponential backoff

For idempotent writes (PUTs by ID, deletes), retry transient 5xx errors a small number of times:

```js
async function retryable(fn, { retries = 3, baseMs = 300 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await fn();
    if (!result?.error) return result;
    // Only retry network-y / 5xx-looking errors; never retry 4xx (caller bug)
    const msg = String(result.error?.message ?? result.error);
    if (!/timeout|network|5\d\d|ECONN/i.test(msg)) return result;
    if (attempt === retries) return result;
    await new Promise(r => setTimeout(r, baseMs * Math.pow(2, attempt)));
  }
}
```

Don't retry POST creates without a client-supplied idempotency key — retrying a create that actually succeeded but had the response truncated produces duplicate records. For Kinetic specifically, there is no built-in idempotency key; you can synthesize one by including a deterministic value in your form (`'Client Op Id': uuid`) and rejecting duplicates server-side via a workflow filter.

### 409 conflict handling

Kinetic's PUT submissions do not currently emit 409 Conflict on stale-data writes — they accept the last write unconditionally. If your application needs optimistic concurrency, store a version field in the submission's values (e.g., `'Version': 1`) and check it client-side before writing:

```js
async function saveWithCheck({ id, expectedVersion, values }) {
  // Re-fetch to check current version
  const { submission } = await fetchSubmission({ id, include: 'values' });
  const currentVersion = submission?.values?.Version ?? 0;
  if (currentVersion !== expectedVersion) {
    return { error: 'The record was modified by another user. Reload and try again.' };
  }
  return updateSubmission({ id, values: { ...values, Version: currentVersion + 1 } });
}
```

This is a read-modify-write race that's still imperfect (two callers could pass the check then both write); a workflow filter on the form's `Submission Updated` event can enforce the check server-side as a backstop.

### Debouncing rapid changes

For inline edits (typing in a textarea that saves on each keystroke), debounce writes:

```jsx
import { useEffect } from 'react';
function useDebouncedEffect(effect, deps, delay = 500) {
  useEffect(() => {
    const t = setTimeout(effect, delay);
    return () => clearTimeout(t);
  }, [...deps, delay]);
}

// In a component:
useDebouncedEffect(() => {
  if (draft !== savedValue) mutate({ id, values: { Description: draft } });
}, [draft], 500);
```

The 500ms feel is fine for most editors. For high-stakes data (financial entries, contract fields), require an explicit Save button rather than auto-saving.

### Undo

Pair an optimistic delete with a brief undo window before committing:

```js
async function deleteWithUndo(item) {
  setItems(prev => prev.filter(i => i.id !== item.id));
  const undo = toastUndo({ title: 'Deleted comment', timeoutMs: 5000 });
  const undone = await undo.promise;       // resolves true if user clicked Undo
  if (undone) {
    setItems(prev => [...prev, item]);     // restore
    return;
  }
  const result = await mutate({ id: item.id });
  if (result?.error) {
    setItems(prev => [...prev, item]);
    toastError({ title: 'Could not delete', description: result.error });
  }
}
```

This requires a `toastUndo` helper in your toast system (returns `{promise}` that resolves true on Undo, false on timeout). It's a small addition to the toast utilities in `front-end/state`.
