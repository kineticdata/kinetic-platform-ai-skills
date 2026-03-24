---
name: kinetic-debug-run
description: Debug a Kinetic workflow execution — find failures and diagnose root causes
argument-hint: "[run-id or 'last failed']"
user-invocable: true
---

# Debug a Workflow Run

The user wants to debug a workflow execution. They may provide a run ID, or say "last failed" / provide no argument (find recent failures automatically).

## Step 1: Connect

Connect to the Kinetic Platform using `mcp__kinetic-platform__connect`.

## Step 2: Find the Run

**If run ID provided:** proceed to Step 3.

**If no run ID or "last failed":**
1. `list_triggers` with `status=Failed`, `limit=10`, `include=details` — find recent failures
2. Show the user a summary of recent failed triggers with run IDs, tree names, and timestamps
3. Ask which run to investigate (or auto-select the most recent)

## Step 3: Get Run Details

1. Get all triggers for the run: `list_triggers` with `runId={id}`, `include=details`
2. Note: Run status is always "Started" in the API — derive real status from triggers:
   - All triggers Closed → run completed successfully
   - Any trigger Failed → run failed
   - Any trigger with status New/Work In Progress → run is still executing or stuck

## Step 4: Analyze Triggers

For each trigger, check:
- **Status** — Closed (success), Failed (error), New (not started), Work In Progress (executing)
- **Node name** and handler — what was it trying to do?
- **Duration** — how long did the handler take?
- **Error details** — in the trigger's details/messages

## Step 5: Diagnose Common Failures

### ENGINE Run Error
The workflow engine itself failed to execute a node. Common causes:
- **Wrong Return node params** — WebAPI trees need `content, content_type, response_code`; event trees need `status, description`. Using the wrong set causes this error.
- **`system_return_v1` doesn't exist** — must be `system_tree_return_v1`
- **Wait param case sensitivity** — must be `"Time to wait"` and `"Time unit"` (caps + spaces), NOT `"time_to_wait"`

### Missing Handler Error
- Handler definition ID is wrong or handler is not installed
- `system_return_v1` → should be `system_tree_return_v1`
- Check handler exists: `list_handlers` and search for the definition ID

### Node Silently Missing
- **Duplicate node ID suffixes** — if two nodes share the same suffix (e.g., `utilities_echo_v1_1` and `system_wait_v1_1`), the builder drops one silently
- Export the tree and check for duplicate suffixes

### Stuck Run (triggers stay New/WIP forever)
- Start node may be stuck — manually advance with:
  `POST /app/api/v2/runs/{runId}/triggers` with `{"nodeId":"...","action":"Root","type":"Automatic","loopIndex":"/"}`

### Connector Condition Failures
- Connector `value` is a Ruby expression — check syntax
- Empty value = unconditional (always fires)

## Step 6: Check Related Resources

- **Active errors:** `list_triggers` with `status=Failed` across all runs for the same tree
- **Tree definition:** `get_tree` with `include=treeJson` (export endpoint may be broken — use this instead)
- **Handler details:** `get_handler` with the failing node's `definitionId` to check expected parameters

## Step 7: Report

Output a clear diagnosis:

```
Run #257649 — "Welcome Email" (form-level, Submission Created)
Status: FAILED

Timeline:
  1. ✓ Start (system_start_v1) — 0ms
  2. ✓ Build Email (utilities_echo_v1) — 2ms
  3. ✗ Send Email (smtp_email_send_v1) — FAILED
     Error: Connection refused to SMTP server

Root Cause: SMTP server is unreachable
Fix: Check SMTP handler source configuration — verify host/port/credentials
```

Suggest specific fixes based on the diagnosis.
