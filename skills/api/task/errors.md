<!-- MANUALLY AUTHORED — pending OAS regeneration to replace this with auto-generated content. -->
<!-- Source: hand-authored to match auto-generated format. Promote to OAS-generated once spec covers /errors. -->

# Errors API Reference

Source: Kinetic Task REST API v2.0

> Hand-authored to fill a gap in the auto-generated reference. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, `api/using-the-api`, and `concepts/task-api-reference`. For diagnosis flows that use these endpoints see `platform/troubleshooting`.

Error records are surfaced when the Task engine fails to advance a node — handler errors, parameter-evaluation errors, connector-condition errors, missing-handler errors, and engine-level crashes. They live until resolved via `/errors/resolve`.

> **⚠ Known cap.** `GET /errors` returns at most **5 records per request** regardless of `limit`. See `platform/known-bugs` Bug 7 and paginate with `offset` to retrieve more.

---

### `GET /errors`
**Operation:** `searchErrors`
List error records.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `status` (string) | query | No | `Active` (unresolved) or `Handled` (resolved). Default: returns both. |
| `include` (string) | query | No | Comma-separated. `details` adds `createdAt`, `updatedAt`, etc. Pair with `status=Active` for the typical "what's broken now" view. |
| `runId` (integer) | query | No | Filter to errors from a specific run. |
| `sourceName` (string) | query | No | Filter by source name (e.g. `Kinetic Request CE`). |
| `sourceGroup` (string) | query | No | Filter by source group (exact match). |
| `tree` (string) | query | No | Filter by tree title. |
| `type` (string) | query | No | `Handler Error`, `Node Parameter Error`, `Connector Error`, `Missing Handler Error`, `Unidentified Error`, `Source Error`, `Tree Error`. |
| `offset` (integer) | query | No | Pagination offset. Required to read past the first 5 records. |
| `limit` (integer) | query | No | **Ignored above 5.** Hard cap is 5 results per request. |

**Success response:** 200
```json
{ "errors": [ { "id": 1234, "type": "Handler Error", "originator": "ENGINE Run Error", "message": "...", "runId": 5678, ... } ] }
```

---

### `GET /errors/{id}`
**Operation:** `getError`
Fetch a single error record with full detail.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | Error record id |
| `include` (string) | query | No | `details` for timestamps and resolution metadata |

**Success response:** 200

---

### `POST /errors/resolve`
**Operation:** `resolveErrors`
Bulk-resolve one or more error records.

**Request body (required):**
```json
{
  "errorIds": [1234, 1235, 1236],
  "action": "Retry Task"
}
```

| Field | Description |
|---|---|
| `errorIds` | Array of error record ids to resolve. |
| `action` | One of: `Retry Task`, `Skip Task`, `Do Nothing`, `Continue Branch`, `Cancel Branch`. **Validity depends on error type — see table below.** |
| `message` | Optional resolution note stored on the error record. |

**Action validity by error type:**

| Error Type | Valid Actions |
|---|---|
| `Handler Error` | `Retry Task`, `Skip Task`, `Do Nothing` |
| `Node Parameter Error` | `Retry Task`, `Skip Task`, `Do Nothing` |
| `Connector Error` | **`Continue Branch`**, **`Cancel Branch`**, `Do Nothing` ← NOTE: `Do Nothing` is rejected here. |
| `Missing Handler Error` | `Retry Task`, `Skip Task`, `Do Nothing` |
| `Unidentified Error` | `Do Nothing` only |
| `Source Error` | `Do Nothing` only |
| `Tree Error` | `Do Nothing` only |

**Mixed-batch behavior:** sending `{errorIds: [<one Connector Error, one Handler Error>], action: "Do Nothing"}` resolves the Handler Error but **silently skips** the Connector Error. The response does not include an HTTP-level error; check resolved counts. Group by type and resolve in separate batches.

**Success response:** 200
```json
{ "resolved": 3 }
```

---

## Related

- `platform/troubleshooting` — how to read the `originator` field, common message patterns.
- `commands/kinetic-debug-run` — turns the contents of `/errors` into a diagnosis report.
- `platform/known-bugs` Bug 7 — the 5-result cap is platform-wide.
