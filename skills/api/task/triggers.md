<!-- MANUALLY AUTHORED — pending OAS regeneration to replace this with auto-generated content. -->
<!-- Source: hand-authored to match auto-generated format. Promote to OAS-generated once spec covers /triggers. -->

# Triggers API Reference

Source: Kinetic Task REST API v2.0

> Hand-authored to fill a gap in the auto-generated reference. For run/trigger lifecycle semantics see `concepts/workflow-engine` and `concepts/task-api-reference`. For diagnosis flows that use these endpoints see `platform/troubleshooting` and `commands/kinetic-debug-run`.

A **trigger** is one node activation within a run. The engine creates a trigger when a deferrable node enters Work In Progress or when a downstream node is queued. Non-deferrable handlers (`defers=false`) execute inline during the parent trigger's processing and **never create their own trigger record** — they only appear in `/runs/{id}/tasks`. Use `tasks` for full-tree inspection; use `triggers` to find deferrals, failures, or to identify run boundaries.

---

### `GET /triggers`
**Operation:** `searchTriggers`
List trigger records.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `runId` (integer) | query | No | Filter to triggers from a specific run. |
| `status` (string) | query | No | `New`, `Work In Progress`, `Closed`, `Failed`, `Deferred`. Filter accepts a single value; multiple statuses require multiple calls. |
| `nodeId` (string) | query | No | Filter to triggers from a specific node id (e.g. `kinetic_core_api_v1_3`). |
| `nodeName` (string) | query | No | Filter by node display name. |
| `branchId` (integer) | query | No | Filter to a specific branch within a run. |
| `tree` (string) | query | No | Filter by tree title. |
| `source` (string) | query | No | Filter by source name. |
| `sourceGroup` (string) | query | No | Filter by source group. |
| `start` / `end` (string) | query | No | ISO timestamps bounding `createdAt`. |
| `include` (string) | query | No | `details` adds timestamps, `messages` adds engine messages, `results` adds the trigger's results hash. **`include=details` is required for trigger ids** — without it the `id` field is absent. |
| `offset` (integer) | query | No | Pagination offset. |
| `limit` (integer) | query | No | Max records per response. |
| `count` (boolean) | query | No | When `true`, suppresses records and returns only `count`. |

**Success response:** 200
```json
{
  "triggers": [
    {
      "id": 9821,
      "runId": 4582,
      "nodeId": "system_wait_v1_3",
      "nodeName": "Wait For Approval",
      "status": "Deferred",
      "token": "abc-123-...",            // only present on deferred triggers
      "results": { ... },
      "createdAt": "...", "updatedAt": "..."
    }
  ]
}
```

---

### `GET /triggers/{id}`
**Operation:** `getTrigger`
Fetch a single trigger by id.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | Trigger id |
| `include` (string) | query | No | `details`, `messages`, `results` |

> **The query-string variant `?id={id}` is ignored.** Use the path parameter form. Sending `GET /triggers?id=9821` returns the full list, not a single record.

**Success response:** 200

---

## Trigger Status Semantics

| Status | Meaning |
|---|---|
| `New` | Created but not yet picked up by an engine worker. Backlogged. |
| `Work In Progress` | An engine worker has it and is executing the handler. |
| `Closed` | Handler completed (success); the trigger's `results` are populated. |
| `Failed` | Handler errored. An accompanying record in `/errors` carries the failure details. |
| `Deferred` | The handler set `defers=true` and is waiting on a callback. `token` field is the deferral token. |

---

## Trigger vs Task

| Concept | Source endpoint | Records | When to use |
|---|---|---|---|
| **Trigger** | `/triggers` | One per node activation that the engine queued separately (deferrable handlers) | Find deferred work, identify run boundaries, filter by status |
| **Task** | `/runs/{id}/tasks` | One per node executed (including inlined non-deferrable handlers) | Full execution path, including the handlers that don't create their own triggers |

For "what happened in this run?" use **tasks**. For "what's deferred or stuck across all runs?" use **triggers** with a status filter.

---

## Related

- `concepts/workflow-engine` — run/trigger lifecycle in narrative form.
- `concepts/task-api-reference` — broader endpoint reference and the run-status-is-misleading rule.
- `api/task/runs.md` — runs and `/runs/{id}/tasks` endpoint shape.
- `api/task/errors.md` — companion endpoint for failure records.
- `commands/kinetic-debug-run` — primary consumer of these endpoints.
