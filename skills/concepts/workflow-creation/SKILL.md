---
name: workflow-creation
description: "Use when creating or managing Kinetic workflow trees via the Task API — building a new tree, uploading treeJson, formatting tree titles ({sourceName} :: {sourceGroup} :: {name}), parsing /export or ?include=treeJson/treeXml responses, binding events, configuring sources, workflow filters, or discovering handlers."
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

### Fetching `treeJson` from the Tree API

When you fetch a tree with `?include=treeJson` (e.g., `GET /trees/{title}?include=treeJson`), the `treeJson` is at the **top level** of the response — not nested under a `tree` key.

```json
{
  "title": "Kinetic Request CE :: ... :: My Workflow",
  "name": "My Workflow",
  "status": "Active",
  "treeJson": { "nodes": [...], "connectors": [...] }
}
```

This is different from `?include=treeXml` and from the `/export` endpoint described above, both of which wrap the content under a `tree` field.

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
Title = `{sourceName} :: {sourceGroup} :: {workflowName}`:
```
Kinetic Request CE :: bee52c65-dbae-4959-894e-b659e59eaba1 :: User Created
Kinetic Request CE :: 9a2adb12-12c5-410a-99cc-4ba7d03f03d3 :: Laptop Request Approval
```

Where:
- **sourceName** = The system generating events (usually `Kinetic Request CE`)
- **sourceGroup** = UUID of the form/entity, or a named group (`Space`, `WebApis`, etc.)
- **workflowName** = The workflow's `name` field, NOT the event name. For workflows registered via `POST /kapps/{kapp}/forms/{form}/workflows`, the third part is whatever you set as the workflow `name` (e.g., `"Laptop Request Approval"`), even though the workflow is bound to an event like `"Submission Submitted"`. The two are often the same for system-generated workflows (e.g., `User Created`), but for custom workflows they can differ.

### Special Tree Sources
- `Kinetic Task :: Run Error :: Notify on Run Error` — Task engine errors
- `Kinops :: System Alert :: Created` — System alerts
- `Kinetic Request CE :: Space :: Created` — Space-level events
- `Kinetic Request CE :: WebApis :: sample` — Web API trees
- `Kinetic Request CE :: WebApis > services :: jdstest` — Nested Web API trees

---

## Creating Trees via API

> **Use the Core API for event-triggered form/kapp workflows — NOT this Task API route.** The `POST /app/components/task/app/api/v2/trees` route below is for **routines and WebAPI trees** only. Event-triggered form and kapp workflows must be created through the Core API (`POST /app/api/v1/kapps/{kapp}/forms/{form}/workflows` or `POST /app/api/v1/kapps/{kapp}/workflows`). A tree created directly via the Task API for a form/kapp event becomes **orphaned**: its `guid` won't match a `sourceGroup`, it's missing the `event`/`platformItemType`/`platformItemId` bindings the Core API sets, it won't appear in the admin UI, and it may be garbage-collected. See the Workflow Engine skill for the full event-binding flow.

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

> **Use `/app/components/task/app/api/v2/trees`, NOT `/kinetic-task/app/api/v2/trees`.** Both paths exist in older Kinetic deployments, but the `/kinetic-task/...` variant silently drops `inputs` and `outputs` on POST — producing routines with no public interface. The `/app/components/task/...` path is the correct namespace on current platform versions. If a routine's declared inputs/outputs aren't appearing in the GET response after creation, check the path you POSTed to.

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

**`stale_record` errors on PUT.** If the tree has been modified (manually or by a concurrent process) since you last fetched its `versionId`, a PUT with the now-stale `versionId` returns `{"errorKey":"stale_record"}`. The fix is to re-fetch the current `versionId` and retry:

```bash
CURRENT=$(curl -s -u "$USER:$PASS" \
  "{base}/app/components/task/app/api/v2/trees/{encoded-title}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('versionId'))")
curl -X PUT -u "$USER:$PASS" \
  "{base}/app/components/task/app/api/v2/trees/{encoded-title}" \
  -H "Content-Type: application/json" \
  -d "{\"treeJson\": $TREE_JSON, \"versionId\": \"$CURRENT\"}"
```

For new trees that have never been edited, `"versionId": "0"` is correct. Stale-record retries are common during iterative development — bake the fetch-versionId step into any tree-PUT script.

**`versionId` must be a JSON string, not a number.** Passing `"versionId": 5` (no quotes) returns HTTP 500 with `{"message":"java.lang.Long cannot be cast to java.lang.String"}` — loud, not silent, but easy to hit if you're building the body in a language that auto-coerces numeric strings. Always quote it: `"versionId": "5"`. Verified May 2026: number form returns 500, string form returns 200.

### Programmatic Construction Gotchas

**Python f-strings collide with Ruby ERB interpolation.** Both languages use `{...}` for substitution: Python f-strings substitute `{var}` at string-build time, Ruby ERB substitutes `#{var}` at runtime. When you generate ERB from a Python f-string, Python silently absorbs `{role}` as a variable and leaves the `#` literal — producing malformed ERB like `"#Finance review: ..."` instead of `"Finance review: ..."`. The bug is invisible until the workflow runs and the rendered ERB looks wrong (or, worse, parses but reads incorrectly).

Workarounds when generating ERB programmatically from Python:
- **String concatenation** (`+`) — clearest separation of Python vs Ruby syntax.
- **`str.format()` with escaped braces** — `'#{{@values[\'X\']}}'.format(...)` (`{{` escapes to a single `{`).
- **Raw triple-quoted strings** for ERB blocks, with Python interpolation done outside via concatenation.

The same logic applies to f-strings around any treeJson string field that contains `{` or `}` — connector `value` expressions, parameter `value` ERB, ERB-templated JSON payloads. When in doubt, check the stored result via `GET /trees/{title}?include=treeJson` and `repr()` the parameter value.

**JSON-transport double-escape variant.** A related failure mode shows up when generating ERB programmatically and embedding strings into JSON parameter values. If the source-language string contains escaped quotes intended to render as plain quotes inside the stored ERB (e.g., Python `"@values[\\\"Field Name\\\"]"`), the escapes can pile up across two layers (source-language string literal → JSON encoding → Ruby ERB parser at runtime) and end up as literal backslash-quote sequences in the saved tree. Symptoms: `SyntaxError` in the Ruby parser when the parameter is evaluated.

Workarounds:
- **Single quotes for Ruby Hash KEYS, double quotes for VALUES that interpolate.** `@values['Field Name']` needs no escaping inside Python (or JS, Java) double-quoted strings — single quotes are clean for keys. But Ruby Hash VALUES that contain `#{...}` interpolation (e.g., `"#{@values['Vendor Name']} approved"`) MUST use double quotes — single-quoted Ruby strings don't interpolate AND can't contain unescaped single quotes (so a single-quoted value with `#{@values['Field']}` inside is a Ruby parse error: the inner `'` closes the outer string mid-stream). The pattern that holds programmatically: `{'Key' => "value with #{@values['Field']}"}` — single quote the key, double quote the value when the value needs interpolation.
- **String concatenation rather than templated literals.** Build the ERB by concatenating pieces (`'<%= ' + something + ' %>'`) so each layer's escaping is unambiguous.
- **Inspect the stored result.** `GET /trees/{title}?include=treeJson` then `repr()` the parameter value. Stored ERB containing `\\\"` instead of `"` is a classic sign of double-escape — the runtime Ruby parser sees backslash-quote, not a properly-escaped quote.

Observed in practice (multiple build tests across May 2026):
- The double-escape variant — `@values[\\\"Field Name\\\"]` in Python source becoming literal `\"` in stored ERB. Switching to `@values['Field Name']` fixed it.
- The single-quoted-value variant — `{'Summary' => 'High-risk: #{@values['Name']} ...'}` produced a severe Ruby SyntaxError at runtime. The error surfaced as `java.lang.RuntimeException` on `BranchHeadTrigger` (engine couldn't even start the run, zero tasks created) rather than a specific `Node Parameter Error`, because the ERB parse error was severe enough to crash the engine before any node executed. Switching the value to double quotes — `{'Summary' => "High-risk: #{@values['Name']} ..."}` — resolved cleanly.

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

---

## Programmatic Workflow Creation (Core API)

**Always use the Core API for creating/updating/deleting workflows.** The Task API v2 PUT silently ignores tree XML content.

### Core API Workflow Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/app/api/v1/kapps/{kapp}/workflows` | List workflows + orphan diagnostics |
| POST | `/app/api/v1/kapps/{kapp}/workflows` | Create workflow (auto-registers with platform) |
| PUT | `/app/api/v1/kapps/{kapp}/workflows/{id}` | Update workflow / upload tree definition |
| DELETE | `/app/api/v1/kapps/{kapp}/workflows/{id}` | Soft-delete workflow |

**No standalone `GET /workflows/{id}` exists.** A 404 is returned for `GET /app/api/v1/workflows/{id}` (without the kapp/form scoping). To read a single workflow's metadata, either:
- Use the kapp- or form-nested list: `GET /app/api/v1/kapps/{kapp}/workflows` or `GET /app/api/v1/kapps/{kapp}/forms/{form}/workflows`, then filter by `id`, OR
- Use the Task API by tree title: `GET /app/components/task/app/api/v2/trees/{url-encoded-title}` (see the Tree Title Format section above for the title format).

### Two-Step Creation

1. **Create:** `POST /workflows` with `{name, event, type:"Tree", status:"Active"}`
   - Returns `id` (UUID) — also used as `sourceGroup` in Task API
   - Auto-sets `platformItemType`, `platformItemId`, `guid === sourceGroup`

2. **Upload definition:** `PUT /workflows/{id}` with `{"treeXml": "<taskTree>...</taskTree>"}`
   - Must be ONLY the `<taskTree>` inner element — NOT the full `<tree>` wrapper
   - Server adds the wrapper automatically

**Response shape on POST/PUT `/workflows`:** the response body is a flat workflow object — `{id, name, event, status, ...}` — NOT wrapped under a `workflow` key. Code that reads `response.workflow.id` will fail; read `response.id` directly. (Contrast with `/trees` and `/forms` endpoints, which often nest the entity under a top-level key.)

**`?include=treeJson` is silently ignored on the form-scoped workflow list.** `GET /app/api/v1/kapps/{kapp}/forms/{form}/workflows?include=treeJson` returns the workflows without the `treeJson` payload. To read a workflow's tree, either fetch via the Task API by title (`GET /app/components/task/app/api/v2/trees/{title}?include=treeJson`) or use the kapp-scoped workflow list, where the include parameter is honored.

### Kapp-Level vs Form-Level Workflows

- **Kapp-level:** `POST /kapps/{kapp}/workflows` — fires for ALL forms in the kapp
- **Form-level:** `POST /kapps/{kapp}/forms/{form}/workflows` — fires only for that form
- Both share the same tree infrastructure in the Task API

### Architecture: Core vs Task

The Workflow Engine (Task) is a **separate web app** that runs independently from Core (the forms engine). However, the Task API is proxied through Core at `/app/components/task/app/api/v2/...` — this is the recommended way to access Task because Core applies permissions. Never call the Task engine host directly in production.

**CRUD pattern:**
1. **Create** workflow via Core: `POST /app/api/v1/kapps/{kapp}/forms/{form}/workflows` — this creates the tree AND registers it with the form
2. **Update** workflow (including uploading tree definition) via Core: `PUT /app/api/v1/workflows/{id}` — use `treeXml` or `treeJson` in the body
3. **Read** tree details, triggers, runs via Core-proxied Task API: `/app/components/task/app/api/v2/trees/{title}`, `/runs`, `/triggers`
4. **Delete** workflow via Core: `DELETE /app/api/v1/kapps/{kapp}/forms/{form}/workflows/{id}` — **form-nested URL required**. The flat `DELETE /app/api/v1/workflows/{id}` returns 404 ("Unable to locate the {id} Workflow"), mirroring the no-standalone-GET rule on form-level workflows. Verified May 2026.

**IMPORTANT:** These are completely separate queries. `GET /kapps/{kapp}/workflows` returns **only kapp-level** workflows — form-level workflows are invisible. To discover ALL workflows in a kapp, you must iterate each form with `GET /kapps/{kapp}/forms/{form}/workflows`. The `platformItemType` field distinguishes them: `"Kapp"` vs `"Form"`.

### `filter` PUT requires the nested URL on form- and kapp-level workflows

The flat `PUT /app/api/v1/workflows/{id}` endpoint **silently no-ops the `filter` field** for form-level and kapp-level workflows. The PUT returns HTTP 200 with the new filter value echoed in the response body, but:

- The form-nested GET (`/kapps/{kapp}/forms/{form}/workflows/{id}`) still shows the OLD filter
- The runtime engine continues honoring the OLD filter — no gating change takes effect

Other top-level workflow fields PUT via the flat URL **persist correctly**: `name`, `status`, `event` all reflect in the form-nested GET and (where verifiable) take effect at runtime. The `filter` field is the lone exception.

**Use the nested PUT URL to change a filter:**

- **Form-level workflows** (`platformItemType: "Form"`): `PUT /app/api/v1/kapps/{kapp}/forms/{form}/workflows/{id}` with body `{"filter": "..."}`. Verified end-to-end May 2026 — form-nested GET reflects the new value, and the runtime gates submissions correctly.
- **Kapp-level workflows** (`platformItemType: "Kapp"`): by analogy, `PUT /app/api/v1/kapps/{kapp}/workflows/{id}` should work. Not directly verified; treat as expected-but-unverified until tested.
- **Space-level workflows** (`platformItemType: "Space"`): the flat URL appears to write the filter persistently (flat GET shows the new value), but runtime enforcement was not verified. Treat as expected.

**Why this matters:** the flat-PUT-200-echoes-the-value pattern looks like success in every script log. There's no error, no warning, no audit signal. The bug only surfaces when later runtime behavior doesn't match what the response body said the filter is — typically wasted debugging cycles after several workflow runs fail to gate correctly.

Verified May 2026 across form-level and kapp-level workflows. An earlier approach used `DELETE` + recreate to clear a bad filter — that works but is unnecessarily destructive; the simpler and non-disruptive fix is using the nested PUT URL.

### Why NOT Task API for Workflow Creation

- `PUT /trees/{title}` with XML content returns HTTP 200 and bumps `versionId` but does NOT persist the XML
- Trees created via `POST /trees` lack platform registration — flagged as "orphaned" and may be deleted
- `guid !== sourceGroup` when created via Task API — admin UI shows "Unable to retrieve tree by GUID"

### Supported Events

**Warning:** The API accepts ANY string as the event name without validation. Invalid event names (like typos) are silently accepted but the workflow will never fire. Always use one of the exact names below.

| Category | Valid Event Names |
|----------|------------------|
| **Space** | `Space Login Failure` |
| **User** | `User Login`, `User Logout`, `User Created`, `User Updated`, `User Deleted`, `User Membership Change` |
| **Submission** | `Submission Created`, `Submission Submitted`, `Submission Updated`, `Submission Saved`, `Submission Closed`, `Submission Deleted` |
| **Form** | `Form Created`, `Form Updated`, `Form Deleted`, `Form Restored` |
| **Team** | `Team Created`, `Team Updated`, `Team Deleted`, `Team Restored`, `Team Membership Change` |

**Scope determines which events are available:**
- **Form-level workflows** — Submission events only
- **Kapp-level workflows** — Submission + Form events (fires for all forms in the kapp)
- **Space-level workflows** — All events (Space, User, Team, plus Submission/Form across all kapps)

Note: `Submission Saved` fires on every save (including Draft saves). `Submission Submitted` fires when a submission becomes `Submitted` — either via a POST with `coreState:"Submitted"` or a PUT transitioning Draft → Submitted (see the callout in "Workflow Events and coreState" in the Workflow Engine skill). `Form Restored` and `Team Restored` fire when a soft-deleted entity is restored.

### Workflow Response Shape

```json
{
  "id": "a03b7bb6-4766-486a-9944-ccbd40121241",
  "name": "On Submit",
  "event": "Submission Submitted",
  "filter": "",
  "sourceGroup": "a03b7bb6-4766-486a-9944-ccbd40121241",
  "type": "Tree",
  "status": "Active",
  "platformItemType": "Form",
  "platformItemId": "230bacf6-32f5-11f1-98c0-6599b94dbb50",
  "ownerEmail": null,
  "notes": null,
  "versionId": "0",
  "createdAt": "2026-04-08T02:49:17.340Z",
  "createdBy": "admin@example.com",
  "updatedAt": "2026-04-08T02:49:17.340Z",
  "updatedBy": "admin@example.com"
}
```

**No version history.** `updatedAt` and `updatedBy` are snapshot-of-most-recent-PUT only. The Task API exposes no `/trees/{id}/versions` endpoint, no `/audits` sub-resource, and `?include=versions,history,audits` is silently ignored (no extra keys returned). Once a tree is mutated, the prior `treeJson` body is unrecoverable from the platform side, and there is no record of who made any intermediate change beyond the most recent one. `versionId` increments monotonically per PUT, which lets you detect that something changed but not what or by whom. For change forensics on production-critical workflows, plan an external audit trail — CI artifacts, cached GETs, or build-test transcripts. The same limitation applies to forms (no notes diff history) and submissions (no values diff history beyond the current snapshot). Verified May 2026 against an active playground space.

The `filter` field accepts KSL expressions for conditional triggering. **Critical: use function-call syntax** `values('Field')`, NOT bracket syntax `values["Field"]`.

```
// CORRECT — KSL function syntax with double-quoted string literals
"filter": "values('Status') == \"Open\""
"filter": "form('name') == \"Approval\""

// ALSO WORKS — single-quoted string literals
"filter": "values('Status') == 'Open'"

// WRONG — bracket syntax silently fails, workflow never fires
"filter": "values[\"Status\"] == \"Open\""
```

**Filter scope depends on workflow level:**
- **Form-level workflows** (Submission events) — filter can use `values('Field')`, `identity('username')`, `form('slug')`, `kapp('slug')`, `submission('property')`
- **Kapp-level workflows** (Form events) — filter can use `form('slug')`, `kapp('slug')` but NOT `values()` (no submission context)
- **Space-level workflows** (User/Team events) — filter can use `identity()`, `space('slug')` but NOT `values()`, `form()`, or `kapp()` (no form/kapp context)

The filter is evaluated by the Core API before triggering the Task engine. If the filter returns false, the workflow is silently skipped — no run is created.

**Change-detection in filters is NOT supported.** `values_previous()` is NOT a valid KSL binding even though `@values_previous` is available in node ERB. The filter accepts `values_previous('Status') != "X"` at registration but the binding returns nil/empty at runtime, so the filter never matches change-detection conditions. Workflow appears inert; no run created, no entry in `/errors`.

**Pattern: KSL filter + ERB connector guard.** Do the gross check in the filter on the current state, then guard the side-effect node inside the tree with a connector condition that uses `@values_previous`:

```json
// Workflow registration
{ "event": "Submission Updated",
  "filter": "values('Status') == \"In Repair\"" }
```

```json
// Connector inside the tree (start → side-effect node)
{ "from": "start", "to": "n1", "type": "Complete",
  "value": "@values_previous['Status'] != 'In Repair'" }
```

The KSL filter creates the run only when the current state matches; the connector blocks the side-effect node when it's a no-op update (Status was already "In Repair"). Empty runs (only `start` Closed) are produced for no-op PUTs but no external side effect fires.

The GET response also includes diagnostic arrays: `{ "migratable": [], "missing": [], "orphaned": [], "workflows": [...] }`


---

## Finding Trees for a Kapp/Form (Discovery)

The Task API `/trees` endpoint's `source` parameter filters by `sourceName`, NOT by kapp slug. All kapp/form/space-bound trees have `sourceName: "Kinetic Request CE"`. **Do NOT use `source={kappSlug}`** — it will return zero results.

### Tree binding model

| `platformItemType` | Scope | `sourceGroup` format | How to identify |
|---------------------|-------|----------------------|-----------------|
| `Space` | All kapps | Random UUID v4 | `platformItemId` = space UUID |
| `Kapp` | All forms in a kapp | Random UUID v4 | `platformItemId` = kapp UUID |
| `Form` | Single form | Random UUID v4 | `platformItemId` = form UUID |
| `null` | WebAPI | `"WebApis > {kapp-slug}"` | Match kapp slug in `sourceGroup` |

### The UUID mapping problem

The Core REST API v1 does **not** expose internal UUIDs for kapps or forms. The `platformItemId` on trees is a UUID v1 (time-based) that encodes the entity's creation timestamp.

**Solution: match by timestamp.** UUID v1's middle group encodes a 60-bit Gregorian timestamp (100ns ticks since 1582-10-15). Match each tree's `platformItemId` to a kapp/form by extracting the timestamp and finding the entity whose `createdAt` is within ~1 second.

```javascript
function uuidV1ToMs(uuid) {
  const p = uuid.split('-');
  if (p[2]?.[0] !== '1') return 0; // not UUID v1
  const timeHex = p[2].slice(1) + p[1] + p[0];
  const ts = BigInt('0x' + timeHex);
  return Number((ts - 122192928000000000n) / 10000n);
}

function matchEntityByUUID(platformItemId, entities) {
  const targetMs = uuidV1ToMs(platformItemId);
  if (!targetMs) return null;
  for (const e of entities)
    if (Math.abs(targetMs - new Date(e.createdAt).getTime()) < 1000) return e;
  return null;
}
```

### Algorithm to find trees for a kapp

1. Fetch all trees: `GET /app/components/task/app/api/v2/trees?source=Kinetic+Request+CE&include=details&limit=500`
2. Fetch all kapps with `include=details` (for `createdAt`)
3. Fetch forms for the target kapp with `include=details`
4. For each tree:
   - **WebAPI:** `sourceGroup` starts with `"WebApis > {kappSlug}"`
   - **Kapp-level:** `platformItemType === "Kapp"` and `matchEntityByUUID(platformItemId, kapps).slug === targetKapp`
   - **Form-level:** `platformItemType === "Form"` and `matchEntityByUUID(platformItemId, forms)` returns a match

> Used by the `/kinetic-health` and `/kinetic-explain-workflow` commands. If you need this in production code, the timestamp match has a 1-second tolerance — collisions are possible if two entities were created in the same second; in practice they're not, but it's worth knowing.
