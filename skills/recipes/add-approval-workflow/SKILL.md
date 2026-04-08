---
name: add-approval-workflow
description: Step-by-step recipe for adding a deferral-based approval workflow to a form, including routing, notifications, and status updates.
---

# Recipe: Add an Approval Workflow

This recipe walks through adding a deferral-based approval step to an existing form — from designing the flow and building the approval form, to writing both workflow trees and testing the full cycle via the Task API.

The pattern is domain-agnostic. "Your form" could be a service request, purchase order, leave application, job requisition, or anything else that needs a human decision before it proceeds.

**Before reading this recipe, familiarise yourself with:**
- `skills/concepts/architectural-patterns/SKILL.md` — the deferral and approval patterns
- `skills/concepts/workflow-engine/SKILL.md` — workflow concepts, execution model, Task API reference
- `skills/concepts/workflow-xml/SKILL.md` — XML schema, handler definition IDs, tree title format

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

| Routing strategy | How it works | Change without workflow change? |
|-----------------|--------------|--------------------------------|
| Hardcoded | Workflow node directly sets approver | No |
| Form attribute-driven | Workflow reads `@form_attributes['Approver Team']` | Yes — edit form attribute |
| Value-driven | Workflow branches on a submission field (e.g. `values['Department']`) | Partially |
| Lookup-driven | Workflow queries a routing matrix form | Yes — edit the matrix form |

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

### Tree title format

When created via the Core API the title is auto-generated:
```
Kinetic Request CE :: {sourceGroup-UUID} :: {eventName}
```

You do not set the title manually — it derives from `sourceName`, `sourceGroup` (the form's UUID), and `name` (the event name you provide).

### Node-by-node walkthrough

```
Start
  └─(Complete)─► Determine Approver
  └─(Complete)─► Update Status to Pending
  └─(Complete)─► Create Approval Submission   [creates child submission in Draft]
  └─(Complete)─► Deferral Step                [pauses here — token lives on @task['Deferral Token']]
       ├─(Create)─► [optional: start SLA timer]
       └─(Complete)─► Branch on Decision
            ├─(Complete, value: @results['Branch']['Decision'] == 'Approved')─► Approval Path
            └─(Complete, value: @results['Branch']['Decision'] != 'Approved')─► Denial Path

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
    "Parent ID": "<%= @values['id'] %>",
    "Status": "Open"
  },
  "coreState": "Draft"
}
```

> The approval submission must be created as `coreState: "Draft"` — not Submitted. This keeps it in the approver's queue and prevents the approval's own "Submission Submitted" workflow from firing prematurely.

> **Important timing:** The `Deferral Token` is only available on `@task` at the point when the deferral node itself executes. Pass the token to the approval submission **within** the deferral node's Create connector path, or use a node immediately before the deferral to pre-generate and store the token. The safest approach is to place the "Create Approval Submission" node as the very first node reached via the deferral node's **Create** connector — so it executes immediately when the deferral begins.

The corrected node order:

```
...
└─(Complete)─► Deferral Node
     ├─(Create)─► Create Approval Submission   ← fires as soon as deferral begins
     └─(Complete)─► Branch on Decision         ← fires when deferral completes
```

#### The Deferral Node

Use `system_wait_v1` with a long wait time as the deferral vehicle, or use a purpose-built handler. The key is that when the deferral node is active, `@task['Deferral Token']` holds the unique token for this specific pause point.

**Critical node flags for the deferral node:**
```
defers: true
deferrable: true
```

Do NOT set these on the Start node.

#### Branch on Decision

After the deferral completes, the deferred results (from the approval callback) are available in `@results`. The approval callback sends back the Decision, Reason, and Notes fields as deferred variables.

Use conditional connectors on the post-deferral node:

```ruby
# Approved path connector value:
@results['Deferral Node']['Decision'] == 'Approved'

# Denied path connector value:
@results['Deferral Node']['Decision'] == 'Denied'
```

Or branch on any field — the approval callback can return the full `@values` hash from the approval submission.

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

Where `{submissionId}` is `@source['Id']` (the submission ID from the triggering event).

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

Use `utilities_create_trigger_v1` (the Create Trigger handler):

| Parameter | Value |
|-----------|-------|
| `action_type` | `Complete` |
| `deferral_token` | `<%= @values['Deferral Token'] %>` |
| `deferred_variables` | See below |
| `message` | `<%= @values['Decision'] %>` (optional, human-readable) |

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

Where `{approvalSubmissionId}` is `@values['id']` (the approval submission's own ID from the triggering event).

---

## Step 5 — Wire Both Trees to Their Forms

**Always use the Core API for creating workflows** — the Task API v2 tree creation lacks platform registration and produces orphaned trees. See the workflow-engine skill for a full explanation.

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

### Upload the tree XML definition

```
PUT /app/api/v1/kapps/{kappSlug}/forms/{yourFormSlug}/workflows/{id}
Content-Type: application/json

{
  "treeXml": "<taskTree>...</taskTree>"
}
```

> Upload only the inner `<taskTree>` element — the server wraps it in the `<tree>` envelope automatically.

### Register the approval callback workflow

Same pattern, against the approval form:

```
POST /app/api/v1/kapps/{kappSlug}/forms/approval/workflows
Content-Type: application/json

{
  "name": "Submission Submitted",
  "event": "Submission Submitted",
  "type": "Tree",
  "status": "Active"
}
```

Then upload the callback tree XML via PUT as above.

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

## Approval Routing Patterns

### Pattern 1 — Form attribute-driven (recommended default)

Add a kapp-level or form-level attribute to control routing. No workflow changes needed when reassigning approvers.

Form attributes to add:

```json
[
  { "name": "Approval Team",       "values": ["Finance Approvers"] },
  { "name": "Approval Individual", "values": [""] }
]
```

In the workflow, read the attribute via `kinetic_core_api_v1`:

```
GET /app/api/v1/kapps/{kapp}/forms/{form}?include=attributes
```

Then in subsequent node parameters:
```ruby
<%= @results['Get Form Attributes']['Approval Team'] %>
<%= @results['Get Form Attributes']['Approval Individual'] %>
```

### Pattern 2 — Value-driven routing

Branch in the workflow based on a submission field value (e.g., `values['Department']`):

```ruby
# Connector condition — Finance branch:
@values['Department'] == 'Finance'

# Connector condition — HR branch:
@values['Department'] == 'HR'
```

Each branch sets a different `Assigned Team` before reaching the shared deferral step.

### Pattern 3 — Lookup-driven routing (most dynamic)

Query a "Routing Matrix" datastore form to resolve approver from submission data:

```
GET /app/api/v1/kapps/{kapp}/forms/routing-matrix/submissions
    ?include=values&q=values[Department]="Finance"&limit=1
```

Parse the result to extract the approver team/individual. Use this when routing rules change frequently without developer involvement.

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
| "Creating a submission with coreState:Submitted fires Submission Created not Submission Submitted" | Only use `coreState: "Draft"` when creating the approval submission; submit it via a separate PUT or the approver's form action |
| Trees created via Task API are "orphaned" | Always create trees via `POST /app/api/v1/kapps/{kapp}/forms/{form}/workflows` — the Task API v2 tree creation lacks platform registration |
| Connector condition uses `=` instead of `==` | Connector `value` is a Ruby expression — use `==` for equality, not `=` |
| XML entities in connector conditions | In treeXml, `&&` must be `&amp;&amp;` and `"` must be `&quot;`; use treeJson format to avoid this |

---

## Reusable Approval Routine

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
- `skills/concepts/workflow-engine/SKILL.md` — Task API v2 reference, run/task/trigger objects, connector types (Complete/Create/Update), observed response formats
- `skills/concepts/workflow-xml/SKILL.md` — XML schema, handler definition IDs (`utilities_create_trigger_v1`, `system_wait_v1`), critical node flags, connector conditions, `system_tree_return_v1` parameter rules
- `skills/recipes/create-submission-form/SKILL.md` — creating the approval form fields, index definitions, events, and test submissions
