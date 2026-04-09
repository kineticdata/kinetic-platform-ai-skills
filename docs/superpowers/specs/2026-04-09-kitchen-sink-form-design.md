# Kitchen Sink Form — Design Spec

## Goals

1. **Regression test fixture** — API round-trip (create form, read back, compare JSON) and CoreForm DOM rendering (load in React, validate rendered elements). Detects breakage when server-side code changes.
2. **Performance benchmark** — A form with enough field volume and variety to measure render time, submission creation throughput, and search latency.
3. **Canonical teaching reference** — Every platform-supported property combination in one verified, working form. AI assistants read this form's JSON and learn exactly how to build forms without guessing.
4. **Portable to other projects** — The form JSON, workflow treeJson, and kapp configuration are fully API-creatable. They can be provisioned on any Kinetic environment via REST API calls, serving as regression/performance fixtures across projects.

## Artifacts

| Artifact | Slug/Name | Location |
|----------|-----------|----------|
| Kapp | `ai-testing` | demo.kinops.io (already exists) |
| Form | `kitchen-sink` | `/kapps/ai-testing/forms/kitchen-sink` |
| Form | `approval` | `/kapps/ai-testing/forms/approval` |
| Workflow | "Kitchen Sink On Submit" | Loop + echo on kitchen-sink |
| Workflow | "Kitchen Sink Approval" | Deferral/approval pattern on kitchen-sink |
| Workflow | "Complete Approval" | Trigger completion on approval form |
| Kapp indexes | system + custom field | On the `ai-testing` kapp |
| Form indexes | system + value fields | On the `kitchen-sink` form |
| Kapp formTypes | Service, Test, Approval | On the `ai-testing` kapp |

---

## Form: `kitchen-sink`

**Top-level properties:**
- `name`: "Kitchen Sink"
- `slug`: "kitchen-sink"
- `status`: "Active"
- `type`: "Test"
- `description`: "Comprehensive test form covering every platform field type, property, and behavior pattern"
- `submissionLabelExpression`: `"${form('name')} — ${values('Text Required')}"`
- `attributes`: `[{name: "Icon", values: ["flask"]}, {name: "Owning Team", values: ["Default"]}]`
- `securityPolicies`: `[{endpoint: "Display", name: "Authenticated Users"}]`

### Page 1 — "Field Types" (renderType: submittable)

Every field renderType in three states: enabled+optional, enabled+required, disabled. Tests that all properties are accepted and persisted correctly.

#### Section: Text Fields
| Field Name | rows | required | enabled | defaultValue | Notes |
|------------|------|----------|---------|-------------|-------|
| Text Optional | 1 | false | true | null | Basic single-line |
| Text Required | 1 | true | true | null | With `requiredMessage: "Please enter text"` |
| Text Uneditable | 1 | false | false | "Read only value" | `enabled: false` |
| Text Multiline Optional | 3 | false | true | null | Textarea |
| Text Multiline Required | 3 | true | true | null | |
| Text Multiline Uneditable | 3 | false | false | null | |
| Text With Placeholder | 1 | false | true | null | `renderAttributes: {"placeholder": "Enter value..."}` |

#### Section: Dropdown Fields
| Field Name | required | enabled | choices | Notes |
|------------|----------|---------|---------|-------|
| Dropdown Optional | false | true | A, B, C | Static choices |
| Dropdown Required | true | true | A, B, C | |
| Dropdown Uneditable | false | false | A, B, C | |

#### Section: Radio Fields
| Field Name | required | enabled | choices | Notes |
|------------|----------|---------|---------|-------|
| Radio Optional | false | true | A, B, C | |
| Radio Required | true | true | A, B, C | |
| Radio Uneditable | false | false | A, B, C | |

#### Section: Checkbox Fields
| Field Name | required | enabled | choices | renderAttributes | Notes |
|------------|----------|---------|---------|------------------|-------|
| Checkbox Optional | false | true | A, B, C | {} | Horizontal (default) |
| Checkbox Required | true | true | A, B, C | {} | |
| Checkbox Uneditable | false | false | A, B, C | {} | |
| Checkbox Vertical | false | true | A, B, C | `{"class":"vertical"}` | Vertical layout |
| Checkbox Columns | false | true | A, B, C, D, E | `{"class":"cols-2"}` | Column layout |
| Agree To Terms | true | true | "I Agree" | label: "" | Single-option "I agree" style |

#### Section: Date/Time Fields
| Field Name | renderType | required | enabled |
|------------|------------|----------|---------|
| Date Optional | date | false | true |
| Date Required | date | true | true |
| Date Uneditable | date | false | false |
| DateTime Optional | datetime | false | true |
| DateTime Required | datetime | true | true |
| DateTime Uneditable | datetime | false | false |
| Time Optional | time | false | true |
| Time Required | time | true | true |
| Time Uneditable | time | false | false |

#### Section: Attachment Fields
| Field Name | required | enabled | allowMultiple |
|------------|----------|---------|---------------|
| Attachment Optional | false | true | false |
| Attachment Required | true | true | false |
| Attachment Multiple | true | true | true |
| Attachment Uneditable | false | false | false |

#### Section: Footer (buttons)
- Previous (renderType: previous-page) — disabled on page 1 but tests the element
- Save (renderType: save)
- Submit (renderType: submit-page)

---

### Page 2 — "Choices & Integrations" (renderType: submittable)

Tests every way choices can be populated: static, integration-driven, and cascading.

#### Section: Integration-Driven Choices
| Field Name | renderType | choicesDataSource | Source | Notes |
|------------|------------|-------------------|--------|-------|
| User Dropdown | dropdown | integration | Kinetic Platform connection → List Users | `choicesResourceName`, `choicesResourceProperty`, `choices: {label, value}` with `${integration('...')}` |
| Team Checkboxes | checkbox | integration | Kinetic Platform connection → List Teams | Multi-select from integration |

#### Section: Cascading Choices
| Field Name | renderType | Notes |
|------------|------------|-------|
| Category | dropdown | Static choices: Hardware, Software, Other |
| Subcategory | dropdown | Static choices, with a Change event on Category that updates Subcategory's choices via Set Fields action |

#### Section: Default From Integration
| Field Name | renderType | defaultDataSource | Notes |
|------------|------------|-------------------|-------|
| Current Username | text | integration | `defaultResourceName` referencing an integration that returns the current user |

#### Section: Bridged Resource
Form-level `bridgedResources` array referencing the Users model. Tests that bridged resources can be defined and queried.

#### Section: Footer
- Previous, Save, Submit buttons

---

### Page 3 — "Behavior & Expressions" (renderType: submittable)

Tests constraints, conditional logic, events, expression defaults, and hidden system fields.

#### Section: Constraints
| Field Name | constraints | Notes |
|------------|------------|-------|
| Min Length Field | `[{type:"custom", content:"values('Min Length Field').length >= 5", message:"Must be at least 5 characters"}]` | Single constraint |
| Multi Constraint Field | Two constraints: non-negative number + max 100 | Multiple constraints on one field |

#### Section: Pattern Validation
| Field Name | pattern | Notes |
|------------|---------|-------|
| Phone Number | `{regex: "^\\d{3}-\\d{3}-\\d{4}$", message: "Use format 555-123-4567"}` | Tests `pattern` as object |

#### Section: Conditional Visibility
| Field Name | visible | Notes |
|------------|---------|-------|
| Show Details | radio, choices: Yes/No | Controls visibility of next field |
| Detail Text | text, `visible: "values('Show Details') === 'Yes'"` | Expression-based visibility |

#### Section: Conditional Required
| Field Name | required | Notes |
|------------|----------|-------|
| Require Explanation | checkbox, single option "Yes" | Controls required state of next field |
| Explanation | text, `required: "values('Require Explanation').includes('Yes')"` | Expression-based required |

#### Section: Expression Defaults
| Field Name | defaultValue | Notes |
|------------|-------------|-------|
| Current User | `"${identity('username')}"` | Identity binding |
| Form Name | `"${form('name')}"` | Form binding |
| Kapp Slug | `"${kapp('slug')}"` | Kapp binding |
| Space Name | `"${space('name')}"` | Space binding |

#### Section: Events
| Element | Event | Notes |
|---------|-------|-------|
| Set Value Button | Click → Set Fields: sets "Event Target" field to "Button was clicked" | Tests button Click event with Set Fields action |
| Event Target | text field | Receives value from button event |

#### Section: Hidden System Fields (visible: false, omitWhenHidden: false)
| Field Name | defaultValue | Notes |
|------------|-------------|-------|
| Submitted By | `"${identity('username')}"` | Auto-populated, always submitted |
| Submit Timestamp | null | Set by workflow after submission |
| Status | "Open" | Workflow-managed status field |

#### Section: Footer
- Previous, Save, Submit buttons

---

### Page 4 — "Layout & Content" (renderType: submittable)

Tests structural elements, nesting, and content types.

#### Section: Content Elements
- Plain text content (`renderType: "text"`)
- HTML content (`renderType: "html"`) with formatted markup
- Content with `renderAttributes: {"id": "help-text-anchor"}` for accessibility linking

#### Section: Nested Sections
- Outer section > Inner section A + Inner section B > fields in each. Tests that nesting renders correctly.

#### Section: Two Columns (`renderAttributes: {"class": "cols-2"}`)
- Left column content + Right column field

#### Section: Three Columns (`renderAttributes: {"class": "cols-3"}`)
- Three content elements side by side

#### Section: Footer
- Previous, Custom (renderType: custom, with empty Click event), Save, Submit

---

### Page 5 — "Confirmation" (renderType: confirmation)

Minimal confirmation page displayed after successful submission. Contains a single HTML content element: "Your submission has been received."

---

## Workflows

Two workflows on the kitchen-sink form, testing different execution patterns.

### Workflow 1: "Kitchen Sink On Submit"

Bound to `Submission Submitted`. Exercises data access, looping, and sequential node execution.

```
Start
  → Echo Summary (utilities_echo_v1)
      input: "Submitted: <%= @values['Text Required'] %> by <%= @values['Submitted By'] %>"
  → Loop Checkboxes (system_loop_head_v1)
      data_source: <%= @values['Checkbox Required'] %>
      loop_path: $[*]
      var_name: choice
    → Echo Choice (utilities_echo_v1)                    ─┐
        input: "Choice: <%= @results['Loop Checkboxes']['Value'] %>"  │ loop body
    → End Loop (system_loop_tail_v1, type: All)          ←┘ + direct from head
```

**Tests:**
- Text field value access via `@values`
- Checkbox array iteration with loop_head/loop_tail
- Correct loop connector pattern (head → body + head → tail)
- No `system_tree_return_v1` (not needed for form workflows)

### Workflow 2: "Kitchen Sink Approval"

Bound to `Submission Submitted`. Tests the deferral/approval pattern — the most important workflow pattern in real-world Kinetic apps.

```
Start
  → Set Status Pending (kinetic_core_api_v1 or system_submission_update)
      PUT /submissions/<%= @submission['Id'] %>
      body: {"values": {"Status": "Pending Approval"}}
  → Create Approval (system_submission_create_v1)   [defers: true, deferrable: true]
      Creates a Draft submission on an "Approval" form with:
        - Approver field = space admin user
        - Original Submission Id = <%= @submission['Id'] %>
        - Deferral Token = <%= @task['Deferral Token'] %>
      On Create connector → (nothing — waits for deferral completion)
      On Complete connector → Check Decision
  → Check Decision (system_junction_v1 or utilities_echo_v1)
      Reads the deferred result to determine Approved/Denied
  → Set Status Complete (kinetic_core_api_v1)
      PUT /submissions/<%= @submission['Id'] %>
      body: {"values": {"Status": "<%= @results['Check Decision']['output'] %>"}}
```

**Tests:**
- Deferral pattern: `defers: true` + `deferrable: true` on a node
- Deferral token access: `<%= @task['Deferral Token'] %>`
- Create connector (fires when node enters deferral) vs Complete connector (fires when deferral is completed)
- `utilities_create_trigger_v1` — completing a deferral from an external workflow
- Submission update from within a workflow
- The full approval lifecycle: submit → pending → deferred → approved/denied → closed

**Requires an Approval form** (also in the ai-testing kapp):
- `slug`: "approval"
- `type`: "Approval"
- Fields: Approver, Decision (dropdown: Approved/Denied), Original Submission Id, Deferral Token, Comments
- Workflow on "Submission Submitted": reads Deferral Token field, calls `utilities_create_trigger_v1` with `action_type: "Complete"` to resume the Kitchen Sink approval workflow

### Why no tree_return on either workflow

Form-triggered workflows complete when all nodes finish. `system_tree_return_v1` is only for WebAPIs (with `?timeout`) and routines where a parent workflow awaits results. Including it on form workflows causes `ENGINE Run Error`.

---

## Kapp Configuration: `ai-testing`

### formTypes
```json
{"formTypes": [{"name": "Service"}, {"name": "Test"}, {"name": "Approval"}]}
```
Enables `type` KQL queries. Kitchen Sink = `"Test"`, User Echo Test = `"Service"`, Approval = `"Approval"`.

### Approval Form (`approval`)

A simple form for the deferral/approval workflow test:

| Field | renderType | Notes |
|-------|------------|-------|
| Approver | text | Pre-filled by the parent workflow |
| Decision | dropdown | Choices: Approved, Denied |
| Comments | text (rows: 3) | Optional free-text |
| Original Submission Id | text | Hidden, links back to Kitchen Sink submission |
| Deferral Token | text | Hidden, used to complete the parent workflow's deferral |

Workflow on `Submission Submitted`: reads `Deferral Token` value, calls `utilities_create_trigger_v1` with `action_type: "Complete"` and passes Decision + Comments as deferred results.

### Kapp-Level Indexes
| Index Name | Parts | Purpose |
|-----------|-------|---------|
| type | `["type"]` | Filter by form type |
| coreState | `["coreState"]` | Filter by submission state |
| createdBy | `["createdBy"]` | Filter by creator |
| submittedBy | `["submittedBy"]` | Filter by submitter |
| type,coreState,submittedBy | `["type","coreState","submittedBy"]` | Compound: cross-form "my submitted requests" |
| type,coreState,createdBy | `["type","coreState","createdBy"]` | Compound: cross-form "my created requests" |
| values[Text Required] | `["values[Text Required]"]` | Cross-form search by field value |
| values[Dropdown Required] | `["values[Dropdown Required]"]` | Cross-form search by choice field |

### Test Scenarios Enabled

**Single-form (form-level indexes):**
- `values[Text Required] = "hello"` on kitchen-sink submissions
- `values[Dropdown Required] = "Option A" AND values[Text Required] = "hello"` (compound)

**Cross-form (kapp-level indexes):**
- `coreState = "Submitted"` returns submissions from ALL forms in kapp
- `type = "Test"` returns only Kitchen Sink submissions
- `type = "Service"` returns only User Echo Test submissions
- `values[Text Required] = "hello"` at kapp level — matches across any form with that field
- `type = "Test" AND coreState = "Submitted" AND submittedBy = "james.davies@kineticdata.com"`

**Sorting:**
- `orderBy=createdAt&direction=DESC` on submission lists

---

## Portability

Everything is created via REST API calls — no admin console or Ruby SDK required:

1. `POST /kapps` or `PUT /kapps/ai-testing` — kapp config, formTypes, indexes
2. `POST /kapps/ai-testing/forms` — full form JSON with pages, fields, sections, content, buttons, events, bridgedResources, integrations, securityPolicies, indexDefinitions
3. `POST /kapps/ai-testing/forms/kitchen-sink/workflows` — workflow metadata
4. `PUT /workflows/{id}` — treeJson upload

This sequence can be scripted and run against any Kinetic environment to provision the test fixture. The form JSON and workflow treeJson should be stored in the skills repo as reference artifacts.

---

## Skills Updates After Implementation

After building and verifying, update these skills:
- **kql-and-indexing**: Correct the "kapp-level values[FieldName] indexes cannot be created via REST API" claim
- **api-basics**: Remove the related gotcha
- **form-engine**: Add any new property discoveries
- **workflow-xml**: Verify loop pattern still works, add any new findings
