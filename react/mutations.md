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

## Lifecycle Integration Constants and Wrappers

Named wrappers for the Platform One lifecycle integrations:

```js
// portal/src/helpers/api.js
export const LIFECYCLE_INTEGRATIONS = {
  CREATE_CUSTOMER_ACCESS:      'Create Customer Access Context',
  UPDATE_CUSTOMER_ACCESS:      'Update Customer Access Context',
  DISABLE_CUSTOMER_ACCESS:     'Disable Customer Access Context',
  CREATE_TICKETING_RECORD:     'Create Ticketing Record',
  UPDATE_TICKETING_RECORD:     'Update Ticketing Record',
  SEND_LIFECYCLE_NOTIFICATION: 'Send Lifecycle Notification',
};

const executeLifecycleIntegration =
  integrationName =>
  ({ kappSlug, formSlug, parameters }) =>
    executeIntegration({ kappSlug, formSlug, integrationName, parameters });

export const executeCreateCustomerAccess    = executeLifecycleIntegration(LIFECYCLE_INTEGRATIONS.CREATE_CUSTOMER_ACCESS);
export const executeUpdateCustomerAccess    = executeLifecycleIntegration(LIFECYCLE_INTEGRATIONS.UPDATE_CUSTOMER_ACCESS);
export const executeDisableCustomerAccess   = executeLifecycleIntegration(LIFECYCLE_INTEGRATIONS.DISABLE_CUSTOMER_ACCESS);
export const executeCreateTicketingRecord   = executeLifecycleIntegration(LIFECYCLE_INTEGRATIONS.CREATE_TICKETING_RECORD);
export const executeUpdateTicketingRecord   = executeLifecycleIntegration(LIFECYCLE_INTEGRATIONS.UPDATE_TICKETING_RECORD);
export const executeSendLifecycleNotification = executeLifecycleIntegration(LIFECYCLE_INTEGRATIONS.SEND_LIFECYCLE_NOTIFICATION);
```

**Usage:**
```js
const result = await executeCreateCustomerAccess({
  kappSlug,
  formSlug,
  parameters: { customerId, submissionId, requestedBy, accessProfile },
});
if (result.error) { /* handle */ }
```

---

## Integration Payload Contracts

### Identity Lifecycle

**`Create Customer Access Context`** — provision initial access after onboarding approval
```json
// Request
{ "customerId": "string", "submissionId": "string", "requestedBy": "string",
  "accessProfile": { "environment": "string", "roles": ["string"] } }
// Response
{ "status": "created", "identityRecordId": "string" }
```

**`Update Customer Access Context`** — apply lifecycle changes to access profile
```json
// Request
{ "customerId": "string", "submissionId": "string", "changeType": "string",
  "accessProfile": { "environment": "string", "roles": ["string"] } }
// Response
{ "status": "updated", "identityRecordId": "string" }
```

**`Disable Customer Access Context`** — decommission access during offboarding
```json
// Request
{ "customerId": "string", "submissionId": "string", "reason": "string" }
// Response
{ "status": "disabled", "identityRecordId": "string" }
```

### Ticketing

**`Create Ticketing Record`** — create operational ticket from lifecycle submission
```json
// Request
{ "submissionId": "string", "customerId": "string", "queue": "string",
  "summary": "string", "details": "string" }
// Response
{ "status": "created", "ticketId": "string", "ticketUrl": "string" }
```

**`Update Ticketing Record`** — sync lifecycle state changes to external ticket
```json
// Request
{ "submissionId": "string", "ticketId": "string", "status": "string", "comment": "string" }
// Response
{ "status": "updated", "ticketId": "string" }
```

### Notification

**`Send Lifecycle Notification`** — trigger customer/internal lifecycle emails
```json
// Request
{ "submissionId": "string", "notificationType": "string",
  "recipients": ["string"], "templateData": {} }
// Response
{ "status": "sent", "deliveryId": "string" }
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

const { error } = await updateSpace({
  space: {
    attributesMap: { 'Lifecycle Kapp Slug': [newKappSlug] },
  },
});
```
