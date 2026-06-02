---
name: models
description: "Use when reading external data into Kinetic forms or portals via Bridge Data Models — defining a model with attributes and qualifications (named queries), mapping it to a bridge structure on an agent, wiring a bridge adapter to LDAP/SQL/REST sources, or distinguishing read-side models from write-side Connections & Operations."
---

# Models (Bridge Data Views)

## Overview

Models define read-only data views that connect the Kinetic Platform to external data sources through bridge adapters. They provide a structured way to query external systems (LDAP, databases, REST APIs) from forms and portals without writing custom integration code.

Models are the **read** side of external data access. For **write** operations (creating/updating records in external systems), use Connections & Operations instead. See the Integrations concept skill (`concepts/integrations`).

## Architecture

```
Form/Portal → Model Qualification → Model Mapping → Bridge Adapter → External System
```

- **Model** — defines abstract attributes and qualifications (named queries)
- **Qualification** — a named query with typed parameters and result type (Single or Multiple)
- **Mapping** — connects model attributes to a specific bridge structure on an agent
- **Bridge Adapter** — Java adapter that translates queries into external system calls (LDAP, SQL, REST, etc.)

## Model Structure

```json
{
  "name": "Team",
  "status": "Active",
  "activeMappingName": "Team",
  "attributes": [
    { "name": "Name" }
  ],
  "qualifications": [
    { "name": "All Teams", "parameters": [], "resultType": "Multiple" },
    { "name": "By Name", "parameters": [{ "name": "Name" }], "resultType": "Single" }
  ],
  "mappings": [
    {
      "name": "Team",
      "agentSlug": "system",
      "bridgeSlug": "kinetic-core",
      "structure": "Teams",
      "attributes": [
        { "name": "Name", "structureField": "${fields('name')}" }
      ],
      "qualifications": [
        { "name": "All Teams", "query": "exclude=Role" },
        { "name": "By Name", "query": "slug=${parameters('Name')}" }
      ]
    }
  ]
}
```

### Key Properties

| Property | Description |
|----------|-------------|
| `activeMappingName` | Which mapping is used at runtime — switching this toggles the data source |
| `attributes` | Abstract field names exposed to forms/portals |
| `qualifications` | Named queries — each has parameters and a result type (`Single` or `Multiple`) |
| `mappings[].bridgeSlug` | Which bridge adapter to use (e.g., `kinetic-core`, `kinetic-bridgehub`) |
| `mappings[].structure` | The bridge structure to query (adapter-specific, e.g., `Teams`, `Users`) |
| `mappings[].attributes[].structureField` | Expression mapping model attribute to bridge field (`${fields('name')}`) |
| `mappings[].qualifications[].query` | Bridge-specific query string with `${parameters('Name')}` substitution |

## API Reference

```
GET    /app/api/v1/models                    # List all models
POST   /app/api/v1/models                    # Create model
GET    /app/api/v1/models/{name}             # Get model by name
PUT    /app/api/v1/models/{name}             # Update model (full replace)
DELETE /app/api/v1/models/{name}             # Delete model
```

Sub-resources for attributes, mappings, qualifications, and parameters follow the same CRUD pattern:
```
/models/{name}/attributes
/models/{name}/attributes/{attrName}
/models/{name}/mappings
/models/{name}/mappings/{mappingName}
/models/{name}/mappings/{mappingName}/attributes
/models/{name}/mappings/{mappingName}/qualifications
/models/{name}/qualifications
/models/{name}/qualifications/{qualName}
/models/{name}/qualifications/{qualName}/parameters
```

**Include parameter:** `?include=details` adds `createdAt`, `createdBy`, `updatedAt`, `updatedBy` to the response. Without it, these audit fields are omitted.

### Create Model — Minimum Required

```json
POST /app/api/v1/models
{ "name": "My Model", "status": "Active" }
```

Only `name` and `status` are required. `status` must be `"Active"` or `"Inactive"` — omitting it returns 400: `Status must be "Active" or "Inactive"`.

A minimal model with no attributes, qualifications, or mappings is valid — you can add them later via sub-resource endpoints or a subsequent PUT.

### Create Mapping — Minimum Required

```json
POST /app/api/v1/models/{name}/mappings
{ "name": "My Mapping", "agentSlug": "system", "bridgeSlug": "kinetic-core", "structure": "Users" }
```

A mapping requires `name`, `agentSlug`, `bridgeSlug`, and `structure`. The `attributes` and `qualifications` collections can be empty initially and added later via the mapping sub-resource endpoints (`/mappings/{mappingName}/attributes`, `/mappings/{mappingName}/qualifications`).

**DON'T — `bridgeSlug` and `agentSlug` must reference an already-deployed agent + bridge.** Inventing a `bridgeSlug` (or `agentSlug`) that doesn't exist on the platform will fail — the mapping has no adapter to route queries to. Confirm the agent is deployed and the bridge slug exists before referencing it in a mapping.

### Response Wrapping

- **List:** `{ "models": [...] }`
- **Single GET/Create/Update/Delete:** `{ "model": { ... } }` (delete returns the deleted model)

### Error Responses

| Error | Cause |
|-------|-------|
| `"Status must be \"Active\" or \"Inactive\""` | Missing or invalid `status` field |
| `"Model names must be unique and there are 2 with the name \"X\""` | Duplicate model name |
| `"Unable to locate the X BridgeModel"` | GET/PUT/DELETE with nonexistent name (404) |

**Gotcha — name is the identifier:** Models are addressed by `name` (not a slug or ID). Names with spaces must be URL-encoded: `/models/Test%20API%20Model`.

**Gotcha — PUT is full replace:** When updating a model, provide all fields (attributes, qualifications, mappings). Omitted collections are cleared. The server alphabetizes attributes and qualifications in the response (not insertion order).

## Executing Model Queries (Bridged Resources)

To execute a model qualification, you must first **expose it as a Bridged Resource on a form**. The platform enforces access control through forms — if a user can view the form, they can execute its bridged resources.

**Layering note — "legacy" applies to the form array, not to Bridges:** the `bridgedResources` ARRAY on a form definition is legacy (superseded by the form `integrations` array — see `concepts/form-events-expressions`). That is a different layer from Bridges/Bridge Models themselves, which remain a current, actively-maintained data-access mechanism (see "Models, Bridges, and Connections — Coexisting Mechanisms" below). Don't read "legacy `bridgedResources` array" as "Bridges are deprecated" — only the form-level array wiring is being phased out, not the underlying Bridge mechanism.

### Setup

1. Create a Model with attributes and qualifications (via API or console)
2. On a form, add a **Bridged Resource** referencing the model qualification
3. Map the qualification's parameters to form field values or static values

### Executing from React (`@kineticdata/react`)

```js
import { fetchBridgedResource, countBridgedResource, convertMultipleBridgeRecords } from '@kineticdata/react';

// Fetch records
const { records } = await fetchBridgedResource({
  kappSlug: 'services',
  formSlug: 'my-form',
  bridgedResourceName: 'Users By Email',
  attributes: ['Display Name', 'Email', 'Username'],  // which model attributes to return
  values: { Email: 'john@' },  // qualification parameter values
  limit: 25,
  offset: 0,
});

// Multiple-result responses separate field names from data for bandwidth efficiency.
// Use convertMultipleBridgeRecords to merge them into objects:
const users = convertMultipleBridgeRecords(records);
// => [{ "Display Name": "John Doe", "Email": "john@example.com", "Username": "john.doe" }, ...]

// Count records
const { count } = await countBridgedResource({
  kappSlug: 'services',
  formSlug: 'my-form',
  bridgedResourceName: 'Users By Email',
  values: { Email: 'john@' },
});
```

### URL Pattern (for custom fetch)

```
POST /{spaceSlug}/{kappSlug}/{formSlug}/bridgedResources/{bridgedResourceName}
```

Body is URL-encoded form data with: `attributes`, `values[paramName]`, `limit`, `offset`.

**Note:** In v6+, all forms live within kapps. The legacy space-level `/datastore/{formSlug}` path may still work for backward compatibility, but use the kapp path for all new work.

### Within Forms (K() API)

Inside form events, bridged resources are accessed via `K('bridgedResource[Name]')`:

```js
K('bridgedResource[Users By Email]').load({
  attributes: ['Display Name', 'Email'],
  values: { Email: values('Email') }
});
```

## Usage in Forms (Choices)

Models power integration-driven dropdowns and lookups on forms. Reference a model qualification from a field's `choicesDataSource: "integration"` configuration:

```json
{
  "choicesDataSource": "integration",
  "choicesResourceName": "Team",
  "choicesResourceProperty": "Teams",
  "choices": {
    "label": "${integration('Name')}",
    "value": "${integration('Name')}"
  }
}
```

See the Form Engine concept skill (`concepts/form-engine`) for full integration-driven choices syntax.

## Models, Bridges, and Connections — Coexisting Mechanisms

Bridges (with their associated Models) and Connections + Operations are both valid integration mechanisms in active use across Kinetic Platform deployments. They coexist in customer spaces — frequently within the same kapp, sometimes within the same form — and pick different tradeoffs. Bridges work well when a target system needs a stable typed data view that forms can populate dropdowns against; Operations work well when individual write actions or stateful API calls need workflow-side handlers. The same external system can appear behind both mechanisms simultaneously — for example, in observed environments HubSpot has been reachable both as a Bridge with model qualifications and as a Connection with REST operations. Spaces vary in how heavily they lean on each. Choose based on what the integration needs and your team's existing patterns, not on a "modern vs legacy" framing — both are actively maintained.

The mechanisms have different sweet spots:

| Use Case | Common Choice |
|----------|---------------|
| **Read** external data — populate dropdowns, lookup records | Bridges + Models |
| **Write** to external systems — create tickets, update records | Connections + Operations |
| **Both read and write on the same system** | Either, or both — observed in practice |
| **Non-REST sources** — SQL, LDAP, file systems, Java-SDK-only systems | Bridges (a custom adapter wraps the access pattern) |
| **Modern REST APIs that the Integrator covers** | Either; many spaces choose by team familiarity |

## Live Example: Users Model (from `kinetic-core` bridge)

```json
{
  "model": {
    "name": "Users",
    "status": "Active",
    "activeMappingName": "Users",
    "attributes": [
      {"name": "Display Name"},
      {"name": "Email"},
      {"name": "Username"}
    ],
    "qualifications": [
      {"name": "All", "parameters": [], "resultType": "Multiple"},
      {"name": "By Email", "parameters": [{"name": "Email"}], "resultType": "Multiple"},
      {"name": "By Username", "parameters": [{"name": "Username"}], "resultType": "Multiple"},
      {"name": "By Username Single", "parameters": [{"name": "Username"}], "resultType": "Single"}
    ],
    "mappings": [
      {
        "name": "Users",
        "agentSlug": "system",
        "bridgeSlug": "kinetic-core",
        "structure": "Users",
        "attributes": [
          {"name": "Display Name", "structureField": "${fields('displayName')}"},
          {"name": "Username", "structureField": "${fields('username')}"},
          {"name": "Email", "structureField": "${fields('email')}"}
        ],
        "qualifications": [
          {"name": "By Email", "query": "q=email=* \"${parameters('Email')}\""},
          {"name": "By Username", "query": "q=username =* \"${parameters('Username')}\""},
          {"name": "By Username Single", "query": "q=username = \"${parameters('Username')}\""},
          {"name": "All", "query": null}
        ]
      }
    ]
  }
}
```

**Note:** The mapping `qualifications[].query` uses KQL-like syntax for the `kinetic-core` bridge. The `=*` operator is starts-with, and `null` query returns all results. Mapping queries use `${parameters('Name')}` to inject qualification parameters.

## Bridge Patterns and Gotchas

### Two Qualification-Query Styles: Named-Structure vs Adhoc

The Live Example above shows the **named-structure** pattern: the bridge knows the target structure (`Users`, `Teams`, `Submissions > kapp > form`), and the qualification's `query` is a filter against that structure. Internal Kinetic-platform bridge mappings frequently use this style — `q=email=*"${parameters('Email')}"` is a typical shape, with `=*` as starts-with and `=` as exact match.

A second style is **Adhoc** — the mapping declares `structure: "Adhoc"` and the qualification's `query` is a free-form HTTP path (or path + body) that the bridge passes through to the target API. Bridges fronting external REST APIs often use this style. An observed HubSpot example:

```json
{
  "structure": "Adhoc",
  "qualifications": [
    { "name": "All Active Companies",
      "query": "/crm/v3/objects/companies?accessor=results&archived=false" },
    { "name": "Search by Status",
      "query": "/crm/v3/objects/companies/search?accessor=results&body={\"filterGroups\":[...]}" }
  ]
}
```

The `accessor=` query parameter tells the bridge how to extract records from the target's response (e.g., `accessor=results` pulls `body.results`). Adhoc qualifications use the same `${parameters('Name')}` substitution as named-structure ones; the bridge interpolates before issuing the request.

### Qualification Parameter Substitution

Both query styles use `${parameters('Name')}` to inject values into the query string at call time. Two patterns worth knowing:

**Submission ID** — pass the current submission's ID as a parameter:
```
${submission('id')}
```
Useful for "fetch records related to this submission" qualifications when the bridged resource is invoked from a form that has an active submission context.

**Attachment file names** — extract the first attachment's filename from an attachment field, returning empty string when no attachment is present:
```
${JSON.parse(fields("values[Attachments]") || "[]").length > 0 ? JSON.parse(fields("values[Attachments]"))[0]['name'] : ""}
```
Used in mapping `attributes[].structureField` to surface attachment metadata to the model layer.

### SQL Adapter Quoting Gotcha

For SQL bridge adapters (Oracle, generic SQL, custom JDBC):

**Don't wrap `${parameters('Name')}` in SQL quotes.** The adapter handles parameter quoting and SQL injection escaping itself — quoting the substitution doubles up.

```
-- Works: adapter quotes the value
LAST_NAME = ${parameters('Last Name')}

-- Breaks: quotes get duplicated
LAST_NAME = '${parameters('Last Name')}'
```

**Wildcards / LIKE — use CONCAT** to combine the parameter and the wildcard pattern:
```
LAST_NAME LIKE CONCAT(${parameters('Last Name')}, '%')
```

On adapters that support it, the `||` concatenation operator works similarly: `${parameters('Last Name')} || '%'`.

### Cross-Form Bridge Calls via K.api

When one form needs to call a bridged resource defined on a different form (a common pattern is a kapp's shared-resources form that hosts reusable bridges), use `K.api` against the bridge endpoint:

```js
K.api({
  method: 'GET',
  url: '<kappSlug>/<sharedResourcesFormSlug>/bridgedResources/<bridgedResourceName>',
  data: { values: { 'Email': 'someone@example.com' } },
  success: function(data) { /* ... */ }
});
```

This lets a kapp consolidate bridge definitions on one shared-resources form and call them from any other form in the kapp without re-declaring the `bridgedResources` entry on each consumer.

### Library Ahead of Need

Models can be defined ahead of when forms or workflows actually consume them. In one observed environment, half the model catalog had zero form references at snapshot time — those models were available for workflow-side calls (via the legacy `bridge_v1` handler) and for direct React portal lookups, but no form's `bridgedResources` array referenced them yet. Treat unreferenced models as inventory rather than dead code unless other signals (deletion comments, deprecated naming) suggest otherwise.
