---
name: workflow-engine
description: Kinetic Platform workflow engine concepts, execution model, Task API v2 reference, observed response formats, run status derivation, tree type classification, stuck run repair, and lessons learned for building workflow UIs.
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

**`@space`, `@kapp`, `@form`, `@submission`, `@values` etc. are all Ruby Hashes — access via bracket notation, not method calls.** Calling `@space.url` throws `NoMethodError: undefined method 'url' for #<Hash:...>` and halts the parameter evaluation. Use bracket notation: `@form['Slug']` not `@form.slug`, `@submission['Id']` not `@submission.id`, `@kapp['Name']` not `@kapp.name`. The Hash key names are Capitalized words like "Slug", "Id", "Name" — see the full ERB context table earlier in this document for the canonical key names.

**Attributes live in their OWN top-level binding hashes — not nested under `@space['attributes']`.** This is a common mistake:

```ruby
# WRONG — @space has only Name/Slug; there's no 'attributes' key
@space['attributes']['Web Server Url']    # raises IndexError "Unable to retrieve hash value for the key \"attributes\""
@space.url                                # NoMethodError (Hashes don't have .url method)

# CORRECT — attributes are exposed as separate top-level bindings
@space_attributes['Web Server Url']
@kapp_attributes['Service Portal Kapp Slug']
@form_attributes['Manager User Attribute']
@submitter_attributes['Manager']          # attributes of the user who submitted
```

**Discover what bindings are available** on a specific workflow via:
```
GET /app/api/v1/kapps/<kapp>/forms/<form>/workflows/<id>?include=details
```
The response's `bindings` field shows every binding name + template. Look for groups like `Space Attributes`, `Kapp Attributes`, `Submitter`, `Submitter Attributes`, etc. — each maps to its own `@xxx_attributes` binding.

**Do NOT hardcode environment-specific values** (URLs, kapp slugs, system endpoints) as a "temporary" workaround when the binding mechanism isn't working. A hardcoded `https://my-dev-host.example.com` in a workflow template will travel with the workflow on import/export and silently break (or send users to the wrong host) when promoted to staging/prod. The fix is to discover and use the correct binding — or to add a missing attribute to the space/kapp/form so the binding has something to return.

**`@submitter` is `nil` in workflow ERB context — use `@submission['Submitted By']` instead.** Despite appearing in some documentation, the bare `@submitter` variable does NOT resolve in event-triggered workflows. Using it as `<%= @submitter %>` returns empty string, so any integration parameter built from it (e.g., `parameters.Username: <%= @submitter %>` for a Get User lookup) gets called with an empty argument and returns empty results — without raising an error.

```ruby
# WRONG — @submitter evaluates to nil in the workflow ERB context
parameters.Username = <%= @submitter %>             # passes empty string to integration

# CORRECT — these are populated by the form-submitted event
parameters.Username = <%= @submission['Submitted By'] %>   # who submitted this submission
parameters.Username = <%= @submission['Created By'] %>     # who created the draft
parameters.Username = <%= @values['Requested For'] %>      # if the form has a "Requested For" field (typical for access-request flows)
```

Diagnostic technique: add a `utilities_echo_v1` (Echo) node temporarily, with `input` set to e.g. `SUBMITTER=<%= @submitter.inspect %> | SUBMITTED_BY=<%= @submission['Submitted By'].inspect %>` — then read its `results.output` via `GET /runs?...&include=tasks` to see exactly what's populated.

**Routine call nodes need `defers: true` if you want to consume their declared `<results>` downstream.** When you invoke a Global Routine (like `Submission Retrieve`, `Submission Update`, etc.) as a node in your workflow, the routine spawns a sub-run. If the calling node is configured with `defers: false`, the parent run advances immediately and `@results['<Routine Node Name>']` only contains meta fields (`Run Id`, `Source Id`, `Tree Id`) — not the routine's declared output results. The actual outputs live on the sub-run's "Return Results" task and propagate to the parent only after the sub-run closes.

```json
{
  "name": "Retrieve Original SAAR",
  "definitionId": "routine_kinetic_submission_retrieve_v1",
  "defers": true,            // ← REQUIRED to receive Values JSON / Form Slug / etc.
  "deferrable": true,
  "parameters": [
    { "id": "Id", "value": "<%= @values['Original SAAR Submission Id'] %>" }
  ]
}
```

Then downstream nodes can access the routine's outputs:
```ruby
@results['Retrieve Original SAAR']['Values JSON']    # JSON string of submission's values
@results['Retrieve Original SAAR']['Form Slug']      # which form the submission belongs to
@results['Retrieve Original SAAR']['Exists']         # whether the submission was found
```

If `defers: false` is used on a routine call, the downstream nodes see empty / meta-only results — leading to silent failures (integration calls with empty params, JSON.parse on empty strings, etc.). Common naming pattern for the routine node `id` field: `<definitionId>_<num>` (e.g., `routine_kinetic_submission_retrieve_v1_25`). The numeric suffix can be any unique value within the tree but the convention is to increment from `lastId`.

**Dynamic email templates pattern** — to keep email subjects/bodies in a separate template form (e.g., `notification-template` with fields `Name`, `Subject`, `Body`) rather than hardcoded in workflow nodes:

1. **Per email**, add a `kinetic_core_api_v1` lookup node BEFORE the email node:
   ```json
   {
     "definitionId": "kinetic_core_api_v1",
     "name": "Fetch Template (My Template Name)",
     "defers": false,
     "parameters": [
       {"id": "method", "value": "GET"},
       {"id": "path",
        "value": "/kapps/datastore/forms/notification-template/submissions?include=values&limit=1&q=values[Name] = \"My Template Name\""}
     ]
   }
   ```

2. **In the email node's `subject` and `htmlbody`**, use ERB to parse the response and substitute `{{Placeholder}}` tokens:
   ```erb
   <%
   tmpl_response = (JSON.parse(@results['Fetch Template (My Template Name)']['Response Body']) rescue {})
   tmpl_subs = (tmpl_response['submissions'] || [])
   tmpl_body = tmpl_subs.length > 0 ? (tmpl_subs[0]['values'] || {})['Body'].to_s : ''
   tmpl_body = tmpl_body.gsub('{{Requestor Name}}', @values['Requested For Name'].to_s)
   tmpl_body = tmpl_body.gsub('{{SAAR URL}}', @space_attributes['Web Server Url'] + '/kapps/.../' + @submission['Id'])
   tmpl_body_html = tmpl_body.gsub("\n", '<br>')
   %><%= tmpl_body_html %>
   ```

This separates content from logic: business users can edit email copy without touching the workflow tree. Placeholders use `{{X}}` (mustache-style) to be obvious in the template editor and not collide with ERB `<%= %>` syntax in the workflow.

**Always wrap `JSON.parse` of integration results in `rescue`** — integration result fields can be empty string, nil, or malformed JSON depending on whether the lookup found anything. A bare `JSON.parse('')` throws `JSON::ParserError: unexpected token at ''` and the connector fails to evaluate, halting the workflow. Defensive pattern:

```ruby
# BAD — crashes when Attributes is empty/nil/malformed
JSON.parse(@results['Get Requestor']['Attributes'])['Manager']

# GOOD — degrades to empty hash on any parse failure
(JSON.parse(@results['Get Requestor']['Attributes'].to_s) rescue {})['Manager']
```

The `rescue {}` modifier returns an empty hash on ANY exception (parser error, nil method, etc.), letting subsequent `['Manager']`, `.first`, `.to_s` chain operations continue safely (eventually evaluating to `nil`/empty as appropriate). This is critical for connector expressions because they fire BEFORE any error-handling node can intercept — a crashed connector halts the branch outright.

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

**Full ERB context (verified by debug dump on live engine):**

Event-triggered workflows (Submission Created/Updated/Submitted):

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

WebAPI trees have additional variables: `@request`, `@request_body_params`, `@request_headers`, `@request_query_params`, `@requested_by`.

Common expressions:
```ruby
# WHO created/submitted/updated
<%= @submission['Created By'] %>
<%= @submission['Submitted By'] %>
<%= @submission['Updated By'] %>

# WHAT form and kapp
<%= @form['Slug'] %>        # e.g. "leads"
<%= @form['Name'] %>        # e.g. "Leads"
<%= @kapp['Slug'] %>        # e.g. "crm"

# FIELD values
<%= @values['Status'] %>
<%= @values['Priority'] %>

# ALL values as string
<%= @values.map{|k,v| "#{k}=#{v}"}.join(', ') %>

# DETECT field changes (Submission Updated only)
<%= @values['Status'] != @values_previous['Status'] %>
```

**Debugging technique — dump all ERB variables:**
Create an Echo node right after Start with this input to see every variable available:
```erb
<% vars = instance_variables.map { |v|
  name = v.to_s
  val = instance_variable_get(v)
  keys = val.respond_to?(:keys) ? val.keys.join(', ') : val.to_s[0..200]
  "#{name} [#{val.class}] = #{keys}"
}; %><%= vars.join(' || ') %>
```
This dumps variable names, types, and hash keys. Check the Echo node's `output` result in Activity Monitor.

**ERB Hash access pitfall:** In the Task engine ERB context, Ruby Hash `[]` raises `IndexError` for missing keys (unlike standard Ruby which returns `nil`). Always use `.fetch('key', 'default')` for optional parameters:
```ruby
# BAD — raises IndexError if key missing:
<%= @request_query_params['personId'] %>

# GOOD — returns empty string if missing:
<%= @request_query_params.fetch('personId', '') %>
```

**Note:** `@values['FieldName']` does NOT raise IndexError for missing fields — all form fields are present in `@values` (with empty string for unfilled fields). The `.fetch` pattern is needed for `@request_query_params`, `@request_headers`, and other hashes where keys are not guaranteed.

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
- **Form Events:** Form Created/Updated, Submission Created/Submitted/Updated/Closed/Deleted

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

### Queue Task Pattern (Parent Workflow ↔ Child Submission Deferral)

The canonical pattern for "create a child submission, wait for someone to approve/decision it, then continue" in Kinetic Service Portal apps. Used for endorsement chains, approval routing, multi-stage tasks.

**The end-to-end flow:**

1. **Parent workflow** calls a "Queue Task Create" routine (typically `routine_queue_task_create_with_custom_activity_label` or `routine_queue_task_create`) with `defers: true`. The routine internally:
   - Creates a Draft child submission via `system_integration_v1` Submissions Create, passing values including a generated `Deferral Token` field
   - (Optional) Creates an Activity record on the originating submission so the requestor sees the pending task
   - Hits a `Retrieve Submission` node with `defers: true` that waits on the Deferral Token
   - When the deferral is Completed, retrieves the now-Submitted child submission and returns `Fields JSON` (all child values) + `Submission Id` to the parent
2. **Child queue task form** must have:
   - A `Deferral Token` field (the routine stamps a token into it during creation)
   - Form attribute `"Custom Submission Workflow": ["Submitted"]` so the submission-submitted workflow fires
   - A `submission-submitted` workflow tree (see below)
3. **Child's submission-submitted workflow** fires when the approver/assignee submits the queue task. It must complete the parent's deferral:

```json
{
  "name": "Complete Deferral",
  "definitionId": "utilities_create_trigger_v1",
  "parameters": [
    { "id": "action_type",        "value": "Complete" },
    { "id": "deferral_token",     "value": "<%= @values['Deferral Token']%>" },
    { "id": "deferred_variables", "value": "<%= \"<results><result name=\\\"Fields JSON\\\">#{@values.to_json}</result></results>\" %>" },
    { "id": "message",            "value": "" }
  ]
}
```

4. **Parent reads child decision** via `JSON.parse(@results['<Stage Node Name>']['Fields JSON'])['Decision']` on outgoing connectors:

```
"value": "JSON.parse(@results['Part II']['Fields JSON'])[\"Decision\"].to_s.downcase != \"denied\""
```

**Critical gotchas in this pattern:**

- **Routine must wire `Return` off the deferred `Retrieve Submission` node's Complete output.** Common breakage: `Return` is wired off `Submission Create` (the synchronous create step) — routine fires Return immediately with empty/Draft values, parent sees `Decision == ""` and takes whichever branch matches empty. Fix: trace the routine in Task admin; ensure the path is Start → Submission Create → (optional Activity Create) → Retrieve Submission [defers] → Return.
- **`Custom Submission Workflow` form attribute is mandatory.** Without it, no submission-submitted workflow fires, the trigger is never sent, the parent's deferral never completes, and the workflow hangs forever.
- **Multiple `.json` files in `workflows/submission-submitted/` ALL fire** — there's no "primary" workflow. If a legacy tree sits next to the active one, both run on every submit, often creating duplicate child stages or duplicate completions. **Delete legacy workflow files** rather than relying on them being ignored.
- **`system_integration_v1` Submission Update's `parameters.Values` must be valid JSON** — empty string `""` fails with `HTTP 400 "Unable to parse JSON content."` Use `"{}"` (empty JSON object literal) when you want to update other fields (e.g., Core State) without modifying values.
- **Don't reuse a child submission across parent runs** — the Deferral Token in the child is tied to the specific parent run that created it. Re-submitting an old child sends the trigger to a parent run that may already be Complete or Error, and the new parent run never gets the signal. Always trigger a fresh parent submission for end-to-end testing.

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
3. **Engine-level retry** — built-in resolution actions on failed nodes/connectors

**Error types and valid resolution actions:**

| Error Type | Valid Actions | Description |
|---|---|---|
| **Handler Error** | Retry Task, Skip Task, Do Nothing | Handler execution failed |
| **Node Parameter Error** | Retry Task, Skip Task, Do Nothing | ERB expression in node parameter failed to evaluate |
| **Connector Error** | Continue Branch, Cancel Branch, Do Nothing | Ruby condition on a connector failed to evaluate |
| **Missing Handler Error** | Retry Task, Skip Task, Do Nothing | Handler definition not found |
| **Source Error** | Do Nothing | Source system unavailable |
| **Tree Error** | Do Nothing | Tree definition problem |
| **Unidentified Error** | Do Nothing | Engine-level crash (e.g., java.lang.RuntimeException) |

**Connector Error resolution:**
- **Continue Branch** — treat the connector condition as `true` (proceed down this path)
- **Cancel Branch** — treat the connector condition as `false` (do not take this path)
- These are different from handler errors because a connector is not a task — it's a routing decision

**Bulk error resolution API:**
```
POST /errors/resolve
{ "ids": [1, 2, 3], "action": "Do Nothing", "resolution": "Description of fix" }
```

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

### Debugging Handlers: Read the Source

Handlers in a space export live as `.zip` files under `task/handlers/`. Unlike routine XML exports (which can be stale/placeholder content — see "Export integrity" below), **handler zips are accurate** and contain the actual Ruby + XML the engine runs. When a handler throws a cryptic error, unzip and read `handler/init.rb` and `process/info.xml` directly — Ruby is straightforward and tells you the actual URL/auth/payload construction.

**Example: `kinetic_core_api_v1` `addr_port` error.** The fingerprint `NoMethodError: undefined method 'include?' for nil:NilClass at addr_port` from this handler always means the URL has no host. The handler source (`init.rb`) builds the URL as:

```ruby
@api_location = @info_values["api_location"]
@api_location.chomp!("/")
api_route = "#{@api_location}#{@path}"
RestClient::Request.execute(method: @method, url: api_route, ...)
```

The handler has **no per-task URL override** — the only parameters are `error_handling`, `method`, `path`, `body`. The URL prefix is always `@info['api_location']`. If `api_location` is empty string or scheme-less (e.g., just `/app/api/v1` with no `https://host`), `api_route` parses to a hostless URI and Net::HTTP errors at `addr_port` when checking `host.include?(":")` for IPv6.

**Fix:** Set the handler's `API Location` info value to a full URL like `https://your-host.example.com/app/api/v1` in Task admin → Settings → Handlers → `kinetic_core_api_v1`.

This pattern generalizes: when a handler errors, the fastest path to root cause is reading 50 lines of Ruby in `init.rb` — not guessing at config from the outside.

### Export Integrity Warning

The Kinetic Task **routine XML export is known to produce stale placeholder content** in some configurations. Symptom: every file in `task/routines/*.xml` is the same byte size and contains an identical, unrelated tree (e.g., "Employee Offboarding Submitted") regardless of what the routine actually does on the server. When this happens, the export is useless for diagnosing routine bodies — the Task admin UI is the source of truth. Handler zips are NOT affected by this bug.

**Quick check:** `ls -la task/routines/*.xml` — if all sizes are identical, the export is stale.

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

**Critical: Component Path vs Direct Path for Routine Creation**

| Path | Inputs/Outputs | treeJson |
|------|---------------|----------|
| `/app/components/task/app/api/v2/trees` | **Works** — saves `taskDefinition` | Works |
| `/kinetic-task/app/api/v2/trees` | **Silently dropped** | Works |

The component path (`/app/components/task/...`) is what the Kinetic Console uses internally. The direct path (`/kinetic-task/...`) does NOT support `inputs`/`outputs` on POST — they are silently ignored, producing a routine with no public interface. **Always use the component path for routine creation.**

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

### Architecture: Core vs Task

The Workflow Engine (Task) is a **separate web app** that runs independently from Core (the forms engine). However, the Task API is proxied through Core at `/app/components/task/app/api/v2/...` — this is the recommended way to access Task because Core applies permissions. Never call the Task engine host directly in production.

**CRUD pattern:**
1. **Create** workflow via Core: `POST /app/api/v1/kapps/{kapp}/forms/{form}/workflows` — this creates the tree AND registers it with the form
2. **Update** workflow (including uploading tree definition) via Core: `PUT /app/api/v1/workflows/{id}` — use `treeXml` or `treeJson` in the body
3. **Read** tree details, triggers, runs via Core-proxied Task API: `/app/components/task/app/api/v2/trees/{title}`, `/runs`, `/triggers`
4. **Delete** workflow via Core: `DELETE /app/api/v1/workflows/{id}`

**IMPORTANT:** These are completely separate queries. `GET /kapps/{kapp}/workflows` returns **only kapp-level** workflows — form-level workflows are invisible. To discover ALL workflows in a kapp, you must iterate each form with `GET /kapps/{kapp}/forms/{form}/workflows`. The `platformItemType` field distinguishes them: `"Kapp"` vs `"Form"`.

### Why NOT Task API for Workflow Creation

- `PUT /trees/{title}` with XML content returns HTTP 200 and bumps `versionId` but does NOT persist the XML
- Trees created via `POST /trees` lack platform registration — flagged as "orphaned" and may be deleted
- `guid !== sourceGroup` when created via Task API — admin UI shows "Unable to retrieve tree by GUID"

### Supported Events

**Warning:** The API accepts ANY string as the event name without validation. Invalid event names (like typos) are silently accepted but the workflow will never fire. Always use one of the exact names below.

| Category | Valid Event Names |
|----------|------------------|
| **Space** | `Space Login Failure` |
| **User** | `User Login`, `User Logout`, `User Created`, `User Updated`, `User Deleted`, `User Membership Change` |
| **Submission** | `Submission Created`, `Submission Submitted`, `Submission Updated`, `Submission Saved`, `Submission Closed`, `Submission Deleted` |
| **Form** | `Form Created`, `Form Updated`, `Form Deleted`, `Form Restored` |
| **Team** | `Team Created`, `Team Updated`, `Team Deleted`, `Team Restored`, `Team Membership Change` |

**Scope determines which events are available:**
- **Form-level workflows** — Submission events only
- **Kapp-level workflows** — Submission + Form events (fires for all forms in the kapp)
- **Space-level workflows** — All events (Space, User, Team, plus Submission/Form across all kapps)

Note: `Submission Saved` fires on every save (including Draft saves), while `Submission Submitted` only fires on the transition to `coreState: "Submitted"`. `Form Restored` and `Team Restored` fire when a soft-deleted entity is restored.

### Workflow Response Shape

```json
{
  "id": "a03b7bb6-4766-486a-9944-ccbd40121241",
  "name": "On Submit",
  "event": "Submission Submitted",
  "filter": "",
  "sourceGroup": "a03b7bb6-4766-486a-9944-ccbd40121241",
  "type": "Tree",
  "status": "Active",
  "platformItemType": "Form",
  "platformItemId": "230bacf6-32f5-11f1-98c0-6599b94dbb50",
  "ownerEmail": null,
  "notes": null,
  "versionId": "0",
  "createdAt": "2026-04-08T02:49:17.340Z",
  "createdBy": "admin@example.com",
  "updatedAt": "2026-04-08T02:49:17.340Z",
  "updatedBy": "admin@example.com"
}
```

The `filter` field accepts KSL expressions for conditional triggering. **Critical: use function-call syntax** `values('Field')`, NOT bracket syntax `values["Field"]`.

```
// CORRECT — KSL function syntax with double-quoted string literals
"filter": "values('Status') == \"Open\""
"filter": "form('name') == \"Approval\""

// ALSO WORKS — single-quoted string literals
"filter": "values('Status') == 'Open'"

// WRONG — bracket syntax silently fails, workflow never fires
"filter": "values[\"Status\"] == \"Open\""
```

**Filter scope depends on workflow level:**
- **Form-level workflows** (Submission events) — filter can use `values('Field')`, `identity('username')`, `form('slug')`, `kapp('slug')`, `submission('property')`
- **Kapp-level workflows** (Form events) — filter can use `form('slug')`, `kapp('slug')` but NOT `values()` (no submission context)
- **Space-level workflows** (User/Team events) — filter can use `identity()`, `space('slug')` but NOT `values()`, `form()`, or `kapp()` (no form/kapp context)

The filter is evaluated by the Core API before triggering the Task engine. If the filter returns false, the workflow is silently skipped — no run is created.

The GET response also includes diagnostic arrays: `{ "migratable": [], "missing": [], "orphaned": [], "workflows": [...] }`

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

### Run Status Is Misleading

`run.status` is almost always `"Started"` — even after the workflow has completed successfully. The engine does not reliably update run status to `"Complete"`. **Derive real status from triggers:**

```
GET /triggers?runId={id}&status=Failed&count=true
→ count > 0 = failed run
→ count = 0 = likely succeeded (check if all triggers are Closed)
```

For UI display, classify runs by checking their triggers rather than trusting `run.status`.

### Tree Type Classification via `sourceGroup`

The `sourceGroup` field on trees reveals the tree type without needing additional lookups:

| `sourceGroup` Pattern | Tree Type | Example |
|----------------------|-----------|---------|
| `"WebApis > {kapp-slug}"` | WebAPI tree | `"WebApis > services"` |
| UUID v4 format | Event-triggered tree | `"bee52c65-dbae-4959-894e-b659e59eaba1"` |
| Other (e.g., `"-"`) | Routine | `"-"` |

### Stuck Run Repair

When a run is stuck (Start node processed but downstream nodes never fire), manually create a trigger to advance past the stuck point:

```
POST /app/components/task/app/api/v2/runs/{runId}/triggers
{
  "nodeId": "utilities_echo_v1_1",
  "action": "Root",
  "type": "Automatic",
  "loopIndex": "/"
}
```

This creates a downstream trigger to resume execution from the specified node.

### NEVER Use Task API PUT on Core API-Registered Workflows

**Critical:** Using `PUT /trees/{title}` (Task API v2) on a workflow created via the Core API (`POST /kapps/{kapp}/workflows`) **wipes** the `event`, `platformItemType`, and `platformItemId` fields. The workflow disappears from the Kinetic admin UI and stops firing on form events.

Task API v2 PUT is **only safe** for:
- WebAPI trees (no Core API registration)
- Routines (no Core API registration)

For event-triggered workflows, always use the Core API: `PUT /kapps/{kapp}/workflows/{id}` with `{treeXml: "..."}` or use `update_workflow_tree`.

---

## Additional Task API Resources

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
