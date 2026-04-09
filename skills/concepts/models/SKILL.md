---
name: models
description: Bridge Data Models — read-only data views backed by bridge adapters for querying external data sources from forms and portals.
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

For datastore forms: `POST /{spaceSlug}/datastore/{formSlug}/bridgedResources/{name}`

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

## When to Use Models vs Connections

| Use Case | Approach |
|----------|----------|
| **Read** external data (populate dropdowns, lookup records) | Models + Bridge Adapters |
| **Write** to external systems (create tickets, update records) | Connections + Operations |
| **Both read and write** | Models for reads, Connections for writes |

Models are the legacy approach for data access. For new REST API integrations, prefer Connections & Operations which handle both read and write in a unified way. Models are still relevant for non-REST data sources (LDAP, custom databases) accessed through bridge adapters.

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
