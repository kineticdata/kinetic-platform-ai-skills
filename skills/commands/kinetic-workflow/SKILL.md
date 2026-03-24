---
name: kinetic-workflow
description: Create a Kinetic Platform workflow tree (event-triggered, WebAPI, or routine)
argument-hint: "<description of what the workflow should do>"
user-invocable: true
---

# Create a Kinetic Workflow

The user wants to create a workflow on the Kinetic Platform. The argument describes what the workflow should do.

## Step 1: Read Reference Docs

Before generating any workflow definition, read:
- `skills/platform/workflow-engine/SKILL.md` — execution model, nodes, connectors, routines
- `skills/platform/workflow-xml/SKILL.md` — XML schema, ERB syntax, handler IDs, parameter formats

## Step 2: Determine Workflow Type

Ask the user (if not clear from the description):

1. **Event-triggered** — fires on form submission events
   - Needs: kapp slug, form slug (or kapp-level for all forms), event type
   - Events: `Submission Created`, `Submission Updated`, `Submission Closed`
   - Create via: `create_form_workflow` (form-level) or `create_workflow` (kapp-level)

2. **WebAPI** — HTTP endpoint backed by a workflow tree
   - Needs: kapp slug, WebAPI slug, HTTP method
   - Create via: `create_webapi` + `create_tree` + `update_tree_json`

3. **Routine** — reusable sub-workflow called by other trees
   - Needs: source group name
   - Create via: `create_tree` + `update_tree_json`

## Step 3: Build the Tree Definition

### Critical Rules

**Node ID suffixes must be globally unique.** Use a single counter `_1`, `_2`, `_3` across ALL handler types. Example: `system_start_v1` gets `id="start"`, then `utilities_echo_v1_1`, `system_wait_v1_2`, `smtp_email_send_v1_3`. Duplicate suffixes cause the builder to silently drop nodes.

**ERB in XML must be escaped:** `&lt;%=` and `%&gt;` (not `<%=` / `%>`).

**Connector types:**
- `Complete` — fires after source node finishes (solid line, most common)
- `Create` — fires when a deferrable node enters deferral (dotted line, for parallel work/SLA timers)
- `Update` — fires each time a deferred node receives an external update (dashed line)
- `value` field = Ruby condition expression (NOT ERB). Empty = unconditional.

**Message types per node:**
- Deferrable nodes (`system_wait_v1`): need `Create`, `Update`, AND `Complete` messages
- Non-deferrable nodes: need only `Complete` message

### Handler Quick Reference

| Handler | `definitionId` | Key Parameters (exact IDs) | Deferrable |
|---|---|---|---|
| Start | `system_start_v1` | (none) | No |
| Noop | `system_noop_v1` | (none, ignores unknown params) | No |
| Echo | `utilities_echo_v1` | `input` | No |
| Wait | `system_wait_v1` | `Time to wait`, `Time unit` (menu: Second,Minute,Hour,Day,Week) | **Yes** |
| Email | `smtp_email_send_v1` | `from`, `to`, `subject`, `htmlbody`, `textbody`, `bcc`, `error_handling` | No |
| Return | `system_tree_return_v1` | WebAPI: `content`, `content_type`, `response_code`, `headers_json` / Event: `status`, `description` | No |
| Core API | `kinetic_core_api_v1` | `method`, `path`, `body`, `content_type`, `error_handling` | No |

**Wait parameter IDs are case/space sensitive** — `"Time to wait"` and `"Time unit"` (with caps and spaces). Wrong IDs cause ENGINE Run Error at runtime.

**Return node params differ by tree type.** Using WebAPI params on an event tree (or vice versa) causes ENGINE Run Error.

## Step 4: Create the Workflow

### For Event-Triggered Workflows

Use Core API MCP tools — these properly register the workflow with the platform:

```
create_form_workflow(kappSlug, formSlug, name, event, treeXml)
```

Or for kapp-level:
```
create_workflow(kappSlug, name, event, treeXml)
```

The `treeXml` must be ONLY the `<taskTree>` inner element — NOT the full `<tree>` wrapper.

**NEVER use `update_tree_json` (Task API v2 PUT) on Core API-registered workflows** — it wipes `event`, `platformItemType`, and `platformItemId`, breaking the kapp linkage. The workflow disappears from the admin UI.

### For WebAPI Trees

1. `create_webapi(kappSlug, slug, method)`
2. `create_tree(sourceName="Kinetic Request CE", sourceGroup="WebApis > {kapp}", name=slug)`
3. `update_tree_json(title, name, sourceName, sourceGroup, treeJson)` — safe for WebAPI trees

### For Routines

1. `create_tree(sourceName="Kinetic Request CE", sourceGroup="{group}", name=name)`
2. `update_tree_json(...)` — safe for routines

## Step 5: Verify

After creation:
1. List workflows/trees to confirm it exists
2. For event trees: create a test submission to trigger it
3. For WebAPIs: invoke with `?timeout=10` to test synchronously
4. Check `list_triggers` for any failures
