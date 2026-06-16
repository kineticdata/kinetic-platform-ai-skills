---
name: create-submission-form
description: "Use when creating a new submission-driven form on the Kinetic Platform end-to-end — defining the form and its fields, adding index definitions for KQL search, wiring events, and verifying with a test submission (e.g. service requests, IT tickets, approvals, recruiting)."
---

# Recipe: Create a Submission-Driven Form

This recipe walks through creating a form end-to-end on the Kinetic Platform — defining fields, configuring indexes for KQL search, adding optional events, and verifying with a test submission. The example uses a **maintenance request** form, but the same pattern applies to any submission-driven workflow: recruiting, field service, IT requests, approvals, etc.

**Before reading this recipe, familiarise yourself with:**
- `skills/concepts/api-basics/SKILL.md` — endpoints, auth, response shapes
- `skills/concepts/form-engine/SKILL.md` — form JSON schema, field types, events
- `skills/concepts/kql-and-indexing/SKILL.md` — index definitions, KQL gotchas

> Field JSON structure, render types, required properties per field type, choice (dropdown/radio/checkbox) fields, conditional visibility, and hidden-field patterns are documented in `concepts/form-engine`. This recipe assumes that material and focuses on the create → index → events → verify flow.

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

> Field/section/button JSON, render types (`text`, `dropdown`, `radio`, `checkbox`, `date`, `attachment`, …), the required-property set per type (and which are forbidden, e.g. `rows` on choice fields), choice-field shapes, conditional `visible`/`required` expressions, and the hidden-section + `omitWhenHidden: false` pattern are all documented in `concepts/form-engine`. Build each element from those templates. The points below are the recipe-specific layout decisions.

**Field layout for a submission-driven form.** Most forms organize fields into three categories:

- **User-facing input fields** (`visible: true`) — what the requester fills in (Location, Category, Description, Priority, Preferred Date, Attachments).
- **Status / routing fields** — populated by workflows, not the requester. A `Status` text field with `defaultValue: "New"` is the primary one (it becomes the main KQL filter — see Step 3).
- **Hidden system fields** — metadata written by workflows (Assigned Team, Deferral Token), placed in a section with `visible: false` + `omitWhenHidden: false` so their values still submit. (`omitWhenHidden: false` is the load-bearing property here — see `concepts/form-engine`.)
- **Denormalized identity fields** (optional — staff-facing intake forms) — when a form is filled in *on behalf of* someone (helpdesk, HR, facilities), it's common to denormalize 10–20 fields about the requester onto the submission: department, location, manager name, manager email, cost center, employee ID, phone, building, room, supervisor team. These come from a Person bridge (LDAP/AD/HR) and live in a hidden section like the system fields above. The form has one *visible* `Requester Username` (or `Requester Email`) field with a Change event that calls a Get-Person-Details integration; the handler writes the resolved fields back into the hidden section via `K('field[Department]').value(result['department'])` etc. The denormalized values then ride along on the submission so workflows, reports, and the SoR don't have to re-query the directory. Use this when a single person field isn't enough context — e.g., approval routing depends on the requester's manager, fulfillment cost depends on their cost center, or the request payload to a downstream system needs department/location embedded. Skip it when the requester *is* the submitter (`submittedBy` is already on the submission and identity is implicit).

**Representative PUT body** (abbreviated — one field per shape; expand using the form-engine templates for each element):

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
          "type": "section", "name": "Request Details", "title": "Request Details",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            { "type": "field", "name": "Location", "renderType": "text", "dataType": "string", "rows": 1, "required": true, "...": "see text template" },
            { "type": "field", "name": "Category", "renderType": "dropdown", "dataType": "string", "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null, "choices": [{ "label": "Plumbing", "value": "Plumbing" }, { "label": "Other", "value": "Other" }], "...": "see dropdown template" },
            { "type": "field", "name": "Description", "renderType": "text", "dataType": "string", "rows": 5, "required": true, "...": "see text template" },
            { "type": "field", "name": "Priority", "renderType": "radio", "dataType": "string", "defaultValue": "Normal", "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null, "choices": [{ "label": "Low", "value": "Low" }, { "label": "Urgent", "value": "Urgent" }], "...": "see radio template" },
            { "type": "field", "name": "Attachments", "renderType": "attachment", "dataType": "file", "renderAttributes": { "allowMultiple": "true" }, "...": "see attachment template" }
          ]
        },
        {
          "type": "section", "name": "Status Fields", "title": "Status",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            { "type": "field", "name": "Status", "renderType": "text", "dataType": "string", "rows": 1, "defaultValue": "New", "...": "see text template" }
          ]
        },
        {
          "type": "section", "name": "Hidden System Questions",
          "visible": false, "omitWhenHidden": false, "renderAttributes": {},
          "elements": [
            { "type": "field", "name": "Assigned Team", "renderType": "text", "dataType": "string", "rows": 1, "...": "see text template" },
            { "type": "field", "name": "Deferral Token", "renderType": "text", "dataType": "string", "rows": 1, "...": "see text template" }
          ]
        },
        {
          "type": "button", "renderType": "submit-page", "name": "Submit Button",
          "label": "Submit", "visible": true, "enabled": true, "renderAttributes": {}
        }
      ]
    }
  ]
}
```

The `"...": "see ... template"` placeholders stand in for the full required-property set each element type needs — fill them from `concepts/form-engine` before PUTting, or the API returns `400 Invalid Form`.

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
| `PUT /forms/{slug}` wipes existing system indexes | Always fetch current `indexDefinitions` first and merge |
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
