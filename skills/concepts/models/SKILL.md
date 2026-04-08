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
GET    /app/api/v1/models/{name}             # Get model
PUT    /app/api/v1/models/{name}             # Update model
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

## Usage in Forms

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
