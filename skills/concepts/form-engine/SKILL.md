---
name: form-engine
description: Kinetic form JSON schema, field types, required properties per type, choices, content elements, buttons, and API creation gotchas.
---

# Form Engine

The Kinetic form engine renders forms from a JSON definition. Forms can be built in the low-code Form Builder and rendered via `CoreForm` in React, or their structure can be created/modified via the API.

---

## Form JSON Schema

**`include=pages` vs `include=fields`:**
- **`include=pages`** — the real form structure. Returns the full nested page/section/field hierarchy with ALL properties (renderType, dataType, choices, constraints, events, visibility, etc.). Use this when you need the complete form definition.
- **`include=fields`** — a flat list of field names. Useful for dynamically understanding what fields exist (e.g., building table column headers, generating search filters) but does NOT include renderType, choices, or other structural properties. Think of it as metadata about the form's data shape, not the form itself.

A form definition retrieved via `GET /kapps/{kapp}/forms/{form}?include=pages,indexDefinitions,attributesMap` contains:

```json
{
  "form": {
    "name": "New Employee Onboarding",
    "slug": "new-employee-onboarding",
    "description": "",
    "status": "Active",
    "type": "Service",
    "anonymous": false,
    "submissionLabelExpression": "${form('name')} request for ${values('Requested for Display Name')}",
    "customHeadContent": null,
    "attributes": [...],
    "bridgedResources": [],
    "integrations": [...],
    "indexDefinitions": [...],
    "securityPolicies": [],
    "categorizations": [{ "category": { "slug": "hr--employee-services" } }],
    "pages": [...]
  }
}
```

### Key Form Properties

| Property | Description |
|----------|-------------|
| `name` | Display name |
| `slug` | URL-safe identifier |
| `type` | Classification (e.g., "Service", "Approval", "Task") — queryable for UI views |
| `status` | "Active" or "Inactive" |
| `anonymous` | Whether unauthenticated submissions are allowed |
| `submissionLabelExpression` | Template for submission display labels using expression syntax |
| `customHeadContent` | Custom HTML/JS injected into form head |
| `attributes` | Key-value metadata (Icon, Assigned Team, Notification Template, etc.) |
| `securityPolicies` | Access control definitions |
| `categorizations` | Category assignments for form organization |

---

## Page Structure

Forms contain one or more pages. Each page has elements (sections, fields, buttons, content) and events.

```json
{
  "name": "Page 1",
  "type": "page",
  "renderType": "submittable",
  "advanceCondition": "values('Status') === 'Complete' || values('Status') === 'Cancelled'",
  "displayCondition": null,
  "events": [...],
  "elements": [...]
}
```

| Property | Description |
|----------|-------------|
| `renderType` | `"submittable"` (has submit button) or `"confirmation"` |
| `advanceCondition` | Expression that must be true to submit/advance the page |
| `displayCondition` | Expression controlling whether the page is shown |
| `events` | Page-level events (Load, Submit) |

---

## Element Types

### Sections

Group fields visually. Support layout via `renderAttributes`:

```json
{
  "type": "section",
  "name": "Employee Name",
  "title": "Employee Name",
  "visible": true,
  "omitWhenHidden": null,
  "renderAttributes": { "class": "cols-2" },
  "elements": [...]
}
```

- `visible: false` with `omitWhenHidden: false` — hidden section whose field values are still submitted (used for system/metadata fields)
- `visible: false` with `omitWhenHidden: true` — hidden section whose field values are omitted
- `renderAttributes.class: "cols-2"` — two-column layout

### Fields

```json
{
  "type": "field",
  "name": "First Name",
  "label": "First Name",
  "renderType": "text",
  "dataType": "string",
  "required": true,
  "enabled": true,
  "visible": true,
  "defaultValue": null,
  "defaultDataSource": "none",
  "key": "f1",              // Unique field key — ties values to submissions (see Field Keys below)
  "pattern": null,          // Regex validation object — see Pattern Validation section below
  "constraints": [],        // JavaScript expression constraints — see Constraints section below
  "events": [...],
  "omitWhenHidden": null,
  "renderAttributes": {},
  "rows": 1,
  "key": "20f8b1836fa244bf8b4947dba9015edb"
}
```

### Field Keys

Every field has a `key` — a unique string that is the **stable identifier** linking field values to submissions at the storage level. Conventions:

- Use sequential keys: `"f1"`, `"f2"`, `"f3"`, etc. The form builder UI auto-increments from the highest existing key.
- Keys must be **unique within a form** — duplicates cause undefined behavior.
- Keys are **not auto-generated** by the API — you must provide them when creating fields.

**Why keys matter:** Submission values are stored by field key internally, not by field name. This means you can **change a field's type** (e.g., dropdown → text) without losing data: delete the old field, create a new field with the same `key`, and all existing submission values remain accessible. This also means renaming a field doesn't affect stored data.

The `include=values.raw` response shows values keyed by field key (e.g., `"f1": {"name": "Status", "value": "Open"}`) — useful for debugging or accessing orphaned values from deleted fields.

### Field Render Types

| renderType | dataType | Description |
|------------|----------|-------------|
| `text` | `string` | Single or multi-line text (`rows` > 1 for textarea) |
| `dropdown` | `string` | Select dropdown |
| `radio` | `string` | Radio button group |
| `checkbox` | `json` | Multi-select checkboxes (value is JSON array) |
| `date` | `string` | Date picker |
| `datetime` | `string` | Date + time picker |
| `time` | `string` | Time picker |
| `attachment` | `file` | File upload (`allowMultiple: true/false`) |

### Attachment Field Values

Attachment field values in the API response are a **JSON array of objects**:

```json
[
  {
    "name": "screenshot.png",
    "contentType": "image/png",
    "size": 45231,
    "link": "/app/api/v1/submissions/abc123/files/Screenshots/0/screenshot.png"
  }
]
```

**Download URL pattern:** `GET /submissions/{submissionId}/files/{fieldName}/{fileIndex}/{fileName}`

**In the K() form engine:** `field.form().fileDownloadPath(field.name()) + '/0/' + encodeURIComponent(field.value()[0].name)`

**Upload via `saveSubmissionMultipart`** (from `@kineticdata/react`):
```js
import { saveSubmissionMultipart } from '@kineticdata/react';
const result = await saveSubmissionMultipart({
  kappSlug, formSlug,
  values: { Summary: 'Bug report' },
  files: [{ field: 'Screenshots', file: fileObject }],
});
```

When **updating** a submission with new files while keeping existing ones, pass the existing attachment objects (with `link` property stripped) in `values` and new files in `files`.

### Complete Field Property Reference

Every field in a form API payload requires ALL properties for its type. Missing any property causes `400 Invalid Form`. Copy-paste the template for your field type and fill in the values.

#### `text` — 19 properties

```json
{
  "type": "field", "renderType": "text", "dataType": "string",
  "name": "Field Name", "key": "f1", "label": "Display Label",
  "enabled": true, "visible": true, "required": false, "requiredMessage": null,
  "defaultValue": null, "defaultDataSource": "none", "defaultResourceName": null,
  "pattern": null, "constraints": [], "events": [],
  "omitWhenHidden": null, "renderAttributes": {},
  "rows": 1
}
```
`rows`: 1 = single line, 3+ = textarea. This is the ONLY type that uses `rows`.

#### `dropdown` — 22 properties

```json
{
  "type": "field", "renderType": "dropdown", "dataType": "string",
  "name": "Field Name", "key": "f1", "label": "Display Label",
  "enabled": true, "visible": true, "required": false, "requiredMessage": null,
  "defaultValue": null, "defaultDataSource": "none", "defaultResourceName": null,
  "pattern": null, "constraints": [], "events": [],
  "omitWhenHidden": null, "renderAttributes": {},
  "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
  "choices": [{"label": "Option A", "value": "Option A"}, {"label": "Option B", "value": "Option B"}]
}
```

#### `radio` — 22 properties

```json
{
  "type": "field", "renderType": "radio", "dataType": "string",
  "name": "Field Name", "key": "f1", "label": "Display Label",
  "enabled": true, "visible": true, "required": false, "requiredMessage": null,
  "defaultValue": null, "defaultDataSource": "none", "defaultResourceName": null,
  "pattern": null, "constraints": [], "events": [],
  "omitWhenHidden": null, "renderAttributes": {},
  "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
  "choices": [{"label": "Option A", "value": "Option A"}, {"label": "Option B", "value": "Option B"}]
}
```

#### `checkbox` — 22 properties

```json
{
  "type": "field", "renderType": "checkbox", "dataType": "json",
  "name": "Field Name", "key": "f1", "label": "Display Label",
  "enabled": true, "visible": true, "required": false, "requiredMessage": null,
  "defaultValue": null, "defaultDataSource": "none", "defaultResourceName": null,
  "pattern": null, "constraints": [], "events": [],
  "omitWhenHidden": null, "renderAttributes": {},
  "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
  "choices": [{"label": "Option A", "value": "Option A"}, {"label": "Option B", "value": "Option B"}]
}
```
Note: `dataType` is `"json"` (not `"string"`). Values are stored as JSON arrays.

#### `date` / `datetime` / `time` — 18 properties each

```json
{
  "type": "field", "renderType": "date", "dataType": "string",
  "name": "Field Name", "key": "f1", "label": "Display Label",
  "enabled": true, "visible": true, "required": false, "requiredMessage": null,
  "defaultValue": null, "defaultDataSource": "none", "defaultResourceName": null,
  "pattern": null, "constraints": [], "events": [],
  "omitWhenHidden": null, "renderAttributes": {}
}
```
Change `renderType` to `"datetime"` or `"time"` as needed. No type-specific properties.

#### `attachment` — 19 properties

```json
{
  "type": "field", "renderType": "attachment", "dataType": "file",
  "name": "Field Name", "key": "f1", "label": "Display Label",
  "enabled": true, "visible": true, "required": false, "requiredMessage": null,
  "defaultValue": null, "defaultDataSource": "none", "defaultResourceName": null,
  "pattern": null, "constraints": [], "events": [],
  "omitWhenHidden": null, "renderAttributes": {},
  "allowMultiple": false
}
```
`allowMultiple`: `true` allows multiple file uploads on a single field.

#### Type-Specific Property Summary

| Property | `text` | `dropdown`/`radio`/`checkbox` | `date`/`datetime`/`time` | `attachment` |
|----------|--------|-------------------------------|--------------------------|-------------|
| `rows` | **Required** | DO NOT include | DO NOT include | DO NOT include |
| `choices` | — | **Required** | — | — |
| `choicesDataSource` | — | **Required** | — | — |
| `choicesRunIf` | — | **Required** (null for static) | — | — |
| `choicesResourceName` | — | **Required** (null for static) | — | — |
| `allowMultiple` | — | — | — | **Required** |
| `dataType` | `"string"` | `"string"` (dropdown/radio) or `"json"` (checkbox) | `"string"` | `"file"` |
| **Total properties** | 19 | 22 | 18 | 19 |

**"DO NOT include"** = including the property causes a 400 error. **"—"** = not applicable, omit entirely.

#### Content Elements

```json
{"type": "content", "renderType": "html", "name": "Help Text", "text": "<span>...</span>", "visible": true, "renderAttributes": {}}
{"type": "content", "renderType": "text", "name": "Plain Text", "text": "Just plain text", "visible": true, "renderAttributes": {}}
```

#### Button Elements

```json
{"type": "button", "name": "Submit", "label": "Submit", "visible": true, "enabled": true, "renderType": "submit-page", "renderAttributes": {}}
```

Button `renderType` values: `"submit-page"`, `"save"`, `"previous-page"`, `"custom"`. Custom buttons also need `"events": []`.

**`renderAttributes: {}` is required on buttons** — omitting it causes a 400 error.

#### Section Elements

```json
{"type": "section", "renderType": null, "name": "Section Name", "title": "Display Title", "visible": true, "omitWhenHidden": null, "renderAttributes": {}, "elements": [...]}
```

#### Page Elements

```json
{"type": "page", "name": "Page 1", "renderType": "submittable", "advanceCondition": null, "displayCondition": null, "displayPage": null, "events": [], "elements": [...]}
```

#### renderAttributes (Platform-Level)

`renderAttributes` is a key-value object passed through to the rendered HTML. The platform's built-in form renderer recognizes these:

| Attribute | Where | Effect |
|-----------|-------|--------|
| `"placeholder": "..."` | text fields | HTML placeholder text |
| `"aria-describedby": "id"` | any field | Accessibility link to a content element |

**Note:** CSS classes like `"class": "cols-2"`, `"class": "vertical"`, etc. are passed to the HTML but require front-end CSS to take effect. The specific class names depend on your implementation's stylesheet. The platform stores and passes them through — it doesn't define their visual behavior.

#### Hidden Fields with `omitWhenHidden`

Use a hidden section with `omitWhenHidden: false` to store fields whose values should always be submitted, even when not visible. This is commonly used for system/metadata fields with expression-based defaults:

```json
{
  "type": "section", "name": "System Fields",
  "visible": false, "omitWhenHidden": false,
  "renderAttributes": {},
  "elements": [
    {"name": "Submitter", "renderType": "text", "defaultValue": "${identity('username')}", "rows": 1, ...}
  ]
}
```

**`omitWhenHidden: false`** = values are still submitted even when the section/field is hidden. Critical for auto-populated fields.
**`omitWhenHidden: null`** = default behavior (values omitted when hidden).
**`omitWhenHidden: true`** = explicitly omit values when hidden (same as default).

The specific field names you put in hidden sections are implementation-specific — the platform pattern is the technique of `visible: false` + `omitWhenHidden: false` + expression `defaultValue`.

### Pattern Validation

The `pattern` property is an **object** (not a string) with `regex` and `message`:

```json
{
  "pattern": {
    "regex": "^\\d{3}-\\d{3}-\\d{4}$",
    "message": "Please use the format 410-366-9999"
  }
}
```

Set to `null` for no pattern validation. **Do NOT pass a plain string** — the API rejects strings with "Pre-defined patterns are not supported yet."

### Default Values from Integrations

Fields can pull their default value from an integration operation:

```json
{
  "name": "Organization",
  "defaultDataSource": "integration",
  "defaultResourceName": "Retrieve User Record",
  "defaultValue": "${integration('Association')}"
}
```

Valid `defaultDataSource` values: `"none"` (static/expression default), `"integration"` (fetched from integration operation). When `"integration"`, set `defaultResourceName` to the name of an integration defined in the form's `integrations` array.

### Integration-Driven Choices (Dynamic Dropdowns)

Dropdowns, radio buttons, and checkboxes can be populated from integration operations:

```json
{
  "name": "State",
  "renderType": "dropdown",
  "choicesDataSource": "integration",
  "choicesResourceName": "States",
  "choicesResourceProperty": "States",
  "choices": {
    "label": "${integration('Name')}",
    "value": "${integration('Abbreviation')}"
  }
}
```

Key differences from static choices:
- `choicesDataSource`: `"integration"` instead of `"custom"`
- `choicesResourceName`: name of an integration from the form's `integrations` array
- `choicesResourceProperty`: output property name from the operation that contains the list
- `choices`: an **object** (not array) with `label`/`value` using `${integration('FieldName')}` expressions

### Cascading Choices (Dependent Dropdowns)

Use `choicesRunIf` to make a dropdown dependent on another field, and `inputMappings` on the integration to pass the parent field's value:

```json
// Form-level integration with input mapping
{
  "integrations": [{
    "name": "Counties by State",
    "connectionId": "...",
    "operationId": "...",
    "inputMappings": {
      "State Abbr": "${values('State')}"
    }
  }]
}

// Field definition — choices reload when State changes
{
  "name": "County",
  "renderType": "dropdown",
  "choicesDataSource": "integration",
  "choicesResourceName": "Counties by State",
  "choicesResourceProperty": "Counties",
  "choices": {
    "label": "${integration('County Name')}",
    "value": "${integration('County Name')}"
  }
}
```

### Content Elements (Inline HTML)

Non-field elements for instructions, labels, or custom HTML:

```json
{
  "type": "content",
  "renderType": "html",
  "name": "Instructions",
  "text": "<div class=\"form-group\"><label class=\"field-label\">Please provide details.</label></div>",
  "visible": true,
  "renderAttributes": {}
}
```

### Page-Level Properties

Pages support conditional display and advance logic for multi-page forms:

| Property | Description |
|----------|-------------|
| `advanceCondition` | Expression that must be true to advance to next page (null = always allow) |
| `displayCondition` | Expression that determines if this page is shown (null = always show) |
| `displayPage` | Alternative page to display (for confirmation/redirect pages) |

### Field Constraints

Constraints are **JavaScript expressions** that validate field values at submission time. They are only enforced when `coreState` is `"Submitted"` or `"Closed"` — `"Draft"` bypasses all validation.

```json
{
  "constraints": [
    {
      "type": "custom",
      "content": "values('Age') >= 18",
      "message": "Must be 18 or older"
    }
  ]
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `type` | Yes | Use `"custom"` for expression-based constraints |
| `content` | Yes | JavaScript expression that must evaluate to `true` (boolean). Non-boolean results cause runtime errors. |
| `message` | Yes | Error message shown when constraint evaluates to `false` |

**Multiple constraints** are supported — all must pass:
```json
{
  "constraints": [
    {"type": "custom", "content": "values('Age') >= 0", "message": "Age cannot be negative"},
    {"type": "custom", "content": "values('Age') <= 150", "message": "Age seems unreasonable"}
  ]
}
```

**Important:** The `pattern` property must be an object `{regex, message}` or `null`. Passing a plain string is rejected with "Pre-defined patterns are not supported yet." See the Pattern Validation section above for the correct format.

### Conditional Visibility and Required

`visible` and `required` can be boolean or an expression string:

```json
{
  "name": "Reason",
  "visible": "values('Decision') === \"Denied\"",
  "required": "values('Decision') === \"Denied\"",
  "requiredMessage": "Please enter a reason for denying the approval",
  "omitWhenHidden": true
}
```

### Default Values with Expressions

```json
{
  "name": "Requested for Display Name",
  "defaultValue": "${identity('displayName')}",
  "defaultDataSource": "none"
}
```

### Choices (Dropdown, Radio, Checkbox)

**Static choices:**
```json
{
  "choicesDataSource": "custom",
  "choices": [
    { "label": "Approved", "value": "Approved" },
    { "label": "Denied", "value": "Denied" }
  ]
}
```

**Integration-driven choices:**
```json
{
  "choicesDataSource": "integration",
  "choicesResourceName": "Departments",
  "choicesResourceProperty": "Teams",
  "choices": {
    "label": "${integration('Name').replace(\"Departments::\", \"\")}",
    "value": "${integration('Slug')}"
  }
}
```

### Buttons

```json
{
  "type": "button",
  "renderType": "submit-page",
  "name": "Submit Button",
  "label": "Submit",
  "visible": true,
  "enabled": true
}
```

### Content (HTML)

```json
{
  "type": "content",
  "renderType": "html",
  "name": "Summary Review HTML",
  "text": "",
  "visible": true
}
```

---

## Gotchas

- **API requires ALL field properties in POST/PUT** — missing properties cause 400 "Invalid Form". When creating forms via API, provide every property for each field (even if `null`). Different field types have different required property sets (see Render Type Property Rules above).
- **`events: []` is required** — even when empty, the events array must be present on forms, pages, and fields in API payloads.
- **Section `renderType` must be present** — `null` is valid, but omitting it causes API errors.
- **Checkbox values: write as JSON string, read as native array** — submitting `"[\"A\",\"B\"]"` (string) reads back as `["A", "B"]` (array). Use `indexOf()` not `===` for membership checks.
- **`K('field[X]').value(newValue)` triggers Change events** — can create infinite loops if the Change event sets the same field. Guard with `runIf` conditions.
- **`hide()`/`show()` can conflict with builder conditions** — the form engine self-corrects, overriding programmatic changes.
- **`K('submission').value(fieldName)` is cross-page only** — returns values from previous pages, not the current page.
- **URL field presets require exact field names** — `?values[NonExistentField]=x` causes a 500 error.
- **Moment.js required for date manipulation** — must be loaded in globals.
- **`K.ready()` is reserved** — never call it directly.
- **Integration expressions use `${...}` syntax** — different from condition expressions which are raw JavaScript.
- **Draft coreState bypasses ALL validation on creation** — but Draft→Submitted transitions via `PUT` DO enforce required field validation (including attachment fields). To submit a Draft with required attachments, upload files first via `POST /submissions/{id}/files`, then transition.
- **Event `action` is a string, not an object** — events use `"action": "Set Fields"` (string) with a separate `"mappings"` array, NOT `"action": {"type": "setFields", "fields": [...]}`. Using an object causes `java.util.LinkedHashMap cannot be cast to java.lang.String`.
- **`pattern` property rejected via REST API** — even as object `{regex, message}` format, the API returns "Pre-defined patterns are not supported yet." The pattern property may only work when set via the form builder UI. Always set to `null` in API payloads and use constraints for validation instead.
- **Bridged resources require `status: "Active"`** — the `bridgedResources` array entries must include `"status": "Active"` or `"Inactive"`. Omitting it returns `Status must be "Active" or "Inactive"`.
- **Attachment upload is a 2-step process** — (1) `POST /submissions/{id}/files` with multipart form data (`-F "FieldName=@file"`), (2) PUT the returned metadata as JSON string values on the submission. Attachment values are stored as JSON arrays of `{contentType, link, name, size}` objects.
- **All active workflows matching source/event fire** — not just form-specific ones. If a kapp-level workflow or a workflow from another source group matches the event, it fires too. Plan for unexpected workflow runs when testing.
- **Expression defaults (`${identity(...)}`, `${form(...)}`) only evaluate in CoreForm** — when creating submissions via REST API, expression-based `defaultValue` fields are NOT evaluated. The values will be empty/null. Set these fields explicitly in the API POST body when not using CoreForm.

---

For events, expressions, K() API, and runtime behavior, see the Form Events & Expressions skill (`concepts/form-events-expressions`).
