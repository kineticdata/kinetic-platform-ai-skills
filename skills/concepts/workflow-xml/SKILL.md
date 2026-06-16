---
name: workflow-xml
description: "Use when authoring, validating, or PUTting Kinetic workflow tree XML/treeJson — handler definitionIds and parameters, loops, deferrals, system_integration_v1, validate-workflow/put-workflow gate scripts, dropped nodes, 404-in-handler, ghost-run-status, or debugging a run via /runs/{id}/tasks."
---

# Kinetic Workflow XML & Handler Reference

Reference for the Kinetic workflow XML schema, handler definition IDs, node configuration,
and debugging workflow runs via the Task API.

For creating and managing workflows (tree creation, treeJson upload, sources), see `concepts/workflow-creation`.

---

## 🚨 MANDATORY — Workflow Tree Gate Scripts

Before writing, PUTting, or debugging any workflow tree, use the gate scripts in `scripts/` alongside this skill:

| Script | Purpose |
|---|---|
| `scripts/validate-workflow.mjs` | Validates a tree XML against all rules documented in this skill. Refuses invalid trees. Cites the rule violated. Run before every PUT. |
| `scripts/put-workflow.mjs` | Atomic validate + PUT wrapper. The sanctioned way to push a tree to the engine. |
| `scripts/workflow-debug.mjs` | Inspects a run via `/runs/{id}/tasks` (NOT `/triggers` — non-deferrable handlers execute inline and don't create triggers). |
| `scripts/hook-check-workflow-put.mjs` | Claude Code `PreToolUse` hook. Install in `~/.claude/settings.json` to block raw Bash PUTs that bypass the validator. |

**Why these exist:** The rules documented below are enforced mechanically so silent failures (node-drop, 404-in-handler, ghost-run-status) can't happen. Every developer who clones this skills repo inherits the same safeguards.

**Hook install (per machine, one-time):**
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "node /absolute/path/to/skills/skills/concepts/workflow-xml/scripts/hook-check-workflow-put.mjs"
      }]
    }]
  }
}
```

Bypass only via `KINETIC_SKIP_VALIDATION=1` for rare intentional cases.

---

> **Task API base URL, auth, and endpoints** — see `concepts/task-api-reference`.

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
    <task label="Not an internal user" type="Complete"
          value="@user['Username'].match(/.*@example.com$/).nil?">
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
@user['Username'].match(/.*@example.com$/).nil?

# Hash key existence
@user_profile_attributes.has_key?('Guided Tour')

# String equality (note XML encoding: &quot; = ", &amp;&amp; = &&)
@team_previous['Name'] == "Default" && @team['Name'] != "Default"
```

#### Path Selection via Multiple Complete Connectors

A common branching idiom: give a single source node multiple outgoing Complete connectors, each with a Ruby `value` expression that selects exactly one path. Distinct from KSL filters (which gate whether a workflow fires at all), connector value expressions select WHICH downstream branch runs after the source node completes. Common examples:

```xml
<!-- API node with three mutually-exclusive Complete connectors -->
<dependents>
  <task type="Complete" value="@results['API']['Handler Error Message'].to_s.empty?">return_results</task>
  <task type="Complete" value="!@results['API']['Handler Error Message'].to_s.empty? &amp;&amp; @results['API']['Response Code'].to_i == 404">return_does_not_exist</task>
  <task type="Complete" value="!@results['API']['Handler Error Message'].to_s.empty? &amp;&amp; @results['API']['Response Code'].to_i != 404">error_process</task>
</dependents>
```

Patterns to keep in mind:
- **Coverage**: write the conditions so they collectively cover all possible outcomes. A node whose only outgoing Complete connectors all evaluate false silently terminates the branch with no error.
- **Mutual exclusivity**: when conditions overlap, multiple downstream branches run in parallel. Sometimes that's intentional; usually it isn't.
- **`@results['Node Name']` reads**: connector conditions can reference any upstream node's results, not just the immediate parent.
- **Encoding in XML**: `&&` becomes `&amp;&amp;`, `"` becomes `&quot;`. treeJson connector values use raw JSON strings and avoid this entirely.

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

### Event-Triggered (Submission) Workflows — full context (verified by debug dump on live engine)

| Variable | Type | Keys | Description |
|----------|------|------|-------------|
| `@submission` | Hash | `Created By`, `Submitted By`, `Updated By`, `Id`, `Core State`, `Handle`, `Created At`, `Submitted At`, `Updated At`, `Closed At`, `Closed By`, `Type`, `Origin Id`, `Parent Id` | The submission that triggered the workflow |
| `@form` | Hash | `Name`, `Slug`, `Description`, `Status`, `Type`, `Created At`, `Created By`, `Updated At`, `Updated By` | The form the submission belongs to |
| `@kapp` | Hash | `Name`, `Slug` | The kapp the form belongs to |
| `@space` | Hash | `Name`, `Slug` | The space |
| `@event` | Hash | `Action` (Created/Updated), `Type` (Submission), `Timestamp` | What triggered this workflow |
| `@values` | Hash | All form field names | Current field values |
| `@values_previous` | Hash | All form field names | Previous field values (empty on Created) |
| `@values_changes` | Hash | All form field names | Tracks which fields changed |
| `@submission_previous` | Hash | Same keys as `@submission` | Previous submission state |
| `@submission_changes` | Hash | Same keys as `@submission` | Tracks which submission properties changed |
| `@results` | Hash | Keyed by node name | Results from completed upstream tasks |
| `@variables` | Hash | Same as `@results` | Alias for `@results` |
| `@run` | Hash | `Id` | Current run |
| `@source` | Hash | `Name`, `Group`, `Id`, `Data` | Source metadata |
| `@task` | Hash | `Id`, `Status`, `Name`, `Deferral Token`, `Task Definition Id`, `Node Id`, `Tree Id`, `Tree Name`, `Source`, `Source Id`, `Return Variables`, `Deferred Variables`, `Loop Index`, `Parent Loop Index`, `Visible`, `Execution Duration` | Current node metadata |
| `@trigger` | Hash | `Id`, `Engine Identification`, `Status`, `Action`, `Execution Type`, `Tree Id`, `Node Id`, `Source`, `Source Id`, `Loop Index`, `Deferral Token`, `Deferred Variables`, `Message`, `Management Action`, `Selection Criterion`, `Flags` | Engine trigger metadata |
| `@kapp_attributes` | Hash | Kapp attribute names | Kapp-level attributes |
| `@form_attributes` | Hash | Form attribute names | Form-level attributes |
| `@space_attributes` | Hash | Space attribute names | Space-level attributes |

The tables below add variables for user/team events, routine `@inputs`, and WebAPI trees.

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

**`@requested_by` is nil in form-triggered (event-tree) workflows.** Even though `@requested_by` is listed in "Available in All Workflows" above, in practice it is `nil` when the workflow is fired by a form submission event. Calling any method on it (`@requested_by['username']`, `@requested_by['displayName']`, etc.) raises `NoMethodError: undefined method '[]' for nil:NilClass`. **The failure is silent at the run level**: the offending task crashes, the run continues marking other tasks complete, but the *next* task downstream of the crashed one stays at status `"New"` indefinitely with no surfaced error. Always check `/app/components/task/app/api/v2/errors?limit=10` when a workflow stalls. In form workflows, use `@values[...]`, `@submission[...]`, `@results[...]`, `@task[...]`, or literal strings — never `@requested_by`. (`@requested_by` does work in WebAPI contexts where the table above is accurate.)

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
| `system_wait_v1` | Deferred wait — pauses workflow for a duration | `Time to wait` (required), `Time unit` (menu: Second,Minute,Hour,Day,Week) |
| `system_noop_v1` | No-op passthrough (merge/gate node) | None |
| `system_join_v1` | Waits for immediate incoming connectors | `type` (menu: All/Any/Some), `number` |
| `system_junction_v1` | Waits for entire branches back to common parent | None |
| `system_loop_head_v1` | Loop entry — iterations execute **in parallel** | `data_source` (required), `loop_path` (required), `var_name` |
| `system_loop_tail_v1` | Loop exit — determines when loop is done | `type` (menu: All/Any/Some), `number` |
| `system_tree_call` | Handler used by `<taskDefinition>` for routines | None |
| `utilities_create_trigger_v1` | Completes or updates a deferred node | `action_type` (required), `deferral_token` (required), `deferred_variables`, `message` |
| `utilities_defer_v1` | Immediately returns deferral token then defers | `deferral_value` (optional initial value) |
| `utilities_echo_v1` | Returns its `input` parameter unchanged. Used for debugging, for stashing computed values under a named handle (downstream nodes read `@results['Echo Name']['output']`), running Ruby in the `input` parameter to expose the evaluated string downstream, and — when orphaned — for inline workflow documentation (see Orphaned Echo Nodes as Notes below). | `input` (required) |
| `system_integration_v1` | Executes a Connection/Operation | `connection` (required, ID), `operation` (required, ID) |
| `system_submission_create_v1` | Creates a submission from workflow | `kappSlug`, `formSlug`, `coreState`, `currentPage`, `origin`, `parent` |

### Return Node Parameter Rules (CRITICAL)

**WebAPI trees** — Return node MUST use ALL FOUR parameter IDs:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `content` | yes | Response body (supports ERB: `<%= ... %>`) |
| `content_type` | yes | MIME type, e.g. `application/json` |
| `response_code` | yes | HTTP status code, e.g. `200` |
| `headers_json` | **yes** | Extra response headers as JSON (use `{}` if none) |

**CRITICAL: `headers_json` is REQUIRED even if empty.** Omitting it causes `RuntimeError` from `system_tree_return_v1` at runtime — the run fails with `run_results_error` and a `Handler Error` in the error queue. Always include `{"id": "headers_json", "value": "{}"}` in the parameters. This has caused repeated debugging sessions.

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

> **Runtime gotcha: the `number` parameter must be declared on the node even when `type` is `"All"` or `"Any"`.** The handler definition marks `number` as `required: false` (and only relevant for `type: "Some"`), but at runtime the engine raises `UnknownVariableError raised by the "system_join_v1" handler` if `number` is absent from the node's parameter list. Declare it with empty `value: ""` to satisfy the runtime. This is one instance of a broader handler-parameter-declaration pattern — see "Optional Handler Parameters May Need to Be Declared" further down. The cleanest source-of-truth for any handler is to fetch an existing working tree using that handler and copy its parameter shape verbatim — including `dependsOnId`/`dependsOnValue` metadata.

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

**CRITICAL: include the `number` parameter even when `type=All`.** The handler reads `number` unconditionally; if the parameter is absent from the node it raises `UnknownVariableError` ("The 'End Loop' node could not be executed...") and the loop never initializes. Leave it empty for All/Any:
```xml
<parameter id="type" ...>All</parameter>
<parameter dependsOnId="type" dependsOnValue="Some" id="number" label="Number:" menu="" required="false" tooltip="If some, how many?"></parameter>
```

**Critical:** Loop iterations execute **in parallel**, not sequentially. There is no `for` loop or `do while` concept. For sequential processing, use recursive routines instead.

**Critical: Loop connector pattern.** The loop_head MUST have **two outgoing Complete connectors**:
1. To the loop **body** (the nodes that execute per iteration)
2. Directly to the **loop_tail** (so the engine knows where the loop ends)

The loop body nodes also connect to the loop_tail. This means the loop_tail receives connectors from BOTH the loop_head AND the last body node. Without the direct `loop_head -> loop_tail` connector, the engine cannot properly track loop completion.

```
loop_head ──→ body_node ──→ loop_tail
    │                           ↑
    └───────────────────────────┘  (direct connector)
```

**CRITICAL: a branching loop body must reconverge through a single `system_junction_v1` before the tail.** The loop_tail must receive exactly TWO incoming connectors: the direct one from loop_head, and ONE from the body. If the body branches conditionally (e.g. needs-patch vs no-change) and BOTH branch endpoints connect directly to the tail (3+ feeders), the tail handler raises `RuntimeError` during loop setup and no iterations run. Insert a `system_junction_v1` ("Merge", no params) that all body branches connect to, then junction → tail:
```
loop_head ──→ compute ──[needs patch]──→ patch ──┐
    │              └──────[no change]────────────→ junction ──→ loop_tail
    └─────────────────────────────────────────────────────────────↑
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
       {"id": "type", "value": "All"},
       {"id": "number", "value": ""}
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

**Verified deferral/approval pattern:**

1. **Request form workflow** (on Submission Submitted, with filter `values('Status') == "Open"`):
   - **Update submission status** to "Pending Approval" (via Connection/Operation for submission update)
   - **Create approval submission** (`defers: true, deferrable: true`) — creates a Draft on an approval form with the deferral token (`<%= @task['Deferral Token'] %>`) stored in a field. The node pauses here.
   - **After deferral completes** → update the original submission status based on the decision from deferred results

2. **Approval form workflow** (on Submission Submitted):
   - **Complete the deferral** via `utilities_create_trigger_v1` — reads the token from `@values['Deferral Token']` and passes the decision as deferred variables
   - **Close the approval submission** (transition to `coreState: "Closed"`) — best practice, don't leave approvals in Submitted forever

The API calls in both workflows (update submission, create submission) should use `system_integration_v1` with Connection/Operation pairs. The specific operations are implementation-specific — create them on your Kinetic Platform connection as needed for your use case.

**Deferred task status:** Shows as `"Work In Progress"` in the runs API (not `"Deferred"`). The presence of a `token` on the task confirms deferral. After completion, status changes to `"Closed"`.

**Deferred results access:** After the Complete trigger fires, subsequent nodes can access deferred results via `@results['Node Name']`. The results are the handler's original results merged with the deferred_variables XML.

### Integration Handler — `system_integration_v1` (Preferred)

Executes a Connection/Operation pair. **This is the preferred handler for all API calls in workflows** — both to external systems and to the Kinetic Platform itself.

**Static parameters (always required):**

| Parameter ID | Description |
|-------------|-------------|
| `connection` | Connection UUID |
| `operation` | Operation UUID |

**Dynamic parameters — `parameters.<Input Name>`:**

Each operation defines inputs (path variables, body fields, query params). These become additional node parameters with the `parameters.` prefix. The parameter ID is `parameters.<name>` where `<name>` matches the operation's input name exactly.

Example — an "Update Submission" operation with path `/submissions/{{Submission Id}}` and body inputs:

```json
{
  "parameters": [
    {"id": "connection", "value": "<connection-uuid>"},
    {"id": "operation", "value": "<operation-uuid>"},
    {"id": "parameters.Submission Id", "value": "<%= @submission['Id'] %>"},
    {"id": "parameters.Values [Object]", "value": "{\"Status\": \"Pending Approval\"}"},
    {"id": "parameters.Core State", "value": "Closed"}
  ]
}
```

ERB expressions work in parameter values — use them to inject workflow context (`@submission`, `@values`, `@results`, `@task`).

**ERB parameter values must be ASCII-safe.** Non-ASCII characters in parameter ERB — em-dash (`—`), en-dash (`–`), smart quotes (`"` `"` `'` `'`), ellipsis (`…`), accented letters from external API responses — cause `Encoding::UndefinedConversionError` at evaluation time. The Task engine's ERB context appears to default to US-ASCII for parameter values. Sanitize before substitution: `gsub(/[—–]/, '-')`, `gsub(/[""]/, '"')`, or transliterate via `String#unicode_normalize` + ASCII-only filter. Hits often when interpolating user-typed strings or external API content (e.g., country names, vendor descriptions) into a node parameter.

**Results:** Depend on the operation's output mapping. Common outputs: `Id`, `_Error`, `_Status Code`.

**Approach:**
1. Create a Connection in the Integrator (defines the target system, auth, base URL)
2. Create Operations on the connection (each defines method, path with `{{param}}` placeholders, body template, input/output mappings)
3. In the workflow node: set `connection` and `operation` UUIDs, then add `parameters.<name>` entries for each operation input

The connections, operations, and their UUIDs are implementation-specific — you create them based on what your workflows need. The Integrator admin console or API (`/app/integrator/api/connections/{id}/operations`) manages them.

**Why this over direct API handlers:**
- Operations are reusable across workflows — define once, use everywhere
- Dynamic inputs are named and typed (not raw method/path/body)
- Authentication managed by the connection (OAuth, API keys, Basic Auth)
- Visible and manageable in the admin console
- Changing an API endpoint updates all workflows using that operation

See the Integrations concept skill (`concepts/integrations`) for Connection/Operation setup.

### API Handler — `kinetic_core_api_v1` (Legacy — Avoid)

Makes REST API calls to Kinetic Core. **Do NOT use for new workflows.** Use `system_integration_v1` with Connections/Operations instead. This handler is being retired.

Configured with `api_username`, `api_password`, `api_location` properties.

| Parameter ID | Name | Required | Menu | Description |
|-------------|------|----------|------|-------------|
| `error_handling` | Error Handling | Yes | `Error Message,Raise Error` | How to handle errors |
| `method` | Method | Yes | `GET,POST,PUT,PATCH,DELETE` | HTTP method (defaults to GET) |
| `path` | Path | Yes | — | API path relative to `api_location` (e.g., `/kapps/:kappSlug/forms/:formSlug`) |
| `body` | Body | No | — | JSON body for POST/PUT/PATCH |

**Results:** `Response Body`, `Response Code`, `Handler Error Message`

**Single-submission GET/PATCH path:** use the top-level `/submissions/{id}` (the handler prepends `/app/api/v1`). The form-scoped path `/kapps/{kapp}/forms/{form}/submissions/{id}` returns **HTTP 404** for a single submission — only the list/query variant (`/kapps/.../forms/.../submissions?q=...`) works form-scoped. A `PATCH /submissions/{id}` with `{"values":{...}}` patches values without triggering field validations, core-state conditions, or webhooks.

**`Response Code` is returned as a String, not an Integer.** Connector value expressions and ERB comparisons must coerce with `.to_i` or compare against a string literal:

```ruby
# Works
@results['API']['Response Code'].to_i == 200
@results['API']['Response Code'] == '200'

# Silently false (Response Code is the string "200", not the integer 200)
@results['API']['Response Code'] == 200
```

The same applies to `Response Code` results from `system_integration_v1` and other HTTP-style handlers.

**`path` is appended to the `api_location` info-value, not used standalone.** The handler builds the request URL as `api_location + path`. If `api_location` is misconfigured (blank, missing scheme, etc.), the URL falls apart and the handler fails with errors like `NoMethodError: undefined method 'include?' for nil:NilClass at addr_port`. Always confirm `api_location` is set to the full API base (`https://<host>/app/api/v1`) before debugging path-level issues.

**Usernames containing `@` need to be URL-encoded in `path`.** Email-style usernames (e.g., `jane.doe@example.com`) appearing in the path — common when calling user-scoped endpoints like `/users/{username}` — must be encoded with `URI.encode_www_form_component`, otherwise the `@` is parsed as a userinfo separator and the request fails. ERB pattern: `<%= "/app/api/v1/users/" + URI.encode_www_form_component(@values['Requestor Username']) %>`.

**`coreState` is not enforced on submission writes.** `PATCH /submissions/{id}` and `PUT /submissions/{id}` issued through this handler will mutate `values` on a Closed submission with HTTP 200, no error, and no Handler Error Message. If your workflow depends on Closed records being immutable, layer that protection in via a security policy or a connector-value check against `coreState` before the API node — the handler will not block it. See `architectural-patterns/SKILL.md` "Closure Is Not a Write Lock" for the full pattern.

#### `error_handling` Parameter Behavior — `Error Message` vs `Raise Error`

Multiple handlers (`kinetic_core_api_v1`, `smtp_email_send_v1`, others) have an `error_handling` parameter with menu values `Error Message` and `Raise Error`. The choice changes whether handler failures halt the workflow:

- **`Raise Error`** — handler failure raises an error the engine treats as a node failure. The node's task status goes to an Error/Failed state, the run lands in the error queue, downstream connectors do not fire. Recovery requires `POST /errors/resolve`.
- **`Error Message`** — handler failure is captured into the node's `Handler Error Message` result. **The node still completes (`status: "Closed"`), and downstream connectors fire normally** — the workflow continues past the failure with no error queue entry. The error message is in `@results['Node Name']['Handler Error Message']` for downstream nodes to inspect.

`Error Message` is a deliberate design lever: notification side-effects (an SMTP send to an unreachable server, a webhook POST that times out) typically shouldn't halt an approval workflow. But the behavior is easy to misread if you assume handler errors always stop progression. To stop progression when the handler fails, set `Raise Error`, OR leave `Error Message` and gate the next connector on the empty-check:

```ruby
# Connector value — only proceed if the handler did NOT error
@results['Send Email']['Handler Error Message'].to_s.empty?
```

This pattern is widely used in routine-composed workflows where the API-call node uses `Error Message` and the success branch is gated on the empty check.

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

**Watch out for non-ASCII characters in subject and body.** Email subjects and message bodies are likely places for users to embed pretty Unicode — em-dashes (`—`), en-dashes (`–`), smart quotes (`"` `"` `'` `'`), ellipsis (`…`). These cause `Encoding::CompatibilityError` at runtime. See the ASCII-safe ERB note in the integration-handler section above.

**Tip:** Use `include=parameters,results` on the handlers API to discover parameters for any handler: `GET /handlers/{definitionId}?include=parameters,results`

### Optional Handler Parameters May Need to Be Declared

Handler metadata's `required: false` flag and runtime tolerance can diverge. A node may need to declare ALL parameters listed in the handler definition — including the optional ones — with empty value, even when those parameters wouldn't logically apply. Omitting an optional parameter from the node can cause the handler to raise `UnknownVariableError` at evaluation time, with the workflow stalling on the affected node.

Observed cases (verified May 2026):
- **`system_join_v1`** — `number` parameter (the count for `type: "Some"`). Required at runtime even when `type` is `"All"` or `"Any"`. Declare as `value: ""`.
- **`smtp_email_send_v1` and `smtp_email_send_v2`** — `bcc` and `htmlbody` parameters (both `required: false` in handler def). When omitted from the node, the handler raises `UnknownVariableError`; declaring both with `value: ""` resolves it. This is an ERB-evaluation failure that fires before the handler's `error_handling: "Error Message"` catch can engage, so even with the catch enabled, missing optional ERB parameters halt the run. Verified May 2026 — v1 and v2 behave identically on this case.

Until a handler is verified to tolerate omitted optional parameters, **declare every parameter listed in the handler definition on the node**, supplying empty value for ones that don't apply. Fetch the handler definition (`GET /handlers/{definitionId}?include=parameters`) to enumerate the full parameter list; the canonical source-of-truth for parameter-shape conventions is any existing tree on the platform that uses the handler.

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

**CRITICAL: a routine-call node must set `defers: true` and `deferrable: true` to capture the routine's returned results.** A Global Routine call (`system_tree_call`) spawns a child run. With `defers: false`, the calling node fires the routine and immediately continues — the routine's declared `<results>` are NOT merged onto the node before its dependents/parameters evaluate. The node's results show only `{Run Id, Source Id, Tree Id}`, and any downstream `@results['<Call Node>']['<ResultName>']` raises **`IndexError`** (the routine returns the value, just too late). With `defers: true` the node waits for the child run and merges the returned results, so `@results['<Call Node>']['<ResultName>']` is available to all downstream nodes. Returned result names come from the routine's `<results><result name="X">` plus a `system_tree_return_v1` node that populates them.

#### `routine_kinetic_submission_update_v1` — PUT Wrapper

The Submission Update routine internally calls `kinetic_core_api_v1` with `method: PUT, path: /submissions/{Id}`. The body assembles conditionally from populated inputs — `{currentPage, origin, parent, values, coreState}` keys appear only when the corresponding inputs are set; unset inputs are omitted rather than nulled. Two consequences worth knowing:

- **It's a PUT, not a PATCH.** Don't reach for this routine expecting PATCH semantics (custom timestamps, validation-free writes, the documented PATCH-specific behaviors in `api-basics`). For those, use `kinetic_core_api_v1` with `method: PATCH` directly against `/submissions/{id}`.
- **It does not enforce `coreState`.** The routine will mutate `values` on a Closed submission with no error. Same caveat as direct `kinetic_core_api_v1` calls — see "Closure Is Not a Write Lock" in `architectural-patterns/SKILL.md` if you need write protection on closed records.

The routine spawns a child run. The parent task's `results` contain a `Run Id` pointing at the child run; to inspect what the routine actually did from a debugging context, follow that to `/runs/{child-id}/tasks` and read the inner `kinetic_core_api_v1_1` task's `Response Body`, `Response Code`, and `Handler Error Message`. Verified May 2026 across a 12-cell submission-write characterization.

#### Error-Handling Pattern Inside Routines

Frequently observed across kinetic-shipped routines that wrap Core API calls: the API node has three Complete connectors that branch on the result, with `routine_handler_failure_error_process_v1` on the error path. The shape:

```
start → API call (kinetic_core_api_v1 or similar)
              │
              ├ Complete  [@results['API']['Handler Error Message'].to_s.empty?]
              │   → return success
              │
              ├ Complete  [!@results['API']['Handler Error Message'].to_s.empty? && Response Code != 404]
              │   → routine_handler_failure_error_process_v1
              │   → recursive retry (routine calls itself)
              │   → return-from-error
              │
              └ Complete  [!@results['API']['Handler Error Message'].to_s.empty? && Response Code == 404]
                  → return special "does not exist" result
```

Notes from observed traffic:
- All routing uses Complete connectors. Error-vs-success is decided by Ruby `value` expressions, not by separate connector types.
- `routine_handler_failure_error_process_v1` takes no parameters in observed cases — invoked with default config.
- The recursive retry is structural: after the error routine logs/processes, control passes to a fresh invocation of the same routine (e.g. inside `Submission_Update`, the retry node is `routine_kinetic_submission_update_v1`).
- Customer-facing form workflows in observed traffic invoke this error routine **zero times directly** — the error handling lives inside the standard `routine_kinetic_*` library, and composing those routines inherits it. Flag this when reading or generating workflows: if a customer tree directly invokes `routine_handler_failure_error_process_v1`, that's unusual and worth understanding why.

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

### Node ID Conventions

Node IDs follow the canonical format `{definition_id}_{N}`, where `N` is taken from a single monotonically-incremented `lastID` counter shared across ALL nodes in the tree. Each new node increments `lastID` and uses the new value as its `_N` suffix:

```
EXAMPLE: start, utilities_echo_v1_2, system_wait_v1_3, smtp_email_send_v1_4
```

The `lastID` (in the tree's top-level metadata) should equal the highest suffix used.

**The Start node is the one structural exception.** Its id is the literal string `"start"`, not the canonical `{definition_id}_{N}` form. Every working tree on the platform — Console-built or programmatically generated — uses `id: "start"` for the `system_start_v1` node. The engine looks up the tree's entry point by exact match on `"start"`. Without that literal id, the initial `BranchHeadTrigger` fails with `java.lang.RuntimeException`, surfacing as an `Unidentified Error` in `/errors` (no `relatedItem2Id` on the error record), and the run spawns zero tasks. Observed: three submissions in a row failed identically with `system_start_v1_1` as the Start id; switching to literal `"start"` and updating connector references resolved cleanly. The canonical `{definition_id}_{N}` rule applies to every other node in the tree.

Two failure modes to keep in mind:

**Numeric suffix collision** — if two nodes end up with the same `_N` (e.g., `system_start_v1_1` and `utilities_echo_v1_1`), the Console workflow builder silently drops one of them. The canonical format avoids this by construction when `lastID` is incremented monotonically; collisions usually arise from hand-edited XML or programmatic generation that doesn't share a counter across handler types.

**Non-canonical IDs and alpha suffixes** — IDs that don't follow `{definition_id}_{N}` (e.g., custom shorthand like `n1`, `n2`, `n13a`, `n13b`), or that use alpha suffixes for branch disambiguation (`n14a`/`n14b` to distinguish parallel branches' close nodes), break the Console workflow builder. The builder strips trailing alpha characters and dedupes by the resulting numeric key — `n13a` and `n13b` both reduce to `n13`, and only one renders. **The runtime engine does NOT have this issue**: the engine processes treeJson IDs as opaque strings and runs all nodes correctly. A tree can pass behavioral tests end-to-end while showing only a fraction of its nodes when opened in the Console.

(Observed: an 18-node workflow with non-canonical IDs `n1`, `n2`, `n13a`, `n13b`, `n14a`, `n14b`, etc. ran all 18 nodes correctly across two test paths; the Console builder displayed 1 node — the last `n14b` survived the dedupe.)

**Leading zeros in numeric suffixes are runtime-tolerated but Console-hostile.** `utilities_echo_v1_01`, `_001`, and `_0001` all PUT 200 and execute cleanly through the engine — the runtime treats node IDs as opaque strings, and earlier May 2026 testing verified this on simple Start → Echo flows. However, **the Kinetic Console workflow builder normalizes leading-zero suffixes to canonical form on save** (`_01` → `_1`). If any other node in the tree shares that canonical suffix (e.g., `routine_kinetic_submission_update_v1_1` coexisting with `utilities_echo_v1_01`), normalization triggers the numeric-suffix collision above and one of the colliding nodes is silently dropped during the Console's re-serialization. The dropped node's incoming and outgoing connectors may get merged into the surviving node, producing a tree that PUTs/GETs clean but executes broken paths.

Verified May 2026: a two-stage approval workflow was built with `routine_kinetic_submission_update_v1_1` (Set Status) and `utilities_echo_v1_01` (Coalesce) as a deliberate leading-zero peer pair. The tree ran clean through E2E approve+approve and approve+deny test cycles. Some days later, after the tree was opened in the Console builder, the routine update node had been collapsed into the echo node — start's outgoing connector pointed at the echo, the routine update node had vanished, and the workflow halted on a `NoMethodError` because the echo's `input` ERB read from a Stage 1 result that hadn't run yet. The Task API preserves no version diff history, so the corrupted state was only diagnosable by comparing the live tree to the original build artifacts.

**Rule:** use canonical `_N` form (no leading zeros) for every node in any tree that might be opened in the Console. Treat the runtime's leading-zero tolerance as a debugging convenience, not a usable pattern.

**Practical guidance:**
- Use the literal `"start"` for the Start node's id — never `system_start_v1_1` or any other canonical-form variant. Connectors and `dependents` references to the start node must also use `"start"` exactly.
- For programmatic tree generation, follow the canonical `{definition_id}_{N}` pattern with a single shared `lastID` counter.
- Avoid alpha suffixes for branch disambiguation. Use distinct numeric IDs even for symmetric branches (`system_integration_v1_13` for one branch's close node, `system_integration_v1_14` for the other's).
- When validating a tree's IDs programmatically, allow `"start"` as the only non-canonical id; require canonical format on every other node.
- A tree that runs correctly but renders incompletely in the Console builder is almost always an ID-format issue. Fetch a Console-built tree's treeJson to see the format the builder expects, or compare a working tree's IDs to a misbehaving tree's.

### Orphaned Echo Nodes as Notes

A `utilities_echo_v1` node placed in the tree with **no incoming and no outgoing connectors** serves as inline workflow documentation. The engine accepts the node as part of the tree definition, displays it in the Console builder, and ignores it at runtime — no task is created when the workflow executes.

**Convention:**
- Name the node `Notes` (or another clear identifier)
- Position above the main flow visually (e.g., `y: -50` so it's separated from the executing nodes)
- `dependents: []` (no outgoing connectors)
- No other node lists this node in its `dependents` (no incoming connectors)
- The `input` parameter contains the documentation prose — multi-line, ASCII-safe, bullet points and section headers welcome

**Example (treeJson shape):**

```json
{
  "definitionId": "utilities_echo_v1",
  "id": "utilities_echo_v1_99",
  "name": "Notes",
  "x": 60, "y": -50,
  "defers": false,
  "deferrable": false,
  "visible": true,
  "parameters": [{"id": "input", "value": "This workflow handles X.\nKey steps:\n- Step 1...\n- Step 2..."}],
  "messages": [],
  "dependents": []
}
```

Verified May 2026 against the Modification Approval workflow: orphan PUT accepted (HTTP 200), persisted intact across GET round-trips, did not generate a task at runtime, did not perturb other nodes' connectors. The pattern is also visible in real customer-exported workflows (Exercises - Workflow 01 - Submitted contains an orphan `utilities_echo_v1` named "Notes" with a multi-line description).

This is the recommended pattern for documenting workflow purpose, key steps, and any non-obvious decisions inline with the tree itself — rather than relying solely on external context docs.

**Verification caveat — trailing newline strip.** The engine strips a single trailing `\n` from `utilities_echo_v1`'s `input` parameter on PUT. Scripts doing byte-identical round-trip verification should trim the trailing newline from the sent value before comparing to the GET response, or expect `len(sent) == len(received) + 1` when the sent value ends in `\n`. Content otherwise round-trips unchanged. Observed May 2026 across all four annotated workflows in a single batch — consistent, not intermittent.

### Deferrable Node Messages

In **treeXml** format, deferrable nodes need three message types:
```xml
<messages>
    <message type="Create"></message>
    <message type="Update"></message>
    <message type="Complete"></message>
</messages>
```
Non-deferrable nodes need only `<message type="Complete">`.

In **treeJson** format, message content is engine-managed: `messages: []` and `messages: [{type: "Create", ...}, ...]` round-trip identically (the engine returns `messages: []` on GET regardless of what was PUT), and deferrable nodes still defer and complete correctly. Verified May 2026 — both shapes PUT 200, and both reached deferred state cleanly. The three-message-types requirement is XML-format-specific; treeJson nodes can omit.

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

> **Triggers API** (querying triggers, run relationship, diagnosing stuck runs) — see `concepts/task-api-reference`.

---

> **Error Management API** (listing/resolving errors, error types, originators) — see `concepts/task-api-reference`.

---

## Runs API

Run IDs are **integers**, not UUIDs. The response includes:
- `source` — the source that triggered the run
- `sourceId` — the submission UUID that triggered it (for form-triggered trees)
- `tree` — embedded tree metadata
- `status` — `Started`, `Completed`, `Failed`

**Note:** Creating submissions on forms that have active workflow trees will automatically generate runs. Plan for this during bulk data creation.

**Note:** Form-triggered workflows (non-WebAPI, non-routine) that have no `system_tree_return_v1` will remain in `Started` status permanently. This is normal — the workflow ran to completion, but the engine only sets `Completed` when a tree_return node executes.

**Run-level status can lag task completion.** Even on workflows that *do* eventually settle to a final status, a run may report `status: "Started"` briefly after all of its tasks have already moved to `Closed`. When verifying that a workflow completed, check the individual task statuses (`tasks[].status`) rather than relying on the run-level `status` field alone — task statuses are the source of truth for "what actually happened."

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
- **Loop tail needs the `number` parameter even for `type=All`** — omitting it raises `UnknownVariableError` and the loop never initializes. Leave it empty for All/Any.
- **A branching loop body must reconverge via one `system_junction_v1` before the tail** — multiple body branches connecting directly to the tail (3+ feeders) raises `RuntimeError` at loop setup. Merge through a junction so the tail has exactly head + one body connector.
- **A routine-call node must be `defers: true`/`deferrable: true` to capture the routine's results** — with `defers: false` the returned `<results>` aren't merged before dependents evaluate, so `@results['Call Node']['Result']` raises `IndexError`.
- **Single-submission GET/PATCH uses top-level `/submissions/{id}`** — the form-scoped `/kapps/.../forms/.../submissions/{id}` 404s; only list/query is form-scoped.
- **JSONPath uses `$[*]` not `$.[*]`** — no dot between `$` and `[`. For nested extraction: `$[*].user.username`
- **`utilities_create_trigger_v1` parameter IDs are lowercase snake_case** — the parameter IDs are `action_type`, `deferral_token`, `deferred_variables`, `message`, NOT the handler's display names (`Action Type`, `Deferral Token`, …). Using the display names causes `UnknownVariableError` at runtime with no clear hint, because the handler simply doesn't find the parameter. This bites on every deferral-resume node and is one of the highest-frequency "looks right, fails at runtime" mistakes. Match the IDs from the handler's `info.xml`, not what shows up in the builder UI.
- **`system_submission_create_v1` has no `values` parameter** — it can create a submission but cannot set field values during creation. If you need to create a submission AND set fields on it (the typical case for deferral-token approval patterns where the child submission needs to carry `Deferral Token` and `Parent ID`), use `kinetic_core_api_v1` with a `POST` to `/kapps/{kapp}/forms/{form}/submissions` and a JSON body containing the values. The Core API node accepts `defers:true,deferrable:true` so it can be the create-and-wait node in a deferral pattern. `system_submission_create_v1` is fine for create-and-forget; reach for `kinetic_core_api_v1` whenever you need values on the new submission.
- **`@values['MissingField']` raises `IndexError`, not nil** — in node ERB, referencing a field that doesn't exist on the form throws at runtime rather than returning nil. This is unlike most templating languages and is easy to forget when reusing a notify-or-work-item ERB block across forms with slightly different schemas. Guard every cross-form field read with `(@values['MaybeMissing'] rescue nil)` or `@values.fetch('MaybeMissing', nil)`. The `rescue nil` idiom is the prevailing convention in customer trees and is worth adopting for any ERB that runs against multiple form shapes.
