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

**Passing data into WebAPI trees:** Use query params, body, or headers:
```ruby
<%= @request_query_params.fetch('myParam', '') %>
<%= @request_body_params.fetch('orderId', '') %>
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
| `system_wait_v1` | Deferred wait — pauses workflow for a duration | `Time to wait` (required), `Time unit` (menu: Second,Minute,Hour,Day,Week) |
| `system_noop_v1` | No-op passthrough (merge/gate node) | None |
| `system_join_v1` | Waits for immediate incoming connectors | `type` (menu: All/Any/Some), `number` |
| `system_junction_v1` | Waits for entire branches back to common parent | None |
| `system_loop_head_v1` | Loop entry — iterations execute **in parallel** | `data_source` (required), `loop_path` (required), `var_name` |
| `system_loop_tail_v1` | Loop exit — determines when loop is done | `type` (menu: All/Any/Some), `number` |
| `system_tree_call` | Handler used by `<taskDefinition>` for routines | None |
| `utilities_create_trigger_v1` | Completes or updates a deferred node | `action_type` (required), `deferral_token` (required), `deferred_variables`, `message` |
| `utilities_defer_v1` | Immediately returns deferral token then defers | `deferral_value` (optional initial value) |
| `utilities_echo_v1` | Returns its input unchanged (useful for debugging) | `input` (required) |
| `system_integration_v1` | Executes a Connection/Operation | `connection` (required, ID), `operation` (required, ID) |
| `system_submission_create_v1` | Creates a submission from workflow | `kappSlug`, `formSlug`, `coreState`, `currentPage`, `origin`, `parent` |

### Return Node Parameter Rules (CRITICAL)

**WebAPI trees** — Return node MUST use these specific parameter IDs:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `content` | yes | Response body (supports ERB: `<%= ... %>`) |
| `content_type` | yes | MIME type, e.g. `application/json` |
| `response_code` | yes | HTTP status code, e.g. `200` |
| `headers_json` | no | Extra response headers as JSON |

**Routine trees** — Return node uses custom output parameter IDs matching the routine's declared outputs.

**Event-triggered form trees — DO NOT use `system_tree_return_v1`!** Regular form-triggered workflows (e.g., "Submission Submitted") do NOT need a Return node. The workflow completes naturally when all nodes finish. Adding `system_tree_return_v1` to a form workflow causes `ENGINE Run Error` because it expects `headers_json` (WebAPI context) or routine output parameters. Just let the tree end after the last node.

`system_tree_return_v1` has **dynamic configuration** — it adapts expected parameters based on tree type. Using wrong parameter IDs causes `ENGINE Run Error` — the Return node stays at status "New", and WebAPI invocations return `{"errorKey":"run_results_error"}`.

**Note:** `system_return_v1` is NOT a valid handler — it causes `Missing Handler Error` at runtime.

### Joins vs Junctions

Both reconverge parallel branches, but with different logic:

**`system_join_v1`** — evaluates only **immediate incoming connectors**:
- `type: "All"` — waits for every connector to arrive
- `type: "Any"` — proceeds as soon as one connector arrives
- `type: "Some"` — proceeds after `number` connectors arrive (set `number` parameter)

**`system_junction_v1`** — traces back through **entire branches to a common parent node**:
- No parameters — evaluates whether each branch is "complete as possible"
- A branch is complete when: no deferred nodes are waiting, and all evaluable connectors have been evaluated
- Branches that evaluate to false (never reach the junction) still count as complete
- **Caution:** Junctions wait for deferred nodes indefinitely. Be careful about placing deferrable nodes on branches leading to a junction.

Use **Join** when you have a fixed number of parallel paths. Use **Junction** when branches may conditionally execute and you want to proceed once all possible work is done.

### Loops

Loops iterate over data using paired **Loop Head** and **Loop Tail** nodes.

**`system_loop_head_v1`** parameters:
- `data_source` (required) — the data to iterate over. Can be:
  - Output from a previous node: `<%= @results['Fetch Users']['Response Body'] %>`
  - Submission values (for arrays like checkbox fields): `<%= @values["Selected Users"] %>`
  - XML constructed inline: `<items><%= ... %></items>`
- `loop_path` (required) — XPath for XML (`//user/id`) or JSONPath for JSON (`$[*]`) identifying records. **Note:** JSONPath uses `$[*]` (no dot after `$`), or `$[*].property` for nested extraction.
- `var_name` (optional) — variable name for current iteration value

**`system_loop_tail_v1`** parameters:
- `type` (menu: All/Any/Some) — when the loop completes
- `number` — for "Some" type, how many iterations must complete

**Critical:** Loop iterations execute **in parallel**, not sequentially. There is no `for` loop or `do while` concept. For sequential processing, use recursive routines instead.

**Critical: Loop connector pattern.** The loop_head MUST have **two outgoing Complete connectors**:
1. To the loop **body** (the nodes that execute per iteration)
2. Directly to the **loop_tail** (so the engine knows where the loop ends)

The loop body nodes also connect to the loop_tail. This means the loop_tail receives connectors from BOTH the loop_head AND the last body node. Without the direct `loop_head → loop_tail` connector, the engine cannot properly track loop completion.

```
loop_head ──→ body_node ──→ loop_tail
    │                           ↑
    └───────────────────────────┘  (direct connector)
```

**Loop head results:**
- `data` — the parsed data in internal format
- `mode` — number of iterations  
- `size` — number of items found
- `variable_name` — the var_name parameter value

**Per-iteration results (accessed within the loop):**
- `Index` — zero-based iteration index
- `Value` — the current item's value (extracted by loop_path)

**Accessing loop values:**
- Inside the loop: `<%= @results['Loop Head Node Name']['Value'] %>` returns the current iteration's value
- Outside the loop: results become a Ruby hash indexed by iteration: `<%= @results['Echo Node'][0]["output"] %>` for first iteration's output

**Verified working example** — looping over checkbox field values:
```json
{
  "nodes": [
    {"name": "Loop Users", "definitionId": "system_loop_head_v1",
     "parameters": [
       {"id": "data_source", "value": "<%= @values[\"Selected Users\"] %>"},
       {"id": "loop_path", "value": "$[*]"},
       {"id": "var_name", "value": "username"}
     ],
     "dependents": {"task": [
       {"type": "Complete", "content": "echo_node_id"},
       {"type": "Complete", "content": "loop_tail_id"}
     ]}},
    {"name": "Echo Name", "definitionId": "utilities_echo_v1",
     "parameters": [
       {"id": "input", "value": "User: <%= @results[\"Loop Users\"][\"Value\"] %>"}
     ],
     "dependents": {"task": [
       {"type": "Complete", "content": "loop_tail_id"}
     ]}},
    {"name": "End Loop", "definitionId": "system_loop_tail_v1",
     "parameters": [
       {"id": "type", "value": "All"}
     ]}
  ]
}
```

### Deferrals

Deferrals pause a workflow node and wait for an external signal to resume.

**Making a node deferrable:** Set `defers: true` and `deferrable: true` on the node. The node executes its action, then enters a waiting state.

**Connector types on deferrable nodes:**
- **Create** (dotted line) — fires immediately when the node enters deferral
- **Update** (dashed line) — fires each time an Update action is received
- **Complete** (solid line) — fires when the node is completed

**Resuming a deferred node** — use `utilities_create_trigger_v1`:

| Parameter ID | Name | Required | Description |
|-------------|------|----------|-------------|
| `action_type` | Action Type | Yes | `"Complete"` or `"Update"` |
| `deferral_token` | Deferral Token | Yes | Token identifying the deferred node (typically stored in a submission field) |
| `deferred_variables` | Deferred Results | No | XML results: `<results><result name="Key">Value</result></results>` |
| `message` | Message | No | Plain text message |

**Results:** `trigger_id`, `run_id`

**Accessing the deferral token:** Within a workflow, use `<%= @task['Deferral Token'] %>` to get the current node's token. Typically this is written to a submission field (e.g., `values[Deferral Token]`) so that a separate workflow can later complete the deferral.

**Common pattern:** An approval workflow creates a submission in Draft with the deferral token stored in a field. When the approver submits their decision, a "Submission Submitted" tree reads the token and calls `utilities_create_trigger_v1` with `action_type: "Complete"` to resume the original workflow.

**Verified end-to-end deferral/approval pattern** (tested on demo.kinops.io):

1. **Request form workflow** (on Submission Submitted, with filter `values('Status') == "Open"`):
   - Set Status Pending: `PUT /submissions/<%= @submission['Id'] %>` → `{"values":{"Status":"Pending Approval"}}`
   - Create Approval (`defers: true, deferrable: true`): `POST /kapps/{kapp}/forms/approval/submissions` with `{values: {Approver, 'Original Submission Id': @submission['Id'], 'Deferral Token': @task['Deferral Token']}, coreState: 'Draft'}`
   - After deferral completes → Set Final Status: `PUT /submissions/<%= @submission['Id'] %>` → `{"values":{"Status":"<%= deferred result %>"}}`

2. **Approval form workflow** (on Submission Submitted):
   - Complete Deferral: `utilities_create_trigger_v1` with `action_type: "Complete"`, `deferral_token: @values['Deferral Token']`, `deferred_variables: <results><result name="Decision"><%= @values['Decision'] %></result></results>`
   - Close Approval: `PUT /submissions/<%= @submission['Id'] %>` → `{"coreState":"Closed"}` (best practice — don't leave approvals in Submitted forever)

**Deferred task status:** Shows as `"Work In Progress"` in the runs API (not `"Deferred"`). The presence of a `token` on the task confirms deferral. After completion, status changes to `"Closed"`.

**Deferred results access:** After the Complete trigger fires, subsequent nodes can access deferred results via `@results['Node Name']`. The results are the handler's original results merged with the deferred_variables XML.

### API Handler — `kinetic_core_api_v1` (Legacy)

Makes REST API calls to Kinetic Core. **Prefer Connections/Operations for new workflows** — this handler is a legacy approach. It's still useful for one-off API calls where building a full operation isn't worth the effort, but Connections/Operations should be the default.

Configured with `api_username`, `api_password`, `api_location` properties.

| Parameter ID | Name | Required | Menu | Description |
|-------------|------|----------|------|-------------|
| `error_handling` | Error Handling | Yes | `Error Message,Raise Error` | How to handle errors |
| `method` | Method | Yes | `GET,POST,PUT,PATCH,DELETE` | HTTP method (defaults to GET) |
| `path` | Path | Yes | — | API path (e.g., `/kapps/:kappSlug/forms/:formSlug`) |
| `body` | Body | No | — | JSON body for POST/PUT/PATCH |

**Results:** `Response Body`, `Response Code`, `Handler Error Message`

### Email Handler — `smtp_email_send_v1`

Sends emails via SMTP. Configured with `server`, `port`, `tls`, `username`, `password` properties.

| Parameter ID | Name | Required | Description |
|-------------|------|----------|-------------|
| `error_handling` | Error Handling | Yes | `Error Message` or `Raise Error` |
| `from` | From (Email Address) | Yes | Sender email address |
| `to` | To (Email Address) | Yes | Recipient email address |
| `bcc` | Bcc (Email Address) | No | BCC recipient |
| `subject` | Subject | No | Email subject line |
| `htmlbody` | HTML Body | No | Rich HTML email body |
| `textbody` | Alternate (text) Body | No | Plaintext fallback for non-HTML clients |

**Results:** `Handler Error Message`, `Message Id`

**Tip:** Use `include=parameters,results` on the handlers API to discover parameters for any handler: `GET /handlers/{definitionId}?include=parameters,results`

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

## Creating Trees via API

### POST to Create

```
POST /app/components/task/app/api/v2/trees
{
  "sourceName": "Kinetic Request CE",
  "sourceGroup": "WebApis > my-kapp",
  "name": "my-tree",
  "type": "Tree",
  "status": "Active",
  "treeXml": "<taskTree>...</taskTree>"
}
```

**Gotcha:** POST creates the tree metadata AND saves the `treeXml` in the same call.

### PUT to Update

```
PUT /app/components/task/app/api/v2/trees/{url-encoded-title}
{
  "treeJson": { ... },
  "versionId": "0"
}
```

**Use `treeJson` for updates** — it's more reliable than `treeXml` for round-trips and properly handles connector logic.

### Handlers API

**`GET /handlers` only returns handlers assigned to a handler category.** Handlers without a category are invisible in the list but still exist and work in trees. You can always fetch a specific handler directly by definition ID: `GET /handlers/{definitionId}?include=parameters,results`.

**Common unlisted handlers** (exist but not categorized by default):
- `utilities_create_trigger_v1` — complete/update deferred nodes
- `utilities_defer_v1` — immediately defer and return a token
- `utilities_echo_v1` — echo input to output (debugging)
- `system_integration_v1` — execute a Connection/Operation from workflow
- `system_submission_create_v1` — create a submission from workflow

System handlers (`system_start_v1`, `system_tree_return_v1`, etc.) are built into the engine and cannot be fetched via the handlers API at all — they have no handler record.

To discover ALL handlers on a server (including uncategorized), inspect the `definitionId` values in existing tree definitions via `GET /trees?include=treeJson`, then fetch each handler individually.

**Handler categories** are managed via the Task API:
```
GET /categories                          # List handler categories
```
Categories have `name`, `description`, and `type` (`"Integrated"` for system, `"Stored"` for user-installed). A handler must be assigned to at least one category to appear in `GET /handlers`.

Handler properties (connection credentials, etc.) are available via `include=properties`:
```
GET /handlers/{definitionId}?include=properties
```

### Sources API

The sources endpoint returns `sourceRoots` (not `sources`):
```json
{
  "count": 3,
  "sourceRoots": [
    {"name": "Kinetic Request CE", "status": "Active", "type": "Kinetic Request CE"},
    {"name": "Kinetic Task", "status": "Active", "type": "Kinetic Task"}
  ]
}
```

### Runs API

Run IDs are **integers**, not UUIDs. The response includes:
- `source` — the source that triggered the run
- `sourceId` — the submission UUID that triggered it (for form-triggered trees)
- `tree` — embedded tree metadata
- `status` — `Started`, `Completed`, `Failed`

**Note:** Creating submissions on forms that have active workflow trees will automatically generate runs. Plan for this during bulk data creation.

**Note:** Form-triggered workflows (non-WebAPI, non-routine) that have no `system_tree_return_v1` will remain in `Started` status permanently. This is normal — the workflow ran to completion, but the engine only sets `Completed` when a tree_return node executes.

### Debugging Workflow Runs

Use the detailed include parameters on the runs API to diagnose failures:

```
GET /runs/{runId}?include=details,triggers,triggers.details,tasks,tasks.details,exceptions,exceptions.details,exceptions.text,exceptions.messages,sourceData,inputs,outputs,tree.inputs,audits.details
```

**Key include options:**

| Include | Returns |
|---------|---------|
| `tasks` | All node executions with status, nodeId, nodeName, loopIndex |
| `tasks.details` | Adds timestamps, task IDs |
| `triggers` | All triggers (Root, loop iterations, failures) with status |
| `triggers.details` | Adds engineIdentification, originator |
| `exceptions` | Handler errors with summary |
| `exceptions.text` | Full stack traces and root cause analysis |
| `exceptions.messages` | Associated messages |
| `sourceData` | Complete JSON payload that triggered the run (event, form, kapp, space, submission, values) |
| `inputs` | Tree input values |
| `outputs` | Tree output values (for routines/WebAPIs) |
| `audits.details` | Manual modifications to run data |

**Task statuses:** `New` (not yet executed), `Closed` (completed), `Work In Progress` (deferred — waiting for external signal). Note: deferred tasks show as "Work In Progress", not "Deferred". The presence of a deferral `token` on the task confirms it's in a deferral state.

**Trigger statuses:** `Closed` (success), `Failed` (error — check exceptions), `New` (not yet processed)

**Loop iteration tracking:** Tasks within a loop have a `loopIndex` field. Root-level tasks show `/`, while loop iterations show `/N#I` (e.g., `/2#0` = node 2, iteration 0).

**Diagnosing failures:**
1. Check `exceptions` — the `summary` field gives a one-line error description
2. Check `exceptions.text` — includes `PROBLEM`, `ROOT CAUSE`, and `STACK TRACE` sections
3. Check `tasks` — look for tasks with `status: "New"` (never executed) to find where the workflow stopped
4. Check `triggers` — look for `status: "Failed"` triggers with `originator: "ENGINE Run Error"`

**Common errors:**
- `No elements match the xpath query '//results/result[@name='X']'` — handler expects a parameter/result that wasn't provided (e.g., `headers_json` on tree_return)
- `Unable to retrieve hash value for key 'X'` — referencing an unexecuted or missing node name in `@results`
- `nil:NilClass` — null value where a value was expected (check ERB expressions)

**Run management actions (via console):**
- **Run Again** — re-run with same inputs (creates new run)
- **Create Manual Trigger** — restart a failed branch
- **Retry Task** or **Skip Task** — for individual node failures

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
- **System handlers are invisible in the handlers API** — `system_start_v1`, `system_tree_return_v1`, `system_noop_v1`, etc. don't appear in `GET /handlers` but work in tree definitions
- **Handler export endpoint does not exist** — `GET /handlers/{id}/export` returns 404. Handlers are imported via ZIP files through the Ruby SDK, not exported via REST API.
- **WebAPI Return node requires `headers_json`** — omitting this parameter causes RuntimeError at runtime even though it appears optional
- **Do NOT add `system_tree_return_v1` to form-triggered workflows** — tree_return is ONLY for: (1) WebAPIs that need to return a response, (2) Routines where the parent workflow awaits results. Form-triggered trees complete naturally when all nodes finish. Adding tree_return causes `ENGINE Run Error` because it expects WebAPI/routine context.
- **Loop head must connect to BOTH body AND tail** — the `system_loop_head_v1` node needs two outgoing Complete connectors: one to the loop body and one directly to `system_loop_tail_v1`. Without the direct connector to the tail, the engine cannot track loop completion.
- **JSONPath uses `$[*]` not `$.[*]`** — no dot between `$` and `[`. For nested extraction: `$[*].user.username`
