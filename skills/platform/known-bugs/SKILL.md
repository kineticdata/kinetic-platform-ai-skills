---
name: known-bugs
description: Confirmed Kinetic Platform bugs with symptoms, impact, and tested workarounds.
---

# Known Platform Bugs

Confirmed bugs discovered through hands-on testing. Each includes the symptom, impact assessment, and a tested workaround.

---

## Bug 1: `/trees/{title}/export` Returns Wrong Tree

**Symptom:** The export endpoint returns an incorrect or stale tree definition for trees that were created via the Core API and have `versionId: "1"`.

**Impact:** Workflow builder and debugger UIs render the wrong canvas. Exported definitions don't match the actual tree.

**Detection:** Check `versionId` before calling export — trees with `versionId: "1"` that have been modified via Core API PUT are suspect.

**Workaround:** Use `GET /trees/{title}?include=treeJson` instead of the export endpoint. `treeJson` always returns the current definition.

---

## Bug 2: `run.tree` Is an Object, Not a String

**Symptom:** `run.tree` in Task API responses is a JSON object (`{name, title, sourceName, ...}`), not a string. Code like `run.tree || "Unknown"` displays `[object Object]`.

**Impact:** Any UI that displays tree names from run objects shows garbage text.

**Workaround:**
```js
const treeName = (typeof run.tree === 'object' ? run.tree?.name : run.tree) || 'Unknown';
```

---

## Bug 3: `/submissions/{id}/submit` Does Not Exist

**Symptom:** `POST /submissions/{id}/submit` returns **404 Not Found**.

**Impact:** Code following older documentation that references a `submit` endpoint fails silently or crashes.

**Workaround:** Use `PUT /submissions/{id}` with `{ "coreState": "Submitted" }` to transition a Draft to Submitted.

---

## Bug 4: WebAPI `timeout` > 30 Causes 500

**Symptom:** Calling a WebAPI with `timeout=60` (or any value > 30) returns HTTP 500. The tree execution starts but creates an orphan run — the run never receives its completion signal back to the caller.

**Impact:** The caller gets an error, but the workflow still executes in the background with no way to get its result. Repeated retries create multiple orphan runs.

**Workaround:** Always use `timeout=30` or lower. For trees that take longer than 30 seconds, use the async pattern: omit `timeout`, receive a `{runId}` immediately, and poll `GET /runs/{runId}` for completion.

---

## Bug 5: Security Policy Evaluation Returns 500 Instead of 403

**Symptom:** When a non-admin user accesses a resource that has a security policy with a `Display` endpoint referencing a failing policy expression, the API returns HTTP **500** instead of the expected 403.

**Impact:**
- Blocks non-admin access entirely (no graceful denial)
- **Poisons `GET /kapps`** — if ANY kapp has a failing Display policy, the entire kapps list returns 500
- Cascading failures: one bad policy breaks the entire portal for non-admin users

**Workaround:** Don't use `manage=true` or `include=authorization` for non-admin API calls. Test all security policies as a non-admin user before deploying.

---

## Bug 6: SMTP Handler Omits `Handler Error Message` on Success

**Symptom:** The `smtp_email_send_v1` handler sends the email successfully (task status: Closed, `Message Id` returned), but a downstream node referencing `@results['Send Email']['Handler Error Message']` fails with `IndexError`. The Return node shows `originator: "ENGINE Run Error"`.

**Impact:** Any workflow that checks for errors after sending email fails on the success path. Error management shows: `"The \"content\" parameter of the \"Return Result\" node could not be evaluated due to an IndexError."`

**Root cause:** The handler defines two results: `Handler Error Message` and `Message Id`. On success, it only returns `Message Id` — the `Handler Error Message` key is **omitted entirely** from the results hash (not set to empty string). Ruby's `[]` on the Task engine hash raises `IndexError` for missing keys.

**Workaround:** Use Ruby `rescue` in ERB expressions:
```ruby
<%= @results['Send Email']['Handler Error Message'] rescue '' %>
```

**General lesson:** Always use `rescue` or `.fetch()` when accessing handler result keys that may be conditional. Don't assume declared result keys will always be present in the hash.

---

## Bug 7: `GET /errors` Hard-Caps at 5 Results

**Symptom:** The Task API errors endpoint returns a maximum of **5 error records per request**, regardless of the `limit` parameter value.

**Impact:** Dashboards and error management UIs that expect to load 25 or 100 errors per page only see 5. Total error counts may be significantly underreported.

**Workaround:** Paginate with `offset` to retrieve all errors:

```js
const allErrors = [];
let offset = 0;
while (true) {
  const r = await fetch(`/errors?include=details&status=Active&limit=5&offset=${offset}`);
  const data = await r.json();
  const errors = data.errors || [];
  allErrors.push(...errors);
  if (errors.length < 5) break;
  offset += 5;
}
```
