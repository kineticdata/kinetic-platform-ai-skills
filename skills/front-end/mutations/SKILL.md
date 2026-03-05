---
name: mutations
description: executeIntegration helper, submission CRUD, profile/kapp/space updates for Kinetic front-end portals.
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

export const executeIntegration = ({ kappSlug, formSlug, integrationName, parameters }) =>
  fetch(
    [
      `${bundle.apiLocation()}/integrations/kapps/${kappSlug}`,
      formSlug && `/forms/${formSlug}`,
      `/${integrationName}`,
    ].filter(Boolean).join(''),
    {
      method: 'POST',
      body: JSON.stringify(parameters),
      headers: { 'X-XSRF-TOKEN': getCsrfToken() },
    },
  )
  .then(handleResponse)
  .catch(handleError);
```

**URL patterns:**
- Kapp-level: `/integrations/kapps/{kappSlug}/{integrationName}`
- Form-level: `/integrations/kapps/{kappSlug}/forms/{formSlug}/{integrationName}`

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
