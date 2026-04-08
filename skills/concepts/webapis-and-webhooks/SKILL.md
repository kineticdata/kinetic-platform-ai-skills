---
name: webapis-and-webhooks
description: WebAPIs (custom REST endpoints backed by workflows), Webhooks (event-driven workflow triggers), security policies, callback patterns, and API management for the Kinetic Platform.
---

# WebAPIs and Webhooks

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
| `@request['body']` | Request body (JSON string) |
| `@request['method']` | HTTP method (GET, POST, etc.) |
| `@request['parameters']` | Query parameters |
| `@request['headers']` | Request headers |

The workflow returns a response using the `system_tree_return_v1` handler with result parameters for status code, headers, and body.

---

## Webhooks — Event-Driven Triggers

**Webhooks** are the mechanism that triggers workflow trees when platform events occur. They are NOT the same as WebAPIs — webhooks fire automatically on events, while WebAPIs are called explicitly via HTTP.

### Supported Event Types

| Category | Events |
|----------|--------|
| **User** | Created, Updated, Deleted |
| **Team** | Created, Updated, Deleted |
| **Kapp** | Created, Updated |
| **Form** | Created, Updated |
| **Submission** | Created, Submitted, Updated, Closed, Deleted |

### Webhook Scope

Webhooks can be configured at three levels:

| Scope | Fires For | Tree `platformItemType` |
|-------|-----------|------------------------|
| **Space** | All events across all kapps | `Space` |
| **Kapp** | All events within a specific kapp | `Kapp` |
| **Form** | Events on a specific form only | `Form` |

### Key Behaviors

- **Asynchronous** — webhooks queue workflow runs; the triggering action (e.g., form submission) does not wait for the workflow to complete
- **Backlog risk** — bulk operations (mass submit) generate many webhook fires; plan for workflow engine backlog
- **PATCH bypasses webhooks** — `PATCH /submissions` does NOT fire webhooks (use for migrations/backfill)
- **Multiple trees per event** — multiple trees can be bound to the same event (all fire independently)

### Webhook Configuration

Webhooks are managed in the Kinetic Console:
- **Space Console > Webhooks** for space-level triggers
- **Kapp Console > Webhooks** for kapp and form-level triggers

Each webhook maps an event type to a workflow tree.

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
GET /app/api/v1/kapps/{kappSlug}/webhookJobs           # List kapp webhook jobs
GET /app/api/v1/webhookJobs                              # List space webhook jobs
GET /app/api/v1/kapps/{kappSlug}/webhookJobs/{id}       # Get job detail
```

**Query parameters:** `status` (queued/failed), `webhook` (name filter), `parentType` + `parentKey` (filter by triggering entity), `limit` (default 25), `pageToken`, `start`/`end` (date range).

**Gotcha:** Default limit is 25 (not the usual 1000). `parentType` and `parentKey` must be used together.

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
