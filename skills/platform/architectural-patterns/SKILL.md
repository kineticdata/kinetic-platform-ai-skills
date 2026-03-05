---
name: architectural-patterns
description: Standard Kinetic Platform patterns for approvals, deferrals, multi-stage fulfillment, SLA tracking, external system sync, work routing, and bulk operations.
---

# Architectural Patterns

Proven patterns used by experienced Kinetic developers. These patterns leverage the platform's core primitives (forms, workflows, deferrals, attributes) to solve common business process challenges.

---

## The Deferral Pattern (Foundation)

Deferral is the universal "wait for callback" mechanism in Kinetic. It is the foundation for approvals, external system integration, and any workflow that needs to pause until something happens.

**How it works:**
1. A workflow reaches a **Deferral step** → the engine generates a unique **deferral token**
2. The workflow pauses at that step (status: "Deferred")
3. The token is passed to whatever needs to respond — a human (via a form), an external system (via API), or another workflow
4. When the respondent is ready, it calls the **Create Trigger** handler (`utilities_create_trigger_v1`) with:
   - `action_type`: `"Complete"` (fires Complete connectors) or `"Update"` (fires Update connectors)
   - `deferral_token`: the token
   - `deferred_variables`: results to pass back (XML format: `<results><result name="key">value</result></results>`)
5. The original workflow resumes from the deferral step with the returned results

**Key points:**
- Deferral is generic — not tied to approvals specifically
- The token can be stored anywhere: on a submission, in an external system, passed via email link
- Deferred results can return arbitrary data back to the waiting workflow

---

## Approval Pattern

Approvals in Kinetic use separate forms linked back to the original submission via the deferral pattern.

### Setup

**Approval form** (typically `type: "Approval"`, `slug: "approval"`):

| Field | Purpose |
|-------|---------|
| `Decision` | Radio: Approved, Denied, Pending |
| `Reason` | Required when Denied (conditional visibility + required expression) |
| `Notes for Customer` | Optional notes sent to requester |
| `Summary` | What is being approved (populated by workflow) |
| `Details` | Additional context (populated by workflow) |
| `Assigned Individual` | Username of the approver |
| `Assigned Individual Display Name` | Display name for UI |
| `Assigned Team` | Team slug (required if no individual assigned) |
| `Assigned Team Display Name` | Display name for UI |
| `Deferral Token` | Token from the parent workflow's deferral step |
| `Status` | Open → Pending/Complete/Cancelled (driven by Decision events) |
| `Due Date` | SLA deadline for the approval |

**Form events on Decision field:**
- `Decision = "Approved"` → Set Status = "Complete"
- `Decision = "Denied"` → Set Status = "Cancelled"
- `Decision = "Pending"` → Set Status = "Pending"

**Page advance condition:** `values('Status') === 'Complete' || values('Status') === 'Cancelled'` — prevents submission until a final decision is made.

**Page Load event:** Typically uses `K()` API to render Summary/Details from hidden metadata fields into a visible review section for the approver.

### Flow

```
Original Form Submitted
  → "Submission Created" workflow starts
  → Workflow determines approver (hardcoded, form attribute, or lookup)
  → Workflow hits Deferral step → generates token
  → Workflow creates approval submission (coreState: "Draft"):
      - Deferral Token = token
      - Assigned Individual = approver username
      - Summary/Details = context from original submission
      - Parent = original submission ID
  → Workflow pauses at deferral step...

Approver sees approval in "My Approvals" UI
  Query: type="Approval" AND values[Assigned Individual] = username
         AND coreState = "Draft" (or values[Status] = "Open")
  → Opens approval, reviews Summary/Details
  → Selects Decision (Approved/Denied), provides Reason if denied
  → Submits the approval form

Approval "Submission Submitted" workflow fires (simple — 3 nodes):
  → Start
  → Complete Deferral: calls utilities_create_trigger_v1 with:
      - action_type = "Complete"
      - deferral_token = @values['Deferral Token']
      - deferred_variables = @values.to_json (sends ALL approval field values back)
  → Close Submission: closes the approval submission via Connection/Operation

Original workflow resumes
  → Receives approval values (Decision, Reason, Notes, etc.) from deferred results
  → Branches: Approved → fulfillment path, Denied → rejection/notification path
```

### Approval Routine

The approval logic is typically wrapped in a **reusable routine** that accepts parameters:
- Approver (individual or team)
- Summary and Details text
- Original submission ID
- Due date / SLA

This routine contains the deferral step, creates the approval submission, waits, and returns the decision. Any workflow can call this routine to add an approval step.

### Form Attributes for Approval Configuration

```json
{
  "name": "Notification Template Name - Create",
  "values": ["Approval Created"]
}
```

The workflow reads the `Notification Template Name - Create` attribute to determine which email template to send when the approval is created. This allows different forms to use different notification templates without changing the workflow.

---

## Multi-Stage Fulfillment Pattern

Requests that go through multiple stages (Request → Approve → Fulfill → Close) use the same child-submission and deferral patterns.

### Typical Flow

```
Request Submitted
  → Approval stage (see Approval Pattern above)
  → If approved:
      → Create fulfillment task(s) as child submissions
      → Each task has: Deferral Token, Assigned Team/Individual, Details, Parent ID
      → Workflow waits at deferral step(s)
  → Fulfillment tasks completed (by human or external system)
  → Triggers fire, completing deferral steps
  → Workflow closes the original request
```

### Parallel Fulfillment

When multiple tasks must happen in parallel (e.g., provision laptop AND setup email AND create AD account):

1. Workflow **branches** into multiple parallel paths
2. Each path creates a fulfillment task or calls an external system
3. Each path has its own deferral step
4. Paths converge at a **Join** or **Junction** node

**Join types:**
- **All** — every branch must complete before continuing (most common for fulfillment)
- **Any** — continue as soon as one branch completes
- **Some(N)** — continue after N branches complete

**Junction** — more sophisticated: looks backward to a common parent node and evaluates if branches are "complete as possible." Handles cases where some branches didn't fire due to conditional connectors. No configuration needed.

### External System Fulfillment

Often fulfillment happens in external systems (ERP, CRM, ITSM). The pattern:

1. Workflow calls external system via Connection/Operation to create a ticket/record
2. External system returns its ID → workflow stores it on the submission (e.g., `SNOW SYS ID`)
3. Workflow hits Deferral step → passes the token to the external system
4. External system stores the deferral token alongside the Kinetic reference
5. When external work is done → external system calls a **WebAPI** endpoint with the token
6. WebAPI creates a Trigger → original workflow resumes

---

## Work Routing Patterns

### Routing Approaches (Simple to Dynamic)

**1. Hardcoded in workflow:**
```
Workflow node directly sets: Assigned Team = "IT Support"
```
Simplest, but requires workflow changes to update routing.

**2. Form attribute-driven:**
```
Form attribute: "Assigned Team" = "IT Support"
Workflow reads: @form_attributes['Assigned Team']
```
Builder changes routing by editing the form attribute in the Form Builder — no workflow change needed. This is the recommended default.

**3. Lookup-driven:**
```
Step 1: Query a "Routing Matrix" form or external system
Step 2: Use the result to set Assigned Team / Assigned Individual
```
Most dynamic. Common when routing depends on submission data (e.g., route by department, location, or request type).

### Standard Assignment Fields

Most work item forms (approvals, tasks, incidents) share these fields:

| Field | Purpose |
|-------|---------|
| `Assigned Individual` | Username of the assigned person |
| `Assigned Individual Display Name` | Human-readable name for UI |
| `Assigned Team` | Team slug for team-based assignment |
| `Assigned Team Display Name` | Human-readable team name for UI |
| `Status` | Open, Pending, Complete, Cancelled |

### Claim Pattern

For team queues where members pick up unassigned work:
- **Unclaimed work query:** `values[Assigned Team] = "IT Support" AND values[Assigned Individual] = null`
- **Claiming:** Update the submission's `Assigned Individual` field to the claimer's username

### UI Patterns

| View | Query Pattern |
|------|---------------|
| My Requests | `createdBy = me` (things I submitted) |
| My Tasks | `values[Assigned Individual] = me` on task/fulfillment forms |
| My Approvals | `type = "Approval" AND values[Assigned Individual] = me` |
| Team Queue | `values[Assigned Team] = myTeam AND values[Assigned Individual] IS NULL` |
| My Work | Combined: My Tasks + My Approvals in one view |

### Index Requirements

For the above queries to work, create indexes on:
- `values[Assigned Individual]`
- `values[Assigned Team]`
- `values[Status]`
- Compound indexes for combined filters: `[Assigned Individual, Status]`, `[Assigned Team, Status]`, `[Assigned Individual, Assigned Team, Status]`

See the approval form JSON for a real-world example of comprehensive compound indexes.

---

## SLA Tracking and Escalation Pattern

Kinetic does not have built-in SLA management — it's implemented via workflows.

### Basic SLA Pattern

```
Workflow creates a work item (task, approval, etc.)
  → Workflow branches:
      Path 1: Normal flow (wait for completion via deferral)
      Path 2: SLA monitoring
        → Read SLA duration from form attribute (e.g., "SLA Hours" = "24")
        → Wait step (configured for SLA duration)
        → After wait: check if the work item is still open
        → If still open: send notification, escalate (reassign), update Due Date
        → Optionally: wait again for a second escalation level
```

### SLA Configuration via Attributes

```json
{"name": "SLA Hours", "values": ["24"]},
{"name": "Escalation Team", "values": ["IT Management"]},
{"name": "SLA Notification Template", "values": ["SLA Warning"]}
```

The workflow reads these attributes to drive SLA behavior. Changing the SLA for a specific form requires only an attribute update — no workflow changes.

### SLA Routine

For consistent SLA behavior across all request types, create an **SLA routine** that accepts:
- Submission ID of the work item
- SLA duration (or reads it from the form's attributes)
- Escalation team / individual
- Notification template name

The routine handles: wait → check → notify → escalate. Any workflow calls this routine to add SLA tracking.

### Due Date Field

A `Due Date` field on the form allows the UI to display the SLA deadline. The workflow calculates and sets it:
```
Due Date = submission created time + SLA Hours
```

---

## External System Sync Pattern

For bidirectional integration with external systems (ServiceNow, Jira, Salesforce, etc.).

### Kinetic → External System → Callback

```
1. Workflow creates record in external system (via Connection/Operation)
2. External system returns its ID → store on submission (e.g., "SNOW SYS ID" field)
3. Workflow hits Deferral step → generates token
4. Deferral token is passed to external system (stored with the record)
5. External system completes work → calls Kinetic WebAPI with deferral token
6. WebAPI creates Trigger → original workflow resumes
7. Workflow reads external system's response and branches accordingly
```

**Key insight:** The external system only needs to know one thing — a URL to call with a token. It doesn't need to understand Kinetic's internal architecture.

### Status Sync

For ongoing status sync (not just one-time callback):
- Use a **polling workflow** that periodically checks the external system for status changes
- Or configure the external system to call a WebAPI whenever status changes (event-driven)
- The WebAPI workflow looks up the Kinetic submission by the external system's ID and updates status

---

## Bulk Operations

### Mass Submit (Validated, Triggers Workflows)

- Upload CSV via UI or use POST API
- Submissions ARE validated (required fields, patterns, etc.)
- Workflows DO fire for each submission
- **Plan for workflow engine backlog** when submitting thousands of records
- Concurrency of ~15 parallel API calls yields ~28 records/second

### Mass Import (No Validation, No Workflows)

- Upload CSV via UI or use PATCH API
- Submissions are NOT validated
- Workflows do NOT fire
- Required metadata: `createdBy`, `updatedAt`, `updatedBy` (always); `submittedBy` (when Submitted/Closed); `closedBy` (when Closed)
- **Use for:** data migrations, backfilling historical records, seeding test data
- Custom timestamps supported (set `createdAt`, `submittedAt`, `closedAt` to historical values)

### Migration Strategy

1. Verify form field names match CSV columns: `GET /kapps/{kapp}/forms/{form}?include=fields`
2. Use PATCH (import) for historical data — preserves original timestamps, avoids workflow storms
3. Use POST (submit) only when you want workflows to fire for each record
4. Consider temporarily deactivating trees during bulk import if using POST
5. Bulk creation triggers active workflows — if trees are bound to "Submission Created," every PATCH-less POST generates a workflow run
