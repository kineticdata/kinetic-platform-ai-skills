---
name: integrator
description: "Use when you need the endpoint shape for the Kinetic Integrator REST API — connection CRUD, operation CRUD, connection test/restart, connection import/export. The Integrator API lives at /app/integrator/api and requires OAuth 2.0 bearer tokens (NOT Basic Auth). For Connection/Operation modeling, auth setup, and worked examples, read the `concepts/integrations` skill."
---

# Integrator API — Endpoint Reference Index

The files in this directory are **auto-generated from the OpenAPI spec** (`oas/integrator.json`). The Integrator API is **separate** from the Core API:

- **Base path:** `{server}/app/integrator/api` (NOT `/app/api/v1/...`)
- **Auth:** OAuth 2.0 implicit grant — Basic Auth is rejected. See `api/authentication` for the redirect-following token-extraction pattern.

## Files

| File | Resources covered |
|------|-------------------|
| [`connections.md`](connections.md) | Connection CRUD, test, restart, import/export. **Includes the critical credential-wipe warning — read it before any PUT/PATCH.** |
| [`operations.md`](operations.md) | Operation CRUD under a connection — define reusable, parameterized API calls |

## ⚠ The credential-wipe rule

Connection auth credentials (passwords, API keys, OAuth secrets) are **masked as `null` on GET**. A naive read-modify-write via `PUT /api/connections/{id}` overwrites the real credentials with `null` permanently with no recovery. **Always patch a strict allowlist of fields you intend to change.** See `connections.md` for the full warning and the safe-update pattern.

## When to read which skill

- **"What endpoints exist?"** → this directory.
- **"How do I set up a Connection and an Operation?"** → `concepts/integrations` and `recipes/connect-external-system`.
- **"How do I authenticate to the Integrator?"** → `api/authentication`.
- **"How do I call an Operation from a workflow?"** → `concepts/workflow-xml` (`system_integration_v1` handler).
- **"How do I call an Operation from a form?"** → `concepts/form-events-expressions` (form-level integrations).
