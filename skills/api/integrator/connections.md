<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/integrator.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Connections API Reference

Source: Kinetic Integrator REST API v6.1.7

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

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
