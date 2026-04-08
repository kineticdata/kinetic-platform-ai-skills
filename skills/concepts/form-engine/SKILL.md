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
  "pattern": null,
  "constraints": [],
  "events": [...],
  "omitWhenHidden": null,
  "renderAttributes": {},
  "rows": 1,
  "key": "20f8b1836fa244bf8b4947dba9015edb"
}
```

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

Available in form builder conditions (visible, required, advanceCondition, runIf, submissionLabelExpression, defaultValue, etc.):

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
| `hasIntersection(a, b)` | True if arrays share any element | `hasIntersection(identity('teams'), ['Role::Employee'])` |

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

## Gotchas

- **`K('field[X]').value(newValue)` triggers Change events** — can create infinite loops if the Change event sets the same field. Guard with `runIf` conditions.
- **`hide()`/`show()` can conflict with builder conditions** — the form engine self-corrects, overriding programmatic changes.
- **Checkbox values are JSON arrays** — use `indexOf()` not `===` for membership checks.
- **`K('submission').value(fieldName)` is cross-page only** — returns values from previous pages, not the current page.
- **URL field presets require exact field names** — `?values[NonExistentField]=x` causes a 500 error.
- **Moment.js required for date manipulation** — must be loaded in globals.
- **`K.ready()` is reserved** — never call it directly.
- **Integration expressions use `${...}` syntax** — different from condition expressions which are raw JavaScript.
