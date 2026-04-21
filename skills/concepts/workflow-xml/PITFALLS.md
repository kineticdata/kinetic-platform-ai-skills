# Kinetic Workflow Tree Pitfalls — Hard-Won Lessons

Every rule below was learned through silent failure on real engines — no stack trace, no error message, just a run that "completes" without doing what it should. The [scripts/](scripts/) directory encodes these as machine-checkable rules so you don't repeat the discovery.

Each pitfall is structured as **Symptom → Cause → Rule → Why it matters**.

---

## 1. Start node must be literal `start`, defers=false

**Symptom**
`java.lang.RuntimeException` with zero triggers created. Run status perpetually `Started`. Tree looks fine in the UI.

**Cause**
Start node was named `system_start_v1_1` (or any other id), or had `defers=true`.

**Rule**
Start node must be EXACTLY:
```json
{ "id": "start", "definitionId": "system_start_v1", "defers": false, "deferrable": false }
```
No exceptions.

**Why it matters**
The engine treats `start` as a special literal, not as a conforming instance of the node ID convention. Deviating breaks the engine's tree bootstrap before any triggers fire.

**Validator check** → `validate-workflow.mjs`: violates if Start node's id, defers, or deferrable diverges.

---

## 2. Non-start node IDs must follow `{definition_id}_{N}` with globally unique suffixes

**Symptom**
Tree appears to work in the builder UI, but at runtime only the Start trigger closes. No downstream node fires. Errors endpoint shows NPE on trigger advance.

**Cause**
Node ID doesn't match the convention (`echo_node`, `create_notification`, etc.), OR two nodes share the same numeric suffix, OR `<lastID>` is less than the highest suffix used. The parser silently drops the mis-named / duplicate-suffix node.

**Rule**
- Every non-start node: `id` = `{definition_id}_{N}` where `N` is a unique positive integer.
- Suffixes are globally unique across ALL nodes in the tree (not per-definition-id).
- `<lastID>` = max suffix actually used.

```xml
<!-- CORRECT -->
<task id="start" definition_id="system_start_v1">...</task>
<task id="utilities_echo_v1_2" definition_id="utilities_echo_v1">...</task>
<task id="kinetic_core_api_connection_v1_3" definition_id="kinetic_core_api_connection_v1">...</task>
<lastID>3</lastID>

<!-- WRONG (engine silently drops one of these) -->
<task id="utilities_echo_v1_1" ...>   <!-- start implicitly takes _1 -->
<task id="kinetic_core_api_connection_v1_1" ...>  <!-- duplicate _1 -->
```

**Why it matters**
The engine's parser uses the suffix-N to index nodes. Duplicates get overwritten; non-conforming IDs get skipped. No warning, no diagnostic — the tree just doesn't have the nodes you thought it had.

**Validator check** → `validate-workflow.mjs`: violates on non-conforming IDs, duplicate suffixes, and `lastID` < max.

---

## 3. `kinetic_core_api_connection_v1` path is **server-root-relative**

**Symptom**
Tree executes all nodes (visible in `/runs/{id}/tasks`), but the handler returns HTTP 404 with error body:
```json
{"error":"The page you were looking for doesn't exist."}
```
Run appears "complete" but nothing downstream happened.

**Cause**
Path parameter was written as if relative to `/app/api/v1/`:
```
/kapps/notifications/forms/notification/submissions    ← 404
```

**Rule**
Always prepend `/app/api/v1/` for Core API, or `/app/components/task/app/api/v2/` for Task API:
```
/app/api/v1/kapps/notifications/forms/notification/submissions    ← correct
/app/api/v1/me                                                     ← Connection Test example
```

**Reference**
The Integration-Catalog-installed "Kinetic Core API Connection Test" routine uses `/app/api/v1/me` — confirming the prefix is part of the path, not baked into the connection base URL.

**Validator check** → `validate-workflow.mjs`: violates on `kinetic_core_api_connection_v1` nodes whose `path` doesn't start with `/app/api/v1/` or `/app/components/task/`.

---

## 4. Debug runs via `/runs/{id}/tasks`, NOT `/triggers`

**Symptom**
Run status reports `Started` indefinitely. `/triggers?runId={id}` shows only the Start trigger, Closed with empty `results: {}`. Looks like the tree is stuck or the engine is broken.

**Cause**
Non-deferrable handlers (`defers=false`) execute inline during the parent trigger's processing and **never create their own trigger record**. They only appear in the **tasks** view.

**Rule**
When debugging any workflow run:
```bash
# WRONG — only shows triggers (one per deferrable boundary)
GET /app/components/task/app/api/v2/triggers?runId={id}

# RIGHT — shows every node's execution + handler errors + results
GET /app/components/task/app/api/v2/runs/{id}/tasks?include=details
```

The `tasks` response carries `nodeName`, `status`, `duration`, and full `results` including `"Handler Error Message"` and `"Response Body"` — the information that was "missing" when you looked at triggers.

**Why it matters**
Multiple hours lost to debugging "why isn't my tree firing?" The tree was firing; the final step was 404-ing; the evidence lived at an endpoint nobody thought to query.

**Tool** → `workflow-debug.mjs` always queries the tasks endpoint, decodes handler errors, and colors failure statuses red.

---

## 5. Every `definition_id` must exist as an installed handler on the target engine

**Symptom**
Same as pitfall #2: only Start trigger fires, no error message at the trigger level, NPE possibly appears in `/errors`.

**Cause**
Tree references a handler (e.g., `utilities_echo_v1`, `smtp_email_send_v1`) that isn't installed on the Task engine of the target space. The engine fails to resolve it and aborts tree advance silently.

**Rule**
Before PUTting a tree, list installed handlers and confirm each non-system `definition_id` is present:
```bash
curl -u user:pass "<server>/app/components/task/app/api/v2/handlers?limit=500"
```

Note: the list endpoint paginates and sometimes hides handlers. If one "seems missing," try fetching it directly by ID:
```bash
curl -u user:pass "<server>/app/components/task/app/api/v2/handlers/utilities_echo_v1"
```
The direct-GET is authoritative.

**Validator check** → `validate-workflow.mjs`: for every non-`system_*` `definition_id` in the tree, performs a live GET on the engine and fails if the handler isn't found.

---

## 6. Routine nodes in a calling tree must be deferrable

**Symptom**
Routine runs, but the caller tree's `@results['Node Name']` only contains `Run Id`, `Source Id`, `Tree Id` — not the routine's actual outputs (`status`, `description`, `result`, etc.).

**Cause**
The routine-call node was configured with `defers=false` / `deferrable=false`. The engine fires the routine synchronously, returns control immediately, and never waits for the routine to complete — so outputs never populate.

**Rule**
Routine nodes in a calling tree (analogous to Wait / Join nodes) must have:
```json
{
  "defers": true,
  "deferrable": true,
  "messages": [
    { "type": "Create" },
    { "type": "Update" },
    { "type": "Complete" }
  ]
}
```

Only Start, Echo, Noop, and other truly-non-blocking system nodes should be `defers=false`.

**Why it matters**
You'll write a tree that calls a routine, see it "succeed," and then be mystified why downstream nodes can't access the routine's return values. The routine returned them; the caller just never waited to collect them.

---

## 7. Global Routines must use `sourceName: "-"` and `sourceGroup: "-"`

**Symptom**
Routine appears in the tree list, but the workflow builder fails to load it. Title lookup returns an error.

**Cause**
Routine was created with `sourceName: "Kinetic Request CE"` (the default for form-event trees). This produces a compound title that the tree list API reports differently than the title the builder expects.

**Rule**
When POSTing a new Global Routine:
```json
{ "type": "Global Routine", "sourceName": "-", "sourceGroup": "-", "name": "..." }
```

Check every code path that creates routines: workflow builder, space admin pages, kapp admin pages, integration catalog, server-side provisioners. Especially check HTML form default values — `value="Kinetic Request CE"` is a common sneaky culprit.

**Run API** also takes these params: `POST /runs?sourceName=-&sourceGroup=-&name={name}`.

**Why it matters**
Silent provisioning bug: the routine gets created but becomes unmanageable via the UI afterward. Three separate fixes landed in one session because the bad default was repeated across the codebase.

---

## Meta-lesson — why these scripts exist

The Kinetic Task engine prioritizes throughput over diagnostics. Violating any rule above results in **no stack trace, no log line, no error notification** — just a tree that doesn't do what you wrote. Every pitfall in this list cost at least an hour to rediscover.

The validator, debugger, and PreToolUse hook in [scripts/](scripts/) turn these rules into machine-enforced invariants:

- Can't PUT an invalid tree — the hook blocks the bash call
- Can't miss a handler error — `workflow-debug.mjs` hits the tasks endpoint by default
- Can't ship with a mis-numbered node — `validate-workflow.mjs` runs before every PUT

Install the hook once per machine, colocate trees with `scripts/put-workflow.mjs`, and the failure modes above become impossible rather than merely unlikely.

See `scripts/README.md` for install and usage.
