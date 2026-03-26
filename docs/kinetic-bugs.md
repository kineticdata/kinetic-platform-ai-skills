# Known Bugs & Quirks

## Task API: `/trees/{title}/export` returns wrong tree for stub registrations

**Severity:** Medium — causes incorrect canvas rendering in workflow-builder and workflow-debugger

**Symptoms:**
- Select a kapp and workflow in workflow-debugger → canvas shows wrong nodes (or nodes from a completely unrelated tree)
- Every export returns the same tree ("Data Exfiltration Investigation" on `second.jdsultra1.lan`)

**Root cause:**
Trees created via Core API `POST /kapps/{kapp}/workflows` are registered in both Core and Task, but have no tree definition uploaded. These stubs have `versionId: "1"`. The Task API export endpoint does not return a 404 for these — it returns an arbitrary other tree's XML.

- `GET /trees/{title}` → correct metadata (name, sourceGroup, etc.)
- `GET /trees/{title}/export` → **wrong XML** (some other tree's definition)
- `GET /trees/{bogus-title}/export` → correct 404

**Affected trees:** Any tree with `versionId: "1"` (never had `treeJson` PUT). Trees with `versionId >= 2` export correctly.

**Affected apps:** workflow-builder (`loadExistingByTitle`), workflow-debugger (`onRunSelected`)

**Workaround:** Check `versionId` before calling export. Show "No definition" if `versionId < 2`.

**Server-side or client-side bug?** Server-side. The Task API should return a 404 or empty response for trees without definitions, not a random other tree.

---

## Task API: `run.tree` is an object, not a string

**Severity:** Low — causes display bugs in monitoring/reporting UIs

**Symptoms:**
- Run tables display `[object Object]` instead of the tree name
- Using `run.tree || "Unknown"` as a fallback produces `[object Object]` (truthy)

**Root cause:**
The Task API `/runs` response returns the tree reference as a nested object `{name, title, sourceGroup, status, ...}`, not a scalar string. This is inconsistent with what you'd expect from a "tree" field.

**Workaround:**
```javascript
const treeName = (typeof run.tree === "object" ? run.tree?.name : run.tree) || "Unknown";
```

---

## Core API: `/submissions/{id}/submit` does not exist (404)

**Severity:** Low — documentation error, not a runtime bug

**Symptoms:**
- Calling `POST /submissions/{id}/submit` returns 404

**Root cause:**
The endpoint was listed in early documentation tables but never implemented. To submit a Draft, use `PUT /submissions/{id}` with `{coreState: "Submitted"}`.

---

## SMTP Handler: Omits `Handler Error Message` result key on success — causes IndexError in downstream ERB

**Severity:** Medium — causes `IndexError` that kills Return nodes referencing the error result

**Discovered:** 2026-03-24, test-smtp WebAPI tree on `second.jdsultra1.lan`

**Symptoms:**
- SMTP handler sends the email successfully (task status: Closed, Message Id returned)
- Return node fails with `originator: "ENGINE Run Error"` and `IndexError`
- Error management shows: `"The \"content\" parameter of the \"Return Result\" node could not be evaluated due to an IndexError."`

**Root cause:**
The `smtp_email_send_v1` handler defines two results: `Handler Error Message` and `Message Id`. On success, it only returns `Message Id` — the `Handler Error Message` key is **omitted entirely** from the results hash (not set to empty string). When a downstream node references `@results['Send Test Email']['Handler Error Message']`, Ruby raises `IndexError` because the key doesn't exist.

This is NOT an engine pre-evaluation bug. The engine correctly executes nodes in order (confirmed via `/runs/{id}/tasks` — SMTP task shows Closed with duration 1303ms). The error occurs when the Return node evaluates its ERB after the SMTP node completes.

**Workaround:**
Use Ruby's safe navigation or rescue in ERB expressions:
```ruby
<%= @results['Send Test Email']['Handler Error Message'] rescue '' %>
```

**Lesson learned:**
Handler results that are conditional (only present on error) should always be returned as empty string on success, not omitted. All new handlers in the zero-dep architecture follow this pattern — they always return `Handler Error Message` (empty on success).

---

## Task API: `GET /errors` hard-caps at 5 results per request

**Severity:** Medium — makes it impossible to retrieve full error lists in one call

**Symptoms:**
- Requesting `GET /errors?limit=100` still returns at most 5 error records
- Pagination must be used to retrieve more

**Root cause:** Server-side hard limit on the errors endpoint, regardless of the `limit` parameter.

**Workaround:** Paginate through errors using offset, or resolve errors in small batches.

---
