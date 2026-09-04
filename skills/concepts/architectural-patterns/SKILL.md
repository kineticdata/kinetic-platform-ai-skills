---
name: architectural-patterns
description: "Use when designing or implementing a common Kinetic business-process pattern — approval workflows, the deferral/Create-Trigger wait-for-callback mechanism, multi-stage fulfillment, SLA tracking, external system sync, work routing/assignment, bulk operations across submissions, scheduled/recurring jobs, or performing a privileged action on behalf of a lower-privilege user."
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

## Scheduled Jobs Pattern

Kinetic does not have built-in CRON-style job scheduling. This pattern implements recurring jobs using the workflow engine's Wait handler and recursive routines, making the engine itself the "always-on" scheduler. No user session or UI polling is required — once a job is activated, the workflow chain is self-sustaining.

### Overview

Two datastore forms work together:
- **Job configuration form** — stores schedule settings, target routine, and operational state
- **Execution log form** — one submission per run, providing audit trail and output chaining

A recursive routine handles the core loop: execute the job's target routine, record the result, calculate the next wait duration, sleep, wake, check guards, and repeat. The chain runs indefinitely until a guard condition stops it.

### Job Configuration Form

Slug: `scheduled-jobs` (or project-appropriate name). Type: Datastore.

| Field | Type | Purpose |
|-------|------|---------|
| Job Name | Text | Human-readable identifier |
| Description | Text (multi-line) | What the job does |
| Status | Text | `Active`, `Inactive`, `Paused`, `Restarting`, `Error` |
| Schedule Type | Text | `Interval` or `Time of Day` |
| Interval Minutes | Number | For Interval type — minutes between runs (minimum 1) |
| Schedule Time | Text | For Time of Day — target time in HH:MM (24h) |
| Schedule Days | Text | For Time of Day — JSON array of day names. Empty = every day |
| Timezone | Text | IANA timezone for Time of Day calculations. Defaults to space default |
| Job Target | Text | Identifier for the work to execute on each tick — typically a WebAPI slug, routine name, or operation ID depending on the execution strategy (see below) |
| Job Target Parameters | Text (multi-line) | JSON object of parameters passed to the target on each call |
| Max Runs | Number | Stop after N executions. Null = unlimited |
| Expires At | Date/Time | Stop after this timestamp. Null = never |
| Current Deferral Token | Text | Token of the currently waiting deferral (for restart mechanism) |
| Last Run ID | Text | Submission ID of the most recent run (for quick error lookup in UI) |

**Status lifecycle:**
- `Active` — chain is running (or will start on creation)
- `Inactive` — chain is stopped, won't restart automatically
- `Paused` — chain stops on next wake, can be reactivated
- `Restarting` — transient state during restart (prevents race conditions)
- `Error` — chain stopped due to execution failure, requires attention

### Execution Log Form

Slug: `scheduled-job-runs` (or project-appropriate name). Type: Datastore.

| Field | Type | Purpose |
|-------|------|---------|
| Job ID | Text | Submission ID of the parent job config |
| Run Number | Number | Sequential run number for this job |
| Status | Text | `Running`, `Success`, `Error`, `Skipped` |
| Started At | Date/Time | When execution began |
| Completed At | Date/Time | When execution finished |
| Duration Ms | Number | Execution duration in milliseconds |
| Routine Output | Text (multi-line) | JSON — whatever the routine returned |
| Error Details | Text (multi-line) | Error info if Status is Error |
| Next Run At | Date/Time | Calculated next execution time |

**Write pattern (Cassandra-aware):** Each run submission is written exactly twice — once on creation (`Status = 'Running'`) and once on completion (final status + output). This avoids tombstone accumulation from repeated updates to the same row. The job config submission is updated once per tick (deferral token + last run ID) plus on state changes (error, restart). Run count is derived from the most recent run's Run Number rather than maintained on the job row to minimize writes.

**Output chaining:** The workflow reads the previous run's `Routine Output` and merges it with the job's static parameters when calling the target. This enables stateful jobs — e.g., a sync job stores a cursor, a cleanup job stores the last processed timestamp.

### Execution Strategies

The scheduler is agnostic about *what* it executes on each tick. Three strategies:

| Strategy | Job Target stores | How it executes | Best for |
|----------|------------------|-----------------|----------|
| **WebAPI** (recommended) | WebAPI slug | HTTP POST to `/kapps/{kapp}/webApis/{slug}` | Low-code: admins create WebAPIs in the Console with workflow trees behind them. 30-second sync timeout but workflow continues async. |
| **Routine** | Routine title | Call the routine as a subroutine within the workflow | When the job logic must complete before the scheduler records the result. Requires the routine to exist in the Task engine. |
| **Operation** | Connection + Operation ID | `POST /app/integrator/api/execute` | When the job calls an external REST API or SQL query via the Integrator. |

**WebAPI strategy details:** Create a kapp-level WebAPI for each job type. Each WebAPI has a workflow tree behind it that does the actual work (send emails, clean up data, sync external systems). The scheduler calls the WebAPI via HTTP POST using `kinetic_core_api_v1` in the Execute Schedule Tick routine. The WebAPI response (or HTTP status) tells the scheduler if the job started successfully. Use a "List Schedulable WebAPIs" Operation on the Kinetic Platform connection to populate the admin UI dropdown.

**UI pattern:** Use an Integrator Operation (e.g., `GET /kapps/{kapp}/webApis`) to fetch the list of available targets and show them in a dropdown, rather than making users type identifiers manually. Include a link to the Console/Integrator for creating new targets.

### Workflow Architecture

Three components:

#### 1. Scheduler Start (Tree)

Bound to the job config form, event: Submission Submitted. Entry point that kicks off the recursive loop.

**Trigger note:** The form must go through the Draft → Submitted transition (e.g., via CoreForm or the submit action API) to fire the "Submission Submitted" event. Creating a submission directly with `coreState: 'Submitted'` in the POST body fires "Submission Created" instead — see Workflow Events and coreState in the Workflow Engine skill.

```
1. Validate config
   - Required fields present based on Schedule Type
   - Interval Minutes >= 1 (if Interval type)
   - Routine Name is not empty
   → If invalid: set job Status = 'Error', STOP

2. Call "Execute Schedule Tick" routine
   - Inputs: Job ID, Run Number = 1, Previous Output = null
```

#### 2. Execute Schedule Tick (Routine — recursive core)

Inputs: `Job ID`, `Run Number`, `Previous Output`

```
1. Re-read job submission (fresh state — never trust stale data)

2. Pre-execution guards (any fail → STOP)
   a. Status != 'Active' → STOP
   b. Max Runs != null AND last run's Run Number >= Max Runs → set job Status = 'Inactive', STOP
   c. Expires At != null AND now > Expires At → set job Status = 'Inactive', STOP
   d. Query execution log for Status = 'Running' on this Job ID
      → If found → STOP (concurrent execution lock — another chain is active)

3. Create run record (WRITE 1 of 2)
   - Job ID, Run Number, Status = 'Running', Started At = now

4. Execute the target routine
   - Read Routine Name and Routine Inputs from job submission
   - Merge static Routine Inputs + Previous Output (previous output keys override static)
   - Call the routine by name with merged inputs

5. Update run record (WRITE 2 of 2)
   - Success: Status = 'Success', Completed At, Duration Ms, Routine Output
   - Error: Status = 'Error', Completed At, Duration Ms, Error Details

6. If error → update job Status = 'Error', STOP
   (Broken chain requires admin attention — do not auto-retry)

7. Calculate wait duration
   - Interval: Interval Minutes × 60 seconds
   - Time of Day: seconds until next occurrence of Schedule Time
     on a valid Schedule Day in the configured Timezone
   - Enforce minimum floor of 60 seconds regardless of calculation

8. Write Next Run At on the run record

9. Wait (system Wait handler with calculated duration)
   - On the **Create connector** from the Wait node (fires immediately when
     Wait enters deferral): store `@task['Deferral Token']` and Last Run ID
     on the job submission. The deferral token does not exist until the Wait
     node starts — it must be captured via the Create connector, not before.

10. After wake (Complete connector from Wait) — re-read job submission
    - Status != 'Active' → STOP
    - Call self: Job ID, Run Number + 1, previous Routine Output
```

**Why re-read twice (steps 1 and 10):** Step 1 catches changes made while the previous tick was executing. Step 10 catches changes made during the Wait period. Both are necessary because the chain must respect admin actions at every opportunity.

#### 3. Restart Job (WebAPI)

A kapp-level WebAPI endpoint for restarting a stalled or errored job chain. Defined on the kapp that owns the scheduled-jobs form.

- **Method:** POST
- **Security:** Admin only
- **Input:** `jobId`

```
1. Read job submission
2. Query execution log for Status = 'Running' on this job
   - If found and recent (Started At within 2× interval or 30 min minimum)
     → Refuse restart, return error ("job is still running")
   - If found but stale → update that run to Status = 'Error'
3. Set job Status = 'Restarting' (transient — prevents race condition)
4. If Current Deferral Token exists → complete it
   (old chain wakes, sees Status != 'Active', stops gracefully)
5. Set job Status = 'Active', clear Current Deferral Token
6. Derive next Run Number from most recent run's Run Number + 1
7. Call "Execute Schedule Tick" routine
8. Return success response via `system_tree_return_v1` on a **Create connector**
   from the routine call — do not wait for the routine to complete
   (WebAPIs have a 30-second synchronous timeout; the routine runs indefinitely)
```

**The `Restarting` status prevents a race condition:** Without it, completing the old deferral token wakes the old chain, which re-reads the job, sees `Active`, and continues — now you have two chains. The `Restarting` intermediate state ensures the old chain sees a non-Active status and stops.

### Guard Summary

| Guard | Where Checked | Failure Action |
|-------|---------------|----------------|
| Status != Active | Before execution + after wake | Stop chain |
| Max Runs reached | Before execution | Set Status = Inactive, stop |
| Expires At passed | Before execution | Set Status = Inactive, stop |
| Concurrent run lock | Before execution | Stop (another chain is active). Note: this is a best-effort TOCTOU check — the `Restarting` status is the primary race-condition guard for the restart path |
| Minimum interval floor | Wait calculation | Clamp to 60 seconds |
| Stale run detection | Restart WebAPI | Mark stale run as Error, proceed |

### Time-of-Day Scheduling

For `Schedule Type = 'Time of Day'`, the Wait duration is calculated dynamically:

```ruby
# Pseudocode for next occurrence calculation
now = current time in job's Timezone
target_today = today at Schedule Time in job's Timezone

if Schedule Days is empty (every day):
  if target_today > now:
    next_run = target_today
  else:
    next_run = target_today + 1 day
else:
  # Find next valid day
  candidate = target_today
  if candidate <= now:
    candidate += 1 day
  while candidate.day_name not in Schedule Days:
    candidate += 1 day
  next_run = candidate

wait_seconds = (next_run - now).to_seconds
wait_seconds = [wait_seconds, 60].max  # enforce floor
```

**DST transitions:** When clocks spring forward, the target time may not exist (e.g., 2:30 AM is skipped). Use the next valid time. When clocks fall back, the target time is ambiguous (e.g., 1:30 AM occurs twice). Use the first occurrence. Implementations should document their DST policy.

### Index Requirements

**Job config form:**
- `Status` — filtering active/inactive jobs

**Execution log form:**
- `[Job ID, Status]` — concurrent run lock check + run history filtering
- `[Job ID, Run Number]` — fetching most recent run per job

### Security

Both forms should be restricted to admin-level access for display and modification. The workflow engine runs as system agent and can always read/write regardless of security policies.

The Restart WebAPI should enforce admin-only access via security policy.

### Admin UI Requirements

**Job list view:** Table of all jobs showing name, status (color-coded badge), schedule description, routine name, last run status/time, next run time, and run count. Actions: activate, pause, deactivate, restart (with confirmation), view history.

**Job create/edit:** Form with config fields. Conditional fields based on Schedule Type. Routine Name as dropdown or freetext. Routine Inputs as JSON editor.

**Run history view:** Per-job table of execution records sorted most recent first. Columns: run number, status badge, started at, duration, truncated output (expandable), error details. Paginated using server-side `pageToken` pagination (run history can grow large).

**Editing active jobs:** Changing config on an Active job (e.g., interval, routine name) takes effect on the next re-read — after the current Wait completes. There may be a delay of up to the old interval duration before the new config is picked up. Admins should be informed of this in the UI.

### Failure Modes and Recovery

| Failure | Symptom | Recovery |
|---------|---------|----------|
| Routine throws error | Job Status = Error, chain stops | Fix routine, use Restart WebAPI |
| Workflow engine restart | Wait node may not resume | Restart WebAPI re-enters the loop |
| Job misconfigured | Validation fails on start | Fix config, resubmit or restart |
| Runaway loop | Should not happen — minimum 60s floor + guards | Deactivate job via UI, chain stops on next wake |
| Two chains running | Lock check prevents execution | One chain stops at guard, other continues |

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

---

## Privileged Action via Utility Form

When a lower-privilege user needs to trigger an operation on a resource they cannot access directly (due to security policies), use a utility form as a trigger and a workflow (running as system agent) to perform the privileged operation.

### When to Use

- A user needs to create, update, or delete a record on a form they don't have submission access to
- A user action should trigger a side effect (email, external system call, record creation) that requires elevated permissions
- You want an audit trail of the request separate from the target record

### How It Works

```
User submits utility form (minimal fields: IDs + context)
  → Workflow fires as system agent (elevated permissions)
  → Workflow performs guard checks (duplicate detection, validation)
  → Workflow creates/updates the target record
  → Workflow sends notifications, triggers side effects
  → Workflow closes the utility form submission
```

### Setup

1. **Create a utility form** with only the fields needed to identify the action:
   - IDs of the target record(s) — e.g., Project ID, Volunteer ID
   - Context for notifications — e.g., display names, optional notes
   - Do NOT duplicate target record fields — the workflow reads those from the source

2. **Set form security** to allow the requesting user to submit (e.g., "Authenticated Users" or a role-based policy), while the target form's security remains restricted

3. **Build the workflow** (bound to Submission Submitted):
   - Guard logic first — query the target form for existing records before creating duplicates
   - Perform the privileged operation (create/update submissions on the restricted form)
   - Send notifications (email, in-app) with context from both the request and target records
   - Close the utility form submission

### Guard Pattern for Idempotency

Before creating the target record, query for an existing record with the same key fields:

- **If found in an active state** → no-op (workflow completes without error, client gets success)
- **If found in a removed/cancelled state** → reactivate (update status) instead of creating a duplicate
- **If not found** → create the new record

This makes the operation idempotent — submitting the same request twice is harmless.

### Key Benefits vs. Relaxing Security Policies

| Approach | Trade-off |
|----------|-----------|
| **Utility form + workflow** | More setup, but preserves least-privilege, adds audit trail, enables server-side validation and notifications |
| **Relax security policies** | Simpler, but gives users direct write access to the target form — no audit trail, no server-side guards, harder to add side effects |

### Portal Integration

The portal creates the utility form submission via `createSubmission()` from `@kineticdata/react`. The workflow handles everything else — the portal does not need to know about the target form's security or the workflow's logic. The portal should:

1. Check for existing records client-side (for UX — show status instead of button)
2. Submit the utility form on user action
3. Show success/error feedback
4. Optionally poll or refetch to reflect the workflow's result
