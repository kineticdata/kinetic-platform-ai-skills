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

**This is the complete, closed set of valid event types.** Using anything else (e.g., `"type": "Save"`) crashes the form at load with:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'push')
    at Page.self.on (head.js:...)
```

The form engine maintains a listener bucket per recognized type and pushes the handler into `this.listeners[event.type]`. An unrecognized type means that bucket is `undefined` and `.push()` throws. The form never finishes initializing — **none** of its events register, including the valid ones.

If you want to fire on draft save, there is no separate "Save" event — use `Submit` (which fires for both draft save and full submission depending on the button's `renderType`) or a button-specific `Click` event on a save button.

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

### Auto-fill Date When a Signature Is Captured

Signature widgets (`bundle.widgets.Signature`) save the signed file by calling `field.value(newFile)` on the configured attachment field — which triggers the field's Change events. To auto-fill an adjacent date field when the user signs, add a Change event with `action: "Custom"` to the signature attachment field:

```json
{
  "type": "field",
  "name": "Requestor Signature",
  "renderType": "attachment",
  "dataType": "file",
  "events": [
    {
      "name": "Auto-fill Signature Date",
      "type": "Change",
      "action": "Custom",
      "integrationResourceName": null,
      "integrationResourceProperty": "",
      "runIf": "values('Requestor Signature') != null && values('Requestor Signature') != ''",
      "code": "var d = new Date(); var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); K('field[Requestor Signature Date]').value(iso);"
    }
  ]
}
```

Pair with `enabled: false` on the date field so users can't manually edit — the auto-fill is the only way to set it (the value() setter bypasses the disabled state). The `runIf` guard prevents the event from clearing the date when the signature is cleared.

### Initialize a Date Field with Today's Date on First Load (Draft-Safe)

Server-side `defaultValue` templates have no built-in `now()` helper. To populate a date field with today's date when the form is first opened — but preserve the original date if the form is saved as draft and reopened later — use a Load event with an "if empty" guard:

```json
{
  "name": "Set Initial Form Date",
  "type": "Load",
  "action": "Custom",
  "code": "if (!K('field[Date]').value()) { var d = new Date(); var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); K('field[Date]').value(iso); }"
}
```

Combined with `enabled: false`, this gives you a "form started on" date that:
- Fills on first load (Draft creation)
- Persists across draft saves and reopens (the `if (!value())` check)
- Can't be edited by the user (disabled in UI, but the Load event's `.value()` call still works)

---

## Common Mistakes

### `K.identity()` Does Not Exist

There is no `K.identity()` function. The way to access the current user in client-side code is:

1. **Server-side template in a hidden field** (preferred):
   ```json
   { "name": "Approver Username", "defaultValue": "${identity('username')}", "visible": false, "omitWhenHidden": false }
   ```
   Read it in events: `K('field[Approver Username]').value()`
2. **Server-side template in content text or labels**: `${identity('email')}` interpolates at form render
3. **`/app/api/v1/me`** — extra round-trip, slower; use the hidden field pattern when possible

The `${identity('...')}` syntax is the only documented mechanism for current-user data in client-side form code. Don't fabricate `K.*` or `bundle.*` calls; verify against sibling working forms in the same kapp.

### `bundle.widgets.X({...})` vs `bundle.helpers.X(arg1, arg2)`

Modern kapp bundles only expose `bundle.widgets.X({...obj})` — a single options-object argument. Legacy `bundle.helpers.X(arg1, arg2, cfg)` calls throw `Cannot read properties of undefined (reading 'X')` because `bundle.helpers` doesn't exist in modern bundles. Different namespaces AND different call signatures. Always copy widget usage verbatim from a sibling working form in the same kapp before authoring new code.

### Integration `inputMappings` Must Reference Existing Form Fields

Every `${values('X')}` template inside an integration's `inputMappings` must reference an actual field defined on the form. If `X` doesn't exist, the form returns **HTTP 500 on render** (not a friendlier client-side error). When you don't have a suitable form field for an input mapping, use `${identity('username')}`, `${form('slug')}`, or a literal string instead.

### UTF-8 Mojibake — `â€”` Is an Em-Dash

When forms are imported from systems that encoding-shift between Windows-1252 and UTF-8, you get sequences like `â€”` (which renders as `â€"`). These come from the UTF-8 bytes `0xE2 0x80 0x94` (em-dash —) being interpreted as Windows-1252 then re-encoded. Common patterns:

| Mojibake escape | Renders as | Should be |
|---|---|---|
| `â€”` | `â€"` | `—` (em-dash —) |
| `â€“` | `â€"` | `–` (en-dash –) |
| `â€™` | `â€™` | `’` (right single quote ') |
| `â€œ` | `â€œ` | `“` (left double quote ") |

Fix by find/replace of the literal escape sequence text in the form JSON. Validate with `python -c "import json; json.load(open(path))"` after.

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
