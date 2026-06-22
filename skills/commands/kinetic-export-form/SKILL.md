---
name: kinetic-export-form
description: Export a single Kinetic form (with fields, indexes, events, integrations, attributes) to a JSON file for version control or migration
argument-hint: "<kapp-slug> <form-slug> [output-path]"
user-invocable: true
---

# Export a Form to JSON

The user wants to export a single form's complete definition to disk — typically for version control, code review, or as the source for `/kinetic-migrate` to apply elsewhere. Parse the argument for kapp slug, form slug, and an optional output path (default: `./forms/{kapp}-{form}-{timestamp}.json`).

> **Tooling:** straight Core REST API. See `api/core/forms.md` for endpoint shape and `concepts/form-engine` for what each field of the response means.

## Step 1: Connect

Authenticate with Basic Auth against the Core API. Confirm the kapp and form exist:

```
GET /app/api/v1/kapps/{kappSlug}
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}
```

A 404 on either is fatal — report it and stop.

## Step 2: Fetch the Form with All Details

Use `include` to pull every property a future `/kinetic-migrate` or hand-restore would need:

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=details,fields,indexDefinitions,attributes,attributesMap,categorizations,bridgedResources,securityPolicies,backgroundJobs
```

The response carries the form's pages/sections/fields, custom indexes (with current build status), attribute values, categorizations, bridged resources, and policy assignments.

## Step 3: Decide What to Strip

Some fields are **server-managed** and should NOT round-trip through a re-import:

| Field | Reason to strip |
|---|---|
| `createdAt` / `updatedAt` / `createdBy` / `updatedBy` | Server timestamps; will be set on re-create |
| Index definitions' `status` field | `"New"` / `"Building"` / `"Built"` is per-environment state |
| `backgroundJobs` array | Per-environment job history |
| `space` / `kapp` nested objects beyond `slug` | Avoids carrying surrounding context |

Some fields are **environment-specific** but you may want to keep them for reference (commented or under a wrapper):

| Field | Decision |
|---|---|
| Connection / operation UUIDs inside `integrations[].connectionId` and `[].operationId` | Different environment = different UUIDs. Keep as-is and document a sed-replace step at import time, OR replace with `{{CONNECTION_ID}}` placeholders. |
| Security policy names in `securityPolicies` | These reference policy *definitions*. If you also export the definitions, fine; otherwise the importer must ensure same-named policies exist. |
| Categorization slugs | Categories must exist in the target kapp. |

Ask the user (or default to "strip system fields, keep UUIDs as-is") if the answer isn't clear from context.

## Step 4: Compose the Export Wrapper

Wrap the form body with metadata so the export is self-describing:

```json
{
  "$schema": "kinetic-form-export-v1",
  "exportedAt": "2026-06-13T15:00:00.000Z",
  "exportedFrom": {
    "space": "demo",
    "kapp": "services",
    "host": "https://demo.kinops.io"
  },
  "form": {
    "name": "Maintenance Request",
    "slug": "maintenance-request",
    "status": "Active",
    "type": "Service",
    "anonymous": false,
    "submissionLabelExpression": "...",
    "pages": [ ... ],
    "indexDefinitions": [
      { "name": "values[Status]", "parts": ["values[Status]"], "unique": false }
    ],
    "attributesMap": { ... },
    "categorizations": [ ... ],
    "integrations": [ ... ],
    "securityPolicies": [ ... ]
  }
}
```

The `$schema` field gives `/kinetic-migrate` and human reviewers a stable identifier; bump when the export format changes incompatibly.

## Step 5: Write to Disk

```
forms/services-maintenance-request-2026-06-13T15-00-00.json
```

Pretty-print with 2-space indentation so diffs are reviewable. If `--minify` is requested, strip whitespace.

## Step 6: Report

```
Exported: services / maintenance-request
  → ./forms/services-maintenance-request-2026-06-13T15-00-00.json
  Size: 18.4 KB
  Pages: 1   Fields: 7   Indexes: 4   Integrations: 2
  Workflows: NOT INCLUDED (use /kinetic-explain-workflow + treeJson export separately)
  Security definitions: NOT INCLUDED (referenced by name; ensure same-named policies exist in target)
```

## Critical Rules

- **Workflows are NOT in the form export.** They live on the Task API and are bound by `platformItemId`. Export them separately via `/kinetic-explain-workflow` or a treeJson dump.
- **Security policy *definitions* are NOT in the form export.** The form references them by name; the target kapp must have same-named definitions for the import to resolve.
- **Connection/Operation UUIDs are environment-specific.** Either replace with placeholders before commit, or document the sed-replace step in your migration runbook.
- **Index `status` is dropped.** A re-imported form's indexes will land in `"New"` state and need building (`POST /backgroundJobs`).
- **Submission data is NOT exported.** This is form schema only. See `/kinetic-migrate` for data copy.

## Related Commands

- `/kinetic-migrate` — apply an exported form to a different kapp / environment, with options to recreate indexes and copy submissions.
- `/kinetic-explain-workflow` — companion export for the workflow(s) bound to this form.
