---
name: add-approval-workflow
description: "Use when adding a human-approval step to an existing Kinetic form — designing approver routing, building the approval form, writing the main and callback workflow trees with the deferral pattern, sending notifications, updating status, and testing the cycle via the Task API."
---

# Recipe: Add an Approval Workflow

This recipe walks through adding a deferral-based approval step to an existing form — from designing the flow and building the approval form, to writing both workflow trees and testing the full cycle via the Task API.

The pattern is domain-agnostic. "Your form" could be a service request, purchase order, leave application, job requisition, or anything else that needs a human decision before it proceeds.

**Before reading this recipe, familiarise yourself with:**
- `skills/concepts/architectural-patterns/SKILL.md` — the deferral and approval patterns
- `skills/concepts/workflow-engine/SKILL.md` — workflow concepts, execution model, deferrals/Queue Task pattern
- `skills/concepts/workflow-xml/SKILL.md` — XML/treeJson schema, handler definition IDs, connectors, ERB context
- `skills/concepts/workflow-creation/SKILL.md` — creating and binding the trees (Core API, tree title format, supported events)
- `skills/concepts/task-api-reference/SKILL.md` — Task API endpoints used in the Step 6 test cycle (runs, triggers, errors)

---

## Overview

A complete approval integration has six steps:

1. Design the approval flow (who approves, routing, what happens after)
2. Create the approval form (fields, events, indexes)
3. Write the main workflow tree (triggered on your form's submission)
4. Write the approval callback workflow (triggered when the approval form is submitted)
5. Wire both trees to their forms via Core API
6. Test the full cycle using API calls

---

## Step 1 — Design the Approval Flow

Before writing a single line of code, answer four questions:

### Who approves?

> The deferral / Create-Trigger wait-for-callback mechanism and approver routing strategies (hardcoded / attribute-driven / value-driven / lookup-driven) are documented in `concepts/architectural-patterns`.

**Recommended default:** use form attributes (`Approver Team`, `Approver Individual`). Builders can update routing by editing a form attribute — no workflow change needed.

### Single or multi-level?

- **Single level** — one deferral step, one approval submission, one decision
- **Multi-level** — chain deferral steps sequentially (manager → director → VP), or run them in parallel branches

This recipe covers single-level. Multi-level is the same pattern repeated; nest additional deferral steps after the first resolves.

### What happens when approved?

Map your post-approval paths now — both branches must be handled:

- **Approved:** update status, trigger fulfillment, send confirmation notification
- **Denied:** update status, notify the requester with the denial reason, optionally close the submission

### What data does the approver need to see?

The approval form must show enough context for the decision. Common fields to pass from the original submission:
- A human-readable summary of what is being approved
- Key values (cost, priority, department, requested dates)
- A link or reference back to the original submission

---

## Step 2 — Create the Approval Form

The approval form is a separate form (typically `type: "Approval"`, `slug: "approval"`) that the approver sees in their "My Approvals" queue.

### Required fields

| Field | Purpose |
|-------|---------|
| `Decision` | Radio: Approved, Denied |
| `Reason` | Required when Denied (conditional visible + required) |
| `Notes for Customer` | Optional notes sent back to the requester |
| `Summary` | What is being approved (populated by main workflow) |
| `Details` | Additional context (populated by main workflow) |
| `Assigned Individual` | Username of the approver |
| `Assigned Individual Display Name` | Display name for UI |
| `Assigned Team` | Team slug (set when routing to a team queue) |
| `Assigned Team Display Name` | Display name for UI |
| `Deferral Token` | Token from the main workflow's deferral step |
| `Status` | Open → Complete / Cancelled |
| `Due Date` | SLA deadline (set by main workflow) |
| `Parent ID` | Submission ID of the original request |

### Field event: Decision drives Status

Add a field-change event on `Decision` to keep `Status` in sync:

```json
{
  "type": "field",
  "name": "Decision",
  "events": [
    {
      "type": "Change",
      "action": "Set Fields",
      "name": "Sync Status",
      "runIf": null,
      "mappings": [
        {
          "field": "Status",
          "value": "K('field[Decision]').value() === 'Approved' ? 'Complete' : 'Cancelled'"
        }
      ]
    }
  ]
}
```

### Page advance condition

Prevent accidental submission without a decision. Add this condition to the page's submit button:

```
values('Status') === 'Complete' || values('Status') === 'Cancelled'
```

Or as a page-level `Submit` event that checks `values('Decision')` and calls `action.stop()` if blank.

### Hidden system fields (critical)

Wrap `Deferral Token`, `Parent ID`, and `Status` in a hidden section with `omitWhenHidden: false`:

```json
{
  "type": "section",
  "name": "Hidden System Questions",
  "visible": false,
  "omitWhenHidden": false,
  "elements": [
    { "type": "field", "name": "Deferral Token", "renderType": "text", "dataType": "string", "required": false, "enabled": true, "visible": true, "defaultValue": null, "defaultDataSource": "none", "rows": 1, "renderAttributes": {} },
    { "type": "field", "name": "Parent ID",      "renderType": "text", "dataType": "string", "required": false, "enabled": true, "visible": true, "defaultValue": null, "defaultDataSource": "none", "rows": 1, "renderAttributes": {} },
    { "type": "field", "name": "Status",         "renderType": "text", "dataType": "string", "required": false, "enabled": true, "visible": true, "defaultValue": "Open", "defaultDataSource": "none", "rows": 1, "renderAttributes": {} }
  ]
}
```

> `omitWhenHidden: false` is mandatory. Without it the hidden section's fields are stripped before submission and the approval callback workflow cannot read `Deferral Token`.

### Index definitions for "My Approvals" queries

The standard "My Approvals" UI query is:
```
type = "Approval" AND values[Assigned Individual] = {me} AND values[Status] = "Open"
```

Add compound indexes that match your query patterns:

```
POST /app/api/v1/kapps/{kappSlug}/forms/approval/backgroundJobs
```

```json
{
  "type": "Build Index",
  "content": {
    "indexes": [
      "values[Assigned Individual]",
      "values[Assigned Team]",
      "values[Status]",
      "values[Assigned Individual],values[Status]",
      "values[Assigned Team],values[Status]"
    ]
  }
}
```

Ensure the `indexDefinitions` are included in the form PUT before triggering the build. Fetch current indexes first (`?include=indexDefinitions`) and merge — a PUT replaces all definitions.

---

## Step 3 — Write the Main Workflow Tree

This tree fires on your form's **Submission Created** (or **Submission Submitted**) event. It determines the approver, creates the approval submission, defers, then branches on the decision.

> treeJson/XML syntax, handler IDs, connectors, and ERB context are in `concepts/workflow-xml`; creating & binding the trees (Core API, title format, supported events) is in `concepts/workflow-creation`.

### Node-by-node walkthrough

The deferral is **carried by the Create Approval node itself** (`defers: true`) — it is not a separate step. The node creates the child approval submission, then pauses the run on the same node until the approval callback completes the deferral. After the deferral completes, the next nodes branch on the returned `Decision`.

```
Start
  └─(Complete)─► Determine Approver
  └─(Complete)─► Update Status to Pending
  └─(Complete)─► Create Approval         [defers: true — creates child submission in Draft,
                                          then pauses on this node until the callback
                                          completes the deferral. @task['Deferral Token']
                                          is available to ERB inside this node's params.]
       ├─(Complete, value: @results['Create Approval']['Decision'] == 'Approved')─► Approval Path
       └─(Complete, value: @results['Create Approval']['Decision'] != 'Approved')─► Denial Path

Approval Path:
  └─► Update Request Status to Approved
  └─► Send Approval Notification
  └─► [Fulfillment steps — create tasks, call external systems, etc.]
  └─► Return

Denial Path:
  └─► Update Request Status to Denied
  └─► Send Denial Notification (include reason from deferred results)
  └─► [Optionally close the submission]
  └─► Return
```

> The deferred results returned by the callback (via `utilities_create_trigger_v1`'s `deferred_variables` XML payload) land in `@results['Create Approval']` — the same node that deferred. There is no separate "Branch on Decision" node; the branching happens on the connectors leaving the deferring node.

### Key nodes explained

#### Determine Approver

Read approver from form attributes (recommended):

```ruby
# In a kinetic_core_api_v1 node:
# GET /app/api/v1/kapps/{kapp}/forms/{form}?include=attributes
# Then read @results['Get Form']['Response Body'] → parse JSON → attributes['Approver Team']

# Simpler: use @values to read directly if routing is field-driven:
@values['Requested For Team']
```

#### Create Approval Submission

Use `kinetic_core_api_v1` to POST the approval submission:

```
POST /app/api/v1/kapps/{kappSlug}/forms/approval/submissions
```

Body (as an ERB string in the node parameter):

```json
{
  "values": {
    "Summary": "<%= @values['Summary'] || 'Approval Required' %>",
    "Details": "<%= @values['Description'] %>",
    "Assigned Team": "<%= @results['Determine Approver']['Team'] %>",
    "Assigned Individual": "<%= @results['Determine Approver']['Individual'] %>",
    "Deferral Token": "<%= @task['Deferral Token'] %>",
    "Parent ID": "<%= @submission['Id'] %>",
    "Status": "Open"
  },
  "coreState": "Draft"
}
```

> The approval submission must be created as `coreState: "Draft"` — not Submitted. This keeps it in the approver's queue and prevents the approval's own "Submission Submitted" workflow from firing prematurely.

> **Important timing:** `@task['Deferral Token']` is available **inside the parameters of the deferring node itself**. Because the Create Approval node IS the deferring node (`defers: true`), the token can be written into the child submission's values as part of that same node's `parameters.Values [Object]` ERB — see the worked treeJson in Step 5. No separate "create then defer" pair is needed.

#### The Deferring Node

Setting `defers: true` / `deferrable: true` on the Create Approval node makes the engine pause the run on this node after the handler runs. `@task['Deferral Token']` holds the unique token for this pause point; downstream connectors do not fire until something calls back to complete the deferral.

> The deferral / Create-Trigger wait-for-callback mechanism is documented in `concepts/architectural-patterns`; the handler flags and ERB context are in `concepts/workflow-xml`.

#### Branch on Decision

After the deferral completes, the deferred results from the approval callback are available in `@results` under the deferring node's name. Place conditional connector values on the connectors leaving the deferring node:

```ruby
# Approved path — connector value on the connector from "Create Approval" to the approval-path branch:
@results['Create Approval']['Decision'] == 'Approved'

# Denied path — connector value on the connector to the denial-path branch:
@results['Create Approval']['Decision'] == 'Denied'
```

The result key (`'Create Approval'`) is the **name of the deferring node** as it appears in the tree. If you rename the deferring node, update both connector values to match. Any field the callback returns via `deferred_variables` is accessible the same way — return additional `<result name="...">` elements from the callback to branch on more than just Decision.

#### Update Submission Status

Use `kinetic_core_api_v1` to PUT the status back onto the original submission:

```
PUT /app/api/v1/submissions/{submissionId}
```

Body:
```json
{
  "values": {
    "Status": "Approved"
  }
}
```

Where `{submissionId}` is `@submission['Id']` (the submission ID from the triggering event).

---

## Step 4 — Write the Approval Callback Workflow

This tree fires on the approval form's **Submission Submitted** event. It is deliberately simple — three nodes:

```
Start
  └─(Complete)─► Complete Deferral
  └─(Complete)─► Close Approval Submission
  └─(Complete)─► Return
```

### Complete Deferral node

Use the Create Trigger handler (`utilities_create_trigger_v1`) with `action_type: Complete` and `deferral_token: <%= @values['Deferral Token'] %>` — see the worked callback treeJson in Step 5 for the full parameter set.

> The Create-Trigger wait-for-callback mechanism is documented in `concepts/architectural-patterns`; the handler parameters and ERB context are in `concepts/workflow-xml`.

**Deferred variables** — pass the decision fields back to the waiting workflow:

```xml
<results>
  <result name="Decision"><%= @values['Decision'] %></result>
  <result name="Reason"><%= @values['Reason'] %></result>
  <result name="Notes for Customer"><%= @values['Notes for Customer'] %></result>
</results>
```

Or pass the entire values hash as JSON:

```ruby
<%= @values.to_json %>
```

The waiting workflow accesses the returned values via `@results['Deferral Node']`.

### Close Approval Submission node

After firing the trigger, close the approval submission so it no longer appears in the approver's queue:

```
PUT /app/api/v1/submissions/{approvalSubmissionId}
```

Body:
```json
{ "coreState": "Closed" }
```

Where `{approvalSubmissionId}` is `@submission['Id']` (the approval submission's own ID from the triggering event).

---

## Step 5 — Wire Both Trees to Their Forms

> Creating & binding the trees (Core API registration, title format, supported events, and why Task API v2 tree creation produces orphaned trees) is in `concepts/workflow-creation`. The two worked treeJson examples below are the recipe-specific spine.

### Register the main workflow tree

```
POST /app/api/v1/kapps/{kappSlug}/forms/{yourFormSlug}/workflows
Content-Type: application/json

{
  "name": "Submission Created",
  "event": "Submission Created",
  "type": "Tree",
  "status": "Active"
}
```

**Response** — note the `id` (UUID):
```json
{
  "workflow": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa1",
    ...
  }
}
```

### Upload the tree definition (treeJson)

Use treeJson (not treeXml) for reliable round-trips. The request workflow sets status, creates an approval with deferral, then logs the result after approval:

```
PUT /app/api/v1/workflows/{id}
Content-Type: application/json

{
  "treeJson": {
    "builderVersion": "", "schemaVersion": "1.0", "version": "", "processOwnerEmail": "",
    "lastId": 5, "name": "Request Approval",
    "connectors": [
      {"from": "start", "to": "si_1", "label": "", "value": "", "type": "Complete"},
      {"from": "si_1", "to": "si_2", "label": "", "value": "", "type": "Complete"},
      {"from": "si_2", "to": "si_3", "label": "Approved", "value": "@results['Create Approval']['Decision'] == 'Approved'", "type": "Complete"},
      {"from": "si_2", "to": "si_4", "label": "Denied",   "value": "@results['Create Approval']['Decision'] == 'Denied'",   "type": "Complete"},
      {"from": "si_3", "to": "echo_5", "label": "", "value": "", "type": "Complete"},
      {"from": "si_4", "to": "echo_5", "label": "", "value": "", "type": "Complete"}
    ],
    "nodes": [
      {"configured": true, "defers": false, "deferrable": false, "visible": false,
       "name": "Start", "id": "start", "definitionId": "system_start_v1",
       "parameters": [], "messages": [], "position": {"x": 10, "y": 10}, "version": 1,
       "dependents": {"task": [{"type": "Complete", "content": "si_1"}]}},

      {"configured": true, "defers": false, "deferrable": false, "visible": true,
       "name": "Set Status Pending", "id": "si_1", "definitionId": "system_integration_v1",
       "parameters": [
         {"id": "connection", "value": "<your-connection-uuid>"},
         {"id": "operation", "value": "<your-update-submission-operation-uuid>"},
         {"id": "parameters.Submission Id*", "value": "<%= @submission['Id'] %>"},
         {"id": "parameters.Values [Object]", "value": "{\"Status\": \"Pending Approval\"}"}
       ],
       "messages": [], "position": {"x": 200, "y": 10}, "version": 1,
       "dependents": {"task": [{"type": "Complete", "content": "si_2"}]}},

      {"configured": true, "defers": true, "deferrable": true, "visible": true,
       "name": "Create Approval", "id": "si_2", "definitionId": "system_integration_v1",
       "parameters": [
         {"id": "connection", "value": "<your-connection-uuid>"},
         {"id": "operation", "value": "<your-create-submission-operation-uuid>"},
         {"id": "parameters.Kapp*", "value": "<your-kapp-slug>"},
         {"id": "parameters.Form*", "value": "approval"},
         {"id": "parameters.Core State", "value": "Draft"},
         {"id": "parameters.Values [Object]", "value": "<%= {Approver: @submission['Created By'], 'Original Submission Id': @submission['Id'], 'Deferral Token': @task['Deferral Token']}.to_json %>"}
       ],
       "messages": [], "position": {"x": 400, "y": 10}, "version": 1,
       "dependents": {"task": [
         {"type": "Complete", "content": "si_3", "value": "@results['Create Approval']['Decision'] == 'Approved'"},
         {"type": "Complete", "content": "si_4", "value": "@results['Create Approval']['Decision'] == 'Denied'"}
       ]}},

      {"configured": true, "defers": false, "deferrable": false, "visible": true,
       "name": "Mark Approved", "id": "si_3", "definitionId": "system_integration_v1",
       "parameters": [
         {"id": "connection", "value": "<your-connection-uuid>"},
         {"id": "operation", "value": "<your-update-submission-operation-uuid>"},
         {"id": "parameters.Submission Id*", "value": "<%= @submission['Id'] %>"},
         {"id": "parameters.Values [Object]", "value": "{\"Status\": \"Approved\"}"}
       ],
       "messages": [], "position": {"x": 600, "y": -60}, "version": 1,
       "dependents": {"task": [{"type": "Complete", "content": "echo_5"}]}},

      {"configured": true, "defers": false, "deferrable": false, "visible": true,
       "name": "Mark Denied", "id": "si_4", "definitionId": "system_integration_v1",
       "parameters": [
         {"id": "connection", "value": "<your-connection-uuid>"},
         {"id": "operation", "value": "<your-update-submission-operation-uuid>"},
         {"id": "parameters.Submission Id*", "value": "<%= @submission['Id'] %>"},
         {"id": "parameters.Values [Object]", "value": "{\"Status\": \"Denied\"}"}
       ],
       "messages": [], "position": {"x": 600, "y": 80}, "version": 1,
       "dependents": {"task": [{"type": "Complete", "content": "echo_5"}]}},

      {"configured": true, "defers": false, "deferrable": false, "visible": true,
       "name": "Log Result", "id": "echo_5", "definitionId": "utilities_echo_v1",
       "parameters": [
         {"id": "input", "value": "Approval completed: <%= @results['Create Approval'] %>"}
       ],
       "messages": [], "position": {"x": 800, "y": 10}, "version": 1,
       "dependents": ""}
    ]
  }
}
```

**Key points:**
- The "Create Approval" node has `"defers": true, "deferrable": true` — it both creates the child submission AND becomes the pause point. `@task['Deferral Token']` is available to its own parameters.
- Two `Complete` connectors leave "Create Approval" with `value` expressions that branch on `@results['Create Approval']['Decision']`. The same node name is used in both `connectors[]` and the node's `dependents` — keep them in sync if you rename.
- Uses `system_integration_v1` — replace UUIDs with your Connection / Operation IDs.
- `Mark Approved` and `Mark Denied` both feed `Log Result`, so the tree has a single Return point.
- The callback workflow (next section) supplies `Decision` via `deferred_variables`; without that, neither branch's connector value is truthy and the run will stall at the deferral.

### Register the approval callback workflow

Same pattern on the approval form — this workflow fires when the approver submits their decision:

```
POST /app/api/v1/kapps/{kappSlug}/forms/approval/workflows
Content-Type: application/json

{
  "name": "Complete Approval",
  "event": "Submission Submitted",
  "type": "Tree",
  "status": "Active"
}
```

Then upload the callback treeJson:

```json
{
  "treeJson": {
    "builderVersion": "", "schemaVersion": "1.0", "version": "", "processOwnerEmail": "",
    "lastId": 3, "name": "Complete Approval",
    "connectors": [
      {"from": "start", "to": "trigger_1", "label": "", "value": "", "type": "Complete"},
      {"from": "trigger_1", "to": "si_2", "label": "", "value": "", "type": "Complete"}
    ],
    "nodes": [
      {"configured": true, "defers": false, "deferrable": false, "visible": false,
       "name": "Start", "id": "start", "definitionId": "system_start_v1",
       "parameters": [], "messages": [], "position": {"x": 10, "y": 10}, "version": 1,
       "dependents": {"task": [{"type": "Complete", "content": "trigger_1"}]}},

      {"configured": true, "defers": false, "deferrable": false, "visible": true,
       "name": "Complete Deferral", "id": "trigger_1", "definitionId": "utilities_create_trigger_v1",
       "parameters": [
         {"id": "action_type", "value": "Complete"},
         {"id": "deferral_token", "value": "<%= @values['Deferral Token'] %>"},
         {"id": "deferred_variables", "value": "<results><result name=\"Decision\"><%= @values['Decision'] %></result></results>"},
         {"id": "message", "value": "Approval: <%= @values['Decision'] %>"}
       ],
       "messages": [], "position": {"x": 200, "y": 10}, "version": 1,
       "dependents": {"task": [{"type": "Complete", "content": "si_2"}]}},

      {"configured": true, "defers": false, "deferrable": false, "visible": true,
       "name": "Close Approval", "id": "si_2", "definitionId": "system_integration_v1",
       "parameters": [
         {"id": "connection", "value": "<your-connection-uuid>"},
         {"id": "operation", "value": "<your-update-submission-operation-uuid>"},
         {"id": "parameters.Submission Id*", "value": "<%= @submission['Id'] %>"},
         {"id": "parameters.Core State", "value": "Closed"}
       ],
       "messages": [], "position": {"x": 400, "y": 10}, "version": 1,
       "dependents": ""}
    ]
  }
}
```

The callback reads `Deferral Token` from the approval submission, completes the parent workflow's deferral with the Decision as a deferred variable, then closes the approval submission.

---

## Step 6 — Test the Full Cycle

Testing requires three phases: trigger the workflow, inspect the deferred state, then simulate the callback.

### Phase A — Create a submission (trigger the workflow)

```bash
curl -s -u "user:pass" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"values":{"Summary":"New purchase request","Description":"Laptop for new hire"},"coreState":"Submitted"}' \
  "https://{space}.kinops.io/app/api/v1/kapps/{kapp}/forms/{yourForm}/submissions"
```

Note the returned `submission.id` — you will need it.

### Phase B — Find the workflow run

```bash
# List runs for your source group (the form's UUID)
curl -s -u "user:pass" \
  "https://{space}.kinops.io/app/components/task/app/api/v2/runs?include=details&limit=5"
```

> Always include `&include=details` — without it the `id` field is absent from run objects.

Find the run where `tree.sourceGroup` matches your form UUID. Note the run `id` (a numeric integer).

### Phase C — Inspect tasks to find the deferral token

```bash
curl -s -u "user:pass" \
  "https://{space}.kinops.io/app/components/task/app/api/v2/runs/{runId}/tasks"
```

Look for the task with `status: "Deferred"`. The `token` field contains the deferral token. A deferred task looks like:

```json
{
  "nodeId": "system_wait_v1_3",
  "nodeName": "Deferral Step",
  "status": "Deferred",
  "token": "abc123-unique-deferral-token",
  "deferredResults": {}
}
```

### Phase D — Check the approval submission was created

```bash
curl -s -u "user:pass" \
  "https://{space}.kinops.io/app/api/v1/kapps/{kapp}/forms/approval/submissions?include=values,details&q=values[Status]=\"Open\""
```

Confirm the approval submission has:
- `values['Deferral Token']` matching the token from Phase C
- `values['Assigned Individual']` or `values['Assigned Team']` set correctly
- `values['Summary']` and `values['Details']` populated from your original submission

### Phase E — Simulate the approver callback

Option 1: Submit the approval form via API (simulates a real approver):

```bash
curl -s -u "user:pass" \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"coreState":"Submitted"}' \
  "https://{space}.kinops.io/app/api/v1/submissions/{approvalSubmissionId}"
```

The approval form's `Submission Submitted` workflow fires, which calls the Create Trigger handler, which resumes the main workflow.

Option 2: Call the Task API directly to complete the deferral (bypasses the approval form):

```bash
curl -s -u "user:pass" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "action": "Complete",
    "results": "<results><result name=\"Decision\">Approved</result><result name=\"Reason\"></result></results>",
    "message": "Approved via direct API call"
  }' \
  "https://{space}.kinops.io/app/components/task/app/api/v2/runs/task/{deferralToken}"
```

> Use option 2 in automated tests or when iterating quickly on the post-approval branching logic without involving the approval form UI.

### Phase F — Verify the outcome

Check the original submission's status was updated:

```bash
curl -s -u "user:pass" \
  "https://{space}.kinops.io/app/api/v1/submissions/{originalSubmissionId}?include=values"
```

Expect `values['Status']` to be `"Approved"` (or `"Denied"` if you sent that decision).

Check the run completed successfully:

```bash
curl -s -u "user:pass" \
  "https://{space}.kinops.io/app/components/task/app/api/v2/runs/{runId}?include=details"
```

Expect `status: "Complete"`. If `status: "Started"`, check for stuck tasks:

```bash
# List triggers for this run — look for status=Error or non-null message
curl -s -u "user:pass" \
  "https://{space}.kinops.io/app/components/task/app/api/v2/triggers?runId={runId}&include=details"
```

---

## Approval Routing

> The full set of routing strategies (hardcoded / attribute-driven / value-driven / lookup-driven) and the standard assignment fields are documented in `concepts/architectural-patterns`.

**Recommended default — form attribute-driven.** Add routing attributes to the form, then read them in the workflow. No workflow change needed to reassign approvers:

```json
[
  { "name": "Approval Team",       "values": ["Finance Approvers"] },
  { "name": "Approval Individual", "values": [""] }
]
```

```ruby
# After GET /app/api/v1/kapps/{kapp}/forms/{form}?include=attributes
<%= @results['Get Form Attributes']['Approval Team'] %>
<%= @results['Get Form Attributes']['Approval Individual'] %>
```

---

## Post-Approval Handling

### Status update

Always update the original submission's `Status` field immediately after the decision is known:

```
PUT /app/api/v1/submissions/{submissionId}
{"values": {"Status": "Approved"}}
```

or

```
{"values": {"Status": "Denied", "Denial Reason": "<%= @results['Deferral']['Reason'] %>"}}
```

### Notifications

Call the notification routine (if configured) with the appropriate template name:

```ruby
# Read the notification template from a form attribute:
@results['Get Form Attributes']['Notification Template - Approved']
```

Pass the requester's email address from `@values['Requested By']` or look up the user via `GET /app/api/v1/users/{username}`.

### Denial path — close the submission

If your process closes denied requests immediately:

```
PUT /app/api/v1/submissions/{submissionId}
{"coreState": "Closed"}
```

If you want the requester to be able to resubmit (common for purchase requests), leave the submission as Submitted but set `Status` to `"Denied"` — they can then edit and resubmit.

### Fulfillment trigger

On the approved path, you may create fulfillment task submissions, call external systems, or simply update the status and let the requester track progress. This is separate from the approval pattern — see `skills/concepts/architectural-patterns/SKILL.md` for the Multi-Stage Fulfillment Pattern.

---

## Common Gotchas

| Gotcha | Fix |
|--------|-----|
| Deferral token is empty when creating the approval submission | Move the "Create Approval Submission" node to the deferral node's **Create** connector path — that fires immediately when deferral begins and `@task['Deferral Token']` is populated |
| Approval callback fires but main workflow does not resume | Confirm `deferral_token` parameter in `utilities_create_trigger_v1` matches exactly — tokens are case-sensitive UUIDs |
| Approval form fields not received by callback workflow | Add `omitWhenHidden: false` to the hidden section; verify `Deferral Token` field is in the hidden section |
| Run stays at `status: "Started"` after callback | Query triggers: `GET /triggers?runId={id}&include=details` — look for `status: "Error"` or non-null `message` on any trigger |
| Approval form's `Submission Submitted` workflow fires the moment you create the approval submission | POSTing the approval with `coreState:"Submitted"` fires both `Submission Created` AND `Submission Submitted` immediately — exactly what an approval queue doesn't want. POST with `coreState:"Draft"` instead; the human approver's form submission triggers the callback at the right time. |
| Trees created via Task API are "orphaned" | Always create trees via `POST /app/api/v1/kapps/{kapp}/forms/{form}/workflows` — the Task API v2 tree creation lacks platform registration |
| Connector condition uses `=` instead of `==` | Connector `value` is a Ruby expression — use `==` for equality, not `=` |
| XML entities in connector conditions | In treeXml, `&&` must be `&amp;&amp;` and `"` must be `&quot;`; use treeJson format to avoid this |

---

## Reusable Approval Routine

The recipe up to this point shows one approach: deferral nodes wired directly into the form's tree, with the approval-submission creation inline. A second approach observed across customer spaces is to extract the deferral + approval-submission creation into a **Global Routine**. Either is valid; the routine approach pays off when the same approval shape is needed across multiple forms, while the inline approach keeps everything in one tree where it's easier to read end-to-end. The two are alternatives, not phases of an evolution.

For consistency across multiple forms, extract the deferral + approval submission creation into a **Global Routine** with declared inputs:

| Input | Description |
|-------|-------------|
| `Approver Team` | Team slug to assign the approval to |
| `Approver Individual` | Username (leave blank for team routing) |
| `Summary` | One-line description of what is being approved |
| `Details` | Full context for the approver |
| `Parent Submission ID` | The original submission's ID |
| `Kapp Slug` | Kapp containing the approval form |
| `Due Date` | SLA deadline (optional) |

The routine outputs `Decision`, `Reason`, and `Notes for Customer` — whatever the callback returns via deferred variables.

Any form-level tree can call this routine instead of duplicating the deferral pattern. This keeps the approval logic in one place and makes changes (e.g., switching the approval form slug) a single-file edit.

---

## Cross-References

- `skills/concepts/architectural-patterns/SKILL.md` — deferral pattern internals, multi-stage fulfillment, SLA tracking, work routing patterns
- `skills/concepts/workflow-engine/SKILL.md` — execution model, deferrals/Queue Task pattern, run-status derivation
- `skills/concepts/task-api-reference/SKILL.md` — Task API v2 endpoints, run/task/trigger objects, response shapes (used by the Step 6 test cycle)
- `skills/concepts/workflow-creation/SKILL.md` — Core API tree creation/binding, tree title format, supported events
- `skills/concepts/workflow-xml/SKILL.md` — XML schema, handler definition IDs (`utilities_create_trigger_v1`, `system_wait_v1`), critical node flags, connector types/conditions, `system_tree_return_v1` parameter rules
- `skills/recipes/create-submission-form/SKILL.md` — creating the approval form fields, index definitions, events, and test submissions
