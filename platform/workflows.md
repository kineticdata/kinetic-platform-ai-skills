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

A **connector** links two nodes together. Connectors may contain logic — if logic is applied, the path executes only when the logic evaluates to not false.

**Three connector types:**

| Type | Visual | Fires When |
|------|--------|------------|
| Complete | Solid line | Node completes normally |
| Update | Dashed line | An Update action is sent to a deferred node |
| Create | Dotted line | A deferred node enters its deferral state |

**Connector expressions** do NOT use ERB tags — the engine automatically evaluates them as true/false.

### Parameters

Each node accepts inputs called parameters. Parameters support:
- Plain text entries
- Values from preconfigured lists
- Ruby code expressions using ERB tags: `<%= ... %>`

**Variable access in parameters:**
- `@values` — Input data from forms (e.g., `@values['Status']`)
- `@results` — Output from previously executed nodes (e.g., `@results['Node Name']['Field Name']`)
- `@inputs` — Data passed to routines

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
- `event` field indicates what triggers the tree: `"Submission Created"`, `"Submission Closed"`, or `null` (for WebAPI/manual triggers)
- `platformItemType` indicates scope: `"Space"`, `"Kapp"`, `"Form"`
- `sourceGroup` may be a GUID (for webhook-triggered trees) or a path like `"WebApis > catalog"` (for WebAPI trees)
- Built-in trees like `"Notify on Run Error"` have `sourceName: "Kinetic Task"` and `sourceGroup: "Run Error"`

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

### Parallel Loading Pattern

For loading large run datasets efficiently, use parallel offset requests. **Always include `include=details`** to get run IDs and timestamps:

```javascript
const [r0, r200, r400] = await Promise.all([
  taskApi('/runs?limit=200&offset=0&include=details'),
  taskApi('/runs?limit=200&offset=200&include=details'),
  taskApi('/runs?limit=200&offset=400&include=details'),
]);
const allRuns = [...(r0.runs||[]), ...(r200.runs||[]), ...(r400.runs||[])];
const totalCount = r0.count; // total from first response
```

This loads 600 runs in a single round-trip. The `count` field from any response gives the grand total.

**However**, loading large batches upfront is wasteful and slow. Prefer server-side pagination — see "Efficient Server-Side Pagination" below.

### Efficient Server-Side Pagination

For UI applications, fetch only what is displayed and let the server handle pagination:

```javascript
// Fetch one page of 25 runs, filtered by tree name
const data = await taskApi('/runs?limit=25&offset=0&include=details&tree=test1');
const runs = data.runs;       // 25 runs
const total = data.count;     // e.g., 1983 — total matching records
const hasMore = (0 + runs.length) < total;

// Next page
const page2 = await taskApi('/runs?limit=25&offset=25&include=details&tree=test1');
```

**Key benefits:**
- Initial load is fast (1 lightweight request instead of multiple heavy ones)
- Server does the filtering — `tree`, `source`, `start`/`end` params are supported
- The `count` field tells you if more records exist without loading them

### Lightweight Count-Only Queries

Use `limit=1` to get just the count of matching records:

```javascript
// "How many runs today?" — returns count without transferring data
const todayISO = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
const { count } = await taskApi(`/runs?limit=1&start=${todayISO}`);
// count = 1984 (but only 1 run object returned)
```

**`limit=0` does NOT work** — it returns ALL matching records instead of zero. Always use `limit=1`.

### Run Filtering Parameters

The `/runs` endpoint supports these server-side filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `tree` | string | Filter by tree short name (e.g., `test1`) |
| `source` | string | Filter by source name (e.g., `Kinetic Request CE`) |
| `start` | ISO date | Runs created on or after this timestamp |
| `end` | ISO date | Runs created before this timestamp |

These can be combined: `?tree=test1&start=2026-02-12T00:00:00Z&limit=25`

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

---
---

# Kinetic Workflow API & XML Quick Reference

Quick reference for programmatically working with Kinetic Platform workflows
via the Task API and understanding the exported XML schema.

---

## 1. Task API Endpoints & Authentication

**Base URL pattern:**
```
https://<space>.kinopsdev.io/app/components/task/app/api/v2
```

**Authentication:** HTTP Basic Auth with Kinetic Platform credentials.

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/trees` | List all workflows (Trees + Global Routines) |
| GET | `/trees?limit=500` | List with higher limit (default is 100) |
| GET | `/trees/{title}` | Get metadata for a single workflow |
| GET | `/trees/{title}/export` | Export full XML definition |
| GET | `/runs` | List workflow execution runs |
| GET | `/handlers` | List available task handlers |
| GET | `/sources` | List configured task sources |

### Searching by Name

The `/trees` endpoint returns all workflows. To find a specific workflow:
1. Fetch the full list with `?limit=500`
2. Search the JSON array by `name` field (the human-readable name)
3. Use the `title` field for export (it's the full qualified name)

**Important:** The `title` field differs between Trees and Global Routines (see below).

### Export Response Format

The export endpoint returns JSON with a single `tree` key containing an XML string:
```json
{"tree": "<tree schema_version=\"1.0\">...</tree>"}
```
Parse the XML string from the `tree` field — it is **not** raw XML.

---

## 2. Tree Title Format

### Global Routines
Title = just the name:
```
User Create
Email Template Notification Send
Handler Failure Error Process
```

### Trees (Event-Triggered Workflows)
Title = `{sourceName} :: {sourceGroup} :: {eventName}`:
```
Kinetic Request CE :: bee52c65-dbae-4959-894e-b659e59eaba1 :: User Created
Kinetic Request CE :: 3d440511-d011-4167-9de4-244a6fc19974 :: Team Updated
```

Where:
- **sourceName** = The system generating events (usually `Kinetic Request CE`)
- **sourceGroup** = UUID of the form/entity, or a named group (`Space`, `WebApis`, etc.)
- **eventName** = The trigger event (`Submitted`, `Created`, `User Created`, etc.)

### Special Tree Sources
- `Kinetic Task :: Run Error :: Notify on Run Error` — Task engine errors
- `Kinops :: System Alert :: Created` — System alerts
- `Kinetic Request CE :: Space :: Created` — Space-level events
- `Kinetic Request CE :: WebApis :: sample` — Web API trees
- `Kinetic Request CE :: WebApis > services :: jdstest` — Nested Web API trees

---

## 3. XML Schema Overview

### Top-Level Structure
```xml
<tree schema_version="1.0">
    <sourceName>Kinetic Request CE</sourceName>  <!-- or "-" for routines -->
    <sourceGroup>bee52c65-...</sourceGroup>        <!-- or "-" for routines -->
    <definitionId>routine_kinetic_user_create_v1</definitionId>  <!-- routines only -->
    <type>Tree</type>                              <!-- "Tree" or "Global Routine" -->
    <status>Active</status>
    <taskTree builder_version="" schema_version="1.0" version="1">
        <name>User Created</name>
        <author></author>
        <notes></notes>
        <lastID>10</lastID>
        <taskDefinition ...>...</taskDefinition>   <!-- Global Routines only -->
        <request>
            <task ...>...</task>                    <!-- one per workflow node -->
        </request>
    </taskTree>
</tree>
```

### Key Differences: Tree vs Global Routine

| Feature | Tree | Global Routine |
|---------|------|----------------|
| `<type>` | `Tree` | `Global Routine` |
| `<sourceName>` | e.g. `Kinetic Request CE` | `-` |
| `<sourceGroup>` | UUID or named group | `-` |
| `<definitionId>` | absent | `routine_*_v1` |
| `<taskDefinition>` | absent | present (public interface) |
| Title format | `Source :: Group :: Event` | Just the name |
| Triggered by | Platform events | Called by other workflows |

---

## 4. Task Nodes (`<task>`)

Each `<task>` element represents a workflow step:

```xml
<task definition_id="kinetic_core_api_v1" id="kinetic_core_api_v1_1" name="API" x="269" y="77">
    <version>1</version>
    <configured>true</configured>
    <defers>false</defers>
    <deferrable>false</deferrable>
    <visible>false</visible>
    <parameters>
        <parameter id="method" label="Method" menu="GET,POST,PUT,PATCH,DELETE"
                   required="true" tooltip="...">POST</parameter>
        ...
    </parameters>
    <messages>...</messages>
    <dependents>
        <task label="No Error" type="Complete"
              value="@results['API']['Handler Error Message'].to_s.empty?">
            system_tree_return_v1_2
        </task>
    </dependents>
</task>
```

### Task Attributes
- **definition_id** — Handler or routine to execute (see section 7)
- **id** — Internal node ID (used in `<dependents>` references)
- **name** — Human-readable display name
- **x, y** — Visual position in the workflow builder

### Parameter Structure
```xml
<parameter id="method"           <!-- Parameter ID (key) -->
           label="Method"        <!-- Display label -->
           required="true"       <!-- Whether required -->
           tooltip="..."         <!-- Help text -->
           menu="GET,POST,..."   <!-- Dropdown options (if any) -->
           dependsOnId=""        <!-- Conditional visibility -->
           dependsOnValue="">    <!-- Conditional visibility value -->
    POST                         <!-- Actual value (may contain ERB) -->
</parameter>
```

---

## 5. Flow Control via `<dependents>`

The `<dependents>` section defines execution flow — which tasks run next:

```xml
<dependents>
    <!-- Unconditional: always proceed -->
    <task label="" type="Complete" value="">next_task_id</task>

    <!-- Conditional: only if ERB expression is truthy -->
    <task label="Not a kinops user" type="Complete"
          value="@user['Username'].match(/.*@kinops.io$/).nil?">
        routine_kinetic_user_password_reset_token_create_v1_7
    </task>
</dependents>
```

### Fields
- **label** — Human-readable description of the branch
- **type** — Always `Complete` (task runs after parent completes)
- **value** — Ruby ERB expression that must evaluate truthy; empty = unconditional
- **Text content** — The `id` of the next task to execute

### Building Execution Order
1. Start from the task with `id="start"` (always `definition_id="system_start_v1"`)
2. Follow `<dependents>` to find next tasks
3. Recursively follow each branch
4. Tasks with empty `<dependents>` are terminal nodes

### Conditional Branch Patterns
```ruby
# Simple boolean check
@results['API']['Handler Error Message'].to_s.empty?

# Regex match (nil check)
@user['Username'].match(/.*@kinops.io$/).nil?

# Hash key existence
@user_profile_attributes.has_key?('Guided Tour')

# String equality (note XML encoding: &quot; = ", &amp;&amp; = &&)
@team_previous['Name'] == "Default" && @team['Name'] != "Default"
```

---

## 6. Context Variables

ERB expressions in parameters and conditions can access these context variables:

### Available in Trees (event-triggered)
| Variable | Description |
|----------|-------------|
| `@user` | User object with `Username`, `Email`, `Display Name` |
| `@team` | Team object (for team events) |
| `@team_previous` | Previous team state (for update events) |
| `@submission` | Submission object (for form events) |
| `@space` | Space object with `Name`, `Slug` |
| `@space_attributes` | Space-level attributes hash |
| `@user_profile_attributes` | User profile attributes hash |
| `@run` | Current run object with `Id` |

### Available in All Workflows
| Variable | Description |
|----------|-------------|
| `@inputs` | Input parameters passed to this routine |
| `@results` | Results from completed upstream tasks |
| `@run` | Current workflow run metadata |

### Accessing Results
Results are accessed by **task name**, then **result key**:
```ruby
@results['Generate Token']['Password Reset Token']
@results['API']['Handler Error Message']
@results['Retrieve All Users']['Users List JSON']
```

---

## 7. Common Handler Definition IDs

### System Handlers
| Definition ID | Purpose |
|---------------|---------|
| `system_start_v1` | Entry point — always `id="start"` |
| `system_tree_return_v1` | Return results from a Global Routine |
| `system_tree_call` | Handler used by `<taskDefinition>` |

### API Handlers
| Definition ID | Purpose |
|---------------|---------|
| `kinetic_core_api_v1` | Make REST API calls to Kinetic Core |

### Routine Calls (subroutines)
Routine definition IDs follow the pattern: `routine_kinetic_{entity}_{action}_v1`

Examples:
```
routine_kinetic_user_create_v1
routine_kinetic_user_update_v1
routine_kinetic_user_password_reset_token_create_v1
routine_kinetic_email_template_notification_send_v1
routine_kinetic_team_create_v1
routine_kinetic_users_retrieve_list_v1
routine_kinetic_finish_v1
routine_handler_failure_error_process_v1
```

**Identifying subroutines:** Any task with `definition_id` starting with `routine_` is calling another Global Routine.

---

## 8. The `<taskDefinition>` Section (Global Routines Only)

Global Routines have a `<taskDefinition>` that defines the routine's **public interface** — the parameters other workflows pass when calling it:

```xml
<taskDefinition id="routine_kinetic_user_create_v1"
                name="User Create"
                schema_version="1.0" version="1">
    <visible>false</visible>
    <deferrable>true</deferrable>
    <parameters>
        <parameter id="Username" label="Username" required="true"
                   tooltip="The value the User will use to login to the application"/>
        <parameter id="Email" label="Email" required="true"
                   tooltip="The email address to send notifications to the user"/>
        ...
    </parameters>
    <handler name="system_tree_call" version="1"/>
    <results format="xml"/>
</taskDefinition>
```

These parameters are what callers must supply. They are accessed within the routine via `@inputs['Parameter Id']`.

---

## 9. Error Handling Patterns

### Error Message Mode
The `kinetic_core_api_v1` handler supports an `error_handling` parameter:
- **`Error Message`** — Returns error text in results instead of raising
- **`Raise Error`** — Throws an exception, stopping the workflow

### Checking for Errors
```ruby
# No error (success path)
@results['API']['Handler Error Message'].to_s.empty?

# Has error
!@results['API']['Handler Error Message'].to_s.empty?
```

### Retry Pattern
A common pattern for error recovery:
1. API call with `error_handling = "Error Message"`
2. Conditional branch: error vs success
3. On error: call `Handler Failure Error Process` routine (logs error details)
4. After error processing: **recursively call the same routine** with original parameters
5. Return results from retry

```
Start → API Call → [success] → Return Results
                 → [error]  → Error Process → Retry (self) → Return From Error
```

The retry gets original parameters from the error process results:
```ruby
<%= @results['Error Process']['Username'] %>
```

---

## 10. Triggers API

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

---

## 11. Tips & Gotchas

- **URL encoding:** Tree titles with spaces and `::` must be URL-encoded for API calls
- **XML in JSON:** The export endpoint wraps XML in a JSON string — parse JSON first, then XML
- **HTML entities in XML:** Parameter values use `&lt;` / `&gt;` for `<` / `>` in ERB expressions
- **`&amp;&amp;` and `&quot;`:** XML-encoded `&&` and `"` in condition expressions
- **Empty `<dependents>`:** Means the task is a terminal/leaf node (workflow ends here)
- **`defers: true`:** Task pauses the workflow until an external event resumes it (approvals, subroutine completion)
- **x/y coordinates:** Visual positions in the builder UI; useful for layout but not execution order
- **`lastID`:** Counter for generating unique task IDs; not meaningful for parsing
- **Global Routine sourceName/sourceGroup:** Always `-` (dash) for both fields
