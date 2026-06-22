---
name: kinetic-test-workflow
description: Test a Kinetic workflow tree by submitting synthetic input, watching the run, and asserting per-node outputs
argument-hint: "<tree-title-or-form-event> [--input file.json]"
user-invocable: true
---

# Test a Workflow

The user wants to invoke a workflow with controlled input and verify it produced the expected outputs. Closes the gap between `/kinetic-workflow` (create) and `/kinetic-debug-run` (diagnose after the fact).

Parse the argument for one of three invocation modes:

| Mode | Argument shape | What gets triggered |
|---|---|---|
| Form event | `services/maintenance-request:Submission Submitted` | Creates a synthetic submission against the form; bound workflows fire |
| WebAPI | `webapi:my-handler-slug` | Direct invocation of the WebAPI URL with a body |
| Routine | `routine:Send Notification` | `POST /runs` against a Global Routine |

## Step 0: Read Reference

Read:
- `concepts/workflow-engine` — run/trigger lifecycle, deferral semantics.
- `concepts/task-api-reference` — `/runs`, `/triggers`, `/runs/{id}/tasks` endpoints.
- `commands/kinetic-debug-run` — diagnosis patterns (this command reuses much of that flow on failure).

## Step 1: Resolve the Target

For each mode, figure out which tree should fire and where to send input:

- **Form event:** confirm the form + event registration. `GET /app/api/v1/kapps/{kapp}/forms/{form}/workflows` — at least one workflow on the target event must be `status: "Active"`. Note its tree title.
- **WebAPI:** confirm the WebAPI exists. `GET /app/api/v1/kapps/{kapp}/webApis/{slug}` — note its `method` and the URL pattern.
- **Routine:** confirm the routine tree exists. `GET /app/components/task/app/api/v2/trees/{url-encoded-title}` — its `inputs` array describes the parameters.

If multiple workflows fire on the same event, all of them will run — the test invokes the event once and the assertions need to cover whichever tree is interesting.

## Step 2: Compose Synthetic Input

Load `--input <file.json>` if given, otherwise prompt the user for inline values OR derive defaults from the form/routine inputs:

```json
{
  "values": {
    "Summary": "Test request — synthetic",
    "Category": "Plumbing",
    "Priority": "Normal",
    "Description": "Created by /kinetic-test-workflow"
  },
  "coreState": "Submitted"
}
```

For WebAPIs: the body shape is whatever the WebAPI's tree expects from `@request.body`. For Routines: the inputs are positional or named per the routine's declared `inputs`.

**Tag the input** so the test submission is recognizable later — e.g. set a marker field (`'Test Run': 'true'`) or use a stable test-only `Summary` prefix. Workflow runs persist; tagging makes cleanup possible.

## Step 3: Invoke

### Form event mode

```
POST /app/api/v1/kapps/{kapp}/forms/{form}/submissions
Content-Type: application/json

{ "values": {...}, "coreState": "Submitted" }
```

Capture the returned `submission.id`. The platform queues active workflows for the event; runs appear in the Task API a moment later.

### WebAPI mode

```
POST /app/kapps/{kapp}/webApis/{slug}?timeout=10
Content-Type: application/json

{ "body": ... }
```

`timeout` ≤ 30 (see known-bugs Bug 4). For a synchronous test, set timeout to the longest you'll wait; the response is the WebAPI tree's Return content.

### Routine mode

```
POST /app/components/task/app/api/v2/runs?sourceName=-&sourceGroup=-&name={routine-title}
Content-Type: application/json

{ "input1": "...", "input2": "..." }
```

Capture the returned `id` (run id).

## Step 4: Locate the Run

For form-event and routine modes, the response doesn't always include a run id directly. Find it:

```
GET /app/components/task/app/api/v2/runs?include=details&limit=10
```

Filter for runs newer than the invocation moment, whose `tree.sourceGroup` matches your form's UUID (for form events) or whose `tree.name` matches your routine title.

For WebAPI mode with `timeout`, the synchronous response already returned — but you still want the run id for inspection:

```
GET /app/components/task/app/api/v2/runs?include=details&sourceGroup={url-encoded "WebApis > " + kappSlug}&limit=5
```

## Step 5: Wait for Completion

Poll the run's tasks until none are `New` or `Work In Progress`:

```bash
while true; do
  TASKS=$(curl -s "/runs/{id}/tasks?include=details")
  STATUSES=$(echo "$TASKS" | jq -r '.tasks[].status' | sort -u)
  case "$STATUSES" in
    "Closed"|"Closed Failed"|"Failed") break ;;          # done
    *Work\ In\ Progress*) ;;                              # still running
  esac
  sleep 2
done
```

Cap the poll loop with a timeout (default 60s for sync tests, 5min for tests that include deferrals). If the run is deferred, the test framework either:

- **Auto-completes the deferral.** Call the deferral callback the same way the real callback would (often a form-submit; see `recipes/add-approval-workflow` Phase E for the trigger-completion shape).
- **Reports the deferral and stops.** The test passes the "started successfully and reached the deferral" assertion but doesn't continue.

## Step 6: Assert Outputs

Compare against `--assertions <file.json>` or against expectations the user provided:

```json
{
  "expectedRunStatus": "Closed",
  "expectedNodes": {
    "Create External Ticket": {
      "status": "Closed",
      "results": {
        "Response Code": "201"
      }
    },
    "Write Ticket ID to Submission": {
      "status": "Closed"
    }
  },
  "expectedSubmission": {
    "values": {
      "Ticket ID": { "matches": "^TKT-[0-9]+$" }
    }
  }
}
```

The test runner:

1. Confirms the derived run status — all tasks closed without `Failed`.
2. For each `expectedNodes` entry, finds the matching task and checks `status` + each `results.<key>` (literal equality or regex match).
3. For `expectedSubmission`, re-fetches the submission with `include=values` and compares.

## Step 7: Cleanup (Optional)

If `--cleanup` is set, delete the synthetic submission and any child submissions the workflow created. Detect children via `GET /submissions/{id}?include=descendants` and DELETE them bottom-up.

For routines or WebAPIs that don't create submissions, cleanup is no-op — the run records themselves are retained for audit history.

## Step 8: Report

```
Test: services/maintenance-request — Submission Submitted
  Synthetic submission: a1b2c3-... (created)
  Run id: 4582 — tree "Maintenance Request - Submission Submitted"
  Duration: 1.4s   Tasks: 6

  ✓ Start (system_start_v1)               — Closed in 1ms
  ✓ Set Status Pending                    — Closed in 41ms
  ✓ Create External Ticket                — Closed in 312ms
      Response Code: 201   matches "^2\\d\\d$" ✓
  ✓ Write Ticket ID to Submission         — Closed in 89ms
  ✓ Notify Submitter                      — Closed in 22ms
  ✓ Return                                — Closed in 1ms

  Submission values:
    Ticket ID: TKT-9381    matches "^TKT-[0-9]+$" ✓

Test PASSED.
Cleanup: deleted submission a1b2c3-... and 0 child submissions.
```

On failure, dump the failing task's `Handler Error Message`, any `/errors` entries with matching `runId`, and the node's `Response Body` — same shape as `/kinetic-debug-run` output.

## Critical Rules

- **Active workflows fire automatically.** Creating a synthetic submission triggers EVERY active workflow bound to the event. If you want isolated testing, either deactivate other workflows first, or invoke the tree directly via the routine path (skips the event hook).
- **`coreState: "Draft"` bypasses workflows.** A Draft creation tests form validity but NOT workflow behavior. To test workflow behavior, create as Submitted or use the routine invocation path.
- **Bulk-creating tests floods the engine.** A test suite that creates 50 submissions in a tight loop generates 50 workflow runs. Throttle (concurrency ≤ 15) or use a dedicated test kapp where the trees can be temporarily deactivated.
- **Deferrals don't auto-complete.** If the workflow has a deferral, the test either auto-completes it (call the callback) or stops at the deferral and asserts the partial outcome.
- **Output assertions on `system_integration_v1` are sensitive to operation definition changes.** If the Operation's `outputs` mapping changes between when you wrote the assertion and when you run the test, the assertion will fail mysteriously.
- **Don't test against production.** Use a dedicated test kapp or test space. Tags + cleanup help but don't substitute for environment isolation.

## Related Commands

- `/kinetic-debug-run` — once the test fails, dig into root cause.
- `/kinetic-workflow` — created the tree this command tests.
- `/kinetic-seed` — produces realistic synthetic data that integrates with this command's `--input`.
