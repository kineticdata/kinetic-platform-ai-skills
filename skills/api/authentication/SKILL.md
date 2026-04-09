---
name: authentication
description: Authentication patterns for Core, Integrator, and Task APIs — Basic Auth, OAuth 2.0, CSRF tokens, and self-signed certificate handling.
---

# Authentication

## Overview

The Kinetic Platform has three API surfaces, all proxied through the Core server. Authentication varies by surface.

| API | Primary Auth | When to Use |
|-----|-------------|-------------|
| Core API v1 | HTTP Basic Auth | Forms, submissions, kapps, users, teams, spaces, webhooks, WebAPIs |
| Task API v2 | HTTP Basic Auth | Workflow runs, nodes, trees, handlers, engine operations |
| Integrator API | OAuth 2.0 Bearer Token | Connections, operations, agents |

## SAML SSO

The platform supports SAML SSO for enterprise authentication. SSO is configured via a `security.space-slug.properties` file on hosted environments — **this cannot be done via the API**; customers must contact Kinetic Support with their SAML identity provider details. See [docs.kineticdata.com](https://docs.kineticdata.com/docs/how-to-configure-saml-authentication-for-a-hosted-environment).

**Basic Auth is always available** — SSO does not disable it. API integrations can continue to use Basic Auth even when SSO is enabled for browser users.

## Core API & Task API — HTTP Basic Auth

Both Core and Task APIs use HTTP Basic Authentication.

### Request Header

```
Authorization: Basic <base64(username:password)>
```

### Example

```bash
# Core API — list kapps
curl -u "admin:password" \
  "https://myspace.kinops.io/app/api/v1/kapps"

# Task API — list runs
curl -u "admin:password" \
  "https://myspace.kinops.io/app/components/task/app/api/v2/runs"
```

### Verifying Credentials

```bash
# The /me endpoint returns the authenticated user's profile
curl -u "admin:password" \
  "https://myspace.kinops.io/app/api/v1/me"
```

Response:
```json
{
  "username": "admin",
  "displayName": "Admin User",
  "email": "admin@example.com",
  "enabled": true,
  "spaceAdmin": true
}
```

**Gotcha:** The `/me` response is flat — `me.username`, NOT `me.user.username`.

## Integrator API — OAuth 2.0

The Integrator API uses OAuth 2.0 implicit grant flow to obtain bearer tokens.

### Token Acquisition

```bash
# Step 1: Request token via implicit grant
curl -u "admin:password" \
  -X GET \
  --max-redirs 0 \
  "https://myspace.kinops.io/app/oauth/authorize?grant_type=implicit&response_type=token&client_id=system"
```

The server responds with a `302 redirect` containing the token in the URL fragment:
```
Location: https://myspace.kinops.io/app/oauth/callback#access_token=<JWT>&token_type=bearer&expires_in=43200&scope=full_access&spaceSlug=demo&displayName=...&iss=kinetic-data&spaceAdmin=true&email=...&username=...
```

**Fragment parameters returned:**

| Parameter | Example Value | Description |
|-----------|---------------|-------------|
| `access_token` | JWT token (~350 chars) | The Bearer token for API calls |
| `token_type` | `bearer` | Always `bearer` |
| `expires_in` | `43200` | Token TTL in seconds (12 hours) |
| `scope` | `full_access` | Granted scope |
| `spaceSlug` | `demo` | Space the token is scoped to |
| `displayName` | `James Davies` | User's display name |
| `iss` | `kinetic-data` | JWT issuer |
| `spaceAdmin` | `true` | Whether user is space admin |
| `email` | `user@example.com` | User's email |
| `username` | `user@example.com` | Authenticated username |

**The token is a HS256 JWT** with this payload structure:
```json
{
  "clientId": "system",
  "displayName": "James Davies",
  "email": "user@example.com",
  "exp": 1775658800,
  "iss": "kinetic-data",
  "spaceAdmin": true,
  "spaceSlug": "demo",
  "username": "user@example.com"
}
```

**Gotcha — `client_id` validation:** Using an invalid `client_id` (anything other than `system` or `kinetic-bundle`) returns HTTP 401. The `system` client is always available.

**Gotcha — Basic Auth rejected:** The Integrator API rejects Basic Auth with `{"message": "Authorization header must contain a bearer token"}`. OAuth Bearer tokens are mandatory.

### Using the Token

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "https://myspace.kinops.io/app/integrator/api/connections"
```

### Token Lifecycle
- Default expiry: 43,200 seconds (12 hours)
- Cache the token and check expiry before each request
- Re-acquire when expired (subtract 30 seconds as a safety buffer)
- The JWT `exp` claim contains the expiry as a Unix timestamp

## Base URL Patterns

### Cloud Deployments
```
Core:       https://<space-slug>.kinops.io/app/api/v1
Task:       https://<space-slug>.kinops.io/app/components/task/app/api/v2
Integrator: https://<space-slug>.kinops.io/app/integrator/api
```

### Self-Hosted Deployments
```
Core:       https://<server>/kinetic/<space-slug>/app/api/v1
Task:       https://<server>/kinetic/<space-slug>/app/components/task/app/api/v2
Integrator: https://<server>/kinetic/<space-slug>/app/integrator/api
```

## Self-Signed Certificates

In development or air-gapped environments, the platform may use self-signed SSL certificates. When using the MCP server, set:

```bash
KINETIC_ALLOW_SELF_SIGNED=true
```

When making direct API calls from Node.js:
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
```

**Warning:** Only use this in development or trusted network environments. Never disable certificate verification in production against untrusted networks.

## CSRF Tokens

When making API calls from a browser context (e.g., inside a React portal using `@kineticdata/react`), the SDK handles CSRF tokens automatically via `KineticLib`. If making raw `fetch` calls from the browser:

```javascript
import { bundle } from '@kineticdata/react';

fetch(`${bundle.apiLocation()}/submissions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': bundle.csrfToken(),
  },
  body: JSON.stringify({ values: { "Field Name": "value" } }),
});
```

**Gotcha:** CSRF tokens are only required for browser-originated requests. Server-side API calls (curl, MCP server, scripts) use Basic Auth or Bearer tokens and do not need CSRF.
