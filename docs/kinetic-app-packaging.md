# Kinetic App Packaging Guide

Standard format for packaging, distributing, and installing Kinetic Platform applications.

## App Directory Structure

```
my-app/
├── app.json          ← Kapp definition: name, slug, forms, fields, indexes
├── seed-data.json    ← Sample/default data keyed by form slug (optional)
├── index.html        ← Single-page app UI (all CSS/JS inline)
└── server.mjs        ← Custom API handler (optional, export format)
```

## app.json — The App Manifest

Defines everything needed to provision the app on a Kinetic Platform instance.

```json
{
  "name": "Third-Party Risk",
  "slug": "third-party-risk",
  "description": "Vendor risk management with assessments, findings, and remediation tracking.",
  "category": "Compliance",
  "forms": [
    {
      "slug": "vendors",
      "name": "Vendors",
      "description": "Vendor registry",
      "submissionLabelExpression": "${values('Vendor ID')} - ${values('Name')}",
      "fields": [
        { "name": "Vendor ID", "required": true },
        { "name": "Name", "required": true },
        { "name": "Status" },
        { "name": "Risk Level" },
        { "name": "Notes", "rows": 3 }
      ],
      "indexes": {
        "single": ["values[Status]", "values[Vendor ID]"],
        "compound": [["values[Status]", "values[Risk Level]"]]
      }
    }
  ]
}
```

### Field Properties

| Property | Type | Description |
|---|---|---|
| `name` | string | Field name (display label and API key) |
| `required` | boolean | Whether the field is required for submission |
| `rows` | number | For textarea fields, number of rows (default 1 = single-line text) |

All field values are stored as strings in Kinetic — there are no typed columns.

### Index Definitions

KQL queries against `values[FieldName]` require a search index on that field. Without indexes, queries return 400 errors.

**Rules:**
- Every field used in a KQL `WHERE` clause needs an index
- `AND` queries on multiple fields need a **compound index** with those fields in order
- Field names in indexes must **exactly match** the field names on the form (case-sensitive)
- `values[Type]` ≠ `values[Issue Type]` — mismatches cause 500 errors
- The 5 system indexes (closedBy, createdBy, handle, submittedBy, updatedBy) are always added automatically by the installer

**How to determine needed indexes:**
1. Scan `index.html` for `values[FieldName]` in fetch URL query parameters
2. Scan `server.mjs` for KQL strings in `collect()` or `collectByQuery()` calls
3. Look for `orderBy=values[FieldName]` which also requires an index

## seed-data.json — Sample Data

JSON object keyed by form slug. Each value is an array of record objects (field name → string value).

```json
{
  "vendors": [
    { "Vendor ID": "V-001", "Name": "Acme Corp", "Status": "Active", "Risk Level": "Medium" },
    { "Vendor ID": "V-002", "Name": "SecureTech", "Status": "Active", "Risk Level": "Low" }
  ],
  "assessments": [
    { "Assessment ID": "A-001", "Vendor ID": "V-001", "Status": "In Progress", "Score": "72" }
  ]
}
```

**Guidelines:**
- 15-30 records per form (enough for dashboards, not excessive)
- All values must be strings (including numbers and dates)
- Use ISO date format: `"2026-04-08"`
- Use status values that match what the UI filters expect (read the index.html)
- Include a realistic mix of statuses so dashboards have data to show

## server.mjs — Custom API Handler

For apps that need server-side aggregation (dashboards, computed metrics, cross-form queries). Apps without custom endpoints don't need a server.mjs, or can have a minimal one with just metadata exports.

### Export Format

```js
export const appId = "third-party-risk";
export const apiPrefix = "/api/tprm";
export const kapp = "third-party-risk";

export async function handleAPI(req, res, pathname, auth, helpers) {
  const { collectByQuery, kineticRequest, jsonResp, readBody, vf } = helpers;

  // ALWAYS use this shorthand — never call collectByQuery directly
  async function collect(formSlug, kql, maxPages = 8) {
    return collectByQuery(kapp, formSlug, kql, auth, maxPages);
  }

  if (pathname === "/api/tprm/dashboard" && req.method === "GET") {
    const vendors = await collect("vendors");
    // ... compute KPIs ...
    jsonResp(res, 200, { totalVendors: vendors.length });
    return true;
  }

  return false; // not handled
}
```

### Available Helpers

| Helper | Signature | Description |
|---|---|---|
| `collectByQuery` | `(kapp, formSlug, kql, auth, maxPages)` | Paginate through submissions with KQL filter |
| `kineticRequest` | `(method, path, body, auth)` | Raw Core API request |
| `jsonResp` | `(res, status, data)` | Send JSON response with CORS headers |
| `readBody` | `(req)` | Read request body as string |
| `vf` | `(submission, fieldName)` | Get field value from submission (`s.values[f] \|\| ""`) |

### Critical: collectByQuery Signature

The base server's `collectByQuery` takes **kapp as the first argument**:

```js
// CORRECT — use collect() shorthand
const vendors = await collect("vendors", 'values[Status]="Active"');

// WRONG — missing kapp, silently returns empty results
const vendors = await collectByQuery("vendors", null, auth, 4);

// CORRECT — if calling collectByQuery directly
const vendors = await collectByQuery(kapp, "vendors", null, auth, 4);
```

This mismatch silently returns empty arrays (no error, just no data). Dashboards show all zeros. Always use the `collect()` shorthand inside `handleAPI`.

### Standalone Mode

Apps can also run independently for development:

```js
if (import.meta.url === `file://${process.argv[1]}`) {
  // Start standalone HTTP server with inline helpers
  // See any app's server.mjs for the full pattern
}
```

## Installing an App

### From CLI
```bash
node admin_apps/app_manager/install.mjs \
  https://first.kinetics.com john password \
  apps/my-app --seed
```

### From the Launcher
Click any uninstalled app in the Platform Launcher. Space admins see an "Install App" button that provisions the kapp, forms, indexes, and seed data.

### What Install Does
1. Creates the kapp (`POST /kapps`)
2. Creates each form with field definitions (`POST /kapps/{slug}/forms`)
3. Defines and builds search indexes (PUT index definitions + background build job)
4. Waits for index builds to complete (polls until status changes from "New")
5. Seeds data from `seed-data.json` if present (parallel batches of 10)

### Auto-Discovery

The base server (`apps/base/server.mjs`) auto-discovers all apps at startup:
- Scans `apps/` for directories containing `app.json`
- Mounts static files at `/{slug}/`
- Dynamically imports `server.mjs` and registers API handlers at the exported `apiPrefix`
- No manual registration needed — drop a directory and restart

## Lessons Learned

### Index field names must exactly match form fields
The index `values[Type]` requires a field literally named `Type` on the form. If the field is `Issue Type`, the index must be `values[Issue Type]`. Mismatches cause HTTP 500 on the PUT that defines indexes, and the install silently skips that form's indexes.

### Seed data field names must match form fields
Posting a submission with a field name that doesn't exist on the form returns HTTP 500 (`"The X field is not defined"`). Verify seed-data.json keys match app.json field names exactly.

### Dashboard response format must match the UI
If the HTML expects `d.incidents.open` (nested), the API must return `{ incidents: { open: 6 } }`, not `{ openIncidents: 6 }` (flat). Changing the API response format without updating the HTML causes `undefined is not an object` errors.

### KQL returns empty without indexes (not errors)
A query on `values[Status]` without a `values[Status]` index returns 400. But a form with no data and proper indexes returns 200 with an empty array. Both look the same on a dashboard (zeros everywhere). Always seed sample data so you can distinguish "no index" from "no data."

### Kinetic license limits
An unlicensed Kinetic Platform stops accepting submissions after hitting its limit. The application status changes to "Stopped." Kapps and forms can still be created, but data seeding fails silently (each POST returns 400). Check `GET /license-check` if bulk operations start failing.

### Multi-kapp apps should be flattened
The original ITSM app used 5 separate kapps (incident, change, service-request, knowledge, foundation). This made installation complex and fragile. Flattening to a single `itsm` kapp with all forms works better — simpler install, simpler queries, same UI. Only use multiple kapps if there's a genuine security boundary between them.
