---
name: connect-external-system
description: Step-by-step recipe for connecting the Kinetic Platform to an external REST API using Connections and Operations.
---

# Recipe: Connect an External System

This recipe walks through wiring an external REST API into the Kinetic Platform end-to-end — creating a Connection, defining Operations, invoking them from workflows, and calling them from front-end portals. The examples use a generic ticketing API but the same steps apply to ServiceNow, Jira, Salesforce, or any custom REST endpoint.

**Before reading this recipe, familiarise yourself with:**
- `skills/concepts/integrations/SKILL.md` — Connections/Operations, Bridges, Handlers, comparison table
- `skills/concepts/api-basics/SKILL.md` — endpoint paths, auth, response shapes
- `skills/front-end/mutations/SKILL.md` — `executeIntegration` helper

---

## Overview

Connecting an external system has four phases:

1. Create a Connection (stores base URL and credentials)
2. Create Operations on the Connection (defines specific API calls)
3. Use Operations in workflows via `system_integration_v1`
4. Use Operations from front-end portals via `executeIntegration`

The Connection and Operations are managed through the **Integrator API**, which requires OAuth 2.0 — not Basic Auth.

---

## Step 1 — Obtain an Integrator API Token

The Integrator API lives at a separate path and requires an OAuth 2.0 bearer token. Basic Auth is rejected.

```bash
# Step 1a — Request a token via implicit grant
# The server returns a 302 redirect; --max-redirs 0 captures the Location header
curl -u "admin:password" \
  --max-redirs 0 \
  -w "%{redirect_url}" \
  "https://myspace.kinops.io/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system" \
  2>/dev/null
```

The redirect URL contains the token in the fragment:
```
https://...#access_token=eyJhbGciOi...&token_type=bearer&expires_in=43200
```

Extract the `access_token` value and export it:

```bash
export INTEGRATOR_TOKEN="eyJhbGciOi..."
```

**Token lifetime:** 43,200 seconds (12 hours). Cache and reuse; re-acquire 30 seconds before expiry.

**Integrator API base URL:**
| Environment | URL |
|-------------|-----|
| Cloud (kinops) | `https://<space-slug>.kinops.io/app/integrator/api` |
| Self-hosted | `https://<server>/kinetic/<space-slug>/app/integrator/api` |

---

## Step 2 — Create a Connection

A Connection represents one external system instance. Create one per system (one for ServiceNow prod, one for ServiceNow dev, etc.).

```bash
curl -s -X POST \
  -H "Authorization: Bearer $INTEGRATOR_TOKEN" \
  -H "Content-Type: application/json" \
  "https://myspace.kinops.io/app/integrator/api/connections" \
  -d '{
    "name": "Ticketing System",
    "type": "HTTP",
    "url": "https://ticketing.example.com/api/v2",
    "credentials": {
      "type": "basic",
      "username": "api-user",
      "password": "s3cr3t"
    },
    "defaultHeaders": {
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  }'
```

**Credential types:**

| `credentials.type` | Required fields | Notes |
|--------------------|-----------------|-------|
| `basic` | `username`, `password` | HTTP Basic Auth |
| `bearer` | `token` | Static Bearer token |
| `api_key` | `header`, `value` | Custom header, e.g. `X-API-Key` |
| `oauth2_client_credentials` | `tokenUrl`, `clientId`, `clientSecret`, `scope` | OAuth 2.0 machine-to-machine |
| `none` | — | Public endpoints |

**Successful response:**

```json
{
  "id": "1415539c-ab12-4e67-8f2d-000000000001",
  "name": "Ticketing System",
  "type": "HTTP",
  "url": "https://ticketing.example.com/api/v2",
  "status": "active"
}
```

Save the `id` — you need it to create Operations.

**List existing connections to verify:**

```bash
curl -s \
  -H "Authorization: Bearer $INTEGRATOR_TOKEN" \
  "https://myspace.kinops.io/app/integrator/api/connections"
```

**Update credentials (deep-merge — does not wipe other fields):**

```bash
curl -s -X PUT \
  -H "Authorization: Bearer $INTEGRATOR_TOKEN" \
  -H "Content-Type: application/json" \
  "https://myspace.kinops.io/app/integrator/api/connections/{connectionId}" \
  -d '{
    "credentials": {
      "type": "bearer",
      "token": "new-token-value"
    }
  }'
```

---

## Step 3 — Create Operations

An Operation defines one specific API call: HTTP method, path, input parameters, and output mappings. Create a separate Operation for each distinct action (lookup by ID, search, create, update).

```bash
export CONNECTION_ID="1415539c-ab12-4e67-8f2d-000000000001"

curl -s -X POST \
  -H "Authorization: Bearer $INTEGRATOR_TOKEN" \
  -H "Content-Type: application/json" \
  "https://myspace.kinops.io/app/integrator/api/connections/$CONNECTION_ID/operations" \
  -d '{
    "name": "Get Ticket",
    "method": "GET",
    "path": "/tickets/${parameters[\"Ticket Id\"]}",
    "parameters": [
      { "name": "Ticket Id", "required": true, "description": "External ticket ID to fetch" }
    ],
    "outputMappings": [
      { "name": "Status",      "value": "${response.body[\"status\"]}" },
      { "name": "Summary",     "value": "${response.body[\"summary\"]}" },
      { "name": "Assignee",    "value": "${response.body[\"assignee\"][\"displayName\"]}" },
      { "name": "External Id", "value": "${response.body[\"id\"]}" }
    ]
  }'
```

**Successful response:**

```json
{
  "id": "7750b186-cd34-5f89-a012-000000000002",
  "name": "Get Ticket",
  "method": "GET",
  "path": "/tickets/${parameters[\"Ticket Id\"]}"
}
```

Save the operation `id` — it is referenced in workflow tasks and form integration configs.

### Common Operation Patterns

#### Lookup by ID (GET)

```json
{
  "name": "Get Ticket",
  "method": "GET",
  "path": "/tickets/${parameters[\"Ticket Id\"]}",
  "parameters": [
    { "name": "Ticket Id", "required": true }
  ],
  "outputMappings": [
    { "name": "Status",  "value": "${response.body[\"status\"]}" },
    { "name": "Summary", "value": "${response.body[\"summary\"]}" }
  ]
}
```

#### Search / List (GET with query string)

```json
{
  "name": "Search Tickets",
  "method": "GET",
  "path": "/tickets?status=${parameters[\"Status\"]}&assignee=${parameters[\"Assignee\"]}&limit=${parameters[\"Limit\"]}",
  "parameters": [
    { "name": "Status",   "required": false },
    { "name": "Assignee", "required": false },
    { "name": "Limit",    "required": false }
  ],
  "outputMappings": [
    { "name": "Tickets", "value": "${response.body[\"results\"]}" },
    { "name": "Total",   "value": "${response.body[\"total\"]}" }
  ]
}
```

#### Create Record (POST)

```json
{
  "name": "Create Ticket",
  "method": "POST",
  "path": "/tickets",
  "body": {
    "summary":     "${parameters[\"Summary\"]}",
    "description": "${parameters[\"Description\"]}",
    "priority":    "${parameters[\"Priority\"]}",
    "assignee":    "${parameters[\"Assignee\"]}"
  },
  "parameters": [
    { "name": "Summary",     "required": true  },
    { "name": "Description", "required": false },
    { "name": "Priority",    "required": false },
    { "name": "Assignee",    "required": false }
  ],
  "outputMappings": [
    { "name": "Ticket Id", "value": "${response.body[\"id\"]}" },
    { "name": "Ticket URL","value": "${response.body[\"self\"]}" }
  ]
}
```

#### Update Record (PATCH)

```json
{
  "name": "Update Ticket Status",
  "method": "PATCH",
  "path": "/tickets/${parameters[\"Ticket Id\"]}",
  "body": {
    "status": "${parameters[\"Status\"]}"
  },
  "parameters": [
    { "name": "Ticket Id", "required": true },
    { "name": "Status",    "required": true }
  ],
  "outputMappings": [
    { "name": "Updated At", "value": "${response.body[\"updatedAt\"]}" }
  ]
}
```

**List operations on a connection:**

```bash
curl -s \
  -H "Authorization: Bearer $INTEGRATOR_TOKEN" \
  "https://myspace.kinops.io/app/integrator/api/connections/$CONNECTION_ID/operations"
```

---

## Step 4 — Use Operations in Workflows

Invoke any Operation from a workflow using the built-in `system_integration_v1` handler. Parameters map directly to the operation's `parameters` array by name.

```xml
<!-- In tree XML — create an external ticket on form submission -->
<task definition_id="system_integration_v1" name="Create External Ticket">
  <parameters>
    <parameter id="connection">1415539c-ab12-4e67-8f2d-000000000001</parameter>
    <parameter id="operation">7750b186-cd34-5f89-a012-000000000003</parameter>
    <parameter id="parameters.Summary"><%= @submission['values']['Summary'] %></parameter>
    <parameter id="parameters.Description"><%= @submission['values']['Description'] %></parameter>
    <parameter id="parameters.Priority"><%= @submission['values']['Priority'] %></parameter>
    <parameter id="parameters.Assignee"><%= @submission['values']['Assigned Team'] %></parameter>
  </parameters>
</task>
```

After the handler runs, its outputs are available downstream as:

```
@results['Create External Ticket']['Ticket Id']
@results['Create External Ticket']['Ticket URL']
```

Write these back to the submission so the portal can display them:

```xml
<task definition_id="kinetic_request_ce_submission_update_v1" name="Write Ticket ID to Submission">
  <parameters>
    <parameter id="submission_id"><%= @submission['id'] %></parameter>
    <parameter id="Ticket ID"><%= @results['Create External Ticket']['Ticket Id'] %></parameter>
    <parameter id="Ticket URL"><%= @results['Create External Ticket']['Ticket URL'] %></parameter>
  </parameters>
</task>
```

**Reference — Integrator API endpoints used by `system_integration_v1`:**

| `id` parameter | What it maps to |
|----------------|-----------------|
| `connection` | Connection UUID (`id` from Step 2 response) |
| `operation` | Operation UUID (`id` from Step 3 response) |
| `parameters.*` | Named parameters defined on the operation |

---

## Step 5 — Expose Operations to the Front End

Front-end portals can invoke Operations through the Kinetic kapp integration layer. This requires:

1. Defining the integration on the form (or kapp)
2. Calling it via `executeIntegration` in React

### 5a — Add the Integration to a Form

In the form's JSON definition, add an entry to the `integrations` array:

```json
{
  "integrations": [
    {
      "name": "Get Ticket",
      "connectionId": "1415539c-ab12-4e67-8f2d-000000000001",
      "operationId": "7750b186-cd34-5f89-a012-000000000002",
      "inputMappings": {
        "Ticket Id": "${values('External Ticket Id')}"
      }
    }
  ]
}
```

`inputMappings` keys are the operation's parameter names; values are form expressions.

### 5b — Expose at Kapp Level (Portal-Wide)

For integrations shared across forms (search, lookup, create), register the integration at the kapp level in the Space console under **Kapps > {KappName} > Integrations**. Apply a security policy so only authenticated users can invoke it.

Kapp-level integrations are callable at:
```
POST /integrations/kapps/{kappSlug}/{integrationName}
```

Form-scoped integrations are callable at:
```
POST /integrations/kapps/{kappSlug}/forms/{formSlug}/{integrationName}
```

### 5c — Call from React Portal

Use the `executeIntegration` helper (see `skills/front-end/mutations/SKILL.md` for the full implementation):

```js
// portal/src/helpers/api.js
import { bundle, getCsrfToken } from '@kineticdata/react';

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
  .then(async res => {
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  })
  .catch(err => ({
    error: { message: err?.error || err?.message || 'Unexpected error.' },
  }));
```

**Example — look up an external ticket:**

```jsx
import { executeIntegration } from '../helpers/api';

const TicketDetail = ({ ticketId, kappSlug }) => {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    executeIntegration({
      kappSlug,
      integrationName: 'Get Ticket',           // kapp-level integration name
      parameters: { 'Ticket Id': ticketId },
    }).then(data => {
      if (data.error) setError(data.error.message);
      else setTicket(data);
    });
  }, [ticketId]);

  if (error) return <p>Error: {error}</p>;
  if (!ticket) return <p>Loading...</p>;
  return (
    <dl>
      <dt>Status</dt><dd>{ticket.Status}</dd>
      <dt>Summary</dt><dd>{ticket.Summary}</dd>
      <dt>Assignee</dt><dd>{ticket.Assignee}</dd>
    </dl>
  );
};
```

**Example — create an external ticket on button click:**

```jsx
const handleCreateTicket = async () => {
  const result = await executeIntegration({
    kappSlug,
    integrationName: 'Create Ticket',
    parameters: {
      Summary:     formValues.summary,
      Description: formValues.description,
      Priority:    formValues.priority,
    },
  });

  if (result.error) {
    toastError({ title: result.error.message });
  } else {
    // result['Ticket Id'] and result['Ticket URL'] come from outputMappings
    await updateSubmissionField(submissionId, 'External Ticket Id', result['Ticket Id']);
    toastSuccess({ title: `Ticket ${result['Ticket Id']} created.` });
  }
};
```

**Named integration wrappers** (recommended for projects with several integrations):

```js
const makeIntegration = name => params =>
  executeIntegration({ kappSlug, integrationName: name, parameters: params });

export const getTicket         = makeIntegration('Get Ticket');
export const createTicket      = makeIntegration('Create Ticket');
export const updateTicketStatus = makeIntegration('Update Ticket Status');
export const searchTickets     = makeIntegration('Search Tickets');
```

---

## Step 6 — Populate Form Dropdowns from an Operation

Operations that return a list can drive form field choices without any custom code. In the form JSON:

```json
{
  "integrations": [
    {
      "name": "Active Queues",
      "connectionId": "1415539c-ab12-4e67-8f2d-000000000001",
      "operationId": "7750b186-cd34-5f89-a012-000000000004",
      "inputMappings": {}
    }
  ]
}
```

Then on the dropdown field:

```json
{
  "type": "field",
  "name": "Queue",
  "renderType": "dropdown",
  "dataType": "string",
  "choicesDataSource": "integration",
  "choicesResourceName": "Active Queues",
  "choicesResourceProperty": "queues",
  "choices": {
    "label": "${integration('name')}",
    "value": "${integration('id')}"
  }
}
```

`choicesResourceProperty` is the key in the operation's response that holds the array. `integration('name')` and `integration('id')` reference fields within each array element.

---

## Step 7 — Test the Integration

Before wiring into workflows or the portal, verify each operation independently.

**Test via the UI:** In the Space console, go to Plugins > Connections > {Connection} > {Operation} > Test. Enter parameter values and inspect the raw response.

**Test via the API directly (simulate what the operation would call):**

```bash
# Test the external system's endpoint before creating the operation
curl -u "api-user:s3cr3t" \
  "https://ticketing.example.com/api/v2/tickets/TKT-001"
```

**Test a Create operation end-to-end:**

```bash
# 1. Create a test submission to trigger the workflow
curl -s -u "admin:password" -X POST \
  -H "Content-Type: application/json" \
  "https://myspace.kinops.io/app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions" \
  -d '{
    "values": {
      "Summary": "Test ticket from Kinetic",
      "Description": "Integration smoke test",
      "Priority": "Low"
    },
    "coreState": "Submitted"
  }'

# 2. Check the workflow run to see if the integration handler succeeded
curl -s -u "admin:password" \
  "https://myspace.kinops.io/app/components/task/app/api/v2/runs?limit=5&include=details"
```

**Verify the External ID was written back:**

```bash
curl -s -u "admin:password" \
  "https://myspace.kinops.io/app/api/v1/submissions/{submissionId}?include=values" \
  | python3 -m json.tool | grep "Ticket"
```

---

## Common Gotchas

| Gotcha | Fix |
|--------|-----|
| `401 Unauthorized` on Integrator API | Integrator API does not accept Basic Auth — use OAuth bearer token (Step 1) |
| Token rejected after 12 hours | Default `expires_in=43200`; re-acquire and cache with a 30-second safety buffer |
| Operation path variables not substituted | Path template syntax is `${parameters["Param Name"]}` — check quotes and escaping |
| `executeIntegration` returns `{ error: ... }` but HTTP status is 200 | Integration ran but returned an error payload — check `error.message` and `error.key` |
| CSRF error calling integration from browser | Include `'X-XSRF-TOKEN': getCsrfToken()` header — required for all browser-originated POSTs |
| Output mapping values are `null` | Check the JSON path — use the UI Test tab to inspect the raw response body first |
| Workflow handler has no `results.*` available | Only outputs declared in `outputMappings` are accessible downstream; add missing mappings |
| Connection URL has trailing slash | External API paths in Operations must NOT start with `/` when the connection URL has a trailing slash, or must start with `/` when it does not — match consistently |
| Basic Auth credentials in connection are wrong | Use `PUT /connections/{id}` with just the `credentials` block to update without changing other fields |
| kapp-level integration returns 404 | Integration name on kapp must match `integrationName` in `executeIntegration` exactly (case-sensitive) |

---

## Quick Reference — Integrator API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/connections` | List all connections |
| POST | `/connections` | Create a connection |
| PUT | `/connections/{id}` | Update a connection (deep-merge credentials) |
| DELETE | `/connections/{id}` | Delete a connection |
| GET | `/connections/{id}/operations` | List operations for a connection |
| POST | `/connections/{id}/operations` | Create an operation |
| PUT | `/connections/{id}/operations/{opId}` | Update an operation |
| DELETE | `/connections/{id}/operations/{opId}` | Delete an operation |

All requests require `Authorization: Bearer <token>` and `Content-Type: application/json`.

---

## Applying This Pattern to Specific Systems

The same steps apply regardless of the target system. Adjust only the connection URL, credential type, and operation paths.

| System | `url` | `credentials.type` | Notes |
|--------|-------|--------------------|-------|
| ServiceNow | `https://{instance}.service-now.com/api/now` | `basic` or `oauth2_client_credentials` | Append `/table/{table}` in operation paths |
| Jira Cloud | `https://{org}.atlassian.net/rest/api/3` | `basic` (email + API token) | Use `api_key` for server instances |
| Salesforce | `https://{instance}.salesforce.com/services/data/v59.0` | `oauth2_client_credentials` | Requires Connected App setup in Salesforce |
| PagerDuty | `https://api.pagerduty.com` | `api_key` (`Authorization: Token token=...`) | Custom header auth |
| Custom REST API | Your endpoint | `bearer` or `none` | Match whatever auth the API requires |

---

## Cross-References

- `skills/concepts/integrations/SKILL.md` — full Connections/Operations reference, Bridges, Handlers, comparison table
- `skills/concepts/api-basics/SKILL.md` — Core and Task API endpoints, auth, response shapes
- `skills/api/authentication/SKILL.md` — OAuth 2.0 implicit grant flow, Integrator API base URLs, CSRF tokens
- `skills/front-end/mutations/SKILL.md` — `executeIntegration` helper, named integration wrappers
- `skills/concepts/workflow-engine/SKILL.md` — workflow trees, `system_integration_v1` handler, deferred tasks
- `skills/concepts/decision-frameworks/SKILL.md` — when to use Connections vs Bridges vs Handlers
