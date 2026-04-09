---
name: workflow-creation
description: Creating and managing workflows via Core API — tree creation, treeJson upload, event binding, workflow filters, and sources.
---

# Workflow Creation & Management

How to create, update, and manage workflow trees via the Task API, including tree title
conventions, export format, treeJson upload, handler discovery, and source configuration.

For handler definition IDs, parameter reference, loops, deferrals, debugging runs, and
common gotchas, see `concepts/workflow-xml`.

---

## Export Response Format

The export endpoint returns JSON with a single `tree` key containing an XML string:
```json
{"tree": "<tree schema_version=\"1.0\">...</tree>"}
```
Parse the XML string from the `tree` field — it is **not** raw XML.

---

## Tree Title Format

### Global Routines
Title = just the name:
```
User Create
Email Template Notification Send
Handler Failure Error Process
```

### Trees (Event-Triggered Workflows)
Title = `{sourceName} :: {sourceGroup} :: {eventName}`:
```
Kinetic Request CE :: bee52c65-dbae-4959-894e-b659e59eaba1 :: User Created
Kinetic Request CE :: 3d440511-d011-4167-9de4-244a6fc19974 :: Team Updated
```

Where:
- **sourceName** = The system generating events (usually `Kinetic Request CE`)
- **sourceGroup** = UUID of the form/entity, or a named group (`Space`, `WebApis`, etc.)
- **eventName** = The trigger event (`Submitted`, `Created`, `User Created`, etc.)

### Special Tree Sources
- `Kinetic Task :: Run Error :: Notify on Run Error` — Task engine errors
- `Kinops :: System Alert :: Created` — System alerts
- `Kinetic Request CE :: Space :: Created` — Space-level events
- `Kinetic Request CE :: WebApis :: sample` — Web API trees
- `Kinetic Request CE :: WebApis > services :: jdstest` — Nested Web API trees

---

## Creating Trees via API

### POST to Create

```
POST /app/components/task/app/api/v2/trees
{
  "sourceName": "Kinetic Request CE",
  "sourceGroup": "WebApis > my-kapp",
  "name": "my-tree",
  "type": "Tree",
  "status": "Active",
  "treeXml": "<taskTree>...</taskTree>"
}
```

**Gotcha:** POST creates the tree metadata AND saves the `treeXml` in the same call.

### PUT to Update

```
PUT /app/components/task/app/api/v2/trees/{url-encoded-title}
{
  "treeJson": { ... },
  "versionId": "0"
}
```

**Use `treeJson` for updates** — it's more reliable than `treeXml` for round-trips and properly handles connector logic.

### Handlers API

**`GET /handlers` only returns handlers assigned to a handler category.** Handlers without a category are invisible in the list but still exist and work in trees. You can always fetch a specific handler directly by definition ID: `GET /handlers/{definitionId}?include=parameters,results`.

**Common unlisted handlers** (exist but not categorized by default):
- `utilities_create_trigger_v1` — complete/update deferred nodes
- `utilities_defer_v1` — immediately defer and return a token
- `utilities_echo_v1` — echo input to output (debugging)
- `system_integration_v1` — execute a Connection/Operation from workflow
- `system_submission_create_v1` — create a submission from workflow

System handlers (`system_start_v1`, `system_tree_return_v1`, etc.) are built into the engine and cannot be fetched via the handlers API at all — they have no handler record.

To discover ALL handlers on a server (including uncategorized), inspect the `definitionId` values in existing tree definitions via `GET /trees?include=treeJson`, then fetch each handler individually.

**Handler categories** are managed via the Task API:
```
GET /categories                          # List handler categories
```
Categories have `name`, `description`, and `type` (`"Integrated"` for system, `"Stored"` for user-installed). A handler must be assigned to at least one category to appear in `GET /handlers`.

Handler properties (connection credentials, etc.) are available via `include=properties`:
```
GET /handlers/{definitionId}?include=properties
```

### Sources API

The sources endpoint returns `sourceRoots` (not `sources`):
```json
{
  "count": 3,
  "sourceRoots": [
    {"name": "Kinetic Request CE", "status": "Active", "type": "Kinetic Request CE"},
    {"name": "Kinetic Task", "status": "Active", "type": "Kinetic Task"}
  ]
}
```
