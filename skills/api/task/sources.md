<!-- MANUALLY AUTHORED — pending OAS regeneration to replace this with auto-generated content. -->
<!-- Source: hand-authored to match auto-generated format. Promote to OAS-generated once spec covers /sources. -->

# Sources API Reference

Source: Kinetic Task REST API v2.0

> Hand-authored to fill a gap in the auto-generated reference. For broader Source concepts and how they relate to trees, runs, and the `source` filter, see `concepts/task-api-reference` and `concepts/workflow-creation`.

A **source** is the originator namespace for trees and runs. The platform's primary source for kapp/form-bound workflows is `"Kinetic Request CE"`. WebAPIs and routines use distinct source-group names within that source. Sources are mostly configured during platform install; this API exposes read access (and limited mutate access) for tooling and diagnostics.

> **Response key gotcha.** `GET /sources` returns `{ "sourceRoots": [...] }`, **not** `{ "sources": [...] }`. Parsing code that keys on `sources` returns empty.

---

### `GET /sources`
**Operation:** `searchSources`
List source roots.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | `details` adds timestamps; `policyRules` adds the source's assigned Task policy rules; `groups` adds the source-group enumeration |

**Success response:** 200
```json
{
  "sourceRoots": [
    {
      "name": "Kinetic Request CE",
      "type": "Adhoc",
      "status": "Active",
      "policyRules": [ ... ],
      "groups": [
        "WebApis > services",
        "WebApis > queue",
        "Submissions > services > maintenance-request",
        ...
      ]
    }
  ]
}
```

---

### `GET /sources/{name}`
**Operation:** `getSource`
Fetch one source root by name.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | Source root name, URL-encoded (`Kinetic%20Request%20CE`) |
| `include` (string) | query | No | `details`, `policyRules`, `groups` |

**Success response:** 200

---

### `PUT /sources/{name}`
**Operation:** `updateSource`
Update a source root. Most teams don't need to touch this — sources are configured by the platform installer.

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | Source root name |

**Request body:** Source config (status, policyRules assignments, type-specific fields)

**Success response:** 200

---

## How `source` interacts with other Task endpoints

- **`/trees?source={sourceName}`** — filter trees by their source. All kapp/form/space-bound trees share `sourceName: "Kinetic Request CE"`. The `source` parameter takes the **source name**, not a kapp slug; `source={kappSlug}` returns zero results. See `concepts/workflow-creation` "Finding Trees for a Kapp/Form (Discovery)."
- **`/runs?source={sourceName}&sourceGroup={group}`** — filter runs the same way. `sourceGroup` is finer-grained (one per kapp or per WebAPI).
- **`/sources/{name}/policyRules`** — Task engine security policies scoped to the source. See `concepts/security-policies` "Task Engine Security."

---

## Source Types

| Type | Used for |
|---|---|
| `Adhoc` | The default for `Kinetic Request CE` — trees + runs created by platform events and direct API calls. |
| `External` | Sources representing integrated external systems (rare). |
| `Workflow` | Internal platform sources for system-level workflows. |

---

## Related

- `concepts/workflow-creation` — tree binding model, finding trees by source.
- `concepts/task-api-reference` — broader Task API reference; this file is a deep dive on sources specifically.
- `concepts/security-policies` — Task policy rules attached to sources (separate language from Core security).
- `api/task/runs.md`, `api/task/trees.md` — runs and trees use `source` / `sourceGroup` filters that map back to this endpoint.
