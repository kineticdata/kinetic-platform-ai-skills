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

**Gotcha:** `include=values` does NOT return `createdAt` or `updatedAt`. The `id` field IS always present regardless of include. Use `include=details` or `include=details,values` when you need timestamps (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`).

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

### Collection (Core API)
Core API collections include a `messages` array alongside the entity key:
```json
{
  "messages": [],
  "forms": [
    { "slug": "form-1", "name": "Form 1" },
    { "slug": "form-2", "name": "Form 2" }
  ],
  "nextPageToken": "..."
}
```

### Collection (Task API)
Task API uses `count`/`limit`/`offset` pagination (not `nextPageToken`):
```json
{
  "count": 42,
  "limit": 25,
  "offset": 0,
  "runs": [...]
}
```

### Collection (Integrator API)
The Integrator API returns **bare arrays** — not wrapped in an object:
```json
[
  { "name": "ServiceNow Production", "id": "...", "type": "http", "config": {...}, "status": {...} },
  { "name": "Jira", "id": "...", "type": "http", "config": {...}, "status": {...} }
]
```

Single resources in the Integrator API are also **unwrapped** — returned directly as the object, not inside a wrapper key.

**Gotcha — Integrator requires OAuth Bearer tokens.** Basic Auth returns: `{"message": "Authorization header must contain a bearer token"}`. See the Authentication skill for the OAuth implicit grant flow.

### Error Response

Core API errors use a flat structure (not nested):
```json
{
  "error": "Unable to locate the Nonexistent BridgeModel",
  "correlationId": "6d3d1b2c-4e99-4c67-bd1b-2c4e999c6776",
  "statusCode": 400
}
```

The `error` field is a **string** (not an object). `correlationId` is useful for support debugging. Some 404 errors use a different shape:
```json
{
  "error": "The page you were looking for doesn't exist.",
  "correlationId": "..."
}
```

Integrator API errors use a different shape with `errorKey`:
```json
{
  "errorKey": "server_error",
  "error": "An unexpected server error has occurred"
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

## Space-Level Utility Endpoints

The Core API provides several utility endpoints that return platform-wide information:

### Version

```bash
GET /app/api/v1/version
```
```json
{
  "version": {
    "buildDate": "2026-02-12 14:02:52 +0000",
    "buildNumber": "2951458",
    "timestamp": "1770905008644",
    "version": "6.1.7"
  }
}
```

The Integrator has a separate version endpoint at `GET /app/integrator/api/version` (requires OAuth). Its `buildNumber` is a git commit hash, not numeric.

### Activity (Dashboard Metrics)

```bash
GET /app/api/v1/activity
```

Returns submission volume metrics for dashboards. Two arrays:
- `submissionBreakdown` — total submissions per kapp: `[{"category": "Services", "value": 100}, ...]`
- `submissionVolume` — daily submission counts per kapp (last 30 days): `[{"category": "2026-03-10", "series": "Services", "value": 5}, ...]`

**Gotcha:** No `include` options. Query parameters like `?kapp=services` or `?type=submissions` are accepted but do NOT filter the response — you always get all kapps.

### Notices (Platform Health)

```bash
GET /app/api/v1/notices
```
```json
{
  "notices": [
    {
      "component": "task",
      "key": "RoutineMissing",
      "message": "There are routines used in trees and/or routines that are missing from the application.",
      "data": { "routines": 6 }
    }
  ]
}
```

Returns health warnings. Each notice has a `component`, `key`, human-readable `message`, and optional `data` object with details.

### Background Jobs

```bash
GET /app/api/v1/backgroundJobs
```

Returns `{ "backgroundJobs": [] }` when no jobs are running. Used to monitor long-running platform operations (imports, exports, bulk operations).

### File Resources

```bash
GET /app/api/v1/fileResources
```

Returns `{ "messages": [], "nextPageToken": null, "fileResources": [] }`. Supports pagination via `nextPageToken`.

### Translations

```bash
GET /app/api/v1/translations/settings/locales    # List configured locales
GET /app/api/v1/translations/contexts             # List translation contexts
GET /app/api/v1/translations/entries              # List all translation entries
GET /app/api/v1/translations/entries?context=shared&locale=en  # Filter by context/locale
```

**Locale response:** `{ "locales": [{"code": "en"}, {"code": "fr"}] }`

**Translation entry shape:**
```json
{
  "context": "shared",
  "locale": "en",
  "key": "Good Morning",
  "keyHash": "72a079088694099d64753fdba3bfe26e",
  "value": "Good Morning",
  "inheritanceEntry": null,
  "createdAt": "2024-08-29T18:19:28.173Z",
  "createdBy": "admin@example.com",
  "updatedAt": "2024-08-29T18:19:28.173Z",
  "updatedBy": "admin@example.com"
}
```

**Gotcha:** Entries for locales that have a key but no translation yet have `value: null`, `createdAt: null`, `createdBy: null`.

**Gotcha:** `GET /translations/settings` (without `/locales`) returns 404. The path must include the sub-resource.

### User Preferences

Per-user key-value storage. Persists UI state like table filter toggles.

```bash
GET    /app/api/v1/userPreferences                    # List all for current user
GET    /app/api/v1/userPreferences/{key}              # Get single preference
POST   /app/api/v1/userPreferences                    # Create
DELETE /app/api/v1/userPreferences/{key}              # Delete
```

**Create request (note required wrapper):**
```json
POST /app/api/v1/userPreferences
{ "userPreference": { "key": "my-setting", "value": "my-value" } }
```

**Gotcha — wrapper required:** The body must be `{"userPreference": {...}}`, not a flat object. Without the wrapper, you get: `Body must contain a 'userPreference' property with a value of type object.`

**Response shapes:**
- List: `{ "userPreferences": [{"key": "...", "value": "..."}, ...] }`
- Single/Create/Delete: `{ "userPreference": {"key": "...", "value": "..."} }`

### User Invitation Tokens

Manage invitation tokens for new user onboarding.

```bash
GET    /app/api/v1/userInvitationTokens               # List (paginated)
POST   /app/api/v1/userInvitationTokens               # Create
DELETE /app/api/v1/userInvitationTokens/{id}           # Delete
```

**Create request (flat body, no wrapper):**
```json
POST /app/api/v1/userInvitationTokens
{ "email": "newuser@example.com" }
```

**Create response:**
```json
{
  "userInvitationToken": {
    "id": "0ea7f773-...",
    "email": "newuser@example.com",
    "expiresAt": "2026-04-18T02:36:29.741Z",
    "invitedAt": "2026-04-08T02:36:29.741Z",
    "invitedBy": "admin@example.com"
  }
}
```

**Delete response (includes extra audit fields):**
```json
{
  "userInvitationToken": {
    "id": "...",
    "email": "newuser@example.com",
    "createdAt": 1775615789741,
    "createdBy": "admin@example.com",
    "updatedAt": 1775615789741,
    "updatedBy": "admin@example.com",
    "versionId": null,
    "expiresAt": 1776479789741,
    "invitedAt": 1775615789741,
    "invitedBy": "admin@example.com",
    "expired": false,
    "validationErrors": []
  }
}
```

**Gotcha — inconsistent timestamp format:** Create returns ISO 8601 strings (`"2026-04-18T02:36:29.741Z"`), but delete returns Unix timestamps in milliseconds (`1775615789741`).

**Gotcha — inconsistent body format:** Unlike `userPreferences` (which requires a wrapper), `userInvitationTokens` accepts a flat body for creation. Using the wrapper format `{"userInvitationToken": {"email": "..."}}` returns validation error "Email must not be blank".

**Pagination:** List response uses `{ "nextPageToken": null, "userInvitationTokens": [] }`.

## Error Patterns

| HTTP Status | Common Cause |
|-------------|-------------|
| 400 | Invalid query parameter (e.g., `timeline` on Core API submissions) |
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
