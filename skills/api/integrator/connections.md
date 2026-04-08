<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/integrator.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Connections API Reference

Source: Kinetic Integrator REST API v6.1.7

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

### `GET /api/connections/{connection_id}/operations`
**Operation:** `IntegratorWeb.OperationController.index`
Retrieve operations

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `connection_id` (string) | path | Yes | Connection Id |

**Success response:** 200

---

### `POST /api/connections/{connection_id}/operations`
**Operation:** `IntegratorWeb.OperationController.create`
Create an operation

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `connection_id` (string) | path | Yes | Connection Id |

**Request body:** Operation params

**Success response:** 200

---

### `GET /api/connections/{connection_id}/operations/{id}`
**Operation:** `IntegratorWeb.OperationController.show`
Show operation

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `connection_id` (string) | path | Yes | Connection Id |
| `id` (string) | path | Yes | Operation Id |

**Success response:** 200

---

### `PUT /api/connections/{connection_id}/operations/{id}`
**Operation:** `IntegratorWeb.OperationController.update`
Update an operation

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `connection_id` (string) | path | Yes | Connection Id |
| `id` (string) | path | Yes | Operation Id |

**Request body (required):** Operation params

**Success response:** 200

---

### `PATCH /api/connections/{connection_id}/operations/{id}`
**Operation:** `IntegratorWeb.OperationController.update (2)`
Update an operation

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `connection_id` (string) | path | Yes | Connection Id |
| `id` (string) | path | Yes | Operation Id |

**Request body (required):** Operation params

**Success response:** 200

---

### `DELETE /api/connections/{connection_id}/operations/{id}`
**Operation:** `IntegratorWeb.OperationController.delete`
Delete an operation

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (string) | path | Yes | Operation Id |
| `connection_id` (string) | path | Yes | Connection Id |

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

### `POST /api/import/connections/{connection_id}/operations`
**Operation:** `IntegratorWeb.ImportController.import_operations`
Import operations

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `connection_id` (string) | path | Yes | Connection ID |
| `force` (boolean) | query | No | Whether to force an overwrite to an existing operation with the same ID |

**Request body:** Operations

**Success response:** 200

---
