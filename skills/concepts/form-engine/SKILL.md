---
name: form-engine
description: Kinetic form JSON schema, field types, events, expressions, K() JavaScript API, bundle.config overrides, integrations on forms, and form builder patterns.
---

# Form Engine

The Kinetic form engine renders forms from a JSON definition. Forms can be built in the low-code Form Builder and rendered via `CoreForm` in React, or their structure can be created/modified via the API.

---

## Form JSON Schema

A form definition retrieved via `GET /kapps/{kapp}/forms/{form}?include=fields,indexDefinitions,attributesMap` contains:

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

### Complete Field Property Reference (from Kitchen Sink Form)

Every field in a form API payload requires ALL properties for its type. Missing any property causes `400 Invalid Form`. Below is the canonical reference derived from the official Kitchen Sink Form.

#### Base Properties (ALL field types)

```json
{
  "type": "field",
  "name": "Field Name",
  "key": "f1",
  "label": "Display Label",
  "renderType": "text",
  "dataType": "string",
  "enabled": true,
  "visible": true,
  "required": false,
  "requiredMessage": null,
  "defaultValue": null,
  "defaultDataSource": "none",
  "defaultResourceName": null,
  "pattern": null,
  "constraints": [],
  "events": [],
  "omitWhenHidden": null,
  "renderAttributes": {}
}
```

#### Type-Specific Properties

| Property | `text` | `dropdown` | `radio` | `checkbox` | `date`/`datetime`/`time` | `attachment` |
|----------|--------|-----------|---------|-----------|------------------------|-------------|
| `rows` | **Required** (1=single, 3+=textarea) | NO | NO | NO | NO | NO |
| `choices` | — | **Required** (array) | **Required** | **Required** | — | — |
| `choicesDataSource` | — | **Required** (`"custom"`) | **Required** | **Required** | — | — |
| `choicesRunIf` | — | **Required** (`null`) | **Required** | **Required** | — | — |
| `choicesResourceName` | — | **Required** (`null`) | **Required** | **Required** | — | — |
| `choicesResourceProperty` | — | Optional (`null`) | Optional | Optional | — | — |
| `allowMultiple` | — | — | — | — | — | **Required** (boolean) |
| `dataType` | `"string"` | `"string"` | `"string"` | `"json"` | `"string"` | `"file"` |

**"Required"** means the property must be present in the JSON — even if the value is `null`. **"NO"** means including it causes a 400 error. **"—"** means not applicable (omit entirely).

#### Static Choices Example (dropdown/radio/checkbox)

```json
{
  "choicesDataSource": "custom",
  "choicesRunIf": null,
  "choicesResourceName": null,
  "choices": [
    {"label": "Option A", "value": "Option A"},
    {"label": "Option B", "value": "Option B"}
  ]
}
```

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

## Integrations on Forms

Connections/Operations are exposed on forms via the `integrations` array (replaces legacy `bridgedResources`):

```json
{
  "integrations": [
    {
      "name": "Departments",
      "connectionId": "1415539c-bb98-48bb-ad33-11be25189ad0",
      "operationId": "7750b186-952a-4b43-bb85-34913951e5fe",
      "inputMappings": {
        "Include": "attributesMap",
        "Limit [integer]": "1000",
        "Order By": "name",
        "Query": "name =* \"Departments::\""
      }
    },
    {
      "name": "Get Team",
      "connectionId": "1415539c-bb98-48bb-ad33-11be25189ad0",
      "operationId": "e20b8b5d-da67-410b-a527-bd3ae1cfe07b",
      "inputMappings": {
        "Slug*": "${values('Department')}",
        "Include": "attributesMap"
      }
    }
  ]
}
```

**Input mappings can reference field values:** `"${values('Department')}"` passes the current field value as an integration parameter.

**Using integrations in events:**
```json
{
  "type": "Change",
  "action": "Set Fields",
  "name": "Set Manager",
  "integrationResourceName": "Get Team",
  "mappings": [
    {
      "field": "Manager",
      "value": "${integration('AttributesMap')['Manager']}"
    }
  ]
}
```

---

## Form Events

### Event Types

| Type | Fires When | Attached To |
|------|------------|-------------|
| `Load` | Page loads (after bundle ready) | Page |
| `Submit` | Before page submission | Page |
| `Change` | Field value changes (user or programmatic) | Field |
| `Click` | Button clicked | Button |

### Event Actions

| Action | Description |
|--------|-------------|
| `Set Fields` | Declaratively set field values via mappings |
| `Custom` | Execute arbitrary JavaScript code |
| `Bridged Resource` | Execute a bridged resource query (legacy) |

### Set Fields Action

```json
{
  "type": "Change",
  "action": "Set Fields",
  "name": "Set Employee Name",
  "runIf": "values('First Name') != null && values('Last Name') != null",
  "integrationResourceName": null,
  "mappings": [
    {
      "field": "Employee Name",
      "value": "${values('First Name')} ${values('Last Name')}",
      "visible": null
    }
  ]
}
```

Mappings can also set `visible` (show/hide the target field).

### Custom Action (JavaScript)

```json
{
  "type": "Change",
  "action": "Custom",
  "name": "Check Start Date",
  "runIf": "values('Start Date')!=null",
  "code": "const date = new Date(values('Start Date'));\ntoday = new Date();\nsevenDaysFromNow = new Date(today.getFullYear(), today.getMonth(), today.getDate()+7);\nif (date <= sevenDaysFromNow) {\n    alert('Date must be more than 7 days in the future');\n    K('field[Start Date]').value(null)\n}"
}
```

### Page Load Event (Custom DOM Manipulation)

```json
{
  "type": "Load",
  "action": "Custom",
  "name": "Load Summary Review",
  "code": "const displaySection = K('section[Summary Review Data]').element();\nconst reviewTarget = K('content[Summary Review HTML]').element();\n// ... build HTML from hidden fields and inject into content element"
}
```

### Submit Event (Async Pattern)

```javascript
action.stop();       // Pause submission
$.ajax({
  url: '...',
  success: function() {
    action.continue(); // Resume submission
  }
});
```

---

## Expression Syntax

Expressions use **bindings** — contextual data access functions that provide access to different objects depending on where the expression runs. The available bindings depend on context (e.g., a kapp security policy has no `form()` binding because it applies to multiple forms).

Available in form conditions (visible, required, advanceCondition, runIf, submissionLabelExpression, defaultValue, etc.):

| Function | Returns | Example |
|----------|---------|---------|
| `values('Field')` | Current field value | `values('Status') === 'Active'` |
| `identity('property')` | Current user info | `identity('username')`, `identity('teams')`, `identity('displayName')` |
| `identity('attribute:Name')` | User attribute | `identity('attribute:Manager', ['nobody'])` |
| `form('property')` | Form info | `form('name')`, `form('slug')`, `form('reviewMode')` |
| `submission('property')` | Submission metadata | `submission('createdBy')`, `submission('createdAt')` |
| `kapp('property')` | Kapp info | `kapp('slug')`, `kapp('name')` |
| `space('property')` | Space info | `space('slug')`, `space('name')` |
| `integration('property')` | Integration result field | `${integration('Name')}`, `${integration('AttributesMap')['Manager']}` |


These are **bindings** (contextual data access), not utility functions. Which bindings are available depends on context — for example, a kapp-level security policy has `identity()` and `kapp()` but not `form()` or `values()`.

**Helper functions** like `hasIntersection` and `now` are NOT built-in — they are defined within the expression itself as inline helpers. You can write any valid JavaScript in condition expressions, including defining helper functions inline.

**Expression vs template syntax:**
- **Conditions** (visible, required, runIf): raw JavaScript — `values('Status') === 'Active'`
- **Templates** (defaultValue, submissionLabelExpression, mapping values): `${...}` wrapper — `${values('First Name')} ${values('Last Name')}`

---

## K() JavaScript API

The `K()` function provides runtime access to form objects in Custom event code.

### Selectors

| Selector | Returns |
|----------|---------|
| `K('form')` | Current form object |
| `K('field[Name]')` | Field by name |
| `K('section[Name]')` | Section by name |
| `K('content[Name]')` | Content element by name |
| `K('button[Name]')` | Button by name |
| `K('page')` | Current page |
| `K('submission')` | Current submission |
| `K('identity')` | Current user |
| `K('kapp')` | Current kapp |
| `K('space')` | Current space |
| `K('bridgedResource[Name]')` | Bridged resource by name |

### Field Methods

| Method | Description |
|--------|-------------|
| `value()` | Get current value |
| `value(newValue)` | Set value (**triggers Change events — guard against loops**) |
| `show()` / `hide()` | Toggle visibility |
| `enable()` / `disable()` | Toggle editability |
| `validate()` | Returns array of validation error messages |
| `element()` | Returns DOM element |
| `name()` | Field name |
| `type()` | Field render type |
| `required()` | Whether required |
| `visible()` | Whether visible |
| `enabled()` | Whether enabled |
| `options()` | Available choices (dropdown/radio/checkbox) |
| `on(event, callback)` | Attach event listener |

### Form Methods

| Method | Description |
|--------|-------------|
| `slug()` | Form slug |
| `attributes('name')` | Form attribute value |
| `reviewMode()` | Whether in review mode |
| `element()` | DOM `<form>` element |
| `find(selector)` | jQuery-style DOM search within form |
| `serialize()` | Object of current page field names/values |
| `validate()` | Object of all field violations |
| `save()` | Save for later (skip constraints) |
| `submitPage()` | Programmatically submit current page |
| `previousPage()` | Navigate to previous page |
| `basePath()` / `kappPath()` / `formPath()` / `submissionPath()` | API paths |

### Section / Button / Content Methods

All support: `name()`, `element()`, `show()`, `hide()`. Buttons also support `enable()`, `disable()`.

### Submission Methods

| Method | Description |
|--------|-------------|
| `id()` | Submission ID (null for new) |
| `value(fieldName)` | Field value from a previous page (cross-page access) |

### Bridged Resource Methods

```javascript
K('bridgedResource[People]').load({
  attributes: ['First Name', 'Last Name'],
  values: { 'Login ID': 'Allen' },
  success: function(data) { /* handle results */ },
  error: function(error) { /* handle error */ }
});
```

---

## bundle.config — Field Rendering Overrides

Override default field rendering in the portal's `globals.jsx`:

```javascript
window.bundle = window.bundle || {};
window.bundle.config = {
  ready: function(form) {
    // Called after form loads — initialize custom UI
  },
  renderers: {
    fieldConstraintViolations: function(violations) { /* custom error display */ },
    submitErrors: function(errors) { /* custom submit error display */ },
    resourceErrors: function(errors) { /* custom bridge error display */ }
  },
  fields: {
    date:     { render: customDatePicker },
    datetime: { render: customDateTimePicker },
    time:     { render: customTimePicker },
    text:     { render: customTextRenderer, callback: afterTextRender },
    checkbox: { render: customCheckbox },
    radio:    { render: customRadio },
    dropdown: { render: customDropdown },
    attachment: { render: customAttachment }
  }
};
```

**Overridable field types:** `text`, `checkbox`, `radio`, `dropdown`, `date`, `datetime`, `time`, `attachment`.

**NOT overridable:** `section`, `content`, `button`.

Each field type supports:
- `render` — completely replaces default rendering
- `callback` — runs after default rendering (for enhancements)

---

## Common Form Patterns

### Hidden System Fields

A hidden section with `omitWhenHidden: false` stores metadata populated by workflows or events:

```json
{
  "type": "section",
  "name": "Hidden System Questions",
  "visible": false,
  "omitWhenHidden": false,
  "elements": [
    { "name": "Status", "renderType": "text" },
    { "name": "SNOW Number", "renderType": "text" },
    { "name": "Deferral Token", "renderType": "text" },
    { "name": "Assigned Individual", "renderType": "text" },
    { "name": "Assigned Team", "renderType": "text" }
  ]
}
```

### Notification Template Attribute

```json
{ "name": "Notification Template Name - Create", "values": ["Approval Created"] }
```

Workflows read this attribute to determine which email template to use.

### Form Type for Querying

Set `type: "Approval"` or `type: "Task"` to enable cross-form queries in the UI (e.g., "My Approvals" fetches all submissions where form type is "Approval").

---

## Form-Level Integrations Array

Forms can define named integrations that connect to Connection/Operation pairs. These are referenced by fields (for choices and defaults) and by events (for Set Fields mappings):

```json
{
  "integrations": [
    {
      "name": "States",
      "connectionId": "1415539c-bb98-48bb-ad33-11be25189ad0",
      "operationId": "c3453382-4573-4f9f-a487-714f085b6ef5",
      "inputMappings": {}
    },
    {
      "name": "Counties by State",
      "connectionId": "1415539c-bb98-48bb-ad33-11be25189ad0",
      "operationId": "c479c95f-8042-45fa-8cb2-dfde604634e4",
      "inputMappings": {
        "State Abbr": "${values('State')}"
      }
    }
  ]
}
```

- `name` — human-readable name, referenced by `choicesResourceName`, `defaultResourceName`, and event `integrationResourceName`
- `connectionId` / `operationId` — the Connection and Operation UUIDs from the Integrator
- `inputMappings` — key-value map of operation parameters to form expressions (`${values('Field')}`, `${identity('attribute:Name')}`)

### Page Events with Integration Data

Events can use integration results for field population. The `integrationResourceName` points to a form-level integration:

```json
{
  "type": "Load",
  "action": "Set Fields",
  "name": "Set User Details",
  "runIf": "!!identity('attribute:Volunteer Id')",
  "integrationResourceName": "Retrieve User Record",
  "mappings": [
    {"field": "Full Name", "value": "${identity('displayName')}"},
    {"field": "Phone", "value": "${integration('Phone Number')}"},
    {"field": "Email", "value": "${identity('email')}"},
    {"field": "Organization", "value": "${integration('Association')}"}
  ]
}
```

Mappings can mix `${identity(...)}` (from current user) and `${integration(...)}` (from integration results) in the same event. The `runIf` expression controls whether the event fires.

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
