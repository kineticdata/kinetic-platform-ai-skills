<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/integrator.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Operations API Reference

Source: Kinetic Integrator REST API v6.1.7

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

### `POST /api/operations-search`
**Operation:** `IntegratorWeb.OperationController.search`
Search operations

**Request body:** Operation params

**Success response:** 200

---
