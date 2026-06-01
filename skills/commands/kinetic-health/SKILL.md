---
name: kinetic-health
description: Run a comprehensive health check on the Kinetic Platform
argument-hint: ""
user-invocable: true
---

# Platform Health Check

Run a comprehensive health check against the connected Kinetic Platform space. No arguments needed.

> **Tooling:** these steps use the raw Core/Task REST API (see the Workflow Engine, Using the API, and Troubleshooting skills for endpoints and auth). If you have an MCP server that wraps these calls, use its equivalent tools — but the raw API is the source of truth.

## Step 1: Connect

Confirm you have the space URL and admin credentials (space-admin username/password or a bearer token). All calls below are authenticated requests against `{space-url}` — see the Using the API skill for auth setup.

## Step 2: Run All Checks

Execute these checks in parallel where possible:

### 1. Space Status
- `GET /app/api/v1/space?include=details`
- Verify space is accessible, note space slug and name

### 2. Kapp Inventory
- `GET /app/api/v1/kapps`
- Count kapps, list names

### 3. User Count
- `GET /app/api/v1/users`
- Count active users

### 4. Failed Triggers (Last 24 Hours)
- `GET /app/components/task/app/api/v2/triggers?status=Failed&start={24h ago ISO}&limit=25`
- Count failures, group by tree name if possible

### 5. Active Errors
- `GET /app/components/task/app/api/v2/errors?include=details&status=Active`
- Also pull `GET /app/components/task/app/api/v2/runs?include=details` for context
- Check for patterns (same tree failing repeatedly, etc.)

### 6. Handler Status
- `GET /app/components/task/app/api/v2/handlers?include=details`
- Check for any Inactive handlers

### 7. Source Status
- `GET /app/components/task/app/api/v2/sources?include=details`
- Check for any Inactive sources

### 8. Orphaned Workflows
The raw API has no `orphaned`/`missing` arrays — derive integrity by cross-checking Core-API workflow registrations against Task-API trees:
- List Core-registered workflows. These live in two SEPARATE places per kapp — query both:
  - Kapp-level: `GET /app/api/v1/kapps/{kapp}/workflows` for each kapp from step 2
  - Form-level: for each form (`GET /app/api/v1/kapps/{kapp}/forms`), `GET /app/api/v1/kapps/{kapp}/forms/{form}/workflows` — form-level workflows are invisible to the kapp-level call
- List the backing trees: `GET /app/components/task/app/api/v2/trees`
- Cross-check:
  - **Orphaned tree** = a tree whose `guid !== sourceGroup` (the linkage to its source group is broken), or a tree with no matching Core workflow registration. Tree exists but no live registration.
  - **Missing tree** = a Core workflow registration with no matching tree in the trees list. Registration points at a tree that no longer exists.

### 9. Team Count
- `GET /app/api/v1/teams`
- Count teams

## Step 3: Generate Report Card

Output a formatted health report (illustrative):

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
   → Run /kinetic-debug-run to investigate

2. ERROR: Missing workflow tree
   Kapp: services, Workflow: "Auto-Close"
   → Workflow is registered but the backing tree was deleted
   → Fix: Delete the orphan workflow registration or recreate the tree

╚══════════════════════════════════════════╝
```

## Step 4: Suggest Fixes

For each issue found, provide actionable fix suggestions:

- **Failed triggers** → suggest `/kinetic-debug-run` with the run ID
- **Inactive handlers** → handler may need reconfiguration or reinstallation
- **Inactive sources** → source connection details may be wrong
- **Orphaned trees** → tree exists without workflow registration, harmless but messy
- **Missing trees** → workflow registration points to non-existent tree, should be cleaned up
- **No issues** → report clean bill of health
