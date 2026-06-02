---
name: task-api-reference
description: "Use when calling the Kinetic Task API v2 directly — listing/creating trees, reading runs and their tasks, querying triggers, resolving errors via /errors, inspecting handlers/sources, or decoding run/tree/task JSON response shapes (include=details, status values, pagination)."
---

# Kinetic Task API v2 Reference

A consolidated reference for calling the Kinetic Task API v2 directly: endpoints, authentication, response shapes, triggers, and error management.

> For workflow XML/treeJson syntax see `concepts/workflow-xml`; for execution-model concepts see `concepts/workflow-engine`; for creating/binding workflows see `concepts/workflow-creation`.

## Base URL & Authentication

**Base URL pattern:**
```
https://<space>.kinops.io/app/components/task/app/api/v2
```

**Base URL:** `{serverUrl}/app/components/task/app/api/v2`
**Auth:** HTTP Basic Auth (`Authorization: Basic <base64(user:pass)>`)
**Pagination:** `limit` (default 100) + `offset` (default 0)
**Filtering:** `tree`, `source`, `start`, `end` query params on `/runs`

**Critical: Component Path vs Direct Path for Routine Creation**

| Path | Inputs/Outputs | treeJson |
|------|---------------|----------|
| `/app/components/task/app/api/v2/trees` | **Works** — saves `taskDefinition` | Works |
| `/kinetic-task/app/api/v2/trees` | **Silently dropped** | Works |

The component path (`/app/components/task/...`) is what the Kinetic Console uses internally. The direct path (`/kinetic-task/...`) does NOT support `inputs`/`outputs` on POST — they are silently ignored, producing a routine with no public interface. **Always use the component path for routine creation.**

### Searching by Name

The `/trees` endpoint returns all workflows. To find a specific workflow:
1. Fetch the full list with `?limit=500`
2. Search the JSON array by `name` field (the human-readable name)
3. Use the `title` field for export (it's the full qualified name)

**Important:** The `title` field differs between Trees and Global Routines (see `concepts/workflow-creation` for title format).

## Endpoints

### Tree Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/trees` | Search trees |
| POST | `/trees` | Create tree (JSON fields, file upload, or URL import) |
| GET | `/trees/{title}` | Retrieve tree by title |
| PUT | `/trees/{title}` | Update tree (treeXml OR treeJson, not both) |
| DELETE | `/trees/{title}` | Delete tree |
| POST | `/trees/{title}/clone` | Clone/duplicate tree |
| GET | `/trees/{title}/export` | Export tree definition |
| POST | `/trees/{title}/restore` | Restore deleted tree |

Additional convenience usage observed:
- `GET /trees?limit=500` — list with higher limit (default is 100)

**Tree Create** supports three methods:
1. JSON fields: `{ "sourceName": "...", "sourceGroup": "...", "name": "..." }`
2. File upload: multipart/form-data with `content` field
3. URL import: `{ "contentUrl": "..." }`

**Tree Update** accepts `treeXml` or `treeJson` (not both).

### Run Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/runs` | Search runs |
| POST | `/runs` | Create run (trigger a tree) |
| GET | `/runs/{id}` | Retrieve run |
| PUT | `/runs/{id}` | Update run |
| DELETE | `/runs/{id}` | Delete run |
| GET | `/runs/{id}/tasks` | List tasks in run |
| POST | `/runs/{id}/triggers` | Create root node trigger |
| POST | `/runs/task/{token}` | Complete deferred task |
| PUT | `/runs/task/{token}` | Update deferred task |

### Handler Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/handlers` | List handlers |
| POST | `/handlers` | Import handler (ZIP or URL) |
| GET | `/handlers/{definitionId}` | Retrieve handler |
| PUT | `/handlers/{definitionId}` | Update handler |
| DELETE | `/handlers/{definitionId}` | Delete handler |

### Source Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sources` | List sources |
| POST | `/sources` | Create source |
| GET | `/sources/{name}` | Retrieve source |
| PUT | `/sources/{name}` | Update source |
| DELETE | `/sources/{name}` | Delete source |
| POST | `/sources/{name}/validate` | Test connection |

### Other Endpoints

- **Categories:** CRUD + handler/routine categorization
- **Triggers:** Search, retrieve, update, delete + backlogged/paused/scheduled
- **Errors:** Search, retrieve, delete, batch resolve
- **Policy Rules:** CRUD by type/name
- **Users/Groups:** CRUD + group membership
- **Config:** Auth, database, engine, identity store, session, encryption keys
- **Meta:** `GET /meta/sourceAdapters`, `GET /meta/version`

## Response Shapes

### Run Object (GET /runs)

**CRITICAL: `include=details` is required** to get `id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy` on run objects. Without it, runs only contain `status`, `sourceId`, `tree`, and `source` — the `id` field is **absent**, not null.

Without `include=details`:
```json
{
  "status": "Started",
  "sourceId": "b003cac6-...",
  "tree": { "name": "test1", ... },
  "source": { "name": "Kinetic Request CE", ... }
}
```

With `include=details`:
```json
{
  "id": 2690,
  "status": "Started",
  "sourceId": "b003cac6-...",
  "createdAt": "2026-02-12T19:04:42.612Z",
  "createdBy": "SYSTEM",
  "updatedAt": "2026-02-12T19:04:42.660Z",
  "updatedBy": "SYSTEM",
  "tree": {
    "name": "test1",
    "title": "Kinetic Request CE :: 2e238f41-... :: test1",
    "sourceName": "Kinetic Request CE",
    "sourceGroup": "2e238f41-...",
    "status": "Active",
    "type": "Tree",
    "versionId": "1"
  },
  "source": {
    "name": "Kinetic Request CE",
    "status": "Active",
    "type": "Kinetic Request CE"
  }
}
```

**Key observations:**
- **Always use `include=details`** when you need run IDs or timestamps — without it you cannot identify or sort runs
- `id` is a numeric integer, not a string/UUID
- `status` values observed in the raw payload: `"Started"`, `"Complete"`, `"Error"` — but **do NOT use `run.status` for completion detection.** The field is unreliable: parent runs typically report `status: "Started"` even after every task inside has finished. Derive run state from task statuses or trigger queries instead (see "Run Status Is Misleading" below).
- **Run status — canonical guidance:** `run.status` is authoritative only for the `"Error"` case; for "did this run complete?" derive state from task statuses (`"Closed"`) or trigger queries, never from `run.status`.
- `tree.title` format: `"SourceName :: SourceGroup :: TreeName"` — the full title is used in API paths
- `tree.name` is the short/friendly name
- `createdBy` is often `"SYSTEM"` when triggered by webhooks
- The `count` field in list responses gives the **total matching record count** (useful for KPIs without loading all data)
- Runs are returned in **descending order** (most recent first by `id`)

### Tree Object (GET /trees with include=details)

```json
{
  "id": 7,
  "name": "test1",
  "title": "Kinetic Request CE :: 2e238f41-... :: test1",
  "sourceName": "Kinetic Request CE",
  "sourceGroup": "2e238f41-...",
  "status": "Active",
  "type": "Tree",
  "versionId": "1",
  "guid": "2e238f41-...",
  "event": "Submission Created",
  "platformItemId": "92d17329-...",
  "platformItemType": "Space",
  "createdAt": "2026-02-12T17:54:49.056Z",
  "createdBy": "second_admin"
}
```

**Key observations:**
- `event` values include: `"Submission Created"`, `"Submission Submitted"`, `"Submission Updated"`, `"Submission Closed"`, or `null` (for WebAPI/manual triggers)
- `platformItemType` indicates scope: `"Space"`, `"Kapp"`, `"Form"`
- `sourceGroup` may be a GUID (for webhook-triggered trees) or a path like `"WebApis > catalog"` (for WebAPI trees)
- Built-in trees like `"Notify on Run Error"` have `sourceName: "Kinetic Task"` and `sourceGroup: "Run Error"`
- **`run.tree` is an object, not a string** — use `run.tree?.name` or `(typeof run.tree === "object" ? run.tree?.name : run.tree)` to get the tree name

### Task Object (GET /runs/{id}/tasks)

```json
{
  "branchId": 1,
  "deferredResults": {},
  "definitionId": "utilities_echo_v1",
  "duration": 11,
  "loopIndex": "/",
  "nodeId": "utilities_echo_v1_1",
  "nodeName": "a",
  "results": { "output": "test" },
  "status": "Closed",
  "token": null,
  "visible": true
}
```

**Key observations:**
- Tasks do **NOT** have `createdAt`/`updatedAt` — they have `duration` in **milliseconds**
- Task `status` values: `"New"`, `"Deferred"`, `"Closed"` (NOT "Complete" — tasks use "Closed")
- `results` is a flat key-value object (not nested)
- `deferredResults` is separate from `results` — populated when a deferred task receives results
- `visible: false` = system nodes (like Start); `visible: true` = user-defined nodes
- `token` is populated for deferrable nodes awaiting completion
- `definitionId` encodes handler info: `{category}_{handler}_{version}` (e.g., `utilities_echo_v1`)
- `nodeId` is unique within the tree definition; `nodeName` is the user-assigned display name
- `branchId` identifies which execution branch the task belongs to (relevant for parallel paths)
- `loopIndex` is `/` for non-loop tasks; loop iterations get indexed paths

## Triggers API

The Task API exposes a `/triggers` endpoint for inspecting individual trigger events within workflow runs. Triggers represent each node activation in a run's execution.

### Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/triggers` | List/search trigger events |

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `runId` | Filter by specific run | `runId=8091` |
| `branchId` | Filter by branch | `branchId=123` |
| `source` | Filter by source name | `source=Kinetic+Request+CE` |
| `sourceId` | Filter by source ID (submission UUID) | `sourceId=4b3cfbc6-...` |
| `group` | Source group path | `group=services+>+laptop-order` |
| `tree` | Filter by tree name | `tree=test1` |
| `start` | Start date filter | `start=2026-02-18` |
| `end` | End date filter | `end=2026-02-19` |
| `timeline` | Field for date filtering (default: `createdAt`) | `timeline=scheduledAt` |
| `limit` | Results per page (default 100) | `limit=10` |
| `offset` | Pagination offset | `offset=100` |
| `include` | Additional properties | `include=details` |

### Response Fields

Each trigger object contains:

| Field | Description |
|-------|-------------|
| `id` | Trigger ID (requires `include=details`) |
| `action` | `Root` (start), handler action, etc. |
| `nodeId` | Which workflow node was activated (e.g., `start`) |
| `nodeName` | Human-readable node name (e.g., `Start`) |
| `status` | `Open`, `Closed`, `Error` |
| `type` | `Automatic` or `Manual` |
| `originator` | What initiated the trigger (e.g., `API v2 Run Tree from 10.x.x.x`) |
| `mode` | `Active` or `Staged` |
| `scheduledAt` | When the trigger was scheduled to fire |
| `results` | Output results from the node execution (empty `{}` for start nodes) |
| `message` | Error or status message (null on success) |
| `loopIndex` | Loop iteration path (e.g., `/` for root, `/0`, `/1` for loop iterations) |
| `engineIdentification` | Task engine host, version, and directory info |
| `createdAt` / `updatedAt` | Timestamps (requires `include=details`) |

### Relationship to Runs

- A **run** is a single execution of a workflow tree
- A **trigger** is one node activation within that run
- A run with 5 nodes produces ~5 triggers (one per node activation)
- The first trigger in any run has `action=Root`, `nodeId=start`
- Use `runId` to get all triggers for a specific run execution

### Diagnosing Stuck Runs

When runs show status `Started` but triggers show `Closed`, the workflow engine processed the start node but got stuck on a downstream handler or deferred task. Check:
1. `GET /triggers?runId={id}&include=details` — see which nodes fired
2. Look for triggers with `status=Error` or non-empty `message`
3. Check if any trigger has `type=Manual` (waiting for external input)

## Error Management API

Failed triggers generate error records in the Task engine.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/errors?include=details&status=Active` | List errors (**`include=details` is REQUIRED to get the `id` field needed by `/errors/resolve`** — see callout below) |
| POST | `/errors/resolve` | Bulk-resolve errors |

### Error Object Fields

| Field | Description |
|-------|-------------|
| `id` | Error ID (only with `include=details`) |
| `relatedItem1Id` | Trigger ID (the failed trigger) |
| `relatedItem2Id` | Node ID |
| `status` | `Active` or `Handled` |
| `summary` | Human-readable error description |
| `type` | Error type (see below) |

> **Always pass `include=details` when listing errors for programmatic resolution.** Without it, `GET /errors` returns objects whose only ID-shaped fields are `relatedItem1Id` (trigger) and `relatedItem2Id` (node) — neither is the error ID. Posting those to `/errors/resolve` returns 404 `Unable to retrieve the error with id`. With `include=details`, the response gains a top-level `id` field; pass those to `/errors/resolve` and they work. Verified empirically (May 2026) — resolving errors `[163, 164]` returned `{"messageType":"success","message":"Resolved task errors [163, 164]"}`.

### Error Types

| Type | Description | Valid Actions |
|------|-------------|---------------|
| `Handler Error` | Handler execution failed | Retry Task, Skip Task, Do Nothing |
| `Node Parameter Error` | ERB evaluation failed on a parameter | Retry Task, Skip Task, Do Nothing |
| `Source Error` | Source data processing error | Do Nothing only |
| `Tree Error` | Tree-level error | Do Nothing only |
| `Missing Handler Error` | Handler not found on server | Retry Task, Skip Task, Do Nothing |
| `Connector Error` | A `<dependents>` connector condition (ERB on a branch) raised at evaluation (e.g. `IndexError` from `JSON.parse(nil)` or a missing `@results` key) | **None of Retry/Skip/Do Nothing are accepted** — cannot be resolved via `/errors/resolve`; fix the tree and re-run, or leave (stale errors are harmless) |

### Resolve Request

```json
POST /errors/resolve
{
  "ids": [1550, 1549, 1548],
  "action": "Retry Task",
  "resolution": "Description of fix applied"
}
```

### Error API Gotchas

- `GET /errors` returns **max 5 errors per request** regardless of `limit` parameter — paginate with offset
- `Skip Task` on handler errors may generate new downstream errors (skipped node's dependents may fail)
- Using an invalid action for an error type returns: `{"message":"Invalid management action \"Skip Task\" for error #N with type \"Source Error\""}`
- "Do Nothing" is the only universally valid action across all error types

### Trigger Originator Values

The `originator` field on triggers indicates what initiated the activation:

| Pattern | Meaning |
|---------|---------|
| `API v2 Run Tree from {IPs}` | Anonymous API invocation |
| `API v2 Run Tree by {user} from {IPs}` | Authenticated API invocation |
| `ENGINE Call System Tree` | Sub-tree/routine call |
| `ENGINE Run Error` | Failure — engine generated this trigger |
| `HANDLER {Name}` | Handler completing (e.g., `HANDLER Wait`) |

## Additional Resources

### Engine Status

```bash
GET /engine
# Response: { "buildDate": "...", "status": "Running", "statusMessage": null, "version": "6.1.7" }
```

### Environment Info

```bash
GET /environment
# Response: { "System Information": { "Host": "...", "Java Version": "...", "Ruby Version": "..." }, "Server Information": { ... } }
```

### Categories (Handler Organization)

Handlers are organized into categories:
```bash
GET /categories
# Response: { "count": N, "categories": [{ "name": "System Controls", "description": "...", "type": "Integrated" }, ...] }
```

Types: `"Integrated"` (built-in system handlers), `"Stored"` (uploaded handlers).

### Sources (Workflow Trigger Sources)

Sources define where workflow triggers originate:
```bash
GET /sources?include=details
```

### Groups

Logical groupings for organizing trees and handlers.

### Policy Rules (Access Control)

Ruby-expression-based access rules for the Task API:
```bash
GET /policyRules
# Response: { "policyRules": [{ "name": "Admins", "rule": "@identity.get_property('spaceAdmin') == 'true'", "type": "API Access" }, ...] }
```

### Access Keys

API authentication keys for machine-to-machine access to the Task API (alternative to Basic Auth).

### Errors and System Errors

```bash
GET /errors?limit=10&include=details     # Application-level errors (workflow failures)
GET /systemErrors?limit=10&include=details  # System-level errors (infrastructure issues)
```

### Triggers

Triggers are execution records for workflow nodes — they represent scheduled or completed handler executions:
```bash
GET /triggers?include=details&limit=10
# Each trigger has: action, branchId, nodeId, nodeName, status, type, token, results, message
```
