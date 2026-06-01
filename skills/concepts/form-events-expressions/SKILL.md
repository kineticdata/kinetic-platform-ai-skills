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
      "connectionId": "11111111-1111-1111-1111-111111111111",
      "operationId": "22222222-2222-2222-2222-222222222222",
      "inputMappings": {
        "Include": "attributesMap",
        "Limit [integer]": "1000",
        "Order By": "name",
        "Query": "name =* \"Departments::\""
      }
    },
    {
      "name": "Get Team",
      "connectionId": "11111111-1111-1111-1111-111111111111",
      "operationId": "33333333-3333-3333-3333-333333333333",
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

**Form events fire only when the form renders in CoreForm.** Submissions created directly via the REST API (`POST /app/api/v1/kapps/{kapp}/forms/{form}/submissions`) bypass form-side JavaScript entirely — Load, Change, Submit, and Click events do not run, and `defaultValue`, `visible`, and `required` expressions are not evaluated. The submission is created from whatever JSON the POST body contains. This matters for testing: form-JS behavior must be verified by rendering the form in a browser, not by API submission.

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

A common pattern for review pages: a Custom Load event reads field values from previous pages and injects formatted HTML into a content element on the current page.

```json
{
  "type": "Load",
  "action": "Custom",
  "name": "Build Review",
  "code": "const target = K('content[Review HTML]').element().querySelector('#review-target');\nconst fmt = v => v == null ? '<em>—</em>' :\n  Array.isArray(v) ? v.map(o => o && o.name ? o.name : o).join(', ') :\n  typeof v === 'object' ? JSON.stringify(v) : String(v);\nconst rows = [\n  ['Requestor', K('submission').value('Requestor Name')],\n  ['Department', K('submission').value('Department')],\n  ['Category', K('submission').value('Service Category')],\n  ['Priority', K('submission').value('Priority')],\n  ['Attachments', K('submission').value('Attachments')]\n];\ntarget.innerHTML = '<dl>' + rows.map(([k, v]) => `<dt>${k}</dt><dd>${fmt(v)}</dd>`).join('') + '</dl>';"
}
```

The pattern requires three pieces working together:

1. **Anchor `<div>` inside the content element.** The content element's `htmlContent` should contain `<div id="review-target"></div>` (or any stable selector) — this gives the JS a guaranteed injection point that survives re-renders.
2. **Cross-page reads via `K('submission').value()`.** Field-level `K('field[Name]').value()` only reaches fields on the current page. For values from previous pages, use `K('submission').value('Field Name')`.
3. **Defensive value formatting.** `value()` returns different shapes by field type: strings for text/dropdown, JSON arrays for checkbox/multi-select, arrays of `{name, size}` objects for attachment fields. Naive coercion produces `[object Object]` for the attachment case. The `fmt()` helper above handles `null`, arrays (mapping objects with a `name` property to that name), and primitives.

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

### Data Selectors vs. Wrapped Selectors

The selectors fall into two distinct shapes — and the asymmetry is a common trap.

**Data selectors** return plain JavaScript objects. Access via property notation; method calls throw `TypeError: K(...).property is not a function`:

| Selector | Properties (observed) |
|----------|----------------------|
| `K('identity')` | `anonymous`, `attributes`, `authenticated`, `displayName`, `email`, `groups`, `profileAttributes`, `sessionToken`, `spaceAdmin`, `teams`, `username` |
| `K('kapp')` | `name`, `slug`, `attributes` |
| `K('space')` | `name`, `slug`, `attributes` |

```javascript
K('identity').username        // 'someone@example.com'   ✓
K('identity').username()      // TypeError                ✗
K('kapp').slug                // 'service-portal'         ✓
```

**Wrapped selectors** return AngularJS `$scope` objects with method APIs. Use parentheses:

```javascript
K('field[Status]').value()           // get
K('field[Status]').value('Active')   // set
K('submission').value('Department')  // cross-page read
K('form').serialize()                // current page values
```

Wrapped selectors include `K('field[X]')`, `K('section[X]')`, `K('content[X]')`, `K('button[X]')`, `K('page')`, `K('submission')`, `K('form')`, and `K('bridgedResource[X]')`. `K('form')` and `K('page')` expose Angular internals like `$watch`, `$digest`, `$apply`, confirming the underlying scope mechanism.

In expression contexts (visible, required, defaultValue, mapping values), use the binding form instead of `K()` — `${identity('username')}`, `${kapp('slug')}`, `${space('name')}`. Bindings work in expressions; `K()` works in Custom event JavaScript.

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
| `options()` | Available choices (dropdown/radio/checkbox) — see note below |
| `on(event, callback)` | Attach event listener |

**`options()` returns a live array reference, but mutating it does not re-render the dropdown.** Pushing/replacing entries in the array (`opts.length = 0; opts.push(...)`) updates the in-memory array but the rendered choices do not change, even when the mutation is wrapped in `K('form').$apply()`. The K() field API has no `setOptions`, `refresh`, or equivalent method for replacing choices at runtime.

For cascading dropdowns (where choices depend on another field's value), the working pattern is multiple separate dropdown fields, each with its own static options and a `visible` expression gating which one shows. See the form-engine skill's Conditional Visibility section.

**`K('field[X]').element()` returns null/undefined for radio and checkbox groups.** These render as multiple `<input>` elements with no single wrapper that the K widget tracks. Trying `K('field[Radio Field]').element().closest('.form-group')` throws `Cannot read properties of null (reading 'closest')` and silently halts whatever script needed the wrapper. The K widget DOES return an element for single-input fields (text, textarea, date, file) — the asymmetry is the trap.

For grouped inputs, fall back to native DOM:

```javascript
// WORKS for any field type — finds the actual input(s)
const inputs = document.querySelectorAll('[name="' + fieldName + '"]');
// Walk up to a layout-meaningful wrapper. In Kinetic's current portal
// bundle, top-level field rows are <section class="mt-3 p-2">.
const wrap = inputs[0] && inputs[0].closest('section.mt-3, .form-group, [data-element-name]');
```

Observed on a large modification form: a highlight-on-change feature silently failed for several fields because `K().element()` returned null and the `.field-modified` CSS class never landed.

**`K('field[X]').value([...])` on a checkbox group sets internal K state but does NOT sync the DOM `checked` property of the underlying inputs.** Symptom: `K().value()` immediately afterward returns the new array correctly, but visually no boxes appear checked, and any DOM-level "is this checkbox checked?" inspection sees the old state. The mismatch persists until the user clicks one of the inputs.

For programmatic pre-fill of checkboxes (e.g., copying values from a parent submission into a child or modification form), set the DOM directly and dispatch native events so any listeners — K's internal change detector, React-managed wrappers, jQuery handlers — pick up the change:

```javascript
function setNativeChecked(input, checked) {
  if (input.checked === checked) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked').set;
  setter.call(input, checked);
  input.dispatchEvent(new Event('click', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// For a checkbox group:
const wanted = Array.isArray(value) ? value : [value];
document.querySelectorAll('input[type="checkbox"][name="' + fieldName + '"]').forEach((i) => {
  setNativeChecked(i, wanted.indexOf(i.value) >= 0);
});
```

The same trap applies — though less severely — to radio groups: `K().value('X')` syncs the selected input most of the time, but if the form is using a custom radio renderer the radio markers can lag the K state. The native-setter + click+change dispatch pattern works for both.

**Page-level events vs field-level events vs form-level events.** Three distinct event-attachment points, all using the same schema (`{name, type, action, code, runIf, ...}`):

| Attached to | JSON path | Common types | Examples |
|---|---|---|---|
| **Form** | `form.events[]` | Rarely used in practice; mostly empty arrays | — |
| **Page** | `form.pages[i].events[]` | `Load`, `Submit` | Pre-fill from API, render review widgets, install autocomplete handlers, set computed submit-time fields |
| **Field** | `form.pages[i].elements[...].events[]` (anywhere inside the page tree) | `Change`, `Click`, `Load` | Auto-fill signature date on Change, custom Submit-button Click validators |

When auditing or modifying a form, **always traverse all three locations**. A form's "Load behavior" is most often a Page-level Load event in `form.pages[0].events`, NOT in form-level `form.events`. Field-level Load events exist but are less common — they fire when the field renders, useful for one-time widget initialization on the field itself.

```javascript
// Pattern for auditing every event on a form
for (const ev of (form.events || [])) { /* form-level */ }
for (const page of form.pages || []) {
  for (const ev of (page.events || [])) { /* page-level */ }
  function walk(els) {
    for (const e of (els || [])) {
      for (const ev of (e.events || [])) { /* field/section/button-level */ }
      if (e.elements) walk(e.elements);
    }
  }
  walk(page.elements);
}
```

**Heavy Load-event JavaScript can hang the renderer enough to time out screenshots and lock interaction.** The K widget's `value()` setter has non-trivial overhead per call (DOM update + Angular `$apply` propagation + any field-level Change events that fire as side effects). Doing 60+ sequential `K('field[X]').value(v)` calls in a tight loop — common when pre-filling a wide form from an API response — can freeze the browser for several seconds, sometimes long enough that browser-automation screenshot tools timeout.

The companion bug is wiring high-frequency event listeners that re-evaluate the world: e.g., a Change handler that calls a `recomputeAll()` function which iterates every field via `K().value()` on every keystroke. On a 60-field form that's 60 K() reads per character typed.

**Defensive patterns:**

1. **Debounce the heavy work in change listeners** — defer to the next tick or a 150 ms window:
   ```javascript
   if (window.__recomputeTimer) clearTimeout(window.__recomputeTimer);
   window.__recomputeTimer = setTimeout(recomputeAll, 150);
   ```

2. **Defer the initial pre-fill DOM writes** off the Load handler so the browser can paint first:
   ```javascript
   setTimeout(() => populateAllFields(values), 0);
   ```

3. **Bypass `K().value(...)` when you don't need K's lifecycle hooks** — use the native setter + event dispatch directly (see checkbox pattern above). Much faster than going through K when you're already iterating large field sets.

4. **Cache K() lookups** if you'll reference the same field multiple times in a tight loop — `const f = K('field[X]'); f.value(); f.value('Y'); f.on('change', ...);`. K()'s selector machinery walks scopes on every call.

Observed: a Load event populating dozens of fields across several sibling sections froze the portal tab badly enough that automated screenshots timed out (~30 s). Switching to native setters + debounced recompute kept the renderer responsive.

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

**`K('submission')` does not expose `coreState` or other submission-level metadata.** Form-side JavaScript can only read `id()` and field values — `K('submission').coreState` returns `undefined`. To check submission state (`Draft` / `Submitted` / `Closed`), fetch the submission via the Core API.

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
      "connectionId": "11111111-1111-1111-1111-111111111111",
      "operationId": "44444444-4444-4444-4444-444444444444",
      "inputMappings": {}
    },
    {
      "name": "Counties by State",
      "connectionId": "11111111-1111-1111-1111-111111111111",
      "operationId": "55555555-5555-5555-5555-555555555555",
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
