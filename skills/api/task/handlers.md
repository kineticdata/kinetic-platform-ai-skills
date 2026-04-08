<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/task.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Handlers API Reference

Source: Kinetic Task REST API v2.0

### `POST /categories/{name}/handlers`
**Operation:** `addCategoryHandler`
Handler Categorization Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the category  |

**Request body (required):** The content for the handler properties


**Success response:** 200

---

### `DELETE /categories/{name}/handlers/{definitionId}`
**Operation:** `removeCategoryHandler`
Handler Categorization Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the category  |
| `definitionId` (string) | path | Yes | The definitionId of the handler  |

**Success response:** 200

---

### `GET /handlers`
**Operation:** `listHandlers`
Handler List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (array) | query | No |  |
| `system` (boolean) | query | No |  |

**Success response:** 200

---

### `POST /handlers`
**Operation:** `uploadHandler`
Handler Import

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `force` (boolean) | query | No | when true, indicates an existing task handler should be overwritten with the package being uploaded.  |

**Request body (required):** The content for the handler properties


**Success response:** 200

---

### `GET /handlers/{definitionId}`
**Operation:** `retrieveHandler`
Handler Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `definitionId` (string) | path | Yes | The definitionId of the handler  |
| `include` (array) | query | No |  |

**Success response:** 200

---

### `PUT /handlers/{definitionId}`
**Operation:** `updateHandler`
Handler Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `definitionId` (string) | path | Yes | The definitionId of the handler  |
| `include` (array) | query | No |  |

**Request body (required):** The content for the handler properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /handlers/{definitionId}`
**Operation:** `deleteHandler`
Handler Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `definitionId` (string) | path | Yes | The definitionId of the handler  |
| `include` (array) | query | No |  |

**Success response:** 200

---

### `GET /handlers/{definitionId}/durations`
**Operation:** `retrieveHandlerDurations`
Handler Metrics Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `definitionId` (string) | path | Yes | The definitionId of the handler  |

**Success response:** 200

---

### `GET /handlers/missing`
**Operation:** `listMissingHandlers`
Missing Handler List

**Success response:** 200

---
