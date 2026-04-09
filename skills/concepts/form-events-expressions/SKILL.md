---
name: form-events-expressions
description: Form events (load/submit/change/click), K() JavaScript API, expression syntax, bundle.config rendering overrides, and form-level integrations array.
---

# Form Events & Expressions

Runtime behavior for Kinetic forms — events, expressions, JavaScript API, and integration data on forms. For form JSON structure and field properties, see the Form Engine skill (`concepts/form-engine`).

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
