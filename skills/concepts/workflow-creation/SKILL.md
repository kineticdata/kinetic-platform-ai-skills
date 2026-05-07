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

Observed in practice (multiple dogfood tests across May 2026):
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
