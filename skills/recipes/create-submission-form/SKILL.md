---
name: create-submission-form
description: Step-by-step recipe for creating a new form with fields, index definitions, events, and submission handling on the Kinetic Platform.
---

# Recipe: Create a Submission-Driven Form

This recipe walks through creating a form end-to-end on the Kinetic Platform — defining fields, configuring indexes for KQL search, adding optional events, and verifying with a test submission. The example uses a **maintenance request** form, but the same pattern applies to any submission-driven workflow: recruiting, field service, IT requests, approvals, etc.

**Before reading this recipe, familiarise yourself with:**
- `skills/concepts/api-basics/SKILL.md` — endpoints, auth, response shapes
- `skills/concepts/form-engine/SKILL.md` — form JSON schema, field types, events
- `skills/concepts/kql-and-indexing/SKILL.md` — index definitions, KQL gotchas

---

## Overview

A complete form creation flow has five steps:

1. Create the form definition (POST to forms endpoint)
2. Add fields with appropriate types
3. Define index definitions (critical — KQL queries fail without them)
4. Add events (optional — for default values, field-level logic, validation)
5. Verify with a test submission

---

## Step 1 — Create the Form Definition

```
POST /app/api/v1/kapps/{kappSlug}/forms
Content-Type: application/json
Authorization: Basic <base64(username:password)>
```

**Minimal payload:**

```json
{
  "name": "Maintenance Request",
  "slug": "maintenance-request",
  "status": "Active",
  "type": "Service",
  "anonymous": false,
  "submissionLabelExpression": "${form('name')} — ${values('Location')}",
  "pages": [
    {
      "name": "Page 1",
      "type": "page",
      "renderType": "submittable",
      "elements": []
    }
  ]
}
```

**Key form-level properties:**

| Property | Required | Notes |
|----------|----------|-------|
| `name` | Yes | Display name shown in the UI |
| `slug` | Yes | URL-safe identifier; must be unique within the kapp |
| `status` | Yes | `"Active"` or `"Inactive"` |
| `type` | Yes | Arbitrary string — used to filter forms in views (e.g. `"Service"`, `"Approval"`, `"Task"`) |
| `anonymous` | No | `true` to allow unauthenticated submissions |
| `submissionLabelExpression` | No | Template string for the submission display label; uses `${values('...')}` syntax |

**Successful response:**

```json
{
  "form": {
    "name": "Maintenance Request",
    "slug": "maintenance-request",
    "status": "Active",
    "type": "Service",
    ...
  }
}
```

---

## Step 2 — Add Fields

Update the form by adding fields to the `pages[0].elements` array. The full form must be PUTed — not patched — so include the complete `pages` structure.

```
PUT /app/api/v1/kapps/{kappSlug}/forms/{formSlug}
Content-Type: application/json
```

### Field Type Reference

| renderType | dataType | Notes |
|------------|----------|-------|
| `text` | `string` | Single-line text; set `rows > 1` for textarea behaviour |
| `text` | `string` | Textarea: `"rows": 5` |
| `dropdown` | `string` | Select with static or integration-driven choices |
| `radio` | `string` | Radio button group |
| `checkbox` | `json` | Multi-select; value is stored as a JSON array |
| `date` | `string` | Date picker |
| `datetime` | `string` | Date + time picker |
| `time` | `string` | Time picker |
| `attachment` | `file` | File upload; set `"allowMultiple": true` in `renderAttributes` for multi-file |

### Required Field Properties

**Critical:** The API validates that ALL field properties are present. Omitting any property results in a `400 Invalid Form` error. Every field element MUST include these properties:

```json
{
  "type": "field",
  "name": "Field Name",
  "label": "Field Name",
  "key": "f1",
  "renderType": "text",
  "dataType": "string",
  "required": false,
  "enabled": true,
  "visible": true,
  "defaultValue": null,
  "defaultDataSource": "none",
  "defaultResourceName": null,
  "requiredMessage": null,
  "omitWhenHidden": null,
  "pattern": null,
  "constraints": [],
  "events": [],
  "rows": 1,
  "renderAttributes": {}
}
```

Section elements also require: `renderType: null`, `omitWhenHidden: null`, `renderAttributes: {}`.

Form-level and page-level `events: []` must also be present (even if empty).

### Typical Field Pattern

Most submission-driven forms have three categories of fields:

**User-facing input fields** — what the requester fills in

```json
{
  "type": "field",
  "name": "Location",
  "label": "Location",
  "key": "f1",
  "renderType": "text",
  "dataType": "string",
  "required": true,
  "enabled": true,
  "visible": true,
  "defaultValue": null,
  "defaultDataSource": "none",
  "defaultResourceName": null,
  "requiredMessage": null,
  "omitWhenHidden": null,
  "pattern": null,
  "constraints": [],
  "events": [],
  "rows": 1,
  "renderAttributes": {}
}
```

**Status and routing fields** — populated by workflows, not the requester

```json
{
  "type": "field",
  "name": "Status",
  "label": "Status",
  "key": "f10",
  "renderType": "text",
  "dataType": "string",
  "required": false,
  "enabled": true,
  "visible": true,
  "defaultValue": "New",
  "defaultDataSource": "none",
  "defaultResourceName": null,
  "requiredMessage": null,
  "omitWhenHidden": null,
  "pattern": null,
  "constraints": [],
  "events": [],
  "rows": 1,
  "renderAttributes": {}
}
```

**Hidden system fields** — metadata written by workflows; never shown to the requester

```json
{
  "type": "section",
  "name": "Hidden System Questions",
  "visible": false,
  "omitWhenHidden": false,
  "elements": [
    {
      "type": "field",
      "name": "Assigned Team",
      "renderType": "text",
      "dataType": "string",
      "required": false,
      "enabled": true,
      "visible": true,
      "defaultValue": null,
      "defaultDataSource": "none",
      "rows": 1,
      "renderAttributes": {}
    },
    {
      "type": "field",
      "name": "Deferral Token",
      "renderType": "text",
      "dataType": "string",
      "required": false,
      "enabled": true,
      "visible": true,
      "defaultValue": null,
      "defaultDataSource": "none",
      "rows": 1,
      "renderAttributes": {}
    }
  ]
}
```

> `omitWhenHidden: false` is critical. Without it, the hidden section's field values are not submitted and workflows cannot read them.

### Dropdown with Static Choices

```json
{
  "type": "field",
  "name": "Category",
  "label": "Category",
  "renderType": "dropdown",
  "dataType": "string",
  "required": true,
  "enabled": true,
  "visible": true,
  "defaultValue": null,
  "defaultDataSource": "none",
  "choicesDataSource": "custom",
  "choices": [
    { "label": "Plumbing", "value": "Plumbing" },
    { "label": "Electrical", "value": "Electrical" },
    { "label": "HVAC", "value": "HVAC" },
    { "label": "Other", "value": "Other" }
  ],
  "rows": 1,
  "renderAttributes": {}
}
```

### Conditional Field (visible and required only when needed)

```json
{
  "type": "field",
  "name": "Other Category Detail",
  "label": "Please specify",
  "renderType": "text",
  "dataType": "string",
  "required": "values('Category') === 'Other'",
  "visible": "values('Category') === 'Other'",
  "omitWhenHidden": true,
  "defaultValue": null,
  "defaultDataSource": "none",
  "rows": 1,
  "renderAttributes": {}
}
```

### Complete PUT Payload (Maintenance Request Example)

```json
{
  "name": "Maintenance Request",
  "slug": "maintenance-request",
  "status": "Active",
  "type": "Service",
  "anonymous": false,
  "submissionLabelExpression": "${form('name')} — ${values('Location')}",
  "pages": [
    {
      "name": "Page 1",
      "type": "page",
      "renderType": "submittable",
      "events": [],
      "elements": [
        {
          "type": "section",
          "name": "Request Details",
          "title": "Request Details",
          "visible": true,
          "omitWhenHidden": null,
          "renderAttributes": {},
          "elements": [
            {
              "type": "field",
              "name": "Location",
              "label": "Location",
              "renderType": "text",
              "dataType": "string",
              "required": true,
              "enabled": true,
              "visible": true,
              "defaultValue": null,
              "defaultDataSource": "none",
              "rows": 1,
              "renderAttributes": {}
            },
            {
              "type": "field",
              "name": "Category",
              "label": "Category",
              "renderType": "dropdown",
              "dataType": "string",
              "required": true,
              "enabled": true,
              "visible": true,
              "defaultValue": null,
              "defaultDataSource": "none",
              "choicesDataSource": "custom",
              "choices": [
                { "label": "Plumbing", "value": "Plumbing" },
                { "label": "Electrical", "value": "Electrical" },
                { "label": "HVAC", "value": "HVAC" },
                { "label": "Other", "value": "Other" }
              ],
              "rows": 1,
              "renderAttributes": {}
            },
            {
              "type": "field",
              "name": "Description",
              "label": "Description",
              "renderType": "text",
              "dataType": "string",
              "required": true,
              "enabled": true,
              "visible": true,
              "defaultValue": null,
              "defaultDataSource": "none",
              "rows": 5,
              "renderAttributes": {}
            },
            {
              "type": "field",
              "name": "Priority",
              "label": "Priority",
              "renderType": "radio",
              "dataType": "string",
              "required": true,
              "enabled": true,
              "visible": true,
              "defaultValue": "Normal",
              "defaultDataSource": "none",
              "choicesDataSource": "custom",
              "choices": [
                { "label": "Low", "value": "Low" },
                { "label": "Normal", "value": "Normal" },
                { "label": "High", "value": "High" },
                { "label": "Urgent", "value": "Urgent" }
              ],
              "rows": 1,
              "renderAttributes": {}
            },
            {
              "type": "field",
              "name": "Preferred Date",
              "label": "Preferred Date",
              "renderType": "date",
              "dataType": "string",
              "required": false,
              "enabled": true,
              "visible": true,
              "defaultValue": null,
              "defaultDataSource": "none",
              "rows": 1,
              "renderAttributes": {}
            },
            {
              "type": "field",
              "name": "Attachments",
              "label": "Attachments (optional)",
              "renderType": "attachment",
              "dataType": "file",
              "required": false,
              "enabled": true,
              "visible": true,
              "defaultValue": null,
              "defaultDataSource": "none",
              "rows": 1,
              "renderAttributes": { "allowMultiple": "true" }
            }
          ]
        },
        {
          "type": "section",
          "name": "Status Fields",
          "title": "Status",
          "visible": true,
          "omitWhenHidden": null,
          "renderAttributes": {},
          "elements": [
            {
              "type": "field",
              "name": "Status",
              "label": "Status",
              "renderType": "text",
              "dataType": "string",
              "required": false,
              "enabled": true,
              "visible": true,
              "defaultValue": "New",
              "defaultDataSource": "none",
              "rows": 1,
              "renderAttributes": {}
            }
          ]
        },
        {
          "type": "section",
          "name": "Hidden System Questions",
          "visible": false,
          "omitWhenHidden": false,
          "renderAttributes": {},
          "elements": [
            {
              "type": "field",
              "name": "Assigned Team",
              "renderType": "text",
              "dataType": "string",
              "required": false,
              "enabled": true,
              "visible": true,
              "defaultValue": null,
              "defaultDataSource": "none",
              "rows": 1,
              "renderAttributes": {}
            },
            {
              "type": "field",
              "name": "Deferral Token",
              "renderType": "text",
              "dataType": "string",
              "required": false,
              "enabled": true,
              "visible": true,
              "defaultValue": null,
              "defaultDataSource": "none",
              "rows": 1,
              "renderAttributes": {}
            }
          ]
        },
        {
          "type": "button",
          "renderType": "submit-page",
          "name": "Submit Button",
          "label": "Submit",
          "visible": true,
          "enabled": true
        }
      ]
    }
  ]
}
```

---

## Step 3 — Define Index Definitions (Critical)

**KQL queries will fail with a 400 error if the fields being searched do not have index definitions.** This includes simple equality queries like `values[Status] = "New"`.

Add indexes in the same PUT call as the fields, or as a separate PUT:

```
PUT /app/api/v1/kapps/{kappSlug}/forms/{formSlug}
Content-Type: application/json
```

```json
{
  "indexDefinitions": [
    { "name": "idx_status",          "parts": ["values[Status]"],                         "unique": false },
    { "name": "idx_category",        "parts": ["values[Category]"],                       "unique": false },
    { "name": "idx_priority",        "parts": ["values[Priority]"],                       "unique": false },
    { "name": "idx_status_category", "parts": ["values[Status]", "values[Category]"],     "unique": false },
    { "name": "idx_status_priority", "parts": ["values[Status]", "values[Priority]"],     "unique": false }
  ]
}
```

> **IMPORTANT — The PUT replaces ALL index definitions.** Always include the existing system indexes alongside your new ones, or they will be removed. To be safe, fetch the current `indexDefinitions` first:
> ```
> GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=indexDefinitions
> ```
> Then merge your new indexes with the existing ones in the PUT body.

### Recommended Base Indexes for Most Forms

| Index | When to add |
|-------|-------------|
| `values[Status]` | Always — status is the primary filter in virtually all views |
| `values[Category]` | If your form has a category/type field used in filters |
| `values[Priority]` | If priority filtering is needed |
| `values[Status], values[Category]` | Required when you AND these two together in KQL |
| `values[Status], values[Priority]` | Required when you AND these two together in KQL |

### Compound Index Rules

Single-field indexes are NOT sufficient for multi-field `AND` queries. KQL will fail with an explicit error like:

```
"The query requires one of the following index definitions to exist:
 values[Category],values[Status]  values[Status],values[Category]"
```

For every combination of fields you intend to AND together in KQL, you need a compound (multi-part) index:

```json
{ "parts": ["values[Status]", "values[Category]"] }
```

Field ordering within `parts` does not matter — Kinetic matches compound indexes regardless of order.

### Triggering the Index Build

New indexes have status `"New"` and return **empty results** (not errors) until built. Trigger a build after defining indexes:

```
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/backgroundJobs
Content-Type: application/json

{
  "type": "Build Index",
  "content": {
    "indexes": ["values[Status]", "values[Category]", "values[Priority]",
                "values[Status],values[Category]", "values[Status],values[Priority]"]
  }
}
```

Poll until all index statuses change from `"New"` to `"Built"`:

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}?include=indexDefinitions
```

With a new (empty) form, building takes under a second. With large historical data, allow 5–30 seconds.

---

## Step 4 — Add Events (Optional)

Events add dynamic behaviour: setting defaults on load, deriving field values from other fields, or validating before submit.

Add events to the `pages[0].events` array or to individual field `events` arrays in the same PUT as the fields.

### Page Load Event — Set Requester Identity

Populate hidden requester fields when the form loads:

```json
{
  "pages": [
    {
      "name": "Page 1",
      "events": [
        {
          "type": "Load",
          "action": "Set Fields",
          "name": "Set Requester",
          "runIf": null,
          "integrationResourceName": null,
          "mappings": [
            { "field": "Requested By",          "value": "${identity('username')}" },
            { "field": "Requested By Display",  "value": "${identity('displayName')}" }
          ]
        }
      ],
      "elements": [...]
    }
  ]
}
```

### Field Change Event — Validate a Date

```json
{
  "type": "field",
  "name": "Preferred Date",
  "events": [
    {
      "type": "Change",
      "action": "Custom",
      "name": "Validate Future Date",
      "runIf": "values('Preferred Date') != null",
      "code": "const selected = new Date(values('Preferred Date'));\nconst today = new Date();\nif (selected <= today) {\n  alert('Preferred Date must be in the future.');\n  K('field[Preferred Date]').value(null);\n}"
    }
  ]
}
```

### Page Submit Event — Async Pre-Submit Check

```json
{
  "pages": [
    {
      "name": "Page 1",
      "events": [
        {
          "type": "Submit",
          "action": "Custom",
          "name": "Pre-Submit Validation",
          "runIf": null,
          "code": "action.stop();\n$.ajax({\n  url: '/some/check',\n  success: function() { action.continue(); },\n  error: function() { alert('Pre-submit check failed.'); }\n});"
        }
      ]
    }
  ]
}
```

---

## Step 5 — Verify with a Test Submission

Create a submission via the API to confirm the form definition is valid and indexes work:

```
POST /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions
Content-Type: application/json

{
  "values": {
    "Location": "Building A, Room 104",
    "Category": "Plumbing",
    "Description": "Sink is leaking under the counter.",
    "Priority": "Normal"
  },
  "coreState": "Submitted"
}
```

**Expected response (201 Created):**

```json
{
  "submission": {
    "id": "abc123...",
    "coreState": "Submitted",
    "createdAt": "2026-04-07T10:00:00.000Z",
    "values": {
      "Location": "Building A, Room 104",
      "Category": "Plumbing",
      "Description": "Sink is leaking under the counter.",
      "Priority": "Normal",
      "Status": "New"
    }
  }
}
```

Then verify KQL search works:

```
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions
  ?include=values,details
  &q=values[Status]="New"
  &limit=25
```

If you get a 400 with a message like `"The query requires one of the following index definitions to exist: values[Status]"`, the index either was not defined or has not finished building. Check index statuses and re-trigger the build if needed.

---

## Common Gotchas

| Gotcha | Fix |
|--------|-----|
| KQL returns 400 — "query requires index definition" | Add `indexDefinitions` for the queried fields, trigger `Build Index` background job, wait for status `"Built"` |
| AND query fails even though both fields have single-field indexes | Multi-field AND requires a **compound** index: `"parts": ["values[A]", "values[B]"]` |
| Range operator (`=*`, `>`, `<`, `BETWEEN`) fails without `orderBy` | Add `&orderBy=values[FieldName]` to the request |
| Hidden section fields not submitted | Set `omitWhenHidden: false` on the section |
| `PUT /forms/{slug}` wipes existing system indexes | Always fetch current `indexDefinitions` first and merge |
| `checkbox` field value comparisons fail with `===` | Checkbox values are JSON arrays — use `.indexOf('value') !== -1` |
| Submitting a value for a non-existent field returns 500 | Verify field names with `GET /forms/{form}?include=fields` |
| New index returns empty results (not an error) | Index is still in `"New"` state — trigger build, poll until `"Built"` |
| Form PUT with partial `pages` loses other pages | Always include the complete `pages` array in PUT requests |

---

## Applying This Pattern to Other Domains

The maintenance request form above uses the same structural pattern as any submission-driven workflow:

| Domain | User Fields | Status Field Values | Hidden Fields |
|--------|-------------|---------------------|---------------|
| IT Request | Asset type, Description, Urgency | New, In Progress, Resolved, Closed | Assigned Team, Ticket Number, Deferral Token |
| Recruiting | Role, Hiring Manager, Job Grade | Open, Screening, Interviewing, Offer, Closed | Requisition ID, ATS Reference, Assigned Recruiter |
| Field Service | Site, Equipment ID, Fault Description | Scheduled, Dispatched, On Site, Complete | Technician, Work Order Number, Deferral Token |
| Approval | Item, Requestor, Justification | Pending, Approved, Denied | Decision, Approver, Approval Token |

The only things that change are field names, dropdown choices, and which index combinations you need for your query patterns.

---

## Cross-References

- `skills/concepts/api-basics/SKILL.md` — endpoint paths, authentication, response shapes, PATCH for backdated submissions
- `skills/concepts/form-engine/SKILL.md` — full field type reference, events, K() API, expression syntax, `bundle.config` overrides
- `skills/concepts/kql-and-indexing/SKILL.md` — KQL operators, compound indexes, range operator rules, client-side filter strategy
