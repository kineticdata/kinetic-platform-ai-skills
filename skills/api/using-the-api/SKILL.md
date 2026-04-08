---
name: using-the-api
description: Common API usage patterns, request/response conventions, error handling, and guidance for working with the Kinetic Platform REST APIs.
---

# Using the API

## Overview

This skill covers practical patterns for working with the Kinetic Platform APIs. For authentication details, see the Authentication skill (`api/authentication`). For specific endpoint reference, see the auto-generated API reference files in `api/core/`, `api/integrator/`, and `api/task/`.

## Request Conventions

### Content Type

All request and response bodies use JSON:
```
Content-Type: application/json
Accept: application/json
```

### Include Parameter

Most GET endpoints accept an `include` query parameter to control response detail:

```bash
# Minimal response (default)
GET /app/api/v1/kapps/{kappSlug}/forms

# Include field definitions
GET /app/api/v1/kapps/{kappSlug}/forms?include=fields

# Include submission values
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions?include=values

# Include multiple — comma-separated
GET /app/api/v1/kapps/{kappSlug}/forms/{formSlug}/submissions?include=details,values
```

**Gotcha:** `include=values` does NOT return `createdAt` or `id`. Use `include=details` or `include=details,values` when you need timestamps or identifiers.

### Task API Include Behavior

The Task API has a different `include` behavior:

```bash
# REQUIRED to get id, createdAt on run objects
GET /app/components/task/app/api/v2/runs?include=details
```

**Gotcha:** Without `include=details`, the Task API returns run objects where `id` is absent (not null) — code that checks `run.id === null` will fail silently.

## Response Conventions

### Single Resource
```json
{
  "form": {
    "slug": "my-form",
    "name": "My Form",
    "fields": [...]
  }
}
```

### Collection
```json
{
  "forms": [
    { "slug": "form-1", "name": "Form 1" },
    { "slug": "form-2", "name": "Form 2" }
  ],
  "nextPageToken": "..."
}
```

### Error Response
```json
{
  "error": {
    "key": "not_found",
    "message": "Form not found: bad-slug"
  }
}
```

## Common Operations

### Create a Form

```bash
curl -u "admin:password" -X POST \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "service-request",
    "name": "Service Request",
    "description": "General service request form",
    "type": "Service",
    "status": "Active",
    "attributes": [
      { "name": "Icon", "values": ["fa-file-text"] }
    ]
  }'
```

### Add Fields to a Form

```bash
curl -u "admin:password" -X POST \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms/service-request/fields" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Requested For",
    "key": "f1",
    "dataType": "string",
    "renderType": "text"
  }'
```

**Gotcha:** Submitting values for fields not defined on the form returns **500**. Always verify field names with `?include=fields` before submitting.

### Create an Index on a Form

```bash
curl -u "admin:password" -X POST \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms/service-request/indexDefinitions" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [
      { "name": "values[Status]" },
      { "name": "values[Requested For]" }
    ]
  }'
```

**Critical:** KQL queries require index definitions on the form — even simple equality queries fail without them. See KQL & Indexing concept skill for details.

### Search Submissions with KQL

```bash
curl -u "admin:password" \
  "https://myspace.kinops.io/app/api/v1/kapps/services/forms/service-request/submissions?include=values&q=values[Status]=\"Open\"&index=values[Status]"
```

### Update a Submission (PATCH)

```bash
curl -u "admin:password" -X PATCH \
  "https://myspace.kinops.io/app/api/v1/submissions/{submissionId}" \
  -H "Content-Type: application/json" \
  -d '{
    "values": {
      "Status": "Approved",
      "Approver": "john.doe"
    }
  }'
```

## Error Patterns

| HTTP Status | Common Cause |
|-------------|-------------|
| 400 | Invalid query parameter (e.g., `timeline` or `direction` on Core API submissions) |
| 401 | Bad credentials or expired OAuth token |
| 404 | Wrong slug, wrong kapp path, or resource doesn't exist |
| 500 | Submitting values for undefined fields, or malformed request body |

## Working with the MCP Server

When using the Kinetic Platform MCP server, you don't construct API calls directly. Instead:

1. Use `discover_space`, `discover_kapp`, `discover_form` to understand what exists
2. Use `get_api_spec` to get endpoint details for a specific domain
3. Use `execute_api` to make calls — it handles auth, base URL, and CSRF

```
execute_api({ method: "POST", path: "/kapps/services/forms", body: { slug: "my-form", name: "My Form" } })
```

The `path` is relative to the Core API base URL. For Task API or Integrator API endpoints, prefix accordingly:
- Task: `execute_api({ method: "GET", path: "/components/task/app/api/v2/runs" })`
- Integrator: `execute_api({ method: "GET", path: "/integrator/api/connections" })`
