<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/task.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Trees API Reference

Source: Kinetic Task REST API v2.0

### `POST /categories/{name}/routines`
**Operation:** `addCategoryRoutine`
Routine Categorization Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the category  |

**Request body (required):** The content for the routine properties


**Success response:** 200

---

### `DELETE /categories/{name}/routines/{definitionId}`
**Operation:** `removeCategoryRoutine`
Routine Categorization Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the category  |
| `definitionId` (string) | path | Yes | The definitionId of the handler  |

**Success response:** 200

---

### `GET /trees`
**Operation:** `searchTrees`
Tree Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `source` (string) | query | No | Optional name of the source the trees belong to.  |
| `group` (string) | query | No | Optional group the trees belong to (exact match)  |
| `group[]` (array) | query | No | Optional combination of groups the trees belong to (exact match)  |
| `groupFragment` (string) | query | No | Optional group the trees belong to (matches any part of the source group - like match)  |
| `name` (string) | query | No | Optional name of the trees (exact match)  |
| `nameFragment` (string) | query | No | Optional name of the trees (matches any part of the tree name - like match)  |
| `ownerEmail` (string) | query | No | Optional the process owner's email address.  |
| `status` (string) | query | No | Optional status of trees.  |
| `type` (string) | query | No | Optional type of tree / routine to retrieve.  |
| `limit` (integer) | query | No | Limit the number of results to the specified value.  |
| `offset` (integer) | query | No | The row number of the first record to retrieve.  |
| `orderBy` (string) | query | No | Name of the field to order the results by. By default, the results are sorted ascending by the following combination of fields - `Source Name`, `Source Group`, `Name`.  |
| `direction` (string) | query | No | Direction to order the results, ascending (ASC) or descending (DESC). Must also include the *orderBy* parameter when using this parameter.  |
| `include` (array) | query | No | comma-separated list of additional properties to include in the response  |

**Success response:** 200

---

### `POST /trees`
**Operation:** `createTree`
Tree Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `force` (boolean) | query | No | when true, indicates an existing tree should be overwritten with the content being uploaded.  |

**Request body (required):** The content for the tree properties


**Success response:** 200

---

### `GET /trees/{definitionId}/usage`
**Operation:** `getRoutineUsage`
Routine Usage Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `definitionId` (string) | path | Yes | The definitionId of the routine to show usage.  |

**Success response:** 200

---

### `GET /trees/{title}`
**Operation:** `retrieveTree`
Tree Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `title` (string) | path | Yes | The title of the tree, which includes the Source name, the Source group, and the Tree name.  |
| `include` (array) | query | No | comma-separated list of additional properties to include in the response  |

**Success response:** 200

---

### `PUT /trees/{title}`
**Operation:** `updateTree`
Tree Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `title` (string) | path | Yes | The title of the tree, which includes the Source name, the Source group, and the Tree name.  |
| `include` (array) | query | No | comma-separated list of additional properties to include in the response  |

**Request body (required):** The content for the tree properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /trees/{title}`
**Operation:** `deleteTree`
Tree Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `title` (string) | path | Yes | The title of the tree, which includes the Source name, the Source group, and the Tree name.  |
| `include` (array) | query | No | comma-separated list of additional properties to include in the response  |

**Success response:** 200

---

### `POST /trees/{title}/clone`
**Operation:** `cloneTree`
Tree Clone

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `title` (string) | path | Yes | The title of the tree, which includes the Source name, the Source group, and the Tree name.  |

**Request body (required):** The properties for the cloned tree.


**Success response:** 200

---

### `GET /trees/{title}/counts`
**Operation:** `getTreeCounts`
Tree Metrics Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `title` (string) | path | Yes | The title of the tree, which includes the Source name, the Source group, and the Tree name.  |

**Success response:** 200

---

### `GET /trees/{title}/export`
**Operation:** `exportTree`
Tree Export

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `title` (string) | path | Yes | The title of the tree, which includes the Source name, the Source group, and the Tree name.  |

**Success response:** 200

---

### `POST /trees/{title}/restore`
**Operation:** `restoreTree`
Tree Restore

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `title` (string) | path | Yes | The title of the tree, which includes the Source name, the Source group, and the Tree name.  |

**Success response:** 200

---

### `GET /trees/missing`
**Operation:** `listMissingTrees`
Missing Routine List

**Success response:** 200

---
