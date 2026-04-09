# Kitchen Sink Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive Kitchen Sink test form on demo.kinops.io that covers every platform property, plus workflows for loop/echo and deferral/approval patterns, enabling regression testing, performance benchmarking, and AI teaching.

**Architecture:** Everything is REST API calls against demo.kinops.io. The Kitchen Sink form is a single large POST with 5 pages covering all field types, choices, behaviors, and layouts. Two workflows on the form test loop iteration and deferral/approval. A companion Approval form with its own workflow completes the deferral cycle. Kapp-level indexes enable cross-form search.

**Tech Stack:** Kinetic Platform REST API (Core v1 + Task v2 proxy), HTTP Basic Auth, JSON payloads.

**Credentials:** `james.davies@kineticdata.com` / `Jcdhawa!!14` on `https://demo.kinops.io`

**Spec:** `docs/superpowers/specs/2026-04-09-kitchen-sink-form-design.md`

---

### Task 1: Configure Kapp — formTypes and System Indexes

**Purpose:** Register form types so `type` KQL works, and add kapp-level system indexes for cross-form searching.

- [ ] **Step 1: Add formTypes to ai-testing kapp**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X PUT \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing" \
  -H "Content-Type: application/json" \
  -d '{"formTypes": [{"name": "Service"}, {"name": "Test"}, {"name": "Approval"}]}'
```

Expected: 200 with kapp JSON containing `formTypes` array.

- [ ] **Step 2: Add kapp-level system indexes**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X PUT \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing" \
  -H "Content-Type: application/json" \
  -d '{
    "indexDefinitions": [
      {"name": "type", "parts": ["type"], "unique": false},
      {"name": "coreState", "parts": ["coreState"], "unique": false},
      {"name": "createdBy", "parts": ["createdBy"], "unique": false},
      {"name": "submittedBy", "parts": ["submittedBy"], "unique": false},
      {"name": "type,coreState,submittedBy", "parts": ["type","coreState","submittedBy"], "unique": false},
      {"name": "type,coreState,createdBy", "parts": ["type","coreState","createdBy"], "unique": false}
    ]
  }'
```

Expected: 200 with kapp JSON. Indexes appear in response.

- [ ] **Step 3: Verify**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing?include=indexDefinitions"
```

Confirm `formTypes` has 3 entries and `indexDefinitions` has 6 system indexes.

- [ ] **Step 4: Commit**

Update the skills repo with any findings about kapp PUT behavior (does it merge or replace indexes? does it merge or replace formTypes?).

---

### Task 2: Create Kitchen Sink Form — Full JSON

**Purpose:** Create the entire Kitchen Sink form in a single POST. This is the largest task — the JSON payload includes all 5 pages, all fields, all sections, content elements, buttons, events, integrations, bridged resources, security policies, and index definitions.

**Key IDs needed:**
- Connection ID: `52676b52-01db-4149-928a-d977d96befb3` (Kinetic Platform)
- List Users operation: `bf892f6f-ad27-409d-a013-f69113555aa7`

- [ ] **Step 1: POST the Kitchen Sink form**

The form JSON is large. Build it as a file and POST it:

```bash
cat > /tmp/kitchen-sink-form.json << 'FORMJSON'
{
  "name": "Kitchen Sink",
  "slug": "kitchen-sink",
  "status": "Active",
  "type": "Test",
  "description": "Comprehensive test form covering every platform field type, property, and behavior pattern",
  "submissionLabelExpression": "${form('name')} — ${values('Text Required')}",
  "attributes": [
    {"name": "Icon", "values": ["flask"]},
    {"name": "Owning Team", "values": ["Default"]}
  ],
  "securityPolicies": [
    {"endpoint": "Display", "name": "Authenticated Users"}
  ],
  "integrations": [
    {
      "name": "List Users",
      "connectionId": "52676b52-01db-4149-928a-d977d96befb3",
      "operationId": "bf892f6f-ad27-409d-a013-f69113555aa7",
      "inputMappings": {}
    }
  ],
  "bridgedResources": [
    {
      "name": "All Users",
      "model": "Users",
      "qualification": "All",
      "parameters": []
    }
  ],
  "indexDefinitions": [
    {"name": "closedBy", "parts": ["closedBy"], "unique": false},
    {"name": "createdBy", "parts": ["createdBy"], "unique": false},
    {"name": "submittedBy", "parts": ["submittedBy"], "unique": false},
    {"name": "handle", "parts": ["handle"], "unique": false},
    {"name": "updatedBy", "parts": ["updatedBy"], "unique": false},
    {"name": "values[Text Required]", "parts": ["values[Text Required]"], "unique": false},
    {"name": "values[Dropdown Required]", "parts": ["values[Dropdown Required]"], "unique": false},
    {"name": "values[Checkbox Required]", "parts": ["values[Checkbox Required]"], "unique": false},
    {"name": "values[Date Required]", "parts": ["values[Date Required]"], "unique": false},
    {"name": "values[Dropdown Required],values[Text Required]", "parts": ["values[Dropdown Required]", "values[Text Required]"], "unique": false}
  ],
  "pages": [
    {
      "name": "Field Types",
      "renderType": "submittable",
      "type": "page",
      "advanceCondition": null,
      "displayCondition": null,
      "displayPage": null,
      "events": [],
      "elements": [
        {
          "type": "section", "renderType": null, "name": "Text Fields", "title": "Text Fields",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Text Optional",
              "key": "f1", "label": "Text Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Text Required",
              "key": "f2", "label": "Text Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": "Please enter text", "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Text Uneditable",
              "key": "f3", "label": "Text Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "Read only value", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Text Multiline Optional",
              "key": "f4", "label": "Text Multiline Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 3
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Text Multiline Required",
              "key": "f5", "label": "Text Multiline Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 3
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Text Multiline Uneditable",
              "key": "f6", "label": "Text Multiline Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 3
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Text With Placeholder",
              "key": "f7", "label": "Text With Placeholder", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {"placeholder": "Enter value..."}, "rows": 1
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Dropdown Fields", "title": "Dropdown Fields",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "dropdown", "dataType": "string", "name": "Dropdown Optional",
              "key": "f8", "label": "Dropdown Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "dropdown", "dataType": "string", "name": "Dropdown Required",
              "key": "f9", "label": "Dropdown Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "dropdown", "dataType": "string", "name": "Dropdown Uneditable",
              "key": "f10", "label": "Dropdown Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Radio Fields", "title": "Radio Fields",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "radio", "dataType": "string", "name": "Radio Optional",
              "key": "f11", "label": "Radio Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "radio", "dataType": "string", "name": "Radio Required",
              "key": "f12", "label": "Radio Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "radio", "dataType": "string", "name": "Radio Uneditable",
              "key": "f13", "label": "Radio Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Checkbox Fields", "title": "Checkbox Fields",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Checkbox Optional",
              "key": "f14", "label": "Checkbox Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Checkbox Required",
              "key": "f15", "label": "Checkbox Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Checkbox Uneditable",
              "key": "f16", "label": "Checkbox Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Checkbox Vertical",
              "key": "f17", "label": "Checkbox Vertical", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {"class": "vertical"},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"}]
            },
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Checkbox Columns",
              "key": "f18", "label": "Checkbox Columns", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {"class": "cols-2"},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Option A","value":"Option A"},{"label":"Option B","value":"Option B"},{"label":"Option C","value":"Option C"},{"label":"Option D","value":"Option D"},{"label":"Option E","value":"Option E"}]
            },
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Agree To Terms",
              "key": "f19", "label": "", "enabled": true, "visible": true, "required": true,
              "requiredMessage": "You must agree to the terms", "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"I Agree to the Terms and Conditions","value":"I Agree"}]
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Date Time Fields", "title": "Date / DateTime / Time Fields",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "date", "dataType": "string", "name": "Date Optional",
              "key": "f20", "label": "Date Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "date", "dataType": "string", "name": "Date Required",
              "key": "f21", "label": "Date Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "date", "dataType": "string", "name": "Date Uneditable",
              "key": "f22", "label": "Date Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "datetime", "dataType": "string", "name": "DateTime Optional",
              "key": "f23", "label": "DateTime Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "datetime", "dataType": "string", "name": "DateTime Required",
              "key": "f24", "label": "DateTime Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "datetime", "dataType": "string", "name": "DateTime Uneditable",
              "key": "f25", "label": "DateTime Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "time", "dataType": "string", "name": "Time Optional",
              "key": "f26", "label": "Time Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "time", "dataType": "string", "name": "Time Required",
              "key": "f27", "label": "Time Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            },
            {
              "type": "field", "renderType": "time", "dataType": "string", "name": "Time Uneditable",
              "key": "f28", "label": "Time Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Attachment Fields", "title": "Attachment Fields",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "attachment", "dataType": "file", "name": "Attachment Optional",
              "key": "f29", "label": "Attachment Optional", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "allowMultiple": false
            },
            {
              "type": "field", "renderType": "attachment", "dataType": "file", "name": "Attachment Required",
              "key": "f30", "label": "Attachment Required", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "allowMultiple": false
            },
            {
              "type": "field", "renderType": "attachment", "dataType": "file", "name": "Attachment Multiple",
              "key": "f31", "label": "Attachment Multiple", "enabled": true, "visible": true, "required": true,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "allowMultiple": true
            },
            {
              "type": "field", "renderType": "attachment", "dataType": "file", "name": "Attachment Uneditable",
              "key": "f32", "label": "Attachment Uneditable", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "allowMultiple": false
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Page 1 Footer", "title": null,
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {"type": "button", "renderType": "save", "name": "Save", "label": "Save", "visible": true, "enabled": true, "renderAttributes": {}},
            {"type": "button", "renderType": "submit-page", "name": "Next Page", "label": "Next", "visible": true, "enabled": true, "renderAttributes": {}}
          ]
        }
      ]
    },
    {
      "name": "Choices and Integrations",
      "renderType": "submittable",
      "type": "page",
      "advanceCondition": null,
      "displayCondition": null,
      "displayPage": null,
      "events": [],
      "elements": [
        {
          "type": "section", "renderType": null, "name": "Integration Driven Choices", "title": "Integration-Driven Choices",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "dropdown", "dataType": "string", "name": "User Dropdown",
              "key": "f33", "label": "User Dropdown (from Integration)", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "integration", "choicesRunIf": null,
              "choicesResourceName": "List Users", "choicesResourceProperty": "Users",
              "choices": {"label": "${integration('Display Name')} (${integration('Username')})", "value": "${integration('Username')}"}
            },
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Team Checkboxes",
              "key": "f34", "label": "Team Checkboxes (from Integration)", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "integration", "choicesRunIf": null,
              "choicesResourceName": "List Users", "choicesResourceProperty": "Users",
              "choices": {"label": "${integration('Display Name')}", "value": "${integration('Username')}"}
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Cascading Choices", "title": "Cascading Choices",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "dropdown", "dataType": "string", "name": "Category",
              "key": "f35", "label": "Category", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [
                {
                  "name": "Category Change",
                  "type": "change",
                  "runIf": null,
                  "action": {
                    "type": "setFields",
                    "fields": [
                      {"name": "Subcategory", "value": ""}
                    ]
                  }
                }
              ],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Hardware","value":"Hardware"},{"label":"Software","value":"Software"},{"label":"Other","value":"Other"}]
            },
            {
              "type": "field", "renderType": "dropdown", "dataType": "string", "name": "Subcategory",
              "key": "f36", "label": "Subcategory", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Laptop","value":"Laptop"},{"label":"Monitor","value":"Monitor"},{"label":"IDE","value":"IDE"},{"label":"License","value":"License"},{"label":"Misc","value":"Misc"}]
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Page 2 Footer", "title": null,
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {"type": "button", "renderType": "previous-page", "name": "Previous", "label": "Previous", "visible": true, "enabled": true, "renderAttributes": {}},
            {"type": "button", "renderType": "save", "name": "Save 2", "label": "Save", "visible": true, "enabled": true, "renderAttributes": {}},
            {"type": "button", "renderType": "submit-page", "name": "Next Page 2", "label": "Next", "visible": true, "enabled": true, "renderAttributes": {}}
          ]
        }
      ]
    },
    {
      "name": "Behavior and Expressions",
      "renderType": "submittable",
      "type": "page",
      "advanceCondition": null,
      "displayCondition": null,
      "displayPage": null,
      "events": [],
      "elements": [
        {
          "type": "section", "renderType": null, "name": "Constraints", "title": "Constraints",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Min Length Field",
              "key": "f37", "label": "Min Length Field (5+ chars)", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null,
              "constraints": [{"type": "custom", "content": "values('Min Length Field') === '' || values('Min Length Field').length >= 5", "message": "Must be at least 5 characters"}],
              "events": [], "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Multi Constraint Field",
              "key": "f38", "label": "Multi Constraint Field (0-100)", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null,
              "constraints": [
                {"type": "custom", "content": "values('Multi Constraint Field') === '' || Number(values('Multi Constraint Field')) >= 0", "message": "Must be zero or positive"},
                {"type": "custom", "content": "values('Multi Constraint Field') === '' || Number(values('Multi Constraint Field')) <= 100", "message": "Must be 100 or less"}
              ],
              "events": [], "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Pattern Validation", "title": "Pattern Validation",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Phone Number",
              "key": "f39", "label": "Phone Number (555-123-4567)", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null,
              "pattern": {"regex": "^\\d{3}-\\d{3}-\\d{4}$", "message": "Use format 555-123-4567"},
              "constraints": [], "events": [], "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Conditional Visibility", "title": "Conditional Visibility",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "radio", "dataType": "string", "name": "Show Details",
              "key": "f40", "label": "Show Details?", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "No", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Yes","value":"Yes"},{"label":"No","value":"No"}]
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Detail Text",
              "key": "f41", "label": "Detail Text (shown when Yes)", "enabled": true,
              "visible": "values('Show Details') === 'Yes'",
              "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 3
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Conditional Required", "title": "Conditional Required",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "checkbox", "dataType": "json", "name": "Require Explanation",
              "key": "f42", "label": "", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {},
              "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
              "choices": [{"label":"Require an explanation","value":"Yes"}]
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Explanation",
              "key": "f43", "label": "Explanation", "enabled": true, "visible": true,
              "required": "values('Require Explanation') !== null && values('Require Explanation').indexOf('Yes') > -1",
              "requiredMessage": "Explanation is required when checkbox is checked", "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 3
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Expression Defaults", "title": "Expression Defaults",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Current User",
              "key": "f44", "label": "Current User (identity)", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "${identity('username')}", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Form Name",
              "key": "f45", "label": "Form Name (form binding)", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "${form('name')}", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Kapp Slug",
              "key": "f46", "label": "Kapp Slug (kapp binding)", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "${kapp('slug')}", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Space Name",
              "key": "f47", "label": "Space Name (space binding)", "enabled": false, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "${space('name')}", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Events", "title": "Events",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "button", "renderType": "custom", "name": "Set Value Button", "label": "Click to Set Value",
              "visible": true, "enabled": true, "renderAttributes": {},
              "events": [
                {
                  "name": "Set Event Target",
                  "type": "click",
                  "runIf": null,
                  "action": {
                    "type": "setFields",
                    "fields": [
                      {"name": "Event Target", "value": "Button was clicked"}
                    ]
                  }
                }
              ]
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Event Target",
              "key": "f48", "label": "Event Target (set by button)", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Hidden System Fields", "title": "Hidden System Fields",
          "visible": false, "omitWhenHidden": false, "renderAttributes": {},
          "elements": [
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Submitted By",
              "key": "f49", "label": "Submitted By", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "${identity('username')}", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            },
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Status",
              "key": "f50", "label": "Status", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": "Open", "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Page 3 Footer", "title": null,
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {"type": "button", "renderType": "previous-page", "name": "Previous 3", "label": "Previous", "visible": true, "enabled": true, "renderAttributes": {}},
            {"type": "button", "renderType": "save", "name": "Save 3", "label": "Save", "visible": true, "enabled": true, "renderAttributes": {}},
            {"type": "button", "renderType": "submit-page", "name": "Next Page 3", "label": "Next", "visible": true, "enabled": true, "renderAttributes": {}}
          ]
        }
      ]
    },
    {
      "name": "Layout and Content",
      "renderType": "submittable",
      "type": "page",
      "advanceCondition": null,
      "displayCondition": null,
      "displayPage": null,
      "events": [],
      "elements": [
        {
          "type": "section", "renderType": null, "name": "Content Elements", "title": "Content Elements",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {"type": "content", "renderType": "text", "name": "Plain Text", "text": "This is a plain text content element. It renders as simple text without HTML formatting.", "visible": true, "renderAttributes": {}},
            {"type": "content", "renderType": "html", "name": "HTML Content", "text": "<p><strong>Bold text</strong>, <em>italic text</em>, and a <a href=\"#\">link</a>. HTML content supports full markup.</p>", "visible": true, "renderAttributes": {}},
            {"type": "content", "renderType": "html", "name": "Help Text", "text": "<span class=\"form-text\" id=\"help-text-anchor\">This is a help text content element with an ID for aria-describedby linking.</span>", "visible": true, "renderAttributes": {"id": "help-text-anchor"}}
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Nested Outer", "title": "Nested Sections (Outer)",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {
              "type": "section", "renderType": null, "name": "Nested Inner A", "title": "Inner Section A",
              "visible": true, "omitWhenHidden": null, "renderAttributes": {},
              "elements": [
                {
                  "type": "field", "renderType": "text", "dataType": "string", "name": "Nested Field A",
                  "key": "f51", "label": "Nested Field A", "enabled": true, "visible": true, "required": false,
                  "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
                  "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
                  "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
                }
              ]
            },
            {
              "type": "section", "renderType": null, "name": "Nested Inner B", "title": "Inner Section B",
              "visible": true, "omitWhenHidden": null, "renderAttributes": {},
              "elements": [
                {
                  "type": "field", "renderType": "text", "dataType": "string", "name": "Nested Field B",
                  "key": "f52", "label": "Nested Field B", "enabled": true, "visible": true, "required": false,
                  "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
                  "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
                  "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
                }
              ]
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Two Columns", "title": "Two Column Layout",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {"class": "cols-2"},
          "elements": [
            {"type": "content", "renderType": "html", "name": "Left Column", "text": "<p>This is the left column content in a two-column layout.</p>", "visible": true, "renderAttributes": {}},
            {
              "type": "field", "renderType": "text", "dataType": "string", "name": "Right Column Field",
              "key": "f53", "label": "Right Column Field", "enabled": true, "visible": true, "required": false,
              "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
              "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
              "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
            }
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Three Columns", "title": "Three Column Layout",
          "visible": true, "omitWhenHidden": null, "renderAttributes": {"class": "cols-3"},
          "elements": [
            {"type": "content", "renderType": "html", "name": "Col 1", "text": "<p>Column one content.</p>", "visible": true, "renderAttributes": {}},
            {"type": "content", "renderType": "html", "name": "Col 2", "text": "<p>Column two content.</p>", "visible": true, "renderAttributes": {}},
            {"type": "content", "renderType": "html", "name": "Col 3", "text": "<p>Column three content.</p>", "visible": true, "renderAttributes": {}}
          ]
        },
        {
          "type": "section", "renderType": null, "name": "Page 4 Footer", "title": null,
          "visible": true, "omitWhenHidden": null, "renderAttributes": {},
          "elements": [
            {"type": "button", "renderType": "previous-page", "name": "Previous 4", "label": "Previous", "visible": true, "enabled": true, "renderAttributes": {}},
            {"type": "button", "renderType": "custom", "name": "Custom Button", "label": "Custom Action", "visible": true, "enabled": true, "renderAttributes": {}, "events": []},
            {"type": "button", "renderType": "save", "name": "Save 4", "label": "Save", "visible": true, "enabled": true, "renderAttributes": {}},
            {"type": "button", "renderType": "submit-page", "name": "Submit Final", "label": "Submit", "visible": true, "enabled": true, "renderAttributes": {}}
          ]
        }
      ]
    },
    {
      "name": "Confirmation",
      "renderType": "confirmation",
      "type": "page",
      "advanceCondition": null,
      "displayCondition": null,
      "displayPage": null,
      "events": [],
      "elements": [
        {"type": "content", "renderType": "html", "name": "Confirmation Message", "text": "<h2>Thank You</h2><p>Your submission has been received. A workflow is now processing your request.</p>", "visible": true, "renderAttributes": {}}
      ]
    }
  ]
}
FORMJSON

curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X POST \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms" \
  -H "Content-Type: application/json" \
  -d @/tmp/kitchen-sink-form.json | python3 -m json.tool | head -20
```

Expected: 200 with `{"form": {"slug": "kitchen-sink", "name": "Kitchen Sink", ...}}`.

- [ ] **Step 2: Verify form round-trip**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink?include=pages,indexDefinitions,integrations,bridgedResources,securityPolicies,attributes" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)['form']
print(f'Name: {d[\"name\"]}')
print(f'Pages: {len(d.get(\"pages\", []))}')
fields = 0
for p in d.get('pages', []):
    for e in p.get('elements', []):
        fields += sum(1 for el in _flatten(e) if el.get('type') == 'field')
print(f'Indexes: {len(d.get(\"indexDefinitions\", []))}')
print(f'Integrations: {len(d.get(\"integrations\", []))}')
print(f'Bridged Resources: {len(d.get(\"bridgedResources\", []))}')
print(f'Security Policies: {len(d.get(\"securityPolicies\", []))}')
"
```

Verify: 5 pages, 53 fields, 10 indexes, 1 integration, 1 bridged resource, 1 security policy.

- [ ] **Step 3: Commit form JSON as reference artifact**

Save the verified form JSON to the skills repo at `tests/fixtures/kitchen-sink-form.json` for portability. Commit.

---

### Task 3: Create Approval Form

**Purpose:** A companion form for testing the deferral/approval workflow pattern.

- [ ] **Step 1: POST the Approval form**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X POST \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Approval",
  "slug": "approval",
  "status": "Active",
  "type": "Approval",
  "description": "Approval form for Kitchen Sink deferral workflow test",
  "submissionLabelExpression": "Approval — ${values(\"Decision\")} by ${identity(\"username\")}",
  "pages": [{
    "name": "Page 1", "renderType": "submittable", "type": "page",
    "advanceCondition": null, "displayCondition": null, "displayPage": null, "events": [],
    "elements": [
      {
        "type": "section", "renderType": null, "name": "Approval Details", "title": "Approval Details",
        "visible": true, "omitWhenHidden": null, "renderAttributes": {},
        "elements": [
          {
            "type": "field", "renderType": "text", "dataType": "string", "name": "Approver",
            "key": "f1", "label": "Approver", "enabled": false, "visible": true, "required": false,
            "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
            "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
            "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
          },
          {
            "type": "field", "renderType": "dropdown", "dataType": "string", "name": "Decision",
            "key": "f2", "label": "Decision", "enabled": true, "visible": true, "required": true,
            "requiredMessage": "Please select a decision", "defaultValue": null, "defaultDataSource": "none",
            "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
            "omitWhenHidden": null, "renderAttributes": {},
            "choicesDataSource": "custom", "choicesRunIf": null, "choicesResourceName": null,
            "choices": [{"label":"Approved","value":"Approved"},{"label":"Denied","value":"Denied"}]
          },
          {
            "type": "field", "renderType": "text", "dataType": "string", "name": "Comments",
            "key": "f3", "label": "Comments", "enabled": true, "visible": true, "required": false,
            "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
            "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
            "omitWhenHidden": null, "renderAttributes": {}, "rows": 3
          }
        ]
      },
      {
        "type": "section", "renderType": null, "name": "System Fields", "title": null,
        "visible": false, "omitWhenHidden": false, "renderAttributes": {},
        "elements": [
          {
            "type": "field", "renderType": "text", "dataType": "string", "name": "Original Submission Id",
            "key": "f4", "label": "Original Submission Id", "enabled": true, "visible": true, "required": false,
            "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
            "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
            "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
          },
          {
            "type": "field", "renderType": "text", "dataType": "string", "name": "Deferral Token",
            "key": "f5", "label": "Deferral Token", "enabled": true, "visible": true, "required": false,
            "requiredMessage": null, "defaultValue": null, "defaultDataSource": "none",
            "defaultResourceName": null, "pattern": null, "constraints": [], "events": [],
            "omitWhenHidden": null, "renderAttributes": {}, "rows": 1
          }
        ]
      },
      {
        "type": "section", "renderType": null, "name": "Footer", "title": null,
        "visible": true, "omitWhenHidden": null, "renderAttributes": {},
        "elements": [
          {"type": "button", "renderType": "submit-page", "name": "Submit Decision", "label": "Submit Decision", "visible": true, "enabled": true, "renderAttributes": {}}
        ]
      }
    ]
  }]
}'
```

Expected: 200 with the approval form created.

- [ ] **Step 2: Verify**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/approval?include=pages"
```

Confirm: 5 fields (Approver, Decision, Comments, Original Submission Id, Deferral Token).

---

### Task 4: Create Workflow 1 — Loop + Echo

**Purpose:** Create the "Kitchen Sink On Submit" workflow that loops over checkbox values and echoes each.

- [ ] **Step 1: Create workflow metadata**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X POST \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink/workflows" \
  -H "Content-Type: application/json" \
  -d '{"name": "Kitchen Sink On Submit", "event": "Submission Submitted", "type": "Tree", "status": "Active"}'
```

Save the returned `id` — needed for the next step.

- [ ] **Step 2: Upload treeJson**

```bash
WORKFLOW_ID="<id from step 1>"
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X PUT \
  "https://demo.kinops.io/app/api/v1/workflows/${WORKFLOW_ID}" \
  -H "Content-Type: application/json" \
  -d '{
  "treeJson": {
    "builderVersion": "", "schemaVersion": "1.0", "version": "", "processOwnerEmail": "",
    "lastId": 5, "name": "Kitchen Sink On Submit",
    "notes": "Loops over Checkbox Required values, echoes each",
    "connectors": [
      {"from": "start", "to": "utilities_echo_v1_1", "label": "", "value": "", "type": "Complete"},
      {"from": "utilities_echo_v1_1", "to": "system_loop_head_v1_2", "label": "", "value": "", "type": "Complete"},
      {"from": "system_loop_head_v1_2", "to": "utilities_echo_v1_3", "label": "", "value": "", "type": "Complete"},
      {"from": "system_loop_head_v1_2", "to": "system_loop_tail_v1_4", "label": "", "value": "", "type": "Complete"},
      {"from": "utilities_echo_v1_3", "to": "system_loop_tail_v1_4", "label": "", "value": "", "type": "Complete"}
    ],
    "nodes": [
      {
        "configured": true, "defers": false, "deferrable": false, "visible": false,
        "name": "Start", "messages": [], "id": "start",
        "position": {"x": 10, "y": 10}, "version": 1,
        "parameters": [], "definitionId": "system_start_v1",
        "dependents": {"task": [{"label": "", "type": "Complete", "value": "", "content": "utilities_echo_v1_1"}]}
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Echo Summary", "messages": [], "id": "utilities_echo_v1_1",
        "position": {"x": 200, "y": 10}, "version": 1,
        "parameters": [
          {"id": "input", "value": "Submitted: <%= @values[\"Text Required\"] %> by <%= @values[\"Submitted By\"] %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": true}
        ],
        "definitionId": "utilities_echo_v1",
        "dependents": {"task": [{"label": "", "type": "Complete", "value": "", "content": "system_loop_head_v1_2"}]}
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Loop Checkboxes", "messages": [], "id": "system_loop_head_v1_2",
        "position": {"x": 400, "y": 10}, "version": 1,
        "parameters": [
          {"id": "data_source", "value": "<%= @values[\"Checkbox Required\"] %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": true},
          {"id": "loop_path", "value": "$[*]", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": true},
          {"id": "var_name", "value": "choice", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false}
        ],
        "definitionId": "system_loop_head_v1",
        "dependents": {"task": [
          {"label": "", "type": "Complete", "value": "", "content": "utilities_echo_v1_3"},
          {"label": "", "type": "Complete", "value": "", "content": "system_loop_tail_v1_4"}
        ]}
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Echo Choice", "messages": [], "id": "utilities_echo_v1_3",
        "position": {"x": 600, "y": 10}, "version": 1,
        "parameters": [
          {"id": "input", "value": "Choice: <%= @results[\"Loop Checkboxes\"][\"Value\"] %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": true}
        ],
        "definitionId": "utilities_echo_v1",
        "dependents": {"task": [{"label": "", "type": "Complete", "value": "", "content": "system_loop_tail_v1_4"}]}
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "End Loop", "messages": [], "id": "system_loop_tail_v1_4",
        "position": {"x": 600, "y": 200}, "version": 1,
        "parameters": [
          {"id": "type", "value": "All", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "All,Some,Any", "required": true},
          {"id": "number", "value": "", "dependsOnId": "type", "dependsOnValue": "Some", "description": "", "label": "", "menu": "", "required": false}
        ],
        "definitionId": "system_loop_tail_v1",
        "dependents": ""
      }
    ]
  }
}'
```

Expected: 200 with `versionId` incremented.

- [ ] **Step 3: Verify workflow exists**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink/workflows"
```

Confirm: "Kitchen Sink On Submit" workflow appears with event "Submission Submitted".

---

### Task 5: Create Workflow 2 — Approval/Deferral

**Purpose:** Create the "Kitchen Sink Approval" workflow that defers and waits for approval, then updates status.

- [ ] **Step 1: Create workflow metadata**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X POST \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink/workflows" \
  -H "Content-Type: application/json" \
  -d '{"name": "Kitchen Sink Approval", "event": "Submission Submitted", "type": "Tree", "status": "Active"}'
```

Save the returned `id`.

- [ ] **Step 2: Upload treeJson with deferral pattern**

```bash
WORKFLOW_ID="<id from step 1>"
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X PUT \
  "https://demo.kinops.io/app/api/v1/workflows/${WORKFLOW_ID}" \
  -H "Content-Type: application/json" \
  -d '{
  "treeJson": {
    "builderVersion": "", "schemaVersion": "1.0", "version": "", "processOwnerEmail": "",
    "lastId": 5, "name": "Kitchen Sink Approval",
    "notes": "Sets status to Pending Approval, creates approval submission with deferral token, waits for approval, updates status",
    "connectors": [
      {"from": "start", "to": "kinetic_core_api_v1_1", "label": "", "value": "", "type": "Complete"},
      {"from": "kinetic_core_api_v1_1", "to": "kinetic_core_api_v1_2", "label": "", "value": "", "type": "Complete"},
      {"from": "kinetic_core_api_v1_2", "to": "utilities_echo_v1_4", "label": "", "value": "", "type": "Complete"}
    ],
    "nodes": [
      {
        "configured": true, "defers": false, "deferrable": false, "visible": false,
        "name": "Start", "messages": [], "id": "start",
        "position": {"x": 10, "y": 10}, "version": 1,
        "parameters": [], "definitionId": "system_start_v1",
        "dependents": {"task": [{"label": "", "type": "Complete", "value": "", "content": "kinetic_core_api_v1_1"}]}
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Set Status Pending", "messages": [], "id": "kinetic_core_api_v1_1",
        "position": {"x": 200, "y": 10}, "version": 1,
        "parameters": [
          {"id": "error_handling", "value": "Error Message", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false},
          {"id": "method", "value": "PUT", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false},
          {"id": "path", "value": "/submissions/<%= @submission['Id'] %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false},
          {"id": "body", "value": "{\"values\":{\"Status\":\"Pending Approval\"}}", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false}
        ],
        "definitionId": "kinetic_core_api_v1",
        "dependents": {"task": [{"label": "", "type": "Complete", "value": "", "content": "kinetic_core_api_v1_2"}]}
      },
      {
        "configured": true, "defers": true, "deferrable": true, "visible": true,
        "name": "Create Approval", "messages": [], "id": "kinetic_core_api_v1_2",
        "position": {"x": 400, "y": 10}, "version": 1,
        "parameters": [
          {"id": "error_handling", "value": "Error Message", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false},
          {"id": "method", "value": "POST", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false},
          {"id": "path", "value": "/kapps/ai-testing/forms/approval/submissions", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false},
          {"id": "body", "value": "<%= {values: {Approver: @submission['Created By'], 'Original Submission Id': @submission['Id'], 'Deferral Token': @task['Deferral Token']}, coreState: 'Draft'}.to_json %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false}
        ],
        "definitionId": "kinetic_core_api_v1",
        "dependents": {"task": [{"label": "", "type": "Complete", "value": "", "content": "utilities_echo_v1_4"}]}
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Set Status Final", "messages": [], "id": "utilities_echo_v1_4",
        "position": {"x": 600, "y": 10}, "version": 1,
        "parameters": [
          {"id": "input", "value": "Approval completed. Deferred results: <%= @results['Create Approval'] %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": true}
        ],
        "definitionId": "utilities_echo_v1",
        "dependents": ""
      }
    ]
  }
}'
```

Expected: 200 with versionId incremented. The "Create Approval" node has `defers: true, deferrable: true` — it will pause the workflow after creating the approval submission and wait for an external trigger.

---

### Task 6: Create Workflow 3 — Complete Approval Trigger

**Purpose:** On the Approval form, when submitted, complete the deferred node in the Kitchen Sink Approval workflow.

- [ ] **Step 1: Create workflow metadata on approval form**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X POST \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/approval/workflows" \
  -H "Content-Type: application/json" \
  -d '{"name": "Complete Approval", "event": "Submission Submitted", "type": "Tree", "status": "Active"}'
```

Save the returned `id`.

- [ ] **Step 2: Upload treeJson**

```bash
WORKFLOW_ID="<id from step 1>"
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X PUT \
  "https://demo.kinops.io/app/api/v1/workflows/${WORKFLOW_ID}" \
  -H "Content-Type: application/json" \
  -d '{
  "treeJson": {
    "builderVersion": "", "schemaVersion": "1.0", "version": "", "processOwnerEmail": "",
    "lastId": 3, "name": "Complete Approval",
    "notes": "Reads deferral token and completes the parent workflow deferral with the decision",
    "connectors": [
      {"from": "start", "to": "utilities_create_trigger_v1_1", "label": "", "value": "", "type": "Complete"}
    ],
    "nodes": [
      {
        "configured": true, "defers": false, "deferrable": false, "visible": false,
        "name": "Start", "messages": [], "id": "start",
        "position": {"x": 10, "y": 10}, "version": 1,
        "parameters": [], "definitionId": "system_start_v1",
        "dependents": {"task": [{"label": "", "type": "Complete", "value": "", "content": "utilities_create_trigger_v1_1"}]}
      },
      {
        "configured": true, "defers": false, "deferrable": false, "visible": true,
        "name": "Complete Deferral", "messages": [], "id": "utilities_create_trigger_v1_1",
        "position": {"x": 200, "y": 10}, "version": 1,
        "parameters": [
          {"id": "action_type", "value": "Complete", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": true},
          {"id": "deferral_token", "value": "<%= @values['Deferral Token'] %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": true},
          {"id": "deferred_variables", "value": "<results><result name=\"Decision\"><%= @values['Decision'] %></result><result name=\"Comments\"><%= @values['Comments'] %></result></results>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false},
          {"id": "message", "value": "Approval decision: <%= @values['Decision'] %>", "dependsOnId": "", "dependsOnValue": "", "description": "", "label": "", "menu": "", "required": false}
        ],
        "definitionId": "utilities_create_trigger_v1",
        "dependents": ""
      }
    ]
  }
}'
```

Expected: 200. This workflow fires when an approval submission is submitted, reads the Deferral Token field, and calls `utilities_create_trigger_v1` to complete the deferral in the parent Kitchen Sink workflow.

---

### Task 7: Add Kapp-Level Custom Field Indexes

**Purpose:** Test that kapp-level `values[FieldName]` indexes can be created via REST API — this will correct our skills documentation if successful.

- [ ] **Step 1: Add values[FieldName] indexes to kapp**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X PUT \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing" \
  -H "Content-Type: application/json" \
  -d '{
    "indexDefinitions": [
      {"name": "type", "parts": ["type"], "unique": false},
      {"name": "coreState", "parts": ["coreState"], "unique": false},
      {"name": "createdBy", "parts": ["createdBy"], "unique": false},
      {"name": "submittedBy", "parts": ["submittedBy"], "unique": false},
      {"name": "type,coreState,submittedBy", "parts": ["type","coreState","submittedBy"], "unique": false},
      {"name": "type,coreState,createdBy", "parts": ["type","coreState","createdBy"], "unique": false},
      {"name": "values[Text Required]", "parts": ["values[Text Required]"], "unique": false},
      {"name": "values[Dropdown Required]", "parts": ["values[Dropdown Required]"], "unique": false}
    ]
  }'
```

**If this succeeds:** Update `skills/concepts/kql-and-indexing/SKILL.md` — remove the claim that kapp-level values[FieldName] indexes cannot be created via REST API. Update `skills/concepts/api-basics/SKILL.md` — remove the related gotcha.

**If this fails with "field was not found":** Document the exact error and conditions. The kitchen-sink form exists with these fields, so if it still fails, the limitation is real and our docs are correct.

- [ ] **Step 2: Verify indexes**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing?include=indexDefinitions" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)['kapp']
for idx in d.get('indexDefinitions', []):
    print(f\"  {idx['name']} — parts: {idx['parts']} — status: {idx.get('status', '?')}\")
"
```

Confirm all 8 indexes exist and check their `status` (should be "New" initially, then "Built" after index building).

---

### Task 8: End-to-End Test — Submit + Verify Workflows

**Purpose:** Create a test submission and verify both workflows fire correctly.

- [ ] **Step 1: Create a Draft submission (to test Draft bypass)**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X POST \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "values": {
      "Text Required": "Kitchen Sink Test",
      "Text Multiline Required": "Multi-line test value",
      "Dropdown Required": "Option A",
      "Radio Required": "Option B",
      "Checkbox Required": "[\"Option A\",\"Option C\"]",
      "Date Required": "2026-04-09",
      "DateTime Required": "2026-04-09T12:00:00.000Z",
      "Time Required": "14:30",
      "Agree To Terms": "[\"I Agree\"]"
    },
    "coreState": "Draft"
  }'
```

Expected: 200 with `coreState: "Draft"`. No workflows fire (Draft bypasses triggers). No validation on required attachment fields.

- [ ] **Step 2: Submit the Draft (transition to Submitted)**

```bash
SUBMISSION_ID="<id from step 1>"
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" -X PUT \
  "https://demo.kinops.io/app/api/v1/submissions/${SUBMISSION_ID}?include=values" \
  -H "Content-Type: application/json" \
  -d '{"coreState": "Submitted"}'
```

Expected: 200 with `coreState: "Submitted"`. This should trigger both workflows.

**Note:** Attachment fields are required but not provided — this tests whether Draft→Submitted transition validates attachment fields or just non-attachment required fields. Document the result either way.

- [ ] **Step 3: Check workflow runs**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/components/task/app/api/v2/runs?source=Kinetic+Request+CE&sourceId=${SUBMISSION_ID}&include=details" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for r in d.get('runs', []):
    print(f\"  Run {r['id']}: {r['tree']['name']} — status: {r['status']}\")
"
```

Expected: Two runs — "Kitchen Sink On Submit" and "Kitchen Sink Approval".

- [ ] **Step 4: Verify Loop + Echo workflow**

```bash
# Get the Kitchen Sink On Submit run ID
RUN_ID="<from step 3>"
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/components/task/app/api/v2/runs/${RUN_ID}?include=tasks,tasks.details,exceptions" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Status: {d[\"status\"]}')
print(f'Exceptions: {len(d.get(\"exceptions\", []))}')
for t in d.get('tasks', []):
    r = ', '.join(f'{k}={str(v)[:60]}' for k,v in t.get('results', {}).items())
    print(f'  [{t[\"status\"]:7}] {t[\"loopIndex\"]:8} {t[\"nodeName\"]:20} => {r[:100]}')
"
```

Expected: Echo Summary outputs "Submitted: Kitchen Sink Test by james.davies@kineticdata.com". Loop creates 2 iterations (Option A, Option C). Each Echo Choice outputs "Choice: Option A" and "Choice: Option C". Zero exceptions.

- [ ] **Step 5: Verify Approval workflow deferred**

Check the Kitchen Sink Approval run — it should have the "Create Approval" node in Deferred status, and an approval submission should exist.

```bash
# Get the Kitchen Sink Approval run ID
RUN_ID="<from step 3>"
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/components/task/app/api/v2/runs/${RUN_ID}?include=tasks,tasks.details" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for t in d.get('tasks', []):
    print(f'  [{t[\"status\"]:8}] {t[\"nodeName\"]:25} token={t.get(\"token\", \"none\")[:20]}')
"
```

Expected: "Set Status Pending" = Closed, "Create Approval" = Deferred (with a token), "Set Status Final" = New (waiting).

- [ ] **Step 6: Test KQL search with indexes**

```bash
# Form-level search
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink/submissions?q=values%5BText%20Required%5D%3D%22Kitchen%20Sink%20Test%22&include=values" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Found: {len(d.get(\"submissions\",[]))} submissions')"

# Kapp-level cross-form search
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/submissions?q=coreState%3D%22Submitted%22&include=values&limit=10" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Found: {len(d.get(\"submissions\",[]))} cross-form submissions')"
```

- [ ] **Step 7: Commit test results and update skills**

Document all findings in the relevant SKILL.md files. Commit.

---

### Task 9: Save Reference Artifacts + Update Skills

**Purpose:** Save the verified form JSON and workflow treeJson as portable reference artifacts. Update skills with all learnings.

- [ ] **Step 1: Export and save Kitchen Sink form JSON**

```bash
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink?include=pages,indexDefinitions,integrations,bridgedResources,securityPolicies,attributes" \
  > tests/fixtures/kitchen-sink-form.json
```

- [ ] **Step 2: Export and save workflow treeJson definitions**

```bash
# Get workflow IDs and export each
curl -s -u "james.davies@kineticdata.com:Jcdhawa!!14" \
  "https://demo.kinops.io/app/api/v1/kapps/ai-testing/forms/kitchen-sink/workflows" \
  | python3 -c "import sys,json; [print(w['id'], w['name']) for w in json.load(sys.stdin).get('workflows',[])]"

# For each workflow ID, GET with include=treeJson and save
```

- [ ] **Step 3: Update kql-and-indexing skill**

Based on Task 7 results, update or confirm the kapp-level values[FieldName] index documentation.

- [ ] **Step 4: Update api-basics skill**

Remove or correct the gotcha about kapp-level indexes if Task 7 succeeded.

- [ ] **Step 5: Update form-engine skill**

Add any new property discoveries from building the Kitchen Sink form (event formats, bridgedResources format, etc.).

- [ ] **Step 6: Commit all artifacts and skill updates**

```bash
git add tests/fixtures/ skills/
git commit -m "feat: Kitchen Sink test fixture — verified form JSON, workflow definitions, skill updates"
```
