---
name: kinetic-create-connection
description: Create a Kinetic Integrator Connection and its paired Operations for an external system
argument-hint: "<external-system-name> [openapi-or-description]"
user-invocable: true
---

# Create a Connection + Operations

The user wants to wire up an external system (REST API, SQL DB) for use from Kinetic workflows and forms via `system_integration_v1`. Parse the argument for the system name and optionally a description, OpenAPI URL, or list of operations needed.

> **Tooling:** Connections and Operations live behind the **Integrator REST API** at `{server}/app/integrator/api`, which requires an **OAuth 2.0 bearer token** (NOT Basic Auth). See `api/authentication` for the implicit-grant token-extraction flow and `concepts/integrations` for the Connection/Operation model. The platform's Console can also create these; this command drives the REST API for repeatability.

## Step 0: Read Reference Docs

Read:
- `concepts/integrations` — Connection/Operation modeling, baseUrl strategy, Mustache template syntax, the credential-wipe warning.
- `api/integrator/connections.md` — endpoint shapes (especially the PUT/PATCH credential warning at the top).
- `api/integrator/operations.md` — operation CRUD endpoints.

## Step 1: Authenticate

Exchange Basic Auth for an Integrator OAuth bearer token:

```
GET {server}/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system
Authorization: Basic <base64(username:password)>
# DO NOT auto-follow the 302 — read access_token from the Location header's URL fragment
```

Cache the token with a ~30s expiry buffer (tokens live 12h). All subsequent Integrator calls send `Authorization: Bearer <token>`.

## Step 2: Plan the Connection

Confirm with the user:

- **`name`** — short, descriptive (e.g. "BambooHR", "Acme CRM").
- **`baseUrl`** — bake the common path prefix in (`https://acme.bamboohr.com/api/v1`, NOT just the host). See the baseUrl-strategy guidance in `concepts/integrations`.
- **`type`** — `HTTP` (REST) or `SQL` (PostgreSQL / SQL Server). This command focuses on HTTP; SQL has its own driver config shape.
- **`auth`** — one of:
  - `null` — header-based auth via per-operation headers (uncommon)
  - `"basic"` with `username` / `password`
  - `"raw_bearer_token"` with `header` / `prefix` / `token`
- **`secrets`** — non-auth secrets the Operations will reference (e.g. shared API keys passed in headers per call). Set names here; values land via Console or follow-up PATCH.
- **`testPath`** — a no-side-effect GET that returns 200 against an authenticated session. The Connection Test endpoint will hit this; pick something stable (not the bare baseUrl, which often 404s).

## Step 3: Create the Connection

```
POST {server}/app/integrator/api/connections
Authorization: Bearer <integrator-token>
Content-Type: application/json

{
  "name": "Acme CRM",
  "type": "HTTP",
  "config": {
    "baseUrl": "https://api.acmecrm.com/v2",
    "auth": { "authType": "raw_bearer_token", "header": "Authorization", "prefix": "Bearer", "token": "<real-secret>" },
    "headers": { "Accept": "application/json" },
    "testPath": "/me"
  }
}
```

Capture the returned `id` (UUID) — every subsequent Operation references it.

## Step 4: Test the Connection

```
POST {server}/app/integrator/api/connections/{id}/test
Authorization: Bearer <integrator-token>
```

**The endpoint always returns HTTP 200** — check the response body's `status` field. `status: "error"` means the test request failed; inspect `message`. False negatives are possible against APIs without a usable `testPath` — see `concepts/integrations` "Connection Test Always Returns 200."

## Step 5: Plan the Operations

For each operation the user needs, capture:

- **`name`** — short, descriptive (e.g. "Get Contact", "Create Lead", "Update Opportunity"). The name will appear in `system_integration_v1`'s operation-picker dropdown.
- **`config.method`** — HTTP verb.
- **`config.path`** — relative to the Connection's `baseUrl`. Use Mustache `{{Param Name}}` for path variables (e.g. `/contacts/{{Contact Id}}`).
- **`config.params`** — query string template (e.g. `{ "limit": "{{Limit}}", "after": "{{Cursor}}" }`).
- **`config.body`** — for POST/PUT/PATCH, `{ "bodyType": "raw", "raw": "<Mustache-templated JSON string>" }`. Use `{{{Param}}}` (triple-stache) for parameters that are themselves JSON objects to avoid HTML-escaping.
- **`config.headers`** — operation-specific headers if any.
- **`outputs`** — `{ "Output Name": { "value": "body.path.to.field" } }`. The handler's `@results['<Node Name>']['Output Name']` reads these.
- **Parameters declared from the templates.** Anything that appears as `{{Name}}` becomes a typed input parameter the workflow / form passes in.

## Step 6: Create Each Operation

```
POST {server}/app/integrator/api/connections/{connectionId}/operations
Authorization: Bearer <integrator-token>
Content-Type: application/json

{
  "name": "Get Contact",
  "config": {
    "method": "GET",
    "path": "/contacts/{{Contact Id}}",
    "params": {},
    "headers": {},
    "body": null,
    "includeEmptyParams": false,
    "followRedirect": true,
    "streamResponse": false
  },
  "outputs": {
    "First Name": { "value": "body.firstName" },
    "Last Name":  { "value": "body.lastName" },
    "Email":      { "value": "body.email" }
  }
}
```

For a write Operation (`POST /contacts`):

```json
{
  "name": "Create Contact",
  "config": {
    "method": "POST",
    "path": "/contacts",
    "body": {
      "bodyType": "raw",
      "raw": "{\"firstName\":\"{{First Name}}\",\"lastName\":\"{{Last Name}}\",\"email\":\"{{Email}}\"}"
    },
    "headers": { "Content-Type": "application/json" }
  },
  "outputs": {
    "Contact Id": { "value": "body.id" },
    "Created At": { "value": "body.createdAt" }
  }
}
```

> **Output mapping caveat.** `system_integration_v1` has no `error_handling` lever — a non-defensive output expression fails the whole run. Defensive shape: `body.path?.to?.field` doesn't exist in the expression language, so the expression must succeed for *every* response shape, including error responses. For optional fields, keep them out of `outputs` and inspect `@results['<Node>']['Response Body']` defensively in the calling tree.

## Step 7: Verify

```
GET {server}/app/integrator/api/connections/{id}/operations
GET {server}/app/integrator/api/connections/{id}/operations/{operationId}
```

Each operation should show the parameters extracted from the templates (one per unique `{{Name}}`). If the parameters list looks wrong, the templates have a typo.

For an end-to-end smoke test, build a one-node workflow that invokes the operation with hardcoded values and run it once via `/kinetic-test-workflow` or by submitting against a form that triggers it.

## Step 8: Report

```
Connection created: Acme CRM (id: 8f3c-2a91-...-)
  baseUrl: https://api.acmecrm.com/v2
  auth: raw_bearer_token

Operations created:
  ✓ Get Contact      (GET /contacts/{{Contact Id}})
  ✓ Create Contact   (POST /contacts)
  ✓ Update Contact   (PATCH /contacts/{{Contact Id}})
  ✓ Search Contacts  (GET /contacts?q={{Query}})

Next steps:
  - Use these in workflows via system_integration_v1 with connection={id} operation={opId}
  - Use from forms via the form's `integrations` array (see concepts/form-events-expressions)
  - Test invocation: /kinetic-test-workflow
```

## Critical Rules

- **NEVER round-trip a GET back through PUT** — credentials are masked as `null` in GETs; PUT-ting them back permanently overwrites the real values. PATCH a strict allowlist of fields.
- **Connection ID is permanent** in the sense that everything binds to it; renaming is cheap, deleting cascades to all Operations.
- **Operation `name` changes break workflows.** The `system_integration_v1` handler stores the operation UUID, so renaming is safe at the API level — but the workflow builder UI displays the name; team confusion follows.
- **Mustache only.** No Kinetic-specific extensions. An asterisk inside `{{Name*}}` is literal, not "required."
- **Test the Connection first.** Don't create five Operations against a broken Connection.
