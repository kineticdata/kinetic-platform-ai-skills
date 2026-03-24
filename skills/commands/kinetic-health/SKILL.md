---
name: kinetic-health
description: Run a comprehensive health check on the Kinetic Platform
argument-hint: ""
user-invocable: true
---

# Platform Health Check

Run a comprehensive health check against the connected Kinetic Platform space. No arguments needed.

## Step 1: Connect

Connect to the Kinetic Platform using `mcp__kinetic-platform__connect`.

## Step 2: Run All Checks

Execute these checks in parallel where possible:

### 1. Space Status
- `get_space` with `include=details`
- Verify space is accessible, note space slug and name

### 2. Kapp Inventory
- `list_kapps`
- Count kapps, list names

### 3. User Count
- `list_users`
- Count active users

### 4. Failed Triggers (Last 24 Hours)
- `list_triggers` with `status=Failed`, `start={24h ago ISO}`, `limit=25`
- Count failures, group by tree name if possible

### 5. Active Errors
- `list_triggers` with `status=Failed`, `limit=10`, `include=details`
- Check for patterns (same tree failing repeatedly, etc.)

### 6. Handler Status
- `list_handlers` with `include=details`
- Check for any Inactive handlers

### 7. Source Status
- `list_sources` with `include=details`
- Check for any Inactive sources

### 8. Orphaned Workflows
- For each kapp from step 2, call `list_workflows`
- Check the `orphaned` and `missing` arrays in the response
- Orphaned = tree exists but no workflow registration; Missing = workflow registered but tree doesn't exist

### 9. Team Count
- `list_teams`
- Count teams

## Step 3: Generate Report Card

Output a formatted health report:

```
╔══════════════════════════════════════════╗
║     Kinetic Platform Health Report       ║
║     {space-name} — {date}                ║
╠══════════════════════════════════════════╣

Space Status:        OK
Kapps:               12
Forms:               47
Users:               8
Teams:               5

Workflow Engine:
  Failed (24h):      3 triggers across 2 runs
  Active Errors:     1
  Handlers:          24 Active, 0 Inactive
  Sources:           3 Active, 0 Inactive

Workflow Integrity:
  Orphaned Trees:    0
  Missing Trees:     1 (kapp: services, workflow: "Auto-Close")

╠══════════════════════════════════════════╣
║ Issues Found: 2                          ║
╠══════════════════════════════════════════╣

1. WARN: 3 failed triggers in last 24h
   Trees: "Welcome Email" (2), "Status Update" (1)
   → Run /debug-run to investigate

2. ERROR: Missing workflow tree
   Kapp: services, Workflow: "Auto-Close"
   → Workflow is registered but the backing tree was deleted
   → Fix: Delete the orphan workflow registration or recreate the tree

╚══════════════════════════════════════════╝
```

## Step 4: Suggest Fixes

For each issue found, provide actionable fix suggestions:

- **Failed triggers** → suggest `/debug-run` with the run ID
- **Inactive handlers** → handler may need reconfiguration or reinstallation
- **Inactive sources** → source connection details may be wrong
- **Orphaned trees** → tree exists without workflow registration, harmless but messy
- **Missing trees** → workflow registration points to non-existent tree, should be cleaned up
- **No issues** → report clean bill of health
