# Kinetic Workflow Tree Pitfalls — Validator Rule Catalogue

This file is the **citable rule catalogue** referenced by section number from the validator scripts (`§ 1`, `§ 2`, …). It is intentionally terse — each section is a one-paragraph rule + symptom + validator reference. For full discussion, examples, and worked treeJson, read the main [SKILL.md](SKILL.md).

> **Why this file is short.** The previous version of PITFALLS.md duplicated extensive prose from SKILL.md. That duplication has been removed to make SKILL.md the single canonical source. Validator scripts still cite `PITFALLS.md § N` because the rule numbering is stable; the rules themselves are catalogued here as one-paragraph anchors.

---

## § 1 — Start node must be literal `start`, defers=false

**Rule.** Start node MUST be `{ "id": "start", "definitionId": "system_start_v1", "defers": false, "deferrable": false }`. No deviation.

**Symptom of violation.** `java.lang.RuntimeException` on tree bootstrap; zero triggers created; run status perpetually `Started`.

**Validator check** → `validate-workflow.mjs`: violates if Start node's id, defers, or deferrable diverges. **Full discussion:** SKILL.md → "Critical Node Flags".

---

## § 2 — Non-start node IDs must follow `{definition_id}_{N}` with globally unique suffixes

**Rule.** Every non-start node `id` = `{definition_id}_{N}` where `N` is a unique positive integer across the entire tree (not per-definition-id). `<lastID>` must equal the maximum suffix used. Every dependent `content` must resolve to an existing node ID.

**Symptom of violation.** Tree appears to work in the builder but at runtime only the Start trigger closes. No downstream node fires. The parser silently drops the mis-named or duplicate-suffix node.

**Validator check** → `validate-workflow.mjs`: violates on non-conforming IDs, duplicate suffixes, `lastID < max`, or dangling dependents. **Full discussion:** SKILL.md → "Node IDs and lastID".

---

## § 3 — `kinetic_core_api_connection_v1` path is server-root-relative

**Rule.** The handler's `path` parameter must be the full server-root-relative path. Prepend `/app/api/v1/` for Core or `/app/components/task/` for Task endpoints.

**Symptom of violation.** Tree executes all nodes (visible in `/runs/{id}/tasks`) but the handler returns HTTP 404 with body `{"error":"The page you were looking for doesn't exist."}`. The "Kinetic Core API Connection Test" routine ships with `/app/api/v1/me` — confirming the prefix is part of the path, not baked into the connection base URL.

**Validator check** → `validate-workflow.mjs`: violates on `kinetic_core_api_connection_v1` nodes whose `path` doesn't start with `/app/api/v1/` or `/app/components/task/`. **Full discussion:** SKILL.md → "kinetic_core_api_v1 / kinetic_core_api_connection_v1 path rules".

---

## § 4 — Debug runs via `/runs/{id}/tasks`, NOT `/triggers`

**Rule.** When debugging, query `GET /app/components/task/app/api/v2/runs/{id}/tasks?include=details` — non-deferrable handlers (`defers=false`) execute inline and never create their own trigger record, so they don't appear in `/triggers?runId=`. The `tasks` view carries `nodeName`, `status`, `duration`, and full `results` including `Handler Error Message` and `Response Body`.

**Symptom of "violation" (misuse).** You query `/triggers?runId={id}` and see only the Start trigger Closed with empty `results: {}`, conclude the tree is stuck, miss the actual failure that lives in tasks.

**Tool** → `workflow-debug.mjs` queries the tasks endpoint by default. **Full discussion:** SKILL.md → "Debugging Runs" and `concepts/task-api-reference`.

---

## § 5 — Every `definition_id` must exist as an installed handler on the target engine

**Rule.** Before PUTting a tree, verify every non-`system_*` `definitionId` has an installed handler. Direct-GET `/handlers/{definitionId}` is authoritative; the list endpoint sometimes hides handlers due to pagination.

**Symptom of violation.** Same observable as § 2 — only Start trigger fires, no visible error. The engine fails to resolve the unknown handler and aborts tree advance silently.

**Validator check** → `validate-workflow.mjs`: for every non-system `definition_id` in the tree, performs a live GET on the engine and fails if the handler isn't found. **Full discussion:** SKILL.md → "Handler Reference".

---

## § 6 — Routine nodes in a calling tree must be deferrable

**Rule.** A routine-call node in the caller tree MUST have `defers: true`, `deferrable: true`, and `messages: [{type:"Create"},{type:"Update"},{type:"Complete"}]`. The engine then waits for the routine to complete and populates `@results['Node Name']` with the routine's actual outputs.

**Symptom of violation.** Routine runs but the caller's `@results['Node Name']` only contains `Run Id`, `Source Id`, `Tree Id` — never the routine's `status`, `description`, `result`, etc. Caller fires the routine synchronously, returns control immediately, never waits.

**Validator check** → not currently checked (heuristic-only). **Full discussion:** SKILL.md → "Routine Invocation".

---

## § 7 — Global Routines must use `sourceName: "-"` and `sourceGroup: "-"`

**Rule.** When creating a Global Routine, set `sourceName: "-"` and `sourceGroup: "-"`. Default `sourceName: "Kinetic Request CE"` produces a compound title the builder cannot load. Run API equivalent: `POST /runs?sourceName=-&sourceGroup=-&name={name}`.

**Symptom of violation.** Routine appears in the tree list but the workflow builder fails to load it; title lookup errors.

**Validator check** → not currently checked. **Full discussion:** SKILL.md → "Routines and Sources" and `concepts/workflow-creation`.

---

## Meta-lesson

The Task engine prioritizes throughput over diagnostics — violating any rule above results in **no stack trace, no log line, no error notification**, just a tree that doesn't do what you wrote. The scripts in [`scripts/`](scripts/) turn these rules into machine-enforced invariants. Install the PreToolUse hook once per machine (`node skills/concepts/workflow-xml/scripts/install-hook.mjs`) and the failure modes above become impossible rather than merely unlikely. See [`scripts/README.md`](scripts/README.md) for install and usage.
