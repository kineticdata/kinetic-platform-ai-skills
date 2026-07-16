---
name: architectural-patterns
description: "Use when designing or implementing a common Kinetic business-process pattern — approval workflows, the deferral/Create-Trigger wait-for-callback mechanism, multi-stage fulfillment, SLA tracking, external system sync, work routing/assignment, or bulk operations across submissions."
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

The workflow reads this attribute to determine which email template to send. This allows different forms to use different notification templates without changing the workflow.

**Important:** The `smtp_email_send` handler is a **built-in handler** that can be configured with SMTP credentials to send emails. However, there is no built-in email **templating** system. Email templates are an **implementation-specific pattern** — typically built by storing templates as form submissions (in a datastore form), with a workflow routine that fetches the template and does string replacement for variables before passing the result to `smtp_email_send`.

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

**Team-name resolution gotcha.** When using a queue task routine (e.g., `routine_kinetic_queue_task_create_v1`) with an `Assignee Team` input, the inner `Queue Assignment Validate` step has been observed to silently fall back to the `Default` team when the supplied team name does not resolve to an existing team. The task is created and assigned, but to the wrong queue — no error, no warning. Validate the team-name input upstream (e.g., a workflow node that fetches the team and errors on miss) when correct routing matters.

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

## Kinetic-as-ITSM-Frontend Pattern

Used when Kinetic is the request-intake and tracking layer in front of a system-of-record ticketing platform (BMC Remedy, ServiceNow, Jira Service Management, Cherwell). Customers picking this pattern aren't replacing the SoR — they're putting a friendlier portal in front of it and using Kinetic to handle the intake form library, approvals, and the work-item handoff. The SoR keeps the official ticket, work-log, SLA clock, and reporting.

### Shape

Kinetic owns: form catalog (hundreds of intake forms), approval routing, requester-facing tracking. The SoR owns: ticket lifecycle, agent work, work-log, SLA, reporting. A workflow on the Kinetic side creates the SoR ticket, stores the SoR's ticket ID back on the Kinetic submission, and from then on the two sides stay in loose sync via an outbound workflow + an inbound webhook.

### The four moving pieces

1. **Fulfillment Case Type form attribute.** Each request form carries an attribute (often `Case Type`, `Ticket Type`, or `Fulfillment Type`) whose value drives which SoR ticket type, queue, or template gets created. The workflow reads `@form['attributes']['Case Type']` (or similar) to decide what to call into the SoR. This attribute is set at the form-definition level, not at submission time — it's part of the form's metadata, like the form's display name.

2. **Assignment-group bridge.** A bridge model that resolves "what SoR queue / assignment group handles this case type" from a lookup table. The lookup typically lives in a Kinetic datastore form (one row per case type → assignment group → SLA tier), and the bridge is queried at submit time so the workflow knows where to send the ticket on the SoR side. This is the integration point where Kinetic's form catalog meets the SoR's operational topology.

3. **Person/identity bridge.** A bridge model that resolves the requester's identity from LDAP/AD/HR — typically returning 10–20 denormalized fields (department, location, manager, cost center, employee ID, phone). The bridge is invoked from a Change event on the Requester field; the resulting fields land in a hidden section on the submission. See the identity-denormalization note in `recipes/create-submission-form` for the form-side mechanics.

4. **Work-log denormalization datastore.** A Kinetic datastore form that mirrors the SoR's work-log entries for read-only display on the requester-facing tracking page. The SoR writes via webhook (one row per status change or agent update); the Kinetic tracking page reads via bridge. This exists so the requester can see "Assigned to Network Team — 6/12" without Kinetic needing live read access to the SoR.

### Workflow shape

The submit-side workflow (Kinetic → SoR) is:

1. Read the form's `Case Type` attribute.
2. Query the assignment-group bridge → get queue/group/SLA tier.
3. Build the SoR create-ticket payload from the submission's values + the bridge result + the identity fields.
4. Call the SoR's create-ticket endpoint via a Connection/Operation (`system_integration_v1`).
5. Store the returned SoR ticket ID on the Kinetic submission (`Ticket ID` field).
6. Optionally: write an initial row to the work-log datastore so the tracking page shows "Submitted" immediately.

The receive-side flow (SoR → Kinetic) is a webhook or scheduled poll that updates the Kinetic submission's status and appends to the work-log datastore as the SoR ticket progresses.

### What it looks like in real customer exports

Customers running this pattern tend to have: a `Case Type` (or equivalent) form attribute on every intake form; a bridge model pointing at an assignment-group lookup; an Operation per SoR ticket type (create-incident, create-change, create-service-request); a `work-log` or `ticket-history` datastore form; and a webhook receiver under `webApis/` that handles inbound SoR updates. If you see all five of those shapes together, you're looking at this pattern.

### When NOT to use this pattern

Don't reach for this if Kinetic owns the fulfillment work — i.e., agents do their work inside Kinetic, in a `queue` kapp, against Kinetic-native work-item forms. In that case there's no SoR to sync with; use the standard fulfillment queue pattern instead. The ITSM-frontend pattern is specifically for "Kinetic is the portal, $other_system is the ticketing platform."

### Common pitfall

Don't try to keep the two sides in tight real-time sync. The webhook from the SoR will lag, will occasionally drop, and will sometimes deliver out of order. Build the Kinetic side to tolerate stale status (show "Last updated 6/12 14:32" on the tracking page) rather than depending on the work-log being current to the second. The work-log datastore is a cache, not a source of truth.

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

---

## Closure Is Not a Write Lock

The `coreState` lifecycle (`Draft` → `Submitted` → `Closed`) is a workflow indicator, not a write-protection mechanism. Closed submissions remain fully mutable via every documented API surface: direct `PUT`/`PATCH /submissions/{id}`, `routine_kinetic_submission_update_v1` from workflows, and `kinetic_core_api_v1` workflow calls. All accept value writes against `coreState: "Closed"` records with HTTP 200, no error, and no audit signal — verified May 2026 across a 12-cell test matrix.

This matters for any pattern that relies on closure as a signal that the record is immutable — audit trails, compliance archives, signed approvals, regulatory hold. **None of those are enforced by the platform automatically.** A common anti-pattern is assuming `coreState: "Closed"` plus a status field like `values['Status'] == 'Approved'` gives a tamper-evident approval record. It does not — both the coreState and the Status field can be silently mutated by any workflow or admin API call afterwards, with no audit entry in the platform's standard responses.

If your design needs real post-closure immutability, choose one of:

- **Security policies (most robust).** Write a KSL policy that denies update permissions when `submission.coreState == 'Closed'`. The policy is platform-evaluated and blocks both direct API and workflow writes. See `security-policies/SKILL.md` for the policy definition syntax and binding model.
- **Separate audit kapp.** When a submission closes, snapshot the relevant values into a dedicated audit-trail kapp via workflow. Make the audit kapp's submissions effectively read-only via a security policy that denies updates. The original kapp's submission can still be mutated for downstream business needs without compromising the audit record.
- **Workflow filters (limited).** For workflows that update submissions, gate the update behind a `coreState != 'Closed'` filter or connector expression. This only protects against workflow-driven writes — direct API calls still bypass it — but is useful when workflow mutations are the only realistic write path.

Technically, `routine_kinetic_submission_update_v1` and `kinetic_core_api_v1` both mutate Closed submissions without any platform resistance — but treat that as an escape hatch for deliberate post-closure corrections, not a design pattern. **The convention is that Closed submissions should not be updated**; Draft and Submitted submissions are fine to update. The takeaway stands: the implicit "Closed = locked" assumption is incorrect, so if closure must mean immutable, enforce it explicitly with one of the options above.
