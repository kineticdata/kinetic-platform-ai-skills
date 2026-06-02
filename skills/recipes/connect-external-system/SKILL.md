---
name: connect-external-system
description: "Use when integrating the Kinetic Platform with an external REST API (ServiceNow, Jira, Salesforce, or any custom endpoint) — creating a Connection and Operations via the Integrator API (OAuth, not Basic Auth), invoking them from workflows with system_integration_v1, and calling them from a portal via executeIntegration."
---

# Recipe: Connect an External System

This recipe wires an external REST API into the Kinetic Platform end-to-end — token → Connection → Operations → workflow → portal → test. The examples use a generic ticketing API, but the same steps apply to ServiceNow, Jira, Salesforce, or any custom REST endpoint.

This recipe is the runnable spine. For the underlying concepts it builds on — Connection/Operation JSON schema, credential/auth types, base-URL strategy, the `{{Param*}}` asterisk rule, the `system_integration_v1` handler, and defensive output expressions — see `skills/concepts/integrations/SKILL.md`. This recipe cross-references that concept skill rather than re-teaching it.

**Before reading this recipe, familiarise yourself with:**
- `skills/concepts/integrations/SKILL.md` — Connections/Operations, auth types, schema, Bridges, Handlers, comparison table
- `skills/concepts/api-basics/SKILL.md` — base URLs, Integrator OAuth bearer flow
- `skills/front-end/mutations/SKILL.md` — `executeIntegration` helper

---

## Overview

Connecting an external system has four phases:

1. Create a Connection (stores base URL and credentials)
2. Create Operations on the Connection (defines specific API calls)
3. Use Operations in workflows via `system_integration_v1`
4. Use Operations from front-end portals via `executeIntegration`

The Connection and Operations are managed through the **Integrator API**, which requires OAuth 2.0 — not Basic Auth.

**Bridges as an alternative.** This recipe covers Connections + Operations. Bridges (with their Models) are a coexisting mechanism — preferred when a form needs a stable typed data view to populate dropdowns, when the target is reached through a non-REST adapter (SQL, LDAP), or when an existing bridge is the established pattern in your space. The two coexist within a kapp; choose on need, not on a "modern vs legacy" framing. See `concepts/integrations/SKILL.md` (Bridges) and `concepts/models/SKILL.md`.

---

## Step 1 — Obtain an Integrator API Token

The Integrator API requires an OAuth 2.0 bearer token; Basic Auth is rejected.

```bash
# Step 1a — Request a token via implicit grant.
# The server returns a 302 redirect; --max-redirs 0 captures the Location header.
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

**Token lifetime:** 43,200 seconds (12 hours). Cache and reuse; re-acquire ~30 seconds before expiry.

The Integrator API base URL is `{server}/app/integrator/api`. For the cloud-vs-self-hosted base-URL forms and the full OAuth implicit-grant flow (including the extra metadata in the redirect fragment), see `concepts/api-basics/SKILL.md` and `concepts/integrations/SKILL.md`.

---

## Step 2 — Create a Connection

A Connection represents one external system instance. Create one per system (one for ServiceNow prod, one for ServiceNow dev, etc.).

> **Bake the version prefix into `url`.** Set `url` to the host *plus* the common path prefix (e.g. `/api/v1`, `/rest/api/3`). Operation paths are then short relatives like `/tickets/{{Ticket Id}}` instead of repeating the prefix. Kinetic appends `path` to `url` literally — no trailing slash on `url`, leading slash on `path`. Full rationale and per-system table: **Base URL strategy** in `concepts/integrations/SKILL.md`.

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

Set `credentials.type` to match the target system — `basic`, `bearer`, `api_key`, `oauth2_client_credentials`, or `none`. Required fields per type are in the **Connection auth types** table in `concepts/integrations/SKILL.md`.

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

**Update credentials** — `PUT /connections/{id}` with just a `credentials` block deep-merges without wiping other fields. But never PUT auth fields back blindly: GET responses mask secrets as `null`, and PUTting `null` permanently breaks the connection. See the **NEVER modify connection auth credentials** warning in `concepts/integrations/SKILL.md`.

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

> Defining an operation does not require invoking it. Building a catalog of operations ahead of need is a normal "library ahead of need" pattern, not dead code — see `concepts/integrations/SKILL.md`. Path/body placeholder syntax (`{{Param}}` / `{{{Param}}}`), the `{{Param*}}` asterisk-is-part-of-the-key rule, and defensive output expressions (`?.` / `?? null`) are also documented there — follow them when authoring the operations below.

### Common Operation Patterns

Beyond the lookup above, the recipe uses a **Create** operation (driven by the workflow in Step 4 and the end-to-end test in Step 7). The same `name`/`method`/`path`/`parameters`/`outputMappings` shape covers the other CRUD verbs — Search is a `GET` with a templated query string, Update is a `PATCH` with a `body`.

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

**Search / List** (GET) — put the filters in the query string and map the array out: `"path": "/tickets?status=${parameters[\"Status\"]}&limit=${parameters[\"Limit\"]}"` with an output like `{ "name": "Tickets", "value": "${response.body[\"results\"]}" }`.

**Update** (PATCH) — `"path": "/tickets/${parameters[\"Ticket Id\"]}"` with `"body": { "status": "${parameters[\"Status\"]}" }`.

**List operations on a connection:**

```bash
curl -s \
  -H "Authorization: Bearer $INTEGRATOR_TOKEN" \
  "https://myspace.kinops.io/app/integrator/api/connections/$CONNECTION_ID/operations"
```

The full set of Integrator endpoints (get/update/delete connection and operation, export/import, etc.) is in the **Integrator REST API** tables in `concepts/integrations/SKILL.md`.

---

## Step 4 — Use Operations in Workflows

Invoke any Operation from a workflow using the built-in `system_integration_v1` handler. The `connection` and `operation` parameters take the UUIDs from Steps 2 and 3; `parameters.*` map by name to the operation's parameters.

```xml
<!-- In tree XML — create an external ticket on form submission -->
<task definition_id="system_integration_v1" name="Create External Ticket">
  <parameters>
    <parameter id="connection">1415539c-ab12-4e67-8f2d-000000000001</parameter>
    <parameter id="operation">7750b186-cd34-5f89-a012-000000000003</parameter>
    <parameter id="parameters.Summary"><%= @values['Summary'] %></parameter>
    <parameter id="parameters.Description"><%= @values['Description'] %></parameter>
    <parameter id="parameters.Priority"><%= @values['Priority'] %></parameter>
    <parameter id="parameters.Assignee"><%= @values['Assigned Team'] %></parameter>
  </parameters>
</task>
```

After the handler runs, its outputs (the operation's `outputMappings`) are available downstream:

```
@results['Create External Ticket']['Ticket Id']
@results['Create External Ticket']['Ticket URL']
```

Write these back to the submission so the portal can display them:

```xml
<task definition_id="kinetic_request_ce_submission_update_v1" name="Write Ticket ID to Submission">
  <parameters>
    <parameter id="submission_id"><%= @submission['Id'] %></parameter>
    <parameter id="Ticket ID"><%= @results['Create External Ticket']['Ticket Id'] %></parameter>
    <parameter id="Ticket URL"><%= @results['Create External Ticket']['Ticket URL'] %></parameter>
  </parameters>
</task>
```

> `system_integration_v1` has **no `error_handling` lever** — a non-defensive output expression or a 4xx/5xx response fails the whole run. Make every output expression defensive. Handler parameter details and ERB binding rules are in `concepts/workflow-xml/SKILL.md`; the defensive-expression requirement is in `concepts/integrations/SKILL.md`.

---

## Step 5 — Expose Operations to the Front End

Front-end portals invoke Operations through the Kinetic kapp integration layer. This requires defining the integration on the form (or kapp), then calling it via `executeIntegration` in React.

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

`inputMappings` keys are the operation's parameter names; values are form expressions. (Note: every `${values('X')}` must reference a field that exists on the form, or the form 500s on render.)

### 5b — Expose at Kapp Level (Portal-Wide)

For integrations shared across forms, register the integration at the kapp level in the Space console under **Kapps > {KappName} > Integrations**, and apply a security policy so only authenticated users can invoke it.

Kapp-level integrations are callable at:
```
POST /integrations/kapps/{kappSlug}/{integrationName}
```

Form-scoped integrations are callable at:
```
POST /integrations/kapps/{kappSlug}/forms/{formSlug}/{integrationName}
```

### 5c — Call from React Portal

Use the `executeIntegration` helper — it POSTs to the integration URL with the CSRF token and returns either the operation's `outputMappings` or `{ error: { message } }`. The full implementation (and the `X-XSRF-TOKEN: getCsrfToken()` header it must send) is in `skills/front-end/mutations/SKILL.md`. Its call signature:

```js
executeIntegration({ kappSlug, formSlug, integrationName, parameters }); // → outputs | { error }
```

**Example — look up an external ticket:**

```jsx
import { executeIntegration } from '../helpers/api';

useEffect(() => {
  executeIntegration({
    kappSlug,
    integrationName: 'Get Ticket',            // kapp-level integration name
    parameters: { 'Ticket Id': ticketId },
  }).then(data => {
    if (data.error) setError(data.error.message);
    else setTicket(data);                     // data.Status, data.Summary, data.Assignee
  });
}, [ticketId]);
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

Once you have several integrations, wrap them by name so callers don't repeat `kappSlug`/`integrationName`:

```js
const makeIntegration = name => params =>
  executeIntegration({ kappSlug, integrationName: name, parameters: params });
export const getTicket    = makeIntegration('Get Ticket');
export const createTicket = makeIntegration('Create Ticket');
```

---

## Step 6 — Populate Form Dropdowns from an Operation

An Operation that returns a list can drive form field choices with no custom code. Add the integration with empty `inputMappings`:

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

`choicesResourceProperty` is the key in the response that holds the array; `integration('name')` and `integration('id')` reference fields within each array element.

---

## Step 7 — Test the Integration

Verify each operation independently before wiring it into workflows or the portal.

**Test via the UI:** Space console > Plugins > Connections > {Connection} > {Operation} > Test. Enter parameter values and inspect the raw response.

**Test via the Integrator `/execute` endpoint directly:**

`POST /app/integrator/api/execute` runs a single operation against its connection without a workflow or form — ideal for verifying inputs/outputs in isolation. Requires the OAuth bearer token from Step 1.

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/app/integrator/api/execute" \
  -d '{
    "connectionId": "<connection-uuid>",
    "operationId":  "<operation-uuid>",
    "parameters":   { "Country Code": "US" }
  }'
```

Two gotchas on the request body:
- **The key is `parameters`, not `inputs`.** Posting `{"inputs": {...}}` returns `{"error": "Request does not match the API schema", "validationErrors": [{"error": "Unexpected field: inputs"}]}`.
- **Each parameter key matches the literal placeholder name** from the operation. If the path uses `{{Country Code}}` (with the space), the request key is `"Country Code"` — with the space. Renaming to `country_code` causes a silent miss: the placeholder isn't substituted and the request goes out malformed. (Same key-matching rule as the `{{Param*}}` asterisk case — see `concepts/integrations/SKILL.md`.)

**Test against the external system directly (before creating the operation):**

```bash
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

# 2. Check the workflow run to confirm the integration handler succeeded
curl -s -u "admin:password" \
  "https://myspace.kinops.io/app/components/task/app/api/v2/runs?limit=5&include=details"
```

If the run stalled, pull the real exception from the Task `/errors` endpoint (`GET /app/components/task/app/api/v2/errors?include=details&status=Active`). See `concepts/task-api-reference/SKILL.md` for the runs/errors response shapes.

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
| `401 Unauthorized` on Integrator API | Integrator API does not accept Basic Auth — use the OAuth bearer token (Step 1) |
| Token rejected after 12 hours | Default `expires_in=43200`; re-acquire and cache with a ~30-second safety buffer |
| `/execute` returns `Unexpected field: inputs` | The body key is `parameters`, not `inputs` (Step 7) |
| Parameter not substituted in `/execute` | Each key must match the operation's literal placeholder name, spaces/asterisks included (Step 7) |
| `executeIntegration` returns `{ error: ... }` but HTTP status is 200 | Integration ran but returned an error payload — check `error.message` |
| CSRF error calling integration from browser | Include `'X-XSRF-TOKEN': getCsrfToken()` — required for all browser POSTs |
| Workflow handler has no `results.*` available | Only outputs declared in `outputMappings` are accessible downstream; add the missing mapping |
| Workflow node fails with `RuntimeError` on a 4xx/5xx | `system_integration_v1` has no error_handling lever — output expressions must be defensive (`concepts/integrations`) |
| kapp-level integration returns 404 | Integration name on the kapp must match `integrationName` in `executeIntegration` exactly (case-sensitive) |
| Output mappings `null` / double-slash URL / repeated `/api/v1` | Connection + Operation schema and base-URL strategy in `concepts/integrations/SKILL.md` |

---

## Applying This Pattern to Specific Systems

The steps are identical regardless of target — adjust only the connection `url`, `credentials.type`, and operation paths. For example, ServiceNow uses `url: https://{instance}.service-now.com/api/now` with `basic` or `oauth2_client_credentials`; PagerDuty uses `url: https://api.pagerduty.com` with `api_key` header auth. The full per-system base-URL and auth table is in the **Base URL strategy** and **Connection auth types** sections of `concepts/integrations/SKILL.md`.

---

## Cross-References

- `skills/concepts/integrations/SKILL.md` — Connection/Operation schema, auth types, base-URL strategy, `{{Param*}}` rule, `system_integration_v1` details, defensive outputs, Bridges, comparison table
- `skills/concepts/api-basics/SKILL.md` — base URLs, Integrator OAuth bearer flow
- `skills/concepts/workflow-xml/SKILL.md` — workflow tree XML, handler parameters, ERB bindings
- `skills/concepts/task-api-reference/SKILL.md` — Task API runs/errors endpoints and response shapes
- `skills/front-end/mutations/SKILL.md` — `executeIntegration` helper, named integration wrappers
- `skills/concepts/decision-frameworks/SKILL.md` — when to use Connections vs Bridges vs Handlers
