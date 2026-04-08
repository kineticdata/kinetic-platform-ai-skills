<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/task.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Runs API Reference

Source: Kinetic Task REST API v2.0

### `GET /runs`
**Operation:** `searchRuns`
Run Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `count` (boolean) | query | No | Optional parameter. When not present, both the records and count that match the criteria will be returned. When present and set to "true", suppress the records and only return the count that matches the criteria. When present and set to "false", suppress the count and return the records that match the query along with the *more* property to indicate if more records match the criteria.  |
| `id` (integer) | query | No | Optional Id of the run to search for. If this parameter is used, all others are ignored.  |
| `afterId` (integer) | query | No | Optional, search for runs that have an Id greater than this value.  |
| `beforeId` (integer) | query | No | Optional, search for runs that have an Id less than this value.  |
| `start` (string) | query | No | UTC formatted timestamp to use as the starting date for the `createdAt` field. This value is inclusive in the results (>=).      Format: `yyyy-MM-dd`         Example: 2017-07-27      Format: `yyyy-MM-dd'T'HH:mm:ssZ`         Example: 2017-07-27T15:00:00Z  |
| `end` (string) | query | No | UTC formatted timestamp to use as the ending date for the `createdAt` field. This value is excluded in the results (<).      Format: `yyyy-MM-dd`         Example: 2017-07-27      Format: `yyyy-MM-dd'T'HH:mm:ssZ`         Example: 2017-07-27T15:00:00Z  |
| `includeSystem` (string) | query | No | Optional whether to include system runs (Source: Kinetic Task). Ignored if the *source* parameter is also provided.  |
| `source` (string) | query | No | Optional name of the source the runs belong to.  |
| `sourceId` (string) | query | No | Optional sourceId  |
| `group` (string) | query | No | Optional source group (exact match)  |
| `groupFragment` (string) | query | No | Optional source group (matches any part of the source group - like match)  |
| `tree` (string) | query | No | Optional tree name (exact match)  |
| `treeFragment` (string) | query | No | Optional tree name (matches any part of the tree name - like match)  |
| `originatingId` (integer) | query | No | Optional Id of the originating run.  |
| `parentId` (integer) | query | No | Optional Id of the parent run.  |
| `status` (string) | query | No | Optional status of the runs.  |
| `treeId` (integer) | query | No | Optional Id of the tree.  |
| `treeType` (string) | query | No | Optional runs that belong to the specified type of tree / routine.  |
| `limit` (integer) | query | No | Number of results to limit the search to. Ignored if the `count` parameter is also provided.  |
| `offset` (integer) | query | No | Offset beginning for paginated results. Ignored if the `count` parameter is also provided.  |
| `orderBy` (string) | query | No | Name of the field to order the results by. By default, the results are sorted descending by the `id` field.  |
| `include` (array) | query | No |  |

**Success response:** 200

---

### `POST /runs`
**Operation:** `createRun`
Run Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `sourceName` (string) | query | Yes | Name of the source the tree belongs to  |
| `sourceGroup` (string) | query | Yes | Name of the source group the tree belongs to  |
| `name` (string) | query | Yes | Name of the tree  |
| `include` (array) | query | No |  |

**Request body (required):** The content for the run properties


**Success response:** 200

---

### `GET /runs/{id}`
**Operation:** `retrieveRun`
Run Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | The id of the run  |
| `include` (array) | query | No |  |

**Success response:** 200

---

### `PUT /runs/{id}`
**Operation:** `updateRun`
Run Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | The id of the run  |
| `include` (array) | query | No |  |

**Request body (required):** The content for the run properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /runs/{id}`
**Operation:** `deleteRun`
Run Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | The id of the run  |
| `include` (array) | query | No |  |

**Success response:** 200

---

### `GET /runs/{id}/tasks`
**Operation:** `retrieveRunTasks`
Run Task List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | The id of the run  |
| `include` (array) | query | No |  |

**Success response:** 200

---

### `GET /runs/{id}/tasks/{taskId}`
**Operation:** `retrieveRunTask`
Run Task Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | The id of the run  |
| `taskId` (integer) | path | Yes | The id of the task  |
| `include` (array) | query | No |  |

**Success response:** 200

---

### `PUT /runs/{id}/tasks/{taskId}`
**Operation:** `updateRunTask`
Run Task Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | The id of the run  |
| `taskId` (integer) | path | Yes | The id of the task  |

**Request body (required):** The content for the task properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `POST /runs/{id}/triggers`
**Operation:** `createRootTrigger`
Root Node Trigger Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `id` (integer) | path | Yes | The id of the run  |

**Request body (required):** The content for the root trigger properties


**Success response:** 200

---

### `POST /runs/task/{token}`
**Operation:** `completeDeferredTask`
Deferred Task Complete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `token` (string) | path | Yes | The token that identifies the deferred task. |

**Request body (required):** The content to complete the task


**Success response:** 200

---

### `PUT /runs/task/{token}`
**Operation:** `updateDeferredTask`
Deferred Task Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `token` (string) | path | Yes | The token that identifies the deferred task. |

**Request body (required):** The content to update the task


**Success response:** 200

---
