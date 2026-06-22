<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually below this line. -->
<!-- Source: oas/integrator.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Connections API Reference

Source: Kinetic Integrator REST API v6.1.7

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

> ## ⚠️ NEVER PUT/PATCH credentials on an existing connection
>
> The connection `properties` object stores authentication credentials (passwords, API keys, OAuth secrets). **GET responses return these fields masked as `null`.** If you read a connection, modify any field, and write the whole object back via `PUT /api/connections/{id}` or `PATCH /api/connections/{id}`, the masked-as-`null` values **overwrite the real credentials permanently** with no way to recover them. The connection will start failing authentication and the original secrets are gone.
>
> **Safe-update rule:**
> 1. Always PATCH a strict allowlist of fields you intend to change (`name`, `status`, non-secret properties).
> 2. **Never** send `properties` containing credential keys back unless you are deliberately rotating them with the real new values.
> 3. To rotate credentials, set only the credential keys you are rotating — do not round-trip the GET body.
>
> This is the single most destructive operation in the Integrator API. See the **Integrations** concept skill for the full pattern.

### `GET /api/connections`
**Operation:** `IntegratorWeb.ConnectionController.index`
Retrieve connections

**Success response:** 200

---

### `POST /api/connections`
**Operation:** `IntegratorWeb.ConnectionController.create`
Create a connection

**Request body:** Connection params

**Success response:** 200

---

### `GET /api/connections/{id}`
**Operation:** `IntegratorWeb.ConnectionController.show`
Show connection

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Connection ID |

**Success response:** 200

---

### `PUT /api/connections/{id}`
**Operation:** `IntegratorWeb.ConnectionController.update`
Update a connection

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Connection Id |

**Request body (required):** Connection params

**Success response:** 200

---

### `PATCH /api/connections/{id}`
**Operation:** `IntegratorWeb.ConnectionController.update (2)`
Update a connection

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Connection Id |

**Request body (required):** Connection params

**Success response:** 200

---

### `DELETE /api/connections/{id}`
**Operation:** `IntegratorWeb.ConnectionController.delete`
Delete a connection

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Connection Id |

**Success response:** 200

---

### `POST /api/connections/{id}/restart`
**Operation:** `IntegratorWeb.ConnectionController.restart`
Restart connection

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Connection ID |

**Success response:** 200

---

### `POST /api/connections/{id}/test`
**Operation:** `IntegratorWeb.TestController.test_saved_connection`
Test saved connection

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Connection ID |

**Request body:** Connection params

**Success response:** 200

---

### `GET /api/export/connections/{id}`
**Operation:** `IntegratorWeb.ExportController.export`
Export a connection and operations

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Connection ID |

**Success response:** 200

---

### `POST /api/import/connections`
**Operation:** `IntegratorWeb.ImportController.import_connection`
Import a connection

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `force` (boolean) | query | No | Whether to force an overwrite to an existing connection with the same ID |

**Request body:** Connection params

**Success response:** 200

---
