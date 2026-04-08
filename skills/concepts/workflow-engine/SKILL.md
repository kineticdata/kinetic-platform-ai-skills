---
name: workflow-engine
description: Kinetic Platform workflow engine concepts, execution model, Task API v2 reference, observed response formats, and lessons learned for building workflow UIs.
---

# Kinetic Platform Workflow Engine

## Overview

Workflows in Kinetic represent "everything that happens after a form is submitted." They are the automation engine for enforcing business rules, automating actions, and integrating with external systems. The workflow engine is called **Kinetic Task** and uses a visual, low-code builder.

**Key properties:**
- **Transparency** — complete visibility into process status and bottlenecks
- **Reusability** — shared routines and integrations across workflows
- **Modularity** — decoupled forms, workflows, and UI enabling independent evolution
- **Self-documentation** — process structure serves as inherent documentation

---

## Core Concepts

### Trees

A **tree** is a collective process of work units called nodes. Trees are top-level workflow definitions triggered by form submissions (via webhooks). Trees are identified by **title/name**, not slugs.

**Scope levels:**

| Scope | Application |
|-------|-------------|
| Space | Cross-Kapp logic, global notifications, system logging |
| Kapp | Department-specific shared processes |
| Form | Submission-specific logic |

**Tree metadata:**
- `name` — Tree name
- `title` — Tree title (used as identifier in API paths)
- `sourceName` — The source (kapp) this tree belongs to
- `sourceGroup` — The group within the source (typically the form slug)
- `type` — Tree type
- `status` — Active/Inactive
- `notes`, `ownerEmail`, `description`

### Nodes

A **node** is a unit of work within a workflow. Each node is created from a **handler** and accepts **parameters** as inputs. When the engine processes a node, it runs the handler's code with the given parameters.

**Pre-installed system handlers (built-in nodes):**
- Join, Junction, Echo, Loop Head, Loop Tail
- Create Trigger, Defer, No Operation, Wait

### Connectors

A **connector** links two nodes together. Each connector has a **type**, an optional **label** (human-readable description), and an optional **condition** (`value`) — a Ruby expression that must evaluate truthy for the path to execute (empty = unconditional).

**Three connector types:**

| Type | Visual | Fires When | Example Use Case |
|------|--------|------------|-----------------|
| **Complete** | Solid line | Source node finishes executing | Normal sequential flow — the default |
| **Create** | Dotted line | A deferrable node enters its deferral state (before completion) | Start an SLA timer when an email is sent, ensuring follow-up even if no response arrives |
| **Update** | Dashed line | A deferred node receives an update action | Log or process each reply to an outbound email — fires once per update, so may execute multiple times |

**Complete** is the standard connector for sequential workflows. **Create** and **Update** only apply to deferrable nodes (Email, Wait, or any handler that defers). A single node can have all three types going to different downstream nodes simultaneously.

**Timing:** The Create-connected node fires immediately (~12ms) when the deferrable node enters deferral. The Complete-connected node waits until the node actually completes (e.g., 60 seconds for a Wait node).

**Connector expressions** do NOT use ERB tags — the engine evaluates the expression directly as Ruby (e.g., `@results['Node']['Status'] == 'approved'`).

### Parameters

Each node accepts inputs called parameters. Parameters support:
- Plain text entries
- Values from preconfigured lists
- Ruby code expressions using ERB tags: `<%= ... %>`

**Variable access in parameters:**
- `@values` — Input data from forms (e.g., `@values['Status']`) — available in event-triggered trees
- `@results` — Output from previously executed nodes (e.g., `@results['Node Name']['Field Name']`)
- `@variables` — Same as `@results` (alias for accumulated node outputs)
- `@inputs` — Data passed to routines

**Full ERB context (all instance variables available in workflow expressions):**

| Variable | Type | Description |
|----------|------|-------------|
| `@request` | Hash | Raw incoming request data: `Body`, `Query` |
| `@request_body_params` | Hash | Parsed POST/PUT body fields |
| `@request_headers` | Hash | HTTP headers (e.g., `content-type`) |
| `@request_query_params` | Hash | Parsed URL query parameters |
| `@requested_by` | Hash | Caller identity: `email`, `displayName`, `username` |
| `@results` | Hash | Results from completed upstream tasks (keyed by node name) |
| `@variables` | Hash | Alias for `@results` |
| `@inputs` | Hash | Input parameters passed to routines |
| `@run` | Hash | Current run: `Id` |
| `@source` | Hash | `Name`, `Group`, `Id`, `Data` (JSON string with full request context) |
| `@task` | Hash | Current node metadata: `Id`, `Status`, `Name`, `Deferral Token`, `Node Id`, `Tree Id`, `Tree Name`, `Loop Index` |
| `@trigger` | Hash | Engine trigger metadata: `Id`, `Status`, `Action`, `Execution Type`, `Node Id` |

**ERB Hash access pitfall:** In the Task engine ERB context, Ruby Hash `[]` raises `IndexError` for missing keys (unlike standard Ruby which returns `nil`). Always use `.fetch('key', 'default')` for optional parameters:
```ruby
# BAD — raises IndexError if personId not in query string:
<%= @request_query_params['personId'] %>

# GOOD — returns empty string if missing:
<%= @request_query_params.fetch('personId', '') %>
```

### Routines

A **routine** is a reusable workflow with explicitly defined inputs and outputs. Unlike trees (which get inputs from form submissions), routines can be embedded/called from multiple trees or other routines.

**Common uses:**
- Sending standardized notifications
- Computing due dates based on SLA attributes
- Executing standard data lookups

---

## Triggering Workflows

### Webhooks

Trees are triggered through **webhooks** — HTTP callbacks fired when predetermined actions occur.

**Supported event types:**
- **User Events:** Created, Updated, Deleted
- **Team Events:** Created, Updated, Deleted
- **Datastore Form Events:** Forms Created/Updated, Submissions Created/Submitted
- **Standard Form Events:** Form Created/Updated, Submission Created/Submitted

### WebAPIs

Custom HTTP endpoints that enable external systems to call workflows. They support custom HTTP methods, security policies, and can return responses (max 30-second synchronous timeout).

### Programmatic Triggering

`POST /app/components/task/app/api/v2/runs` creates a new run of a specified tree directly via API.

---

## Workflow Events and coreState

Workflows fire based on coreState transitions — not field value changes. The three coreStates are **Draft** (incomplete), **Submitted** (complete, ready for processing), and **Closed** (finalized, locked from edits).

| Workflow Event | When it fires | coreState after |
|----------------|---------------|-----------------|
| Submission Created | Any new submission is created (via POST) | Draft or Submitted (depends on whether `coreState:"Submitted"` was in the POST body) |
| Submission Submitted | Draft → Submitted transition (via submit action) | Submitted |
| Submission Updated | Any PUT that modifies values on a Submitted record | Submitted |
| Submission Closed | coreState transitions to Closed (via PUT with `coreState:"Closed"`) | Closed |

**Important:** Creating a submission with `coreState:"Submitted"` in the POST body fires "Submission Created" — NOT "Submission Submitted". The "Submitted" event only fires on the explicit submit action transitioning a Draft to Submitted.

---

## Execution Model

### Runs

A **run** is an instance of a workflow execution. Runs record each workflow instance's input, trigger, node, and result.

### Tasks (within Runs)

Tasks represent units of work within a run with three states:
- **New** — not yet executed
- **Deferred** — awaiting external completion trigger
- **Closed** — execution complete

### Deferrals

Deferred nodes pause workflow execution while waiting for external processes to respond. Visually identified by a blue corner on the node.

**Resuming a deferred node requires:**
- **Token** — unique identifier locating the specific node instance
- **Action Type** — "Update" (fires Update connectors) or "Complete" (fires Complete connectors)
- **Results** — XML structure: `<results><result name="Key">Value</result></results>`
- **Messages** — plain text notifications

### Looping

Uses **Loop Head** and **Loop Tail** system handlers. Loop iterations execute in **parallel** (not sequentially). For sequential iteration, use recursive routines.

- **Loop Head params:** Data Source, Loop Path (XPath for XML, JSONPath for JSON), Variable Name
- **Loop Tail params:** Completion condition — All, Any, or Some

### Joins and Junctions

- **Joins** — evaluate only directly connected connectors. Types: All, Any, Some
- **Junctions** — look backward through branches to a common parent node, evaluate whether branches are "complete as possible"

### Error Management

Three strategies:
1. **Branching on error outputs** — handlers return errors as results for conditional routing
2. **Retry paths with external input** — wrap handlers in routines with error-handling
3. **Engine-level retry** — built-in Retry Task / Skip Task options on failed nodes

---

## Handlers

A **handler** is a small program that performs a unit of work. Handlers are Ruby + XML combinations that execute functions in workflows.

**Handler file structure (3 directories):**

1. **handler/init.rb** — Executable Ruby code
   - `initialize` method — retrieves info from node.xml, assigns `@info_values` and `@parameters`
   - `execute` method — performs API interactions, returns handler results

2. **process/node.xml, info.xml** — XML configuration
   - Defines: config values (info values), parameters, results, XML input templates

3. **test/input.rb, output.xml** — Test cases

**Handler properties:**
- `definitionId` — Unique identifier (e.g., `kinetic_request_ce_submission_create_v1`)
- `definitionName` — Name without version
- `definitionVersion` — Version number
- `deferrable` — Boolean indicating deferral support
- `properties` — Configuration key-value pairs (info values)
- `parameters` — Input parameter definitions
- `results` — Output result definitions

---

## Sources

A **source** defines the application calling and getting results from a tree. The `type` field tells Kinetic Task which **consumer** file to use for that source.

Every kapp with workflows typically has a corresponding source in the task engine.

**Source properties:**
- `name` — Source identifier
- `adapter` — Source adapter class to use
- `properties` — Adapter-specific configuration key-value pairs
- `policyRules` — Access control rules
- `status` — Operational state

Available adapters discoverable via `GET /meta/sourceAdapters`.

---

## Connections (Modern Integration)

**Connections** are the newer, preferred integration method over legacy Bridges & Handlers:
- Store base URLs, credentials, and endpoint details for REST APIs or SQL databases
- **Operations** within connections define specific actions
- Support HTTP connections (REST APIs) and SQL Database connections (PostgreSQL, SQL Server)

---

## Task API v2 Reference

**Base URL:** `{serverUrl}/app/components/task/app/api/v2`
**Auth:** HTTP Basic Auth (`Authorization: Basic <base64(user:pass)>`)
**Pagination:** `limit` (default 100) + `offset` (default 0)
**Filtering:** `tree`, `source`, `start`, `end` query params on `/runs`

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

---

## Engine Configuration

| Setting | Description |
|---------|-------------|
| Sleep Delay | Pause intervals during processing |
| Max Threads | Maximum concurrent execution threads |
| Trigger Query | Selection criteria (default: `'Selection Criterion'=null`) |

---

## Programmatic Workflow Creation (Core API)

**Always use the Core API for creating/updating/deleting workflows.** The Task API v2 PUT silently ignores tree XML content.

### Core API Workflow Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/app/api/v1/kapps/{kapp}/workflows` | List workflows + orphan diagnostics |
| POST | `/app/api/v1/kapps/{kapp}/workflows` | Create workflow (auto-registers with platform) |
| PUT | `/app/api/v1/kapps/{kapp}/workflows/{id}` | Update workflow / upload tree definition |
| DELETE | `/app/api/v1/kapps/{kapp}/workflows/{id}` | Soft-delete workflow |

### Two-Step Creation

1. **Create:** `POST /workflows` with `{name, event, type:"Tree", status:"Active"}`
   - Returns `id` (UUID) — also used as `sourceGroup` in Task API
   - Auto-sets `platformItemType`, `platformItemId`, `guid === sourceGroup`

2. **Upload definition:** `PUT /workflows/{id}` with `{"treeXml": "<taskTree>...</taskTree>"}`
   - Must be ONLY the `<taskTree>` inner element — NOT the full `<tree>` wrapper
   - Server adds the wrapper automatically

### Kapp-Level vs Form-Level Workflows

- **Kapp-level:** `POST /kapps/{kapp}/workflows` — fires for ALL forms in the kapp
- **Form-level:** `POST /kapps/{kapp}/forms/{form}/workflows` — fires only for that form
- Both share the same tree infrastructure in the Task API

### Why NOT Task API for Workflow Creation

- `PUT /trees/{title}` with XML content returns HTTP 200 and bumps `versionId` but does NOT persist the XML
- Trees created via `POST /trees` lack platform registration — flagged as "orphaned" and may be deleted
- `guid !== sourceGroup` when created via Task API — admin UI shows "Unable to retrieve tree by GUID"

### Supported Events

`Submission Created`, `Submission Submitted`, `Submission Updated`, `Submission Closed`

---

## Kinetic Agent

Lightweight web app for integrating across network boundaries securely:
- Deployed in DMZ for hybrid-cloud integrations
- Agent handlers execute remotely on the agent rather than on the platform
- Uses shared secret authentication between Platform and Agent

---

## Observed API Response Formats (from live testing)

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
- `status` values observed: `"Started"`, `"Complete"`, `"Error"`
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

---

## Lessons Learned — Building Workflow UIs

### Respect the Server
- Never load all runs upfront — with thousands of workflow executions, this is slow and wasteful
- Use server-side `limit`/`offset` pagination: fetch 25 records at a time
- Use `count` from the API response to determine if "more" exist — don't show total page counts
- Use `limit=1` count-only queries for dashboard KPI numbers (total runs, today's runs)

### `include=details` is Non-Negotiable
- Without `include=details`, run objects lack `id`, `createdAt`, `updatedAt`, `createdBy`
- These fields are **absent** (not null) — code like `run.id` returns `undefined`
- Always add `&include=details` to every `/runs` request

### Server-Side vs Client-Side Filtering
- **Server-side** (use for filters that change the dataset): `tree` parameter works well
- **Client-side** (use for filtering within a loaded page): text search, status filtering within 25 loaded rows
- Changing a server-side filter should reset to offset 0 and re-fetch
- Changing a client-side filter should just re-render the current page

### Navigation Patterns
- **Prev/Next pagination** is better than numbered pages when you only load one page at a time
- Show "Showing 1–25 of 2,689" and `Previous` / `Next` buttons
- Don't show "Page 1 of 108" — you don't know how many pages exist without loading all data
- **Prev/Next within detail views**: when drilling into a run or task, provide prev/next buttons to navigate siblings without returning to the list
