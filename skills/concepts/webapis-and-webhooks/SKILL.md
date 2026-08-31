---
name: webapis-and-webhooks
description: "Use when exposing a Kinetic workflow as a custom REST endpoint or wiring an event trigger — WebAPIs (/app/webApis/<slug> or /app/kapps/<kapp>/webApis/<slug>, @request body/method/parameters, 30s synchronous timeout, callback pattern), Webhooks as event-driven tree triggers, securing them with KSL policies, or frontend JS calling a WebAPI."
---

# WebAPIs and Webhooks

> **"Webhook" is overloaded in the platform.** This skill covers two distinct concepts that share the name:
>
> 1. **Customer-managed webhook** (the "external POSTer") — a configured object that calls **out** to an external HTTPS URL when a platform event fires. CRUD'd via `/app/api/v1/webhooks` (space) or `/app/api/v1/kapps/{kapp}/webhooks` (kapp). This is what most documentation means by "webhook." The "Webhooks — External POSTers" section below covers this.
>
> 2. **Implicit event-trigger** — the internal mechanism the platform uses to dispatch workflow runs in response to events (e.g., the same "Submission Submitted" event the external-POSTer-webhook observes also dispatches any workflow trees bound to that event). These appear in webhook-job history as `"Implicit Webhook Job"` with `"webhookId": null` — they are platform-internal and you don't CRUD them; you configure their behavior by registering workflows. The "Implicit Webhooks" subsection covers this.
>
> When a skill or recipe says "webhook" without qualification, it means #1 (the external POSTer). Implicit webhooks (#2) are an internal implementation detail of the workflow-trigger mechanism; you interact with them only when debugging why a workflow did or didn't fire.

## WebAPIs — Custom REST Endpoints

A **WebAPI** exposes a workflow as a callable REST endpoint. External systems or the portal frontend can invoke it via HTTP.

### URL Patterns

- **Space-level:** `https://<space>.kinops.io/app/webApis/<slug>`
- **Kapp-level:** `https://<space>.kinops.io/app/kapps/<kappSlug>/webApis/<slug>`

### How WebAPIs Work

1. An HTTP request hits the WebAPI URL
2. The platform routes it to a workflow tree bound to that WebAPI
3. The workflow executes (handlers, routines, integrations)
4. The workflow returns a response (JSON, XML, or plain text) to the caller

### WebAPI Tree Binding

WebAPI trees have a distinctive `sourceGroup` format in the Task API:

| Pattern | Meaning |
|---------|---------|
| `WebApis > {kapp-slug}` | Kapp-level WebAPI |
| `WebApis` | Space-level WebAPI |

Tree title format: `Kinetic Request CE :: WebApis > {kapp-slug} :: {webapi-name}`

### Synchronous Timeout

WebAPIs support a **synchronous timeout** (max 30 seconds). If the workflow completes within the timeout, the response is returned inline. If it exceeds the timeout, the caller receives a timeout response.

For long-running operations, use the **callback pattern**: the WebAPI returns immediately with a token, and the workflow calls back to the external system when done (see External System Sync in the Architectural Patterns skill).

### Security Policies on WebAPIs

WebAPIs can be secured with security policies that control who can invoke them. Policies use the same KSL (Kinetic Security Language) expressions as form security (see the Users, Teams, and Security skill).

### Common Use Cases

- **External system callbacks** — receive webhook notifications from third-party systems (e.g., ServiceNow, Jira)
- **Custom API endpoints** — expose platform data or actions to external consumers
- **Deferral completion** — external systems call back with a deferral token to resume a paused workflow
- **Frontend integrations** — portal JavaScript calls a WebAPI to trigger server-side logic that isn't available through standard form submission

### WebAPI in Workflows

The workflow backing a WebAPI accesses the HTTP request via context variables:

| Variable | Description |
|----------|-------------|
| `@request['Body']` | Request body (string). **Capitalized key — `@request['body']` raises IndexError.** |
| `@request['Method']` | HTTP method (GET, POST, etc.) |
| `@request['Parameters']` | Query parameters map. **Engine-variable** — see below; on some engine builds (observed 2026-05) this key is absent and only `@request['Query']` (raw query string) is present. |
| `@request['Query']` | Raw query string (everything after `?`). Reliable across engine builds — parse it yourself for portability. |
| `@request['Headers']` | Request headers map. **Known issue: access with a string key (`@request['Headers']['X-Foo']`) raises IndexError in some engine builds; `@request['Headers']` alone to inspect the whole map is safer.** |

**Portable query-parameter pattern** — use `@request['Query']` and parse manually so the workflow works on any engine:
```erb
<%=
  require 'uri'
  params = {}
  q = @request['Query'].to_s
  URI.decode_www_form(q).each { |k, v| params[k.to_s] = v.to_s } unless q.empty?
  cls = params['class'] || 'servers'
  id  = params['id'] || ''
%>
```
This was discovered while debugging a CMDB WebAPI that returned 404s: the workflow's `@request['Parameters']['ciNumber']` was silently returning `nil` because the `Parameters` key didn't exist on the engine. A `?count=true` debug WebAPI returning `@request.inspect` showed `{"Body" => nil, "Query" => "ciNumber=SRV-0001&class=servers"}` — no `Parameters` field at all. Don't assume `Parameters` exists; parse `Query` instead.

**Critical: key names are Capitalized**, not lowercase. Confirmed on Kinetic Task Engine 6.1.7 via runtime dump (`@request.inspect` → `{"Body"=>"...", "Parameters"=>{...}, ...}`). Earlier versions of this skill documented lowercase keys — that was wrong. Accessing `@request['body']` raises `IndexError: string not matched` and the run fails with `Node Parameter Error` surfaced as `run_results_error` on the WebAPI response.

**Recommended access pattern** — defensive, engine-version-tolerant:
```erb
<%=
raw = (@request['Body'] || @request['body']).to_s
# Avoid directly indexing @request['Headers']['Some-Name'] — may IndexError.
# Instead, capture the whole map first (safer) or read from @request['Parameters'] for query data.
%>
```

The workflow returns a response using the `system_tree_return_v1` handler with result parameters for status code, headers, and body.

### Synchronous Invocation with `?timeout`

By default, calling a WebAPI URL returns immediately with `{"messageType":"success","message":"Initiated run #N.","runId":"N"}`. To get the actual workflow response inline, pass the `?timeout` query parameter (in seconds):

```
GET https://myspace.kinops.io/app/kapps/services/webApis/my-api?timeout=15
```

The platform will wait up to 15 seconds for the workflow to reach a `system_tree_return_v1` node and return its content. If the workflow doesn't complete in time, a timeout error is returned.

### Creating a WebAPI End-to-End

1. **Create the WebAPI definition** (Core API):
```
POST /app/api/v1/kapps/{kapp}/webApis
{ "slug": "list-items", "method": "GET" }
```

2. **Create the backing workflow tree** (Task API):
```
POST /app/components/task/app/api/v2/trees
{
  "sourceName": "Kinetic Request CE",
  "sourceGroup": "WebApis > {kapp-slug}",
  "name": "list-items",
  "type": "Tree",
  "status": "Active",
  "treeXml": "<taskTree>...</taskTree>"
}
```

3. **Update the tree with treeJson** (more reliable than XML for round-trips):
```
PUT /app/components/task/app/api/v2/trees/{url-encoded-title}
{
  "treeJson": { ... },
  "versionId": "0"
}
```

4. **Invoke the WebAPI**:
```
GET https://myspace.kinops.io/app/kapps/{kapp}/webApis/list-items?timeout=15
```

### WebAPI Return Node Configuration (Critical)

The `system_tree_return_v1` node for WebAPI trees requires these **exact parameter IDs**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `content` | Yes | Response body (supports ERB: `<%= ... %>`) |
| `content_type` | Yes | MIME type (e.g., `application/json`) |
| `response_code` | Yes | HTTP status code (e.g., `200`) |
| `headers_json` | **Yes** | Extra response headers as JSON (`{}` if none). **Omitting this causes a RuntimeError** at runtime — the node fails silently with "ENGINE Run Error" |

**Gotcha:** The `headers_json` parameter is listed as optional in some documentation but is **required in practice**. Without it, the Return node throws a RuntimeError and the WebAPI returns `{"errorKey":"run_results_error"}`.

### Complete WebAPI treeJson Example

```json
{
  "treeJson": {
    "builderVersion": "",
    "schemaVersion": "1.0",
    "version": "",
    "processOwnerEmail": "",
    "lastId": 3,
    "name": "list-items",
    "notes": "",
    "connectors": [
      {"from": "start", "to": "kinetic_core_api_v1_2", "type": "Complete", "label": "", "value": ""},
      {"from": "kinetic_core_api_v1_2", "to": "system_tree_return_v1_3", "type": "Complete", "label": "Success", "value": "@results[\"Fetch Items\"][\"Handler Error Message\"].to_s.empty?"}
    ],
    "nodes": [
      {
        "configured": true, "defers": false, "deferrable": false, "visible": false,
        "name": "Start", "messages": [], "id": "start",
        "position": {"x": 10, "y": 10}, "version": 1,
        "parameters": [], "definitionId": "system_start_v1"
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Fetch Items", "messages": [{"type": "Complete", "value": ""}],
        "id": "kinetic_core_api_v1_2",
        "position": {"x": 200, "y": 10}, "version": 1,
        "parameters": [
          {"id": "method", "value": "GET"},
          {"id": "path", "value": "/kapps/{kapp}/forms/{form}/submissions?include=values,details&limit=25"},
          {"id": "body", "value": ""},
          {"id": "error_handling", "value": "Error Message"}
        ],
        "definitionId": "kinetic_core_api_v1"
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Return", "messages": [{"type": "Complete", "value": ""}],
        "id": "system_tree_return_v1_3",
        "position": {"x": 400, "y": 10}, "version": 1,
        "parameters": [
          {"id": "content", "value": "<%= @results[\"Fetch Items\"][\"Response Body\"] %>"},
          {"id": "content_type", "value": "application/json"},
          {"id": "response_code", "value": "200"},
          {"id": "headers_json", "value": "{}"}
        ],
        "definitionId": "system_tree_return_v1"
      }
    ]
  },
  "versionId": "0"
}
```

---

## Webhooks — External POSTers (Customer-Managed)

A **customer-managed webhook** is a configured object that the platform POSTs OUT to an external HTTPS URL when a matching event fires. They are NOT WebAPIs (which receive incoming calls) and NOT the implicit-event-trigger mechanism (which dispatches workflow runs internally).

**Cleanly: webhooks call OUT; WebAPIs receive IN; implicit triggers route events to workflows internally.**

### Supported Event Types

| Category | Events |
|----------|--------|
| **User** | Created, Updated, Deleted |
| **Team** | Created, Updated, Deleted |
| **Kapp** | Created, Updated |
| **Form** | Created, Updated |
| **Submission** | Created, Submitted, Updated, Closed, Deleted |

### Webhook Scope

Webhooks can be configured at two API levels (form-level webhooks are NOT supported via the API):

| Scope | API Endpoint | Fires For |
|-------|-------------|-----------|
| **Space** | `POST /app/api/v1/webhooks` | All events across all kapps |
| **Kapp** | `POST /app/api/v1/kapps/{kappSlug}/webhooks` | Events within a specific kapp |

**Gotcha — no form-level webhooks via API:** `GET /kapps/{kapp}/forms/{form}/webhooks` returns 404. Form-level webhook binding happens through workflow tree configuration, not a separate webhook entity.

### Webhook API — CRUD

```bash
# Space webhooks
GET    /app/api/v1/webhooks                              # List all
POST   /app/api/v1/webhooks                              # Create
GET    /app/api/v1/webhooks/{name}                       # Get by name
PUT    /app/api/v1/webhooks/{name}                       # Update
DELETE /app/api/v1/webhooks/{name}                       # Delete

# Kapp webhooks
GET    /app/api/v1/kapps/{kappSlug}/webhooks             # List all
POST   /app/api/v1/kapps/{kappSlug}/webhooks             # Create
GET    /app/api/v1/kapps/{kappSlug}/webhooks/{name}      # Get by name
PUT    /app/api/v1/kapps/{kappSlug}/webhooks/{name}      # Update
DELETE /app/api/v1/kapps/{kappSlug}/webhooks/{name}      # Delete
```

**Create/Update request body:**
```json
{
  "name": "Notify on Submit",
  "type": "Submission Submitted",
  "event": "Submission Submitted",
  "filter": "values[\"Status\"] != \"\"",
  "url": "https://example.com/webhook-handler"
}
```

**Required fields:** `name`, `type` (the error message says "Type must not be blank" if omitted). Both `type` and `event` should be set to the same value — the API stores both and returns both.

**Response shape:**
```json
{
  "webhook": {
    "name": "Notify on Submit",
    "type": "Submission Submitted",
    "event": "Submission Submitted",
    "filter": "values[\"Status\"] != \"\"",
    "url": "https://example.com/webhook-handler"
  }
}
```

List response: `{ "webhooks": [...] }`
Delete response: returns the deleted webhook in `{ "webhook": { ... } }`.

**Gotcha — no event validation:** The API accepts any string for `type`/`event`. Invalid event names are silently accepted but never fire. Use only the valid names from the Workflow Engine skill's Supported Events table: `Submission Created`, `Submission Submitted`, `Submission Updated`, `Submission Saved`, `Submission Closed`, `Submission Deleted`, `User Created`, `User Updated`, `User Deleted`, `User Login`, `User Logout`, `User Membership Change`, `Team Created`, `Team Updated`, `Team Deleted`, `Team Restored`, `Team Membership Change`, `Form Created`, `Form Updated`, `Form Deleted`, `Form Restored`, `Space Login Failure`.

**Gotcha — filter is a KSL expression:** The `filter` field accepts expressions like `"true"` (always fire), `"values[\"Status\"]=\"Open\""` (conditional fire). These use KSL (Kinetic Security Language) syntax.

**Gotcha — webhooks are identified by name:** The URL path uses the webhook name (URL-encoded), not an ID.

### Implicit Webhooks — The Internal Event-Trigger Mechanism

The platform also fires **implicit webhook jobs** that are NOT tied to user-configured external-POSTer webhooks. These are the platform's internal mechanism for dispatching workflow runs in response to events — when a workflow tree is bound to "Submission Submitted," the run is dispatched via an implicit webhook job.

You see implicit webhooks in webhook-job history (`/webhookJobs`) with `"name": "Implicit Webhook Job"` and `"webhookId": null`. You don't CRUD them — you don't see them in the Console's Webhooks list — they exist only as observable artifacts in job history.

**When does this matter?** Almost never. Two cases where it does:

- **Debugging a workflow that didn't fire.** Check `/webhookJobs?status=Failed` for implicit jobs associated with the event you expected — a failed implicit job means the platform tried to dispatch the workflow and something broke before the run was created.
- **Backlog troubleshooting.** Bulk operations (mass submit, bulk PUT) generate many implicit webhook jobs in parallel with any user-configured webhooks. If the Task engine is backlogged, both show in the queue.

For configuring which workflows fire on which events, see `concepts/workflow-creation` — that's where workflow-event binding happens, NOT here. This section exists only so the term "implicit webhook" makes sense when it appears in error logs or webhook-job history.

### Key Behaviors

- **Asynchronous** — webhooks queue workflow runs; the triggering action (e.g., form submission) does not wait for the workflow to complete
- **Backlog risk** — bulk operations (mass submit) generate many webhook fires; plan for workflow engine backlog
- **PATCH bypasses webhooks** — `PATCH /submissions` does NOT fire webhooks (use for migrations/backfill)
- **Multiple trees per event** — multiple trees can be bound to the same event (all fire independently)

### Webhook Configuration

Webhooks are managed in the Kinetic Console:
- **Space Console > Webhooks** for space-level triggers
- **Kapp Console > Webhooks** for kapp-level triggers

Each webhook maps an event type to a workflow tree via the URL field (typically pointing to the Task API run endpoint).

### Common Webhook Patterns

**Submission Created** — the most common trigger:
- Send notification emails
- Create records in external systems
- Initialize workflow processes (approvals, fulfillment)

**Submission Submitted** — fires when a Draft is formally submitted:
- Start approval chains
- Route to work queues
- Trigger SLA timers

**User Created** — fires on new user provisioning:
- Set default team memberships
- Send welcome emails
- Provision external system accounts

---

## Webhook Jobs (Execution History)

Webhook Jobs are execution records for individual webhook invocations. Use them to monitor delivery success and retry failures.

```bash
GET /app/api/v1/webhookJobs                              # List space webhook jobs
GET /app/api/v1/webhookJobs/{id}                         # Get job detail
GET /app/api/v1/kapps/{kappSlug}/webhookJobs             # List kapp webhook jobs
GET /app/api/v1/kapps/{kappSlug}/webhookJobs/{id}        # Get kapp job detail
```

**Query parameters:** `status` (Complete/Queued/Failed), `type` (User/Submission/etc.), `limit` (default 25), `pageToken`, `start`/`end` (date range).

**Full webhook job response shape:**
```json
{
  "webhookJob": {
    "id": "9f7c4889-32f3-11f1-85e7-8f53b6e0619f",
    "name": "Implicit Webhook Job",
    "event": "User Created",
    "type": "User",
    "status": "Complete",
    "summary": "200 OK",
    "url": "/app/api/v2/runs?guid=2e0f049e-...",
    "webhookId": null,
    "parentId": "9f7a73c7-32f3-11f1-85e7-5d6cea2c776e",
    "scopeId": "6c460f94-...",
    "scopeType": "Space",
    "retryCount": 0,
    "scheduledAt": "2026-04-08T02:35:35.925Z",
    "requestContent": "{\"event\":{\"action\":\"Created\",\"type\":\"User\"},\"space\":{...},\"user\":{...}}",
    "responseContent": "{\"messageType\":\"success\",\"message\":\"Initiated run #1430.\",\"runId\":\"1430\"}"
  }
}
```

**Webhook job fields:**

| Field | Description |
|-------|-------------|
| `event` | Full event name (e.g., `"User Created"`, `"Submission Submitted"`) |
| `type` | Event category (e.g., `"User"`, `"Submission"`) |
| `status` | `Complete`, `Queued`, or `Failed` |
| `summary` | HTTP response summary (e.g., `"200 OK"`) |
| `url` | The webhook URL that was called (often a Task API run endpoint) |
| `webhookId` | ID of the webhook definition, or `null` for implicit webhooks |
| `parentId` | ID of the parent job (for grouped webhook executions) |
| `scopeType` | `"Space"` or `"Kapp"` |
| `scopeId` | ID of the space or kapp |
| `retryCount` | Number of retry attempts |
| `requestContent` | Full JSON payload sent to the webhook URL (as string) |
| `responseContent` | Response body received (as string) |
| `scheduledAt` | When the job was scheduled |

**Include parameter:** `?include=details` adds `createdAt`, `createdBy`, `updatedAt`, `updatedBy` to the response.

**Pagination:** Uses standard `nextPageToken` / `pageToken` pattern. Default page size is 25.

**Gotcha:** Default limit is 25 (not the usual 1000). `parentType` and `parentKey` must be used together for filtering by triggering entity.

---

## Webhooks vs WebAPIs Decision

| Feature | Webhooks | WebAPIs |
|---------|----------|---------|
| **Trigger** | Automatic (platform events) | Explicit (HTTP request) |
| **Direction** | Platform → Workflow | External → Workflow |
| **Synchronous** | No (always async) | Optional (30s timeout) |
| **Use case** | React to platform events | Expose endpoints to external systems |
| **Configuration** | Console > Webhooks | Console > WebAPIs |

### When to Use Which

- **Webhook**: "When a submission is created, do X" — reacting to platform events
- **WebAPI**: "When an external system calls us, do X" — receiving external requests
- **Both together**: External system sync pattern — webhook triggers outbound call, WebAPI receives the callback
