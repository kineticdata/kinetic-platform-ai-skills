---
name: form-engine
description: "Use when creating or modifying a Kinetic form definition via the API — building the form JSON (pages/sections/fields/buttons/content), choosing field render types (text, dropdown, radio, checkbox, date, attachment), supplying every required property per field type, or fixing a 400 Invalid Form / unsupported 'events' property / missing renderAttributes rejection on PUT."
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
| `type` | Classification label ONLY (e.g., "Service", "Approval", "Task", "Data", "Utility") — see "Form `type` is cosmetic" below |
| `status` | "Active" or "Inactive" |
| `anonymous` | Whether unauthenticated submissions are allowed — **must be a JSON boolean (`true`/`false`)**; passing a string (`"false"`) is rejected at PUT |
| `submissionLabelExpression` | Template for submission display labels using expression syntax |
| `customHeadContent` | Custom HTML/JS injected into form head |
| `attributes` | Key-value metadata (Icon, Assigned Team, Notification Template, etc.) |
| `securityPolicies` | Access control definitions |
| `categorizations` | Category assignments for form organization |
| `notes` | Free-form prose documenting the form's purpose, fields, events, and integrations — see Form Notes below |

### Form Notes

The top-level `notes` field is intended for developer-facing documentation: what the form is for, key fields and their behaviors, events, workflow trigger, integrations consumed. Multi-line ASCII prose round-trips cleanly with no length, escaping, or content issues (verified May 2026 with multi-line notes up to ~2,500 chars including newlines, double quotes, slashes, and parentheses).

**Reading `notes` back requires `?include=details`.** `GET /forms/{slug}` without `?include=details` returns the form WITHOUT the `notes` field — the key is omitted from the response entirely, not returned as `null`. Counterintuitively, `?include=notes` alone is silently ignored and produces the same response shape as no include at all; the `notes` keyword is non-functional on this endpoint. Only `details` (the system-metadata include) surfaces the field. Characterized May 2026 across six probes on v1 (`/app/api/v1/kapps/{kapp}/forms/{slug}`); there is no v2 of this endpoint (`/app/api/v2/kapps/.../forms/...` returns 404). Agents that PUT a note and then GET with `?include=notes` to verify will see no notes field and may incorrectly conclude the PUT failed — always use `?include=details` for the verification GET.

Populating `notes` is a recommended default for any new form — both for developer onboarding and for the form's own audit trail.

### Form `type` does NOT affect rendering — but it DOES drive bundle/portal queries

Two distinct truths, easy to conflate:

1. **The form RENDERER ignores `type`.** `Service`, `Approval`, `Task`, `Data`, `Utility`, `Exercise` all render identically — same pages/fields/events/JS, same interactivity. So **do not chase a *rendering or load* problem by changing `type`.** A form that won't render has a different cause — security policy, missing `categorizations`, a Load-event JS error, a missing required field property, or a portal-SPA/bundle state issue (see "Stuck on a spinner" below). Switching `Data`→`Utility`→`Service` will not fix a render failure. (Observed June 2026: multiple `type` changes had zero effect on a render failure — the renderer doesn't branch on `type`.)

2. **The portal BUNDLE filters its queues by `type`** — so `type` is functionally significant for *where a form's submissions appear*, even though it doesn't change rendering. In the Momentum bundle (verified June 2026 against `momentum-portal` source):
   - **"My Work" / Actions** (`pages/tickets/actions/Actions.jsx`) searches only the portal kapp and filters `type IN ('Approval','Task')`. A queue/approval form must be `Approval` or `Task` (and live in the portal kapp) or its assigned submissions never show in My Work.
   - **Public catalog** ("Submit a Request", `pages/home/Home.jsx`) filters `types: ['Service']`. Only `Service` forms appear in the catalog; `Approval`/`Task` forms are intentionally hidden from it.

   So the convention is: `Service` = user-initiated/public-catalog forms; `Approval`/`Task` = work-queue forms surfaced in My Work. Set a form's `type` to match the queue you want it in. This is bundle behavior — confirm the specific bundle's queries rather than assuming, but the Service-vs-Approval/Task split is the standard Momentum pattern.

### Stuck on a spinner → check the browser console FIRST

When a form (or the whole portal) renders only the loading spinner and never shows content, **the browser console almost always has the actual error** — go there before guessing at the form definition. The spinner is the SPA's "still mounting" state; if mounting threw, it never clears, but the thrown error is logged.

Common console signatures and what they mean:
- `TypeError: KD.Bundle is not a constructor` / `Cannot read properties of undefined (reading 'load')` (from `app/bundle.js` or `app/spa/assets/index-*.js`) — a **bundle-asset load failure, NOT your form content and NOT anything you can fix via the form/kapp API.** `KD.Bundle` is undefined because the kapp's compiled bundle JS never loaded. **Scroll UP in the console** — the real cause is almost always a preceding 404 / MIME error on the kapp's combined bundle assets, e.g.:
  ```
  GET .../core.combined.js.h-846593382.pack  net::ERR_ABORTED 404 (Not Found)
  Refused to apply style from '.../core.combined.css...pack' because its MIME type ('application/json') is not a supported stylesheet MIME type
  Refused to execute script from '.../core.combined.js...pack' because its MIME type ('application/json') is not executable
  ```
  Those `core.combined.*.pack` files are content-hashed bundle build artifacts. A 404 (with the error JSON body mis-served as the CSS/JS, hence the `application/json` MIME complaint) means **the served `index` references a build hash that no longer exists on the server** — a stale deploy or a CDN/proxy cache mismatch. This is a server-side / environment problem:
  - It hits EVERY form in the kapp (a form that worked an hour ago and that you never touched will spin identically) — that's the tell it's the bundle, not your form.
  - `kapp.bundlePath: null` means the kapp uses the platform's shared/default bundle, so there's no per-kapp path to repoint — the fix is purely server-side.
  - Fix attempts (all environment-side, none via API): hard-reload at the portal ROOT url to drop a stale local `index`; try incognito / another machine (if it works there, it's just YOUR browser cache holding a stale index); otherwise the environment's bundle/CDN cache needs purging or the bundle needs a redeploy. There is no bundle-rebuild API endpoint.
  - Do NOT respond to this by editing/redeploying your form or flipping its `type` — the renderer never got far enough to look at your form. (Observed June 2026: form-side changes had no effect; the `.pack` 404 in the console identified the shared bundle as the cause.)
- A `ReferenceError` / `TypeError` whose stack points at `eval` or `doCustomAction` — the error is in YOUR Load/Change/Click event JavaScript. Read the message; it names the failing reference.
- `Cannot read properties of null (reading 'element')` on Load — an event references a `K('section[X]')` / `K('field[X]')` that doesn't exist (e.g. you deleted the element but left the event). See "When deleting a field or section, audit every event" below.

The anti-pattern is editing and re-deploying the form definition repeatedly to see if the spinner clears. One console read tells you whether the problem is your content, your event JS, or the platform/SPA — and saves a pile of blind redeploys.

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
  "key": "20f8b1836fa244bf8b4947dba9015edb",  // GUID, dashes stripped — opaque stable id (see Field Keys below)
  "pattern": null,          // Regex validation object — see Pattern Validation section below
  "constraints": [],        // JavaScript expression constraints — see Constraints section below
  "events": [...],
  "omitWhenHidden": null,
  "renderAttributes": {},
  "rows": 1
}
```

### Field Keys

Every field has a `key` — a unique, opaque string that is the **stable identifier** linking field values to submissions at the storage level. Conventions:

- **Default to a GUID.** A field key should be a generated GUID/UUID with its dashes removed — a 32-character lowercase hex string, e.g. `20f8b1836fa244bf8b4947dba9015edb`. This is what the form builder generates for new fields. Field keys are **alphanumeric-only**, so a standard dashed UUID (`20f8b183-6fa2-44bf-8b49-47dba9015edb`) is rejected — strip the dashes.
- **Do NOT derive the key from the field name.** Don't turn `First Name` into `FirstName`, `firstName`, or `first_name`. The key is deliberately decoupled from the display name; keep it opaque.
- Keys must be **unique within a form** — duplicates cause undefined behavior.
- Keys are **not auto-generated by the API** — you must supply one when creating a field (generate a GUID, strip the dashes).

**Why keys matter:** Submission values are stored by field key internally, not by field name. This means you can **change a field's type** (e.g., dropdown → text) without losing data: delete the old field, create a new field with the same `key`, and all existing submission values remain accessible. It also means renaming a field doesn't affect stored data — but that only holds when the key is an opaque GUID rather than a name-derived string (rename `First Name` → `Given Name` and a name-derived key would no longer match its stored values).

The `include=values.raw` response shows values keyed by field key (e.g., `"20f8b1836fa244bf8b4947dba9015edb": {"name": "Status", "value": "Open"}`) — useful for debugging or accessing orphaned values from deleted fields.

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
  "name": "Field Name", "key": "<32-char-guid-no-dashes>", "label": "Display Label",
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
  "name": "Field Name", "key": "<32-char-guid-no-dashes>", "label": "Display Label",
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
  "name": "Field Name", "key": "<32-char-guid-no-dashes>", "label": "Display Label",
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
  "name": "Field Name", "key": "<32-char-guid-no-dashes>", "label": "Display Label",
  "enabled": true, "visible": true, "required": false, "requiredMessage": null,
  "defaultValue": null, "defaultDataSource": "none", "defaultResourceName": null,
  "pattern": null, "constraints": [], "events": [],
  "omitWhenHidden": null, "renderAttributes": {},
  "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
  "choices": [{"label": "Option A", "value": "Option A"}, {"label": "Option B", "value": "Option B"}]
}
```
Note: `dataType` is `"json"` (not `"string"`). Values are stored as JSON arrays. Write/read is asymmetric: submit a JSON **string** (`"[\"A\",\"B\"]"`) and it reads back as a native **array** (`["A", "B"]`). Use `indexOf()`, not `===`, for membership checks.

#### `date` / `datetime` / `time` — 18 properties each

```json
{
  "type": "field", "renderType": "date", "dataType": "string",
  "name": "Field Name", "key": "<32-char-guid-no-dashes>", "label": "Display Label",
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
  "name": "Field Name", "key": "<32-char-guid-no-dashes>", "label": "Display Label",
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

Button `renderType` values:

| `renderType` | Behavior |
|--------------|----------|
| `"submit-page"` | Advance to the next page (use on intermediate pages of multi-page forms) |
| `"submit"` | Final form submission — transitions `coreState` to `Submitted` (use on the final page) |
| `"save"` | Save current state without submitting (submission stays in `Draft`) |
| `"previous-page"` | Navigate back to the previous page |
| `"custom"` | Arbitrary behavior via attached `events` |

**Multi-page forms require explicit button elements on each page.** The platform does not auto-render Submit buttons. A page with `renderType: "submittable"` is structurally submittable (programmatic `K('form').submitPage()` works), but no UI button appears unless an explicit button element exists in the page's `elements` array. Pages without an explicit button can leave the user with no affordance to advance or submit.

**Use `submit-page` on intermediate pages and `submit` on the final page.** A multi-page form whose final page has a `submit-page` button (or no button) can never transition `coreState` from `Draft` to `Submitted` — the user clicks through, the submission saves as Draft, and any `Submission Submitted` workflow never fires.

**`events` is only allowed on `renderType: "custom"` buttons.** PUTting a button with `events: []` and any other `renderType` returns HTTP 400 with `"The 'events' property of the '<name>' submit button is not supported."` Custom buttons require `events: []` (or populated); other renderTypes must omit the key entirely.

**`renderAttributes: {}` is required on buttons** — omitting it causes a 400 error.

#### Section Elements

```json
{"type": "section", "renderType": null, "name": "Section Name", "title": "Display Title", "visible": true, "omitWhenHidden": null, "renderAttributes": {}, "elements": [...]}
```

**Section schema is strict.** `renderType`, `omitWhenHidden`, `renderAttributes`, `events`, and `title` must all be present at PUT (each may be `null` or empty), even when the section has no events and no special rendering. Omitting any of them returns HTTP 400. `renderType: null` is valid, but the key must be there. The `events: []` shape applies to sections that don't define any — include the empty array, don't drop the key. `title` is required too — use the section `name` as the title if no separate display label is needed.

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

**Page placement is irrelevant on multi-page forms.** Hidden system-field sections work identically on any page. Workflows and security policies access field values by name, not by page; place hidden fields on whichever page is most convenient (typically Page 1, since it always renders).

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

**Pattern may not work via the REST API at all.** The same "Pre-defined patterns are not supported yet" rejection has also been observed even when sending the correct `{regex, message}` object — the `pattern` property may only take effect when set through the form builder UI. When building forms via API, the reliable approach is to set `pattern: null` and enforce format validation with `constraints` (see Field Constraints below) instead.

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

**`required: true` is enforced even when `visible: false`.** A hidden field with literal `required: true` still produces an "is required" validation error on page submit, blocking the user even though the field is not visible to fill in. When a field's visibility depends on a condition, its `required` should use the same expression (as in the example above) — not a literal `true` — so the requirement only applies when the field is shown.

### Default Values with Expressions

```json
{
  "name": "Requested for Display Name",
  "defaultValue": "${identity('displayName')}",
  "defaultDataSource": "none"
}
```

For choices (static and integration-driven), button, and content element shapes, see the per-field-type templates, the Button Elements / Content Elements subsections, and the Integration-Driven Choices / Cascading Choices sections above.

---

## Gotchas

- **API requires ALL field properties in POST/PUT, `events: []` included** — see the Complete Field Property Reference and per-type templates above; missing any property (including the empty `events` array on forms, pages, sections, and fields) causes 400 "Invalid Form."
- **`rows` belongs only on `text` fields** — required there, forbidden on every other type; both directions 400. See the Type-Specific Property Summary table above (authoritative).
- **Field names: only letters, numbers, hyphens, and spaces.** Other characters — slashes (`/`), underscores (`_`), dots (`.`), or punctuation — are rejected with 400 `Invalid Form. The "<name>" field is invalid: Name may only contain letters, numbers, hyphens, and spaces`. Hit on attempts like `Make/Model` or `Asset_Tag`. Choose names accordingly; if you need to convey a slash, use a space (`Make Model`) or hyphen.
- **Page `type` is round-trip-asymmetric.** GET responses return page entries with `"type": "page"`. But PUTting a freshly-POSTed form skeleton with `"type": "page"` returns `"Type must be confirmation or submittable"` — and PUTting `"submittable"` works only on a fresh skeleton, not after edits. The reliable workaround: **fetch a working form's full page structure and use it as your PUT template, replacing only the `elements` array**. Don't construct page JSON from scratch.
- **`K('field[X]').value(newValue)` triggers Change events** — can create infinite loops if the Change event sets the same field. Guard with `runIf` conditions.
- **`hide()`/`show()` can conflict with builder conditions** — the form engine self-corrects, overriding programmatic changes.
- **`K('submission').value(fieldName)` is cross-page only** — returns values from previous pages, not the current page.
- **URL field presets require exact field names** — `?values[NonExistentField]=x` causes a 500 error.
- **Moment.js required for date manipulation** — must be loaded in globals.
- **`K.ready()` is reserved** — never call it directly.
- **Integration expressions use `${...}` syntax** — different from condition expressions which are raw JavaScript.
- **Draft coreState bypasses ALL validation on creation** — but Draft→Submitted transitions via `PUT` DO enforce required field validation (including attachment fields). To submit a Draft with required attachments, upload files first via `POST /submissions/{id}/files`, then transition.
- **Event `action` is a string, not an object** — events use `"action": "Set Fields"` (string) with a separate `"mappings"` array, NOT `"action": {"type": "setFields", "fields": [...]}`. Using an object causes `java.util.LinkedHashMap cannot be cast to java.lang.String`.
- **Bridged resources require `status: "Active"`** — the `bridgedResources` array entries must include `"status": "Active"` or `"Inactive"`. Omitting it returns `Status must be "Active" or "Inactive"`.
- **Attachment upload is a 2-step process** — (1) `POST /submissions/{id}/files` with multipart form data (`-F "FieldName=@file"`), (2) PUT the returned metadata as JSON string values on the submission. Attachment values are stored as JSON arrays of `{contentType, link, name, size}` objects.
- **All active workflows matching source/event fire** — not just form-specific ones. If a kapp-level workflow or a workflow from another source group matches the event, it fires too. Plan for unexpected workflow runs when testing.
- **Expression defaults (`${identity(...)}`, `${form(...)}`) only evaluate in CoreForm** — when creating submissions via REST API, expression-based `defaultValue` fields are NOT evaluated. The values will be empty/null. Set these fields explicitly in the API POST body when not using CoreForm.
- **`type: "Automated"` forms suppress the default Submit button** — even when the page is `renderType: "submittable"`. Automated forms are intended for workflow-driven completion, so the portal hides the auto-rendered submit button. If a human needs to submit an Automated form (queue tasks, endorsement forms filled by approvers), add an **explicit submit-page button element** to the page: `{"type":"button","renderType":"submit-page","name":"Submit Button","label":"Submit","visible":"!form('review')","enabled":true,"renderAttributes":{}}`. Use `visible: "!form('review')"` so the button hides when the form is rendered as a review subform.
- **`enabled: false` is read-only, not hidden** — disabled fields:
  - Block user input in the UI (greyed out, can't type)
  - Still submit their values with the rest of the form
  - Still accept programmatic writes via `K('field[X]').value(newValue)` — the setter bypasses the disabled state
  - Useful for fields that should only be populated by events (signature dates, derived totals, system-set status fields) but still need to round-trip through submission
- **Form `slug` vs `name` — different scopes, different rename costs:**
  - `slug` is the URL identifier referenced by every Task Form Slug workflow parameter, every email URL template (`/kapps/<kapp>/forms/<slug>/submissions/...`), and the export file/folder names. Renaming a slug requires: file rename + folder rename + internal `slug` field update + every workflow `Task Form Slug` parameter + every URL template. **Risk**: in-flight submissions against the old slug become orphaned when the form is re-imported under the new slug — drain or migrate before the rename.
  - `name` is admin/queue display label only. Safe to rename anytime with zero workflow impact.
  - Slugs being inconsistent with display names is normal — `name: "Supervisor Endorsement (Part II)"` paired with `slug: "supervisor-endorsement"` is the idiomatic combo.
- **Form attribute definitions live on the kapp, not on individual forms.** Every form's `attributes` (key/value pairs) reference a `formAttributeDefinition` registered on the parent kapp. An import that overwrites a kapp definition list wipes every form's `attributesMap` even though `pages`, `events`, `customHeadContent`, `integrations`, `bridgedResources`, and `securityPolicies` are intact and identical. Symptom: forms render fine, but workflow logic that reads e.g. `@form_attributes['Notification Template']` returns nil, status routing breaks silently. Recovery: re-POST the definitions to `POST /kapps/{kapp}/formAttributeDefinitions`, then re-PUT each form with its `attributesMap` from a known-good source (local export, snapshot, or git). Observed after an import overwrote a kapp's definition list: a structural diff showed `pages`/`sections`/`fields` all matched while `attributesMap` came back `{}` — restored by re-POSTing the definitions and re-PUTting each form's `attributesMap` from a local export.
- **`attributesMap` returned by `GET form?include=attributesMap` contains every attribute name in the kapp's `formAttributeDefinitions`** — not just the ones with values on this form. Keys with empty arrays `[]` mean "this kapp defines this attribute but this form doesn't use it"; they're not "missing." You cannot tell which attributes "belong" to a specific form by reading `attributesMap` keys — you only know by reading the values. The output looks redundant across forms but is correct.
- **`GET form?include=attributesMap` UNDER-reports: it only returns attributes the kapp currently DEFINES. `GET form?export=true` returns ALL stored attribute values regardless of definitions — and is the representation `export.rb` writes.** The two endpoints can disagree, and the difference is not corruption. A form's attribute *values* persist in the datastore even when the kapp has no matching `formAttributeDefinition` — they're just invisible to the join-against-definitions `include=attributesMap` read. This bites hardest after a **cross-kapp form move**: e.g. moving a form from a `datastore` kapp (which defines `Approval Stage`, `Custom Submission Workflow`, `Notification Template`, `Prohibit Subtasks`, …) to a `service-portal` kapp (which defines only `Approvers`, `Departments`, `Icon`). After the move, `include=attributesMap` shows only `Icon`, making it look like every other attribute was dropped — but `export=true` shows the full set intact. The values survived the move; they're retained on the form, merely unsurfaced. **Consequences for auditing & migration:**
  - When comparing a form against its local export (export.rb output) for faithfulness, compare against `?export=true`, NOT `?include=attributesMap`, or you'll get false "drift" on exactly these definition-less attributes.
  - Cross-kapp moves do NOT silently lose attribute values. (They DO become unreadable by `@form_attributes['X']` at runtime if the destination kapp lacks the definition — verify nothing reads them, or re-POST the definitions to the destination kapp to re-expose them.)
  - To know whether a definition-less attribute matters, scan the consuming workflows/bundle for reads (`@form_attributes['X']`, the attribute name in treeJson) — if zero reads, it's inert/vestigial and the invisibility is harmless.
- **Field-name uniqueness is form-WIDE, not section-scoped.** Two fields both named `Clearance Level` in different sections of the same form fails with `400 Invalid Form. Field names must be unique and there are 2 with the name "Clearance Level"`. When repurposing form sections (e.g. mirroring stage forms inside a modification form's embedded sections), pick distinct field names per stage section OR delete the field from the obsolete section before adding it to the new one. The error is total — the entire PUT is rejected — so plan the rename + remove atomically.
- **When deleting a field or section, audit every event for `K()` references to the deleted element.** Form/page/field-level events that reference `K('section[Deleted]')` or `K('field[Deleted]')` will throw `Cannot read properties of null (reading 'element')` on Load and **prevent the entire form from rendering** — not just the orphaned event. The form sits on the spinner forever and the user gets no error UI. Audit pattern:
  ```javascript
  // Grep every event's `code` for K() refs to elements that no longer exist:
  const exists = new Set();
  function walk(els) {
    for (const e of (els||[])) {
      if (e.type === 'section') exists.add('section[' + e.name + ']');
      if (e.type === 'field')   exists.add('field['   + e.name + ']');
      if (e.type === 'content') exists.add('content[' + e.name + ']');
      if (e.elements) walk(e.elements);
    }
  }
  for (const p of form.pages || []) walk(p.elements);
  // Then scan event code via regex /K\(['"]?(section|field|content)\[([^\]]+)\]/g
  // and warn on any kind+name not in `exists`.
  ```
  Example: removing a section (e.g. a "Rules of Behavior" section) can leave an orphaned page-level Load event — such as a signature-widget init event that still references the removed section — which crashes the form on every load. Fix by removing the orphaned event from the page's `events` array.
- **Checkbox-choice `value` consistency MUST match across forms that share a field name.** Two forms can both have a checkbox named `Need to Know Verified`, but if one stores `value="YES"` and another stores `value="I certify that this user's need-to-know has been verified."`, pre-fill or copy-between-forms patterns silently fail. The receiving checkbox can't find a matching option for the source value, so the box stays unchecked, the submission stores `[]`, and downstream "did anything change?" comparisons see a permanent diff. When designing related forms (e.g., parent + modification + review forms that mirror each other), define the choice `value`s in one place and reuse — or write an explicit value-mapping table and apply it in the pre-fill code. Surfaces in pre-fill / modification flows where one form sources from another.

---

For events, expressions, K() API, and runtime behavior, see the Form Events & Expressions skill (`concepts/form-events-expressions`).
