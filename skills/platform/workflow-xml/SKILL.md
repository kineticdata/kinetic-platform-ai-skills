---
name: workflow-xml
description: Kinetic workflow XML schema, tree title format, task nodes, flow control, ERB context variables, handler definition IDs, error handling patterns, and triggers API reference.
---

# Kinetic Workflow XML & API Quick Reference

Quick reference for programmatically working with Kinetic Platform workflows
via the Task API and understanding the exported XML schema.

---

## Task API Endpoints & Authentication

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

## Tree Title Format

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

## XML Schema Overview

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

## Task Nodes (`<task>`)

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
- **definition_id** — Handler or routine to execute (see Common Handler Definition IDs below)
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

## Flow Control via `<dependents>`

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
- **type** — `Complete`, `Create`, or `Update`:
  - **Complete**: fires after the node finishes executing (default for sequential flow)
  - **Create**: fires immediately when a deferrable node enters deferral (e.g., start SLA timer when email is sent)
  - **Update**: fires each time a deferred node receives an update action (e.g., each reply to an email)
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

### treeJson Connector Format

```json
{
  "from": "smtp_email_send_v1_1",
  "to": "utilities_echo_v1_2",
  "type": "Complete",
  "label": "Email delivered",
  "value": "@results['Send Email']['Handler Error Message'].to_s.empty?"
}
```

In treeJson, connectors are a flat array at the top level of the `taskTree`, replacing the nested `<dependents>` XML structure.

---

## Context Variables

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
| `@task` | Hash | Current node: `Id`, `Status`, `Name`, `Deferral Token`, `Node Id`, `Tree Id`, `Tree Name`, `Loop Index` |
| `@trigger` | Hash | Engine info: `Id`, `Status`, `Action`, `Execution Type`, `Node Id` |

### WebAPI Context Variables (verified via runtime dump)

These variables are confirmed available in WebAPI tree execution:

| Variable | Type | Example Value |
|----------|------|---------------|
| `@request_query_params` | Hash | `{"id"=>"TEST-001", "foo"=>"bar"}` |
| `@request_body_params` | Hash | `{}` (empty for GET, parsed body for POST) |
| `@request_headers` | Hash | `{}` |
| `@requested_by` | Hash | `{"email"=>"...", "displayName"=>"john", "username"=>"john"}` |
| `@source` | Hash | `{"Name"=>"Kinetic Request CE", "Group"=>"WebApis > {kapp}", "Id"=>nil, "Data"=>"..."}` |
| `@run` | Hash | `{"Id"=>3083}` |
| `@task` | Hash | `{"Id"=>..., "Status"=>"New", "Name"=>"...", "Node Id"=>"...", "Tree Name"=>"...", "Source"=>"Kinetic Request CE", ...}` |
| `@trigger` | Hash | `{"Id"=>..., "Engine Identification"=>"...", "Status"=>"...", "Action"=>"Root", ...}` |
| `@results` | Hash | Results from completed upstream tasks (keyed by node name) |

**Not available in WebAPI context:** `@space`, `@kapp`, `@form`, `@submission`, `@values`, `@user`, `@space_attributes`, `@user_profile_attributes` — these are event-tree-only variables.

**Passing data into WebAPI trees:** Use query params, body, or headers:
```ruby
<%= @request_query_params['id'] %>
<%= @request_body_params['orderId'] %>
<%= @requested_by['username'] %>
```

### Accessing Results
Results are accessed by **task name**, then **result key**:
```ruby
@results['Generate Token']['Password Reset Token']
@results['API']['Handler Error Message']
@results['Retrieve All Users']['Users List JSON']
```

---

## Common Handler Definition IDs

### System Handlers
| Definition ID | Purpose | Key Parameters |
|---------------|---------|----------------|
| `system_start_v1` | Entry point — always `id="start"` | None |
| `system_tree_return_v1` | Return node — params vary by tree type (see below) | Varies |
| `system_wait_v1` | Deferred wait | `Time to wait` (required), `Time unit` (menu: Second,Minute,Hour,Day,Week) |
| `system_noop_v1` | No-op passthrough (merge/gate node). Safely ignores unknown parameters — can be used as comment/annotation nodes | None |
| `system_join_v1` | Coordinates multiple incoming connectors | `type` (menu: All/Any/Some), `number` |
| `system_junction_v1` | Looks backward through branches to common parent | None |
| `system_loop_head_v1` | Loop entry. Iterations execute in parallel | `data_source` (required), `loop_path` (required), `var_name` |
| `system_loop_tail_v1` | Loop exit | `type` (menu: All/Any/Some), `number` |
| `system_tree_call` | Handler used by `<taskDefinition>` | None |

### Return Node Parameter Rules (CRITICAL)

**WebAPI trees** — Return node MUST use ALL FOUR parameter IDs:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `content` | yes | Response body (supports ERB: `<%= ... %>`) |
| `content_type` | yes | MIME type, e.g. `application/json` |
| `response_code` | yes | HTTP status code, e.g. `200` |
| `headers_json` | **yes** | Extra response headers as JSON (use `{}` if none) |

**CRITICAL: `headers_json` is REQUIRED even if empty.** Omitting it causes `RuntimeError` from `system_tree_return_v1` at runtime — the run fails with `run_results_error` and a `Handler Error` in the error queue. Always include `{"id": "headers_json", "value": "{}"}` in the parameters. This has caused repeated debugging sessions.

**Event-triggered trees** (non-WebAPI) — Return node uses:

| Parameter | Description |
|-----------|-------------|
| `status` | Completion status string (e.g., `Complete`) |
| `description` | Description/summary of the result |

**Routine trees** — Return node uses custom output parameter IDs matching the routine's declared outputs.

`system_tree_return_v1` has **dynamic configuration** — it adapts expected parameters based on tree type. Using wrong parameter IDs causes `ENGINE Run Error` — the Return node stays at status "New", and WebAPI invocations return `{"errorKey":"run_results_error"}`.

**Note:** `system_return_v1` is NOT a valid handler — it causes `Missing Handler Error` at runtime.

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

## Critical Node Flags

When building treeJson programmatically, every node MUST have these flags set correctly:

| Flag | Required Value | Effect of Wrong Value |
|------|---------------|----------------------|
| `visible` | `true` | `false` causes engine to skip/ignore nodes |
| `configured` | `true` | `false` causes engine to skip nodes |
| `defers` on Start | `false` | `true` causes Start to enter deferral — run stuck permanently |
| `deferrable` on Start | `false` | Same as `defers` — Start hangs, no downstream triggers created |
| `version` | `1` (number) | Must be a number, not a string |

**Only Wait and other genuinely deferrable handlers** should have `defers: true, deferrable: true`. The Start node must NEVER be deferrable.

### Node ID Uniqueness Rules

Node IDs use the format `{definition_id}_{N}` where N is a sequential integer. Suffixes must be **globally unique across ALL handler types** in a tree:

```
CORRECT: system_start_v1_1, utilities_echo_v1_2, system_wait_v1_3
WRONG:   system_start_v1_1, utilities_echo_v1_1, system_wait_v1_1  (duplicate _1 suffix)
```

Duplicate suffixes cause the workflow builder to **silently drop nodes**. `<lastID>` should equal the highest suffix used.

### Deferrable Node Messages

Deferrable nodes need three message types:
```xml
<messages>
    <message type="Create"></message>
    <message type="Update"></message>
    <message type="Complete"></message>
</messages>
```
Non-deferrable nodes need only `<message type="Complete">`.

### Handler Parameter Case Sensitivity

Parameter names must match **exactly** (case, spacing, punctuation). For example, `system_wait_v1` requires `"Time to wait"` and `"Time unit"` (not `time_to_wait` or `TimeToWait`). Wrong names don't error at creation — they cause `ENGINE Run Error` at runtime with no clear error message.

Verify parameter names: `GET /handlers/{definitionId}?include=parameters,results`

---

## The `<taskDefinition>` Section (Global Routines Only)

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

## Error Handling Patterns

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

---

## Error Management API

Failed triggers generate error records in the Task engine.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/errors?include=details&status=Active` | List errors (`include=details` required for `id` field) |
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

### Error Types

| Type | Description | Valid Actions |
|------|-------------|---------------|
| `Handler Error` | Handler execution failed | Retry Task, Skip Task, Do Nothing |
| `Node Parameter Error` | ERB evaluation failed on a parameter | Retry Task, Skip Task, Do Nothing |
| `Source Error` | Source data processing error | Do Nothing only |
| `Tree Error` | Tree-level error | Do Nothing only |
| `Missing Handler Error` | Handler not found on server | Retry Task, Skip Task, Do Nothing |

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

---

## Tips & Gotchas

- **URL encoding:** Tree titles with spaces and `::` must be URL-encoded for API calls
- **XML in JSON:** The export endpoint wraps XML in a JSON string — parse JSON first, then XML
- **HTML entities in XML:** Parameter values use `&lt;` / `&gt;` for `<` / `>` in ERB expressions
- **`&amp;&amp;` and `&quot;`:** XML-encoded `&&` and `"` in condition expressions
- **Empty `<dependents>`:** Means the task is a terminal/leaf node (workflow ends here)
- **`defers: true`:** Task pauses the workflow until an external event resumes it (approvals, subroutine completion)
- **x/y coordinates:** Visual positions in the builder UI; useful for layout but not execution order
- **`lastID`:** Counter for generating unique task IDs; not meaningful for parsing
- **Global Routine sourceName/sourceGroup:** Always `-` (dash) for both fields
- **`treeJson` is more reliable than XML for round-trips** — use `include=treeJson` on GET and `treeJson` in PUT body. The `/export` endpoint may return incorrect XML on some servers.
- **Optimistic locking on tree PUT** — `versionId` is enforced. Always GET the tree first to retrieve current `versionId`. Must be a **string** in the PUT body. Stale values return HTTP 400 `stale_record`.
- **Both Core API and Task API return HTTP 400 (not 409) for duplicate names** — error body: `{"errorKey":"uniqueness_violation"}`
