# Kinetic Workflow API & XML Reference

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
| GET | `/triggers` | List triggers (node activations within runs) |
| GET | `/errors?include=details&status=Active` | List task errors (`include=details` required for `id` field) |
| POST | `/errors/resolve` | Resolve failed task errors (see Error Management below) |
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

## 5. Connectors & Flow Control

Connectors link nodes together and control execution flow. Each connector has a **type**, an optional **label**, and an optional **condition** (`value`).

### Connector Types

| Type | When it fires | Use case |
|------|--------------|----------|
| **Complete** | After the source node finishes executing | Normal sequential flow — node A completes, then node B runs |
| **Create** | When a deferrable node enters its deferral state (before completion) | Start parallel work while a node is waiting — e.g., kick off an SLA timer when an email is sent, so follow-up happens even if no one responds |
| **Update** | Each time a deferred node receives an update action | React to intermediate events — e.g., an outbound email may receive multiple replies; the Update connector fires for each one, allowing logging or escalation logic to run multiple times |

**Complete** is the default. **Create** and **Update** only apply to deferrable nodes (e.g., Email Send, Wait, or any handler that defers). A single node can have all three connector types going to different downstream nodes.

### Verified Behavior (tested 2026-02-25)

Test tree: `Start → Wait (1 min)` with two downstream Echo nodes — one via **Create**, one via **Complete**.

| Task | Connector | Executed At | Delta |
|------|-----------|-------------|-------|
| Start | — | 03:31:14.689 | 0ms |
| Wait 1 Minute | Complete (from Start) | 03:31:14.693 | entered deferral |
| **Create Fired Immediately** | **Create** (from Wait) | **03:31:14.701** | **12ms after start** |
| Complete Fired After Wait | Complete (from Wait) | 03:32:14.070 | **~60s after start** |

The Create-connected node executed **12ms** after the tree started — immediately when the Wait entered deferral. The Complete-connected node waited the full 60 seconds. Tree: `connector-test` on `workflow-playground` kapp (run #257649).

### XML format (`<dependents>`)

```xml
<dependents>
    <!-- Unconditional Complete: always proceed after node finishes -->
    <task label="" type="Complete" value="">next_task_id</task>

    <!-- Conditional Complete: only if expression is truthy -->
    <task label="Not a kinops user" type="Complete"
          value="@user['Username'].match(/.*@kinops.io$/).nil?">
        routine_kinetic_user_password_reset_token_create_v1_7
    </task>

    <!-- Create: fires when node enters deferral (e.g., email sent, now waiting) -->
    <task label="Start SLA Timer" type="Create" value="">sla_timer_task_id</task>

    <!-- Update: fires on each update to the deferred node -->
    <task label="Log Response" type="Update" value="">log_response_task_id</task>
</dependents>
```

### treeJson format (connectors array)

```json
{
  "from": "smtp_email_send_v1_1",
  "to": "utilities_echo_v1_2",
  "type": "Complete",
  "label": "Email delivered",
  "value": "@results['Send Email']['Handler Error Message'].to_s.empty?"
}
```

### Fields
- **label** — Human-readable description of the branch (shown on the connector in the builder)
- **type** — `Complete`, `Create`, or `Update` (see table above)
- **value** — Ruby expression that must evaluate truthy for this path to execute; empty = unconditional. **Do NOT use ERB tags** (`<%= %>`) — the engine evaluates the expression directly as Ruby
- **Text content** (XML) / **to** (JSON) — The `id` of the next task to execute

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

### Available in All Workflows (confirmed via runtime introspection)
| Variable | Type | Description |
|----------|------|-------------|
| `@request` | Hash | Raw request data: `Body`, `Query` |
| `@request_body_params` | Hash | Parsed POST/PUT body fields |
| `@request_headers` | Hash | HTTP headers (e.g., `content-type`) |
| `@request_query_params` | Hash | Parsed URL query parameters |
| `@requested_by` | Hash | Caller identity: `email`, `displayName`, `username` |
| `@results` | Hash | Results from completed upstream tasks (keyed by node name) |
| `@variables` | Hash | Alias for `@results` |
| `@inputs` | Hash | Input parameters passed to routines |
| `@run` | Hash | Current run: `Id` |
| `@source` | Hash | `Name`, `Group`, `Id`, `Data` (JSON string with full request context) |
| `@task` | Hash | Current node: `Id`, `Status`, `Name`, `Deferral Token`, `Task Definition Id`, `Node Id`, `Tree Id`, `Tree Name`, `Source`, `Source Id`, `Return Variables`, `Deferred Variables`, `Loop Index`, `Parent Loop Index`, `Visible`, `Execution Duration` |
| `@trigger` | Hash | Engine info: `Id`, `Engine Identification`, `Status`, `Action`, `Execution Type`, `Tree Id`, `Node Id`, `Source`, `Source Id`, `Loop Index`, `Deferral Token`, `Deferred Variables`, `Message`, `Management Action`, `Selection Criterion`, `Flags` |

**Self class:** `KineticTask::Utils::Binder`

**Passing data into WebAPI trees:** Use query params, body, or headers — all accessible via `@request_query_params`, `@request_body_params`, `@request_headers`:
```ruby
<%= @request_query_params['myParam'] %>
<%= @request_body_params['orderId'] %>
<%= @requested_by['username'] %>
```

**ERB Hash access pitfall:** In the Task engine ERB context, Ruby Hash `[]` raises `IndexError` for missing keys (unlike standard Ruby which returns `nil`). Always use `.fetch('key', 'default')` for optional parameters:
```ruby
# BAD — raises IndexError if personId not in query string:
<%= @request_query_params['personId'] %>

# GOOD — returns empty string if missing:
<%= @request_query_params.fetch('personId', '') %>
```

**WebAPI synchronous response:** Add `&timeout=N` (seconds, max 30) to the invocation URL. The server holds the HTTP connection until the tree completes and returns the Return node's `content` directly. Without `timeout`, the call returns immediately with `{runId}` (async).
```
# Async: /app/kapps/{kapp}/webApis/{slug}?personId=1001
# Sync:  /app/kapps/{kapp}/webApis/{slug}?personId=1001&timeout=5
```
If the tree doesn't complete within the timeout, the server returns a token for polling results later.

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
| `system_tree_return_v1` | Return node — used in both routines and WebAPI trees (see below) |
| `system_wait_v1` | Deferred wait — params: `Time to wait`, `Time unit` (menu: Second,Minute,Hour,Day,Week) |
| `system_noop_v1` | No-op passthrough (merge/gate node). Zero params, zero results. **Safely ignores unknown parameters** — tested with pseudo "note" param, engine executes in 0ms with no error. Can be used as comment/annotation nodes. |
| `system_join_v1` | Coordinates multiple incoming connectors. Params: `type` (menu: All/Any/Some), `number` |
| `system_junction_v1` | Looks backward through branches to common parent. No params. |
| `system_loop_head_v1` | Loop entry. Params: `data_source` (required), `loop_path` (required), `var_name`. Iterations execute in parallel. |
| `system_loop_tail_v1` | Loop exit. Params: `type` (menu: All/Any/Some), `number`. Must be directly connected to Loop Head. |
| `system_tree_call` | Handler used by `<taskDefinition>` |

### Critical Node Flags (treeJson)

When building treeJson programmatically, every node MUST have these flags set correctly:

| Flag | Required Value | Effect of Wrong Value |
|------|---------------|----------------------|
| `visible` | `true` | `false` causes engine to skip/ignore nodes |
| `configured` | `true` | `false` causes engine to skip nodes |
| `defers` on Start | `false` | `true` causes Start to enter deferral — run stuck permanently at "Work In Progress" |
| `deferrable` on Start | `false` | Same as `defers` — Start hangs, no downstream triggers created |
| `version` | `1` (number) | Must be a number, not a string |

**Only Wait and other genuinely deferrable handlers** should have `defers: true, deferrable: true`. The Start node must NEVER be deferrable.

### Return Node Parameter Rules (CRITICAL)

**WebAPI trees** — Return node MUST use these specific parameter IDs to produce an HTTP response:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `content` | yes | Response body (supports ERB: `<%= ... %>`) |
| `content_type` | yes | MIME type, e.g. `application/json` |
| `response_code` | yes | HTTP status code, e.g. `200` |
| `headers_json` | no | Extra response headers as JSON, e.g. `{}` |

**Note:** `system_return_v1` is NOT a valid handler — it is not listed by the handlers API and causes `Missing Handler Error` at runtime. Trees with this handler (e.g., from copy-paste errors) must be corrected to `system_tree_return_v1`. Three trees on `second.jdsultra1.lan` were found and fixed: `abc`, `account-compromise-mfa-reset`, `jdsTest`.

**Event-triggered trees** (non-WebAPI) — Return node uses different parameter IDs:
| Parameter | Description |
|-----------|-------------|
| `status` | Completion status string (e.g., `Complete`) |
| `description` | Description/summary of the result |

**Routine trees** — Return node uses custom output parameter IDs matching the routine's declared outputs (e.g., `output`, `CompletedStatus`).

**`system_tree_return_v1` has DYNAMIC configuration** — the handler adapts its expected parameters based on the tree type (WebAPI vs event vs routine). Using the wrong parameter set for the tree type is a hard failure, not a silent one.

**Failure mode:** Using wrong parameter IDs (e.g., `status`/`description` in a WebAPI tree, or `content`/`content_type` in an event tree) causes `ENGINE Run Error` — the Return node task stays at status "New" (never executes), a Failed trigger is created with originator `ENGINE Run Error`, and WebAPI invocations return `{"errorKey":"run_results_error"}`.

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

## 8b. Creating Global Routines Programmatically

Creating routines via API is a two-step process using the **component API path** (not the direct Task API path).

### Step 1: Create the Routine with Inputs/Outputs

```
POST /app/components/task/app/api/v2/trees
```

```json
{
  "sourceName": "-",
  "sourceGroup": "-",
  "name": "Email Send",
  "definitionId": "routine_email_send_v1",
  "categories": [],
  "inputs": [
    {"name": "From", "defaultValue": "", "description": "Sender email address", "required": true},
    {"name": "To", "defaultValue": "", "description": "Recipient(s), comma-separated", "required": true},
    {"name": "Subject", "defaultValue": "", "description": "Email subject line", "required": true}
  ],
  "outputs": [
    {"name": "Status", "description": "Complete or Error"},
    {"name": "Error Message", "description": "Error details on failure"}
  ]
}
```

**Key details:**
- `sourceName` and `sourceGroup` must both be `"-"` for routines
- `definitionId` must include the `routine_` prefix (e.g., `routine_email_send_v1`)
- `inputs` and `outputs` are **top-level fields** — they create the `taskDefinition` (public interface)
- The Kinetic Console UI auto-prepends `routine_` to the definition ID you enter; the API does NOT

### Step 2: Upload Tree Nodes

```
PUT /app/components/task/app/api/v2/trees/{title}
```

The title for GET/PUT uses the triple-colon format: `- :: - :: Email Send` (URL-encoded).

```json
{
  "sourceName": "-",
  "sourceGroup": "-",
  "name": "Email Send",
  "type": "Global Routine",
  "status": "Active",
  "definitionId": "routine_email_send_v1",
  "versionId": "0",
  "treeJson": {
    "schemaVersion": "1.0",
    "lastId": 1,
    "nodes": [...],
    "connectors": [...]
  }
}
```

The PUT preserves the `taskDefinition` from Step 1 and adds the node definitions. versionId increments from 0 to 1.

### Critical: Component API Path vs Direct Task API Path

| Path | Inputs/Outputs | treeJson |
|---|---|---|
| `/app/components/task/app/api/v2/trees` | **Works** — saves `taskDefinition` | Works for PUT |
| `/kinetic-task/app/api/v2/trees` | **Silently dropped** | Works for PUT |

The component path (`/app/components/task/...`) is what the Kinetic Console uses internally. The direct path (`/kinetic-task/...`) does NOT support `inputs`/`outputs` on POST — they are silently ignored. **Always use the component path for routine creation.**

### Discovery Method

This was discovered by intercepting the Kinetic Console's network requests with Playwright `page.on('request')` during routine creation. When the existing API doesn't seem to support a feature that the UI can do, **intercept what the UI sends** — the platform is API-first, so the UI is always calling an API endpoint.

### Calling a Routine from Another Tree

In the calling tree, add a node with:
- **`definitionId`**: the routine's definition ID (e.g., `routine_email_send_v1`)
- **`defers: true, deferrable: true`** — routine calls are deferred (the engine waits for the subroutine to complete)
- **`messages`**: must include all 3 types: `Create`, `Update`, `Complete`
- **`parameters`**: match the routine's input names exactly (case-sensitive)

```json
{
  "definitionId": "routine_email_send_v1",
  "id": "routine_email_send_v1_1",
  "name": "Send Welcome",
  "defers": true,
  "deferrable": true,
  "messages": [{"type": "Create"}, {"type": "Update"}, {"type": "Complete"}],
  "parameters": [
    {"id": "From", "value": "noreply@example.com"},
    {"id": "To", "value": "<%= @values['Email'] %>"},
    {"id": "Subject", "value": "Welcome!"},
    {"id": "HTML Body", "value": "<p>Hello!</p>"},
    ...
  ]
}
```

The connector from the routine node should use `type: "Complete"` to wait for the routine to finish.

### Data Format Differences

| Context | taskDefinition params | Field name |
|---|---|---|
| XML export | `<parameters><parameter id="..." .../>` | `parameters` |
| treeJson GET | `inputs: [{name, required, description, value}]` | `inputs` |
| Console UI | Name, Default Value, Description, Required columns | inputs |
| Workflow Builder | INPUTS textarea (one name per line) | separate field |

The `taskDefinition` in treeJson uses `inputs` (read-only from API). The XML uses `parameters`. The Workflow Builder right panel has separate INPUTS/OUTPUTS textareas that must be populated independently — they are NOT synced from the `taskDefinition`.

### Routine Naming Conventions

From the existing Kinetic platform routines on playground:
```
routine_kinetic_{entity}_{action}_v1
```
Examples:
- `routine_kinetic_user_create_v1`
- `routine_kinetic_email_template_notification_send_v1`
- `routine_kinetic_team_retrieve_v1`

Custom routines can use any naming pattern, but must start with `routine_` (auto-added by console).

### ERB Context Inside Routines

- `@inputs['Input Name']` — access caller-provided input values
- `@results['Node Name']['Result Name']` — access handler results (use `rescue nil` for optional keys)
- `@values`, `@submission`, etc. are NOT available inside routines — only `@inputs` from the caller

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
| `originator` | What initiated the trigger (see Originator Values below) |
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

### Single Trigger Lookup

Use `GET /triggers/{id}` to fetch a single trigger by ID. Do **NOT** use `?id={id}` as a query parameter — the query param is silently ignored and returns an unfiltered list.

### Originator Values

The `originator` field on triggers indicates what initiated the node activation:

| Pattern | Meaning |
|---------|---------|
| `API v2 Run Tree from {IPs}` | Anonymous API invocation |
| `API v2 Run Tree by {user} from {IPs}` | Authenticated API invocation |
| `ENGINE Call System Tree` | Sub-tree/routine call from another tree |
| `ENGINE Run Error` | Failure — the engine itself generated this trigger |
| `HANDLER {Name}` | Handler completing (e.g., `HANDLER Wait`, `HANDLER Echo`) |

### Run Status Never Transitions

Run status is **always `"Started"`** — it never transitions to `"Completed"` even when all triggers are `Closed` and the tree has finished executing. To determine if a run actually completed, check its triggers:
- `GET /triggers?runId={id}&status=Failed&count=true` — if count is 0, the run succeeded
- Look for a Return node trigger with `status=Closed` — confirms the tree reached its end

### Diagnosing Stuck Runs

When runs show status `Started` but triggers show `Closed`, the workflow engine processed the start node but got stuck on a downstream handler or deferred task. Check:
1. `GET /triggers?runId={id}&include=details` — see which nodes fired
2. Look for triggers with `status=Error` or non-empty `message`
3. Check if any trigger has `type=Manual` (waiting for external input)

### Error Management

Failed triggers generate error records in the Task engine. Errors are separate objects from triggers — each failed trigger gets an error with its own `id`.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/errors?include=details&status=Active` | List errors. **`include=details` required** to get the `id` field |
| POST | `/errors/resolve` | Bulk-resolve errors with an action |

#### Error Object Fields

| Field | Description |
|-------|-------------|
| `id` | Error ID (only present with `include=details`) |
| `relatedItem1Id` | Trigger ID (the failed trigger) |
| `relatedItem1Type` | `KineticTask::Models::ManagementTrigger` |
| `relatedItem2Id` | Node ID (e.g., `system_tree_return_v1_2`) |
| `relatedItem2Type` | `KineticTask::Models::Tree::Node` |
| `status` | `Active` or `Handled` |
| `summary` | Human-readable error description |
| `type` | Error type (see table below) |
| `createdAt` | Timestamp (with `include=details`) |
| `updatedAt` | Timestamp (with `include=details`) |

#### Resolve Request

```json
POST /errors/resolve
{
  "ids": [1550, 1549, 1548],
  "action": "Retry Task",
  "resolution": "Description of fix applied"
}
```

#### Error Types

| Type | Description | Valid Actions |
|------|-------------|---------------|
| `Handler Error` | Handler execution failed (ERB errors, missing params, etc.) | Retry Task, Skip Task, Do Nothing |
| `Node Parameter Error` | ERB evaluation failed on a node parameter | Retry Task, Skip Task, Do Nothing |
| `Source Error` | Source data could not be processed (e.g., NoMethodError) | **Do Nothing only** |
| `Tree Error` | Tree-level error (e.g., node already completed) | **Do Nothing only** |
| `Missing Handler Error` | Handler definition not found on server | Retry Task, Skip Task, Do Nothing |

#### Available Actions

| Action | Effect |
|--------|--------|
| `Retry Task` | Re-execute the failed node (use after fixing the tree) |
| `Skip Task` | Skip the failed node and continue the workflow |
| `Do Nothing` | Mark as handled without retrying or skipping |

**Action validity depends on error type.** Using an invalid action returns `{"message":"Invalid management action \"Skip Task\" for error #N with type \"Source Error\""}`. "Do Nothing" is the only universally valid action across all error types.

#### API Behavior Notes

- `GET /errors` returns **max 5 errors per request** regardless of `limit` parameter
- For bulk resolution, loop through pages until `count: 0`
- `Skip Task` on handler errors may generate **new downstream errors** (the skipped node's dependents may fail), so error count can grow during bulk resolution
- Resolved errors transition from `status: "Active"` to `status: "Handled"`

#### Tracing Errors to Trees

Errors reference triggers (via `relatedItem1Id`), not trees directly. To find which tree an error belongs to:
1. Get the trigger: `GET /triggers/{relatedItem1Id}` → note the `branchId` (Start trigger ID)
2. Get the Start trigger: `GET /triggers/{branchId}` → note the `scheduledAt` timestamp
3. Find runs near that timestamp, check `run.tree.name` for the tree identity
4. Confirm with `GET /triggers?runId={runId}` to verify the trigger belongs to that run

---

## 11. Programmatic Workflow Creation (Core API)

**Always use the Core API for creating/updating/deleting workflows.** The Task API v2 PUT silently ignores tree XML content.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/app/api/v1/kapps/{kapp}/workflows` | List workflows + orphan diagnostics |
| POST | `/app/api/v1/kapps/{kapp}/workflows` | Create workflow (auto-registers with platform) |
| PUT | `/app/api/v1/kapps/{kapp}/workflows/{id}` | Update workflow / upload tree XML |
| DELETE | `/app/api/v1/kapps/{kapp}/workflows/{id}` | Soft-delete workflow |

### Two-Step Creation

1. **Create:** `POST /workflows` with `{name, event, type:"Tree", status:"Active"}`
   - Returns `id` (UUID) — also used as `sourceGroup` in Task API
   - Auto-sets `platformItemType`, `platformItemId`, `guid === sourceGroup`

2. **Upload XML:** `PUT /workflows/{id}` with `{"treeXml": "<taskTree>...</taskTree>"}`
   - **Must be ONLY the `<taskTree>` inner element** — NOT the full `<tree>` wrapper
   - Server adds the `<tree>`, `<sourceName>`, `<sourceGroup>`, `<type>`, `<status>` wrapper automatically

3. **Verify:** Export via Task API: `GET /trees/{title}/export`

### Why NOT Task API v2

- `PUT /trees/{title}` with XML content returns HTTP 200 and bumps `versionId` but **does NOT persist the XML**
- Trees created via `POST /trees` lack platform registration → flagged as "orphaned" → deleted by repair tool
- `guid !== sourceGroup` when created via Task API → web admin shows "Unable to retrieve tree by GUID"

### Serial vs Parallel Execution

- **Serial:** Each node's `<dependents>` links to one next node
- **Parallel:** Start node lists multiple `<dependent>` entries — all fire simultaneously

### Critical XML Rules

1. **Node ID suffixes must be globally unique** — IDs use `{definition_id}_{N}` where N is sequential across ALL handler types. `utilities_echo_v1_1` + `system_wait_v1_1` is WRONG (both suffix `_1`). Use `_1`, `_2`, `_3` in order. Duplicate suffixes cause the builder to silently drop nodes.

2. **Deferrable nodes need 3 message types** — `Create`, `Update`, `Complete`:
   ```xml
   <messages>
       <message type="Create"></message>
       <message type="Update"></message>
       <message type="Complete"></message>
   </messages>
   ```
   Non-deferrable nodes need only `<message type="Complete">`.

3. **`<lastID>`** should equal the highest numeric suffix used.

### Supported Events

`Submission Created`, `Submission Updated`, `Submission Closed`

## 12. Tips & Gotchas

- **URL encoding:** Tree titles with spaces and `::` must be URL-encoded for API calls
- **XML in JSON:** The export endpoint wraps XML in a JSON string — parse JSON first, then XML
- **HTML entities in XML:** Parameter values use `&lt;` / `&gt;` for `<` / `>` in ERB expressions
- **`&amp;&amp;` and `&quot;`:** XML-encoded `&&` and `"` in condition expressions
- **Empty `<dependents>`:** Means the task is a terminal/leaf node (workflow ends here)
- **`defers: true`:** Task pauses the workflow until an external event resumes it (approvals, subroutine completion)
- **x/y coordinates:** Visual positions in the builder UI; useful for layout but not execution order
- **`lastID`:** Counter for generating unique task IDs; not meaningful for parsing
- **Global Routine sourceName/sourceGroup:** Always `-` (dash) for both fields

---

## 13. Lessons Learned — Tree API (2026-02-22)

### Export Endpoint Bug
- `/trees/{title}/export` is broken on `second.jdsultra1.lan` — always returns wrong XML
- Use `GET /trees/{title}?include=treeJson` instead — returns correct JSON definition
- `fix-workflows.mjs` migration script uploaded treeJson definitions for all 114 kapp workflows

### treeJson PUT via Task API v2
- `PUT /trees/{title}` with `treeJson` field works universally (event-triggered, WebAPI, routines)
- `treeXml` in PUT body is **silently ignored** — only use `treeJson`
- Always include `versionId` (string) from the latest GET — optimistic locking is enforced
- Stale `versionId` returns HTTP 400 with `stale_record` error

### Handler Parameter Names
- Parameter names must match **exactly** (case, spacing, punctuation)
- `system_wait_v1`: `"Time to wait"` and `"Time unit"` (not snake_case)
- Wrong names don't error at creation — they cause `ENGINE Run Error` at runtime
- Verify with `GET /handlers/{definitionId}?include=parameters,results`

### Kapp-Level vs Form-Level Workflows
- Kapp-level: `POST /kapps/{kapp}/workflows` — fires for ALL forms
- Form-level: `POST /kapps/{kapp}/forms/{form}/workflows` — fires only for that form
- `list_workflows` MCP tool only returns kapp-level — iterate forms for form-level
- Both share the same tree infrastructure in Task API

### Event-Triggered Execution Timing
- Creating a submission triggers `Submission Created` workflows asynchronously
- Runs appear within ~500ms typically
- Triggers progress: New → Work In Progress → Closed
- Echo nodes close near-instantly; Wait nodes defer

### Node ID Uniqueness (Reinforced)
- Suffixes must be globally unique across ALL handler types in a tree
- `utilities_echo_v1_1` + `system_wait_v1_1` = BROKEN (both suffix `_1`)
- Use `_1`, `_2`, `_3` sequentially — builder silently drops nodes with duplicate suffixes

### Tree Type Classification via `sourceGroup`
Classify a tree's type by inspecting `run.tree.sourceGroup`:
- `"WebApis > {kapp}"` → **WebAPI** tree
- UUID pattern (`/^[0-9a-f]{8}-/`) → **Event-triggered** (kapp/form workflow)
- Anything else (including `-`) → **Routine**
- Never classify by tree name — names don't reliably indicate type
