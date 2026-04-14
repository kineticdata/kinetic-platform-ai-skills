---
name: troubleshooting
description: Diagnosing workflow failures, stuck runs, error management, common API error patterns, and platform debugging techniques.
---

# Troubleshooting

Patterns and techniques for diagnosing issues on the Kinetic Platform, based on real-world debugging of workflow failures and API errors.

---

## Workflow Run Diagnostics

### Run Status Is Misleading

`run.status` is almost always `"Started"` — even after the workflow has completed. The engine does not reliably update run status. **Never trust `run.status` to determine outcome.**

Instead, check triggers:

```
# Count failed triggers for a run
GET /triggers?runId={id}&status=Failed&count=true
→ count > 0 = run has failures

# Get all triggers to see full execution path
GET /triggers?runId={id}&include=details
```

For a quick success/fail check, use `limit=1` with `status=Failed` — if you get a result, the run failed.

### Diagnosing Failed Runs

1. **Get all triggers for the run:**
   ```
   GET /triggers?runId={id}&include=details
   ```

2. **Look for triggers with `status=Error`** — these are the failure points

3. **Check the `originator` field** — it indicates what caused the trigger:

| Originator Pattern | Meaning |
|-------------------|---------|
| `ENGINE Run Error` | Engine-level failure — handler not found, parameter evaluation failed, or type error |
| `HANDLER {Name}` | Handler completed (normal) — e.g., `HANDLER Wait` |
| `ENGINE Call System Tree` | Sub-tree/routine invocation |
| `API v2 Run Tree by {user} from {IPs}` | Authenticated API invocation |
| `API v2 Run Tree from {IPs}` | Anonymous API invocation |

4. **Check error records:**
   ```
   GET /errors?include=details&status=Active
   ```

### Common Failure Causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ENGINE Run Error` on Return node | Wrong parameter set (WebAPI params on event tree or vice versa) | Use `content`/`content_type`/`response_code` for WebAPI trees; `status`/`description` for event trees |
| `Missing Handler Error` | Handler not installed, or using `system_return_v1` (invalid) | Use `system_tree_return_v1`. Check handler exists: `GET /handlers/{definitionId}` |
| `Node Parameter Error` | ERB expression failed — missing variable, wrong Hash key, type error | ERB Hash `[]` raises `IndexError` for missing keys. Use `.fetch('key', 'default')` |
| Run stuck at Start | Start node has `defers: true` or `deferrable: true` | Start node must ALWAYS have `defers: false, deferrable: false` |
| Run starts but downstream nodes never fire | Connector condition evaluates to `false` or node IDs have duplicate suffixes | Check connector `value` expressions; ensure node ID suffixes are unique across ALL handlers |
| Both branches of mutually exclusive connectors fire | Both connector conditions errored (exception ≠ false, so both are truthy) | Fix the connector conditions so they evaluate cleanly. Common cause: `@values['FieldName']` where FieldName doesn't exist on the form — raises IndexError |
| `Connector Error` — "The X connector between Start and Y could not be evaluated" | Ruby condition on connector threw an exception | Fix the Ruby expression. Common: referencing a field that doesn't exist, or using wrong variable names |
| `Unidentified Error` — "java.lang.NullPointerException" | Engine internal crash, often caused by corrupt tree definition or node reference | Check tree definition for orphaned node references, invalid connector targets |
| `Node Parameter Error` — "could not be evaluated due to an IndexError" | ERB expression in node parameter references a Hash key that doesn't exist | Use correct variable names: `@submission['Created By']` not `@created_by`, `@form['Slug']` not `@form_slug`. See ERB context table in workflow-engine skill |
| Mass errors across all kapps after workflow deployment | Workflow templates used wrong ERB variables (`@created_by`, `@form_slug`) or referenced fields that don't exist on the target form | Audit forms before deploying: check that referenced field names actually exist. Use debug Echo node to dump all available ERB variables |
| `stale_record` on tree PUT | `versionId` mismatch — tree was modified since last GET | Always GET the tree first to retrieve current `versionId`, then pass it in the PUT |

---

## Error Management API

Failed triggers generate error records that can be listed, inspected, and resolved.

### Listing Errors

```
GET /errors?include=details&status=Active    # Unresolved errors
GET /errors?include=details&status=Handled   # Resolved errors
GET /errors/{id}                             # Single error with resolution details
```

**Gotcha:** `GET /errors` returns a **maximum of 5 errors per request** regardless of the `limit` parameter. Paginate with `offset` to get more.

### Error Types and Valid Actions

| Error Type | Description | Valid Actions |
|-----------|-------------|---------------|
| `Handler Error` | Handler execution failed | Retry Task, Skip Task, Do Nothing |
| `Node Parameter Error` | ERB evaluation failed on a parameter | Retry Task, Skip Task, Do Nothing |
| `Connector Error` | Ruby condition on a connector failed to evaluate | **Continue Branch, Cancel Branch**, Do Nothing |
| `Missing Handler Error` | Handler definition not found on server | Retry Task, Skip Task, Do Nothing |
| `Unidentified Error` | Engine-level crash (java.lang.RuntimeException, NullPointerException, etc.) | Do Nothing |
| `Source Error` | Source data processing error | **Do Nothing only** |
| `Tree Error` | Tree-level error | **Do Nothing only** |

**"Do Nothing" is NOT universally valid.** Connector Errors reject "Do Nothing" with `"Invalid management action"`. Only "Continue Branch" and "Cancel Branch" work for Connector Errors. The resolve API returns an error message but does NOT throw an HTTP error — it silently fails to resolve those IDs. When bulk-resolving mixed error types, group by type and use the correct action for each.

**Connector Error resolution:**
- **Continue Branch** — treat the connector condition as `true` (proceed down this path)
- **Cancel Branch** — treat the connector condition as `false` (do not take this path)
- These are NOT the same as Retry/Skip — a connector is a routing decision, not a task

**CRITICAL: Resolving connector errors on mutually exclusive paths.** If a tree has two connectors from the same node with complementary conditions (e.g., `@values['Status'] == 'Closed'` and `@values['Status'] != 'Closed'`), and BOTH connectors error (e.g., IndexError because the field doesn't exist), resolving both with "Continue Branch" causes BOTH downstream paths to execute — even though they were designed to be mutually exclusive. This is because an errored connector is not `false` — it's undefined, and "Continue Branch" treats it as `true`. The correct resolution is to Continue one and Cancel the other.

**No direct trigger→run link in the API.** The Task API does not store which run a trigger belongs to. The `GET /triggers/{id}` response has no `runId` field. To find the run for a trigger, you must either:
1. Search runs by time window and check each run's triggers (slow, unreliable for old triggers)
2. Walk the `branchId` chain up to the root trigger, then search recent runs for that root trigger ID

### Resolving Errors

```json
POST /errors/resolve
{
  "ids": [1550, 1549, 1548],
  "action": "Retry Task",
  "resolution": "Description of fix applied"
}
```

**Warning:** `Skip Task` on handler errors may generate new downstream errors — skipped node's dependents may fail because expected results are missing.

---

## Stuck Run Repair

When a run is stuck (Start node processed but no downstream triggers created), manually create a trigger to advance execution:

```json
POST /runs/{runId}/triggers
{
  "nodeId": "utilities_echo_v1_1",
  "action": "Root",
  "type": "Automatic",
  "loopIndex": "/"
}
```

Set `nodeId` to the ID of the node that should execute next. This creates a trigger as if the engine had naturally advanced to that node.

---

## Common API Error Patterns

### HTTP 400 Errors

| Error Body | Cause | Fix |
|-----------|-------|-----|
| `{"errorKey": "uniqueness_violation"}` | Duplicate name (webApi slug, tree name) | Check existence first. Both Core and Task API return 400 for this, NOT 409 |
| `{"errorKey": "stale_record"}` | `versionId` mismatch on PUT | GET the record first, use its `versionId` in your PUT |
| `"The query requires one of the following index definitions..."` | Missing form/kapp index for KQL field | Add index definition via `PUT /forms/{form}`, then build it |
| `"The query included one or more unexpected parts: values[...]"` | Missing kapp field for kapp-wide query | Add kapp field via `PUT /kapps/{kapp}` |
| `"When executing a search query that includes a range expression..."` | Range operator without `orderBy` | Add `&orderBy=values[Field]` matching the range field |
| `"The application was temporarily stopped due to licensing restrictions"` | Too many concurrent API calls | Reduce concurrency; app auto-restarts from admin console |

### HTTP 500 Errors

| Scenario | Cause | Fix |
|----------|-------|-----|
| POST submission with undefined field | Field not on form definition | Verify field names: `GET /forms/{form}?include=fields` |
| WebAPI with `timeout` > 30 | Hard maximum exceeded | Use `timeout=30` or lower; use async mode for longer trees |
| Security policy evaluation for non-admin | Policy expression throws instead of returning false | Don't use `manage=true` or `include=authorization` for non-admin API calls |
| `Long cannot be cast to java.lang.String` | `schemaVersion` in treeJson set to number instead of string | Use `"schemaVersion": "1.0"` (string), not `1.0` (number) |

---

## Debugging Techniques

### Dump All ERB Variables

When you don't know what variables are available in a workflow context, create a temporary Echo node right after Start with this input:

```erb
<% vars = instance_variables.map { |v|
  name = v.to_s
  val = instance_variable_get(v)
  keys = val.respond_to?(:keys) ? val.keys.join(', ') : val.to_s[0..200]
  "#{name} [#{val.class}] = #{keys}"
}; %><%= vars.join(' || ') %>
```

This dumps every instance variable name, its Ruby class, and its hash keys (if it's a Hash). Check the Echo node's `output` result in the Workflow Debugger or Activity Monitor.

**Verified ERB variables for event-triggered workflows:**
- `@submission` — `Created By`, `Submitted By`, `Updated By`, `Id`, `Core State`, `Handle`, etc.
- `@form` — `Name`, `Slug`
- `@kapp` — `Name`, `Slug`
- `@space` — `Name`, `Slug`
- `@event` — `Action` (Created/Updated), `Type` (Submission)
- `@values` — all form field names with current values
- `@values_previous` — previous values (empty on Created)
- `@values_changes` — which fields changed

**Common wrong variable names:**
- `@created_by` → use `@submission['Created By']`
- `@submitted_by` → use `@submission['Submitted By']`
- `@form_slug` → use `@form['Slug']`

### Verify Form Fields Before Deploying Workflows

Before creating a workflow that references `@values['FieldName']`, verify the field exists on the target form:

```
GET /kapps/{kapp}/forms/{form}?include=pages
```

Parse the pages → elements tree to extract field names. If the field doesn't exist, the connector condition or Echo ERB will throw an IndexError at runtime.

### Connector Conditions Are Pure Ruby (Not ERB)

Connector `value` fields are evaluated as pure Ruby expressions — do NOT use `<%= %>` tags. The engine evaluates the expression directly and checks if the result is `false` (don't fire) or anything else (fire).

```ruby
# CORRECT (pure Ruby):
@values['Status'] == 'Closed'

# WRONG (ERB tags — will error):
<%= @values['Status'] %> == 'Closed'
```

---

## Webhook Jobs API — Status Filter Ignored

`GET /webhookJobs?status=Failed` silently ignores the `status` parameter — it returns all webhook jobs regardless. Even invalid values like `status=INVALID` return results without error. Must filter client-side after fetching.

---

## Export Endpoint Bug

`GET /trees/{title}/export` may return the **wrong tree definition** for trees with `versionId: "1"` (stub registrations that were never explicitly updated via the export path).

**Workaround:** Use `GET /trees/{title}?include=treeJson` instead. The `treeJson` include is the reliable round-trip path — it always returns the current tree definition.

To detect affected trees: check `versionId` — if it's `"1"` and the tree has been modified via Core API PUT (not Task API), the export endpoint may return stale or incorrect XML.

---

## `run.tree` Is an Object

The `run.tree` field in Task API responses is an **object** (not a string):

```json
{
  "tree": {
    "name": "my-workflow",
    "title": "Kinetic Request CE :: abc123 :: my-workflow",
    "sourceName": "Kinetic Request CE",
    "sourceGroup": "abc123",
    "status": "Active"
  }
}
```

Using `run.tree` directly (e.g., in string concatenation) produces `[object Object]`. Always extract the name:

```js
const treeName = (typeof run.tree === 'object' ? run.tree?.name : run.tree) || 'Unknown';
```
