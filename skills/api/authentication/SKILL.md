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
Location: ...#access_token=<TOKEN>&token_type=bearer&expires_in=43200
```

### Using the Token

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "https://myspace.kinops.io/app/components/integrator/app/api/v1/connections"
```

### Token Lifecycle
- Default expiry: 43,200 seconds (12 hours)
- Cache the token and check expiry before each request
- Re-acquire when expired (subtract 30 seconds as a safety buffer)

## Base URL Patterns

### Cloud Deployments
```
Core:       https://<space-slug>.kinops.io/app/api/v1
Task:       https://<space-slug>.kinops.io/app/components/task/app/api/v2
Integrator: https://<space-slug>.kinops.io/app/components/integrator/app/api/v1
```

### Self-Hosted Deployments
```
Core:       https://<server>/kinetic/<space-slug>/app/api/v1
Task:       https://<server>/kinetic/<space-slug>/app/components/task/app/api/v2
Integrator: https://<server>/kinetic/<space-slug>/app/components/integrator/app/api/v1
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
