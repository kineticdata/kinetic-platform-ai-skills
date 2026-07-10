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

### Measuring execution time (the run never "closes")

The run-level `status` stays `Started` forever — it is a *ghost status* that never advances to
`Complete`/`Closed`, and `run.updatedAt` is frozen ~30ms after `run.createdAt` (it is NOT touched as
tasks execute). So neither `run.status` nor `run.updatedAt` can tell you when a tree finished, and any
benchmark that counts `status="Complete"` runs is measuring **run creation**, not execution. (The
`/runs?count=true&q=status="..."` filter is silently ignored — it returns the *total* run count.)

The **tasks** are the source of truth. Fetch the full execution:
```
GET /app/components/task/app/api/v2/runs/{id}?include=details,tasks,tasks.details
```
Each task carries `createdAt`, `updatedAt`, `status` (→ `Closed`), `nodeName`, `loopIndex`, `branchId`,
and a per-task `duration` (ms). **Execution time of a tree = `max(task.updatedAt) − run.createdAt`.**

**Caveat on `duration`:** the per-task `duration` measures only the handler body, NOT parameter ERB
rendering. A `utilities_echo_v1` whose `input` is `<%= sleep(5) %>` reports `duration≈20ms` yet its
`updatedAt` lands ~5s later — the sleep happens during ERB rendering of the parameter, on the worker
thread, before the handler "runs." To measure real wall time (or to make a node deliberately hold a
worker), rely on the `updatedAt` deltas, not `duration`.

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

## 5b. A node must supply EVERY parameter the installed handler declares (`UnknownVariableError`)

**Symptom**
A handler node sits at status `New` forever (never runs, never defers, `duration=null`); the run stalls with no completed handler task. `/errors` shows:
> The "<Node>" node could not be executed due to an **UnknownVariableError** raised by the "<handler>" handler.

**Cause**
The handler's `node.xml` maps each declared parameter with `<parameter name="x"><%= @parameters['x'] %></parameter>`. Kinetic's `@parameters` raises `UnknownVariableError` when you read a key the **node instance never declared** — it is not a plain Ruby hash that returns `nil`. So if the installed handler declares a parameter your node omits, the node dies before executing.

This bites hardest with **handler-version drift**: the handler *installed on the engine* (e.g. the Integration Catalog build of `kinetic_core_api_connection_v1`) can declare more parameters (`extra_headers`, `enable_debug_logging`, …) than the older copy your tree was authored against. The same `definition_id` ≠ the same parameter set.

**Rule**
Author nodes against the **engine's** handler, not a local/older copy. Download the installed definition and pass every declared `<parameter id=...>` (empty string is fine for optional ones):
```bash
curl -u user:pass "<server>/app/components/task/app/api/v2/handlers/<def>/zip" -o h.zip
unzip -p h.zip '*/node.xml' | grep 'parameter id='   # ← the full required set
```
A working node on the same engine is the fastest reference — diff its parameters against yours.

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

## Non-ASCII characters in a node parameter body silently strand the task (2026-05-27)

**Symptom**
A workflow node never executes. The run defers normally, but one downstream task sits at
`status: "New"` forever — `token: null`, `results: {}`, `message: null`, no error, no log.
The validator passes (the tree is structurally valid). An identical tree on a sibling form
runs fine.

**Cause**
A multibyte/non-ASCII character (em-dash `—` U+2014, curly quotes, etc.) inside a node
parameter **value** — e.g. the `body` of a `kinetic_core_api_connection_v1` POST built as an
ERB/JSON string. The engine accepts the PUT and creates the task, but never dispatches it
(stuck `New`). Confirmed by reduction: two trees identical except one `Summary` string
contained `—`; removing the em-dash fixed it. Re-PUTting the same content did **not** fix it —
only changing the character did.

**Rule**
Keep workflow node parameter values (paths, bodies, ERB) **ASCII-only**. If you must emit
non-ASCII into a created submission, build it from `@values`/`@results` at runtime (UTF-8 data
the engine already holds) rather than embedding the literal in the tree. Comments and node
*names* are unaffected. To diagnose: `GET /runs/{id}/tasks` and look for a task stuck at `New`
with a null token.

---

## Secret handler info values must be `type="encrypted"` in info.xml (2026-07-10)

**Symptom**
A handler you authored stores a password/token/API key as an info value. It works — but the
secret is stored in plaintext and is **visible in cleartext** to anyone who can view the
handler config in the admin tools (Space → Task → Handlers). A silent data-exposure bug.

**Cause**
The handler's `process/info.xml` declares the secret info value **without** the `type="encrypted"`
attribute:
```xml
<!-- WRONG — plaintext, readable in the UI -->
<info name="api_password" description="Service account password"/>
```
`type="encrypted"` is what tells the engine to encrypt the value at rest and mask it in every
GET / admin view. Without it the value is a normal, readable string.

**Rule**
Mark every password, token, secret key, or client secret with `type="encrypted"`:
```xml
<info name="api_password" required="true" type="encrypted" description="Service account password"/>
```
Non-secret config (URLs, usernames, flags) stays plain. Note: once encrypted, GET responses
**never echo the value back** (masked/absent) — that's expected, not a failed write. Verify a
handler you didn't author by downloading it (`GET /handlers/{def}/zip`) and checking info.xml.

---

## Meta-lesson — why these scripts exist

The Kinetic Task engine prioritizes throughput over diagnostics. Violating any rule above results in **no stack trace, no log line, no error notification** — just a tree that doesn't do what you wrote. Every pitfall in this list cost at least an hour to rediscover.

The validator, debugger, and PreToolUse hook in [scripts/](scripts/) turn these rules into machine-enforced invariants:

- Can't PUT an invalid tree — the hook blocks the bash call
- Can't miss a handler error — `workflow-debug.mjs` hits the tasks endpoint by default
- Can't ship with a mis-numbered node — `validate-workflow.mjs` runs before every PUT

Install the hook once per machine, colocate trees with `scripts/put-workflow.mjs`, and the failure modes above become impossible rather than merely unlikely.

See `scripts/README.md` for install and usage.

## Tree export can render a STALE handler name for freshly-uploaded handlers (2026-06-04)

**Symptom**
A routine/tree's stored `treeJson` (via `GET /trees/{title}?include=treeJson`) references the
correct handler (e.g. `onestream_connection_v1`), but `GET /trees/{title}/export` renders that
node as a *different* handler (`gusto_connection_v1`) — one that does not even exist on the
engine (`GET /handlers/gusto_connection_v1` → not found). Re-uploading the handler with
`?force=true`, and even DELETE + fresh upload, does NOT fix the export rendering.

**Cause**
The engine's in-memory definition cache maps the handler to a stale record (likely a reused
internal row from a previously-deleted handler). Export serializes through that cache; the
stored tree content itself is correct.

**Rule**
Trust runtime over export. Verify with a live run: `POST /runs?sourceName=-&sourceGroup=-&name={routine}`
then `GET /runs/{id}?include=tasks,tasks.details` — the task's `definitionId` shows which
handler actually executed. Confirmed 2026-06-04 on engine 6.1.7: runtime executed the correct
`onestream_connection_v1` while export still printed the stale name. An engine restart is the
only known fix for the cosmetic export label; there is NO REST endpoint for engine restart on
6.1.7 (`PUT /engine` → Unknown API call, on both v1 and v2 paths).

**Why it matters**
Export is the natural verification tool after a PUT (the gate scripts use it). For trees
referencing a just-uploaded handler, a wrong-looking export is not proof of a wrong tree —
check `include=treeJson` and a live run before tearing apart a correct install.
