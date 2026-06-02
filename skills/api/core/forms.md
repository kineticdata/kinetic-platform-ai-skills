<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Forms API Reference

Source: Kinetic Core REST API v6.1

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

### `POST /integrations/kapps/{kappSlug}/forms/{formSlug}/{name}`
**Operation:** `executeFormIntegration`
Form Integration Execute

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `name` (string) | path | Yes | The name of the integration |

**Request body (required):** The input mapping parameter values to send to the integration


**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms`
**Operation:** `listForms`
Form Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * versionId * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * bridgedResources * ca… |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'. |
| `archived` (boolean) | query | No | Flag indicating the API should return archived (i.e. deleted) forms. **The user must be a space admin to perform this action.** |
| `slug` (string) | query | No | When specified, will filter out archived forms that don't match the provided slug. **Only valid when the `archived` parameter is set to `true`.** |
| `start` (string) | query | No | Inclusive starting date/time boundary for when the form was archived (i.e. deleted). Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'` **Only valid when the `archived` parameter i… |
| `end` (string) | query | No | Exclusive ending date/time boundary for when the form was archived (i.e. deleted). Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'` **Only valid when the `archived` parameter is … |
| `limit` (integer) | query | No | Limit the number of results returned. If not provided, the server will return the default, maximum limit of `1000` results. **DEPRECATION NOTICE:** Pagination functionality was introduced in versio… |
| `orderBy` (string) | query | No | A comma separated list of any of the following form properties to order (sort) results by * `createdAt` * `updatedAt` * `name` * `slug` * `status` * `type` * `attributes[Attribute Name]` |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page or results. |
| `direction` (string) | query | No | The direction the results should be ordered by, either ascending or descending. |
| `q` (string) | query | No | Search qualification parameter used to find forms within the system. #### Common Example Queries * `q=status = "Active"` Returns all active forms in the kapp. * `q=status = "Active" AND type = "App… |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms`
**Operation:** `createForm`
Form Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * versionId * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * bridgedResources * ca… |

**Request body (required):** The content for the form properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}`
**Operation:** `retrieveForm`
Form Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * versionId * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * bridgedResources * ca… |
| `export` (boolean) | query | No | flag indicating the API should export all child components of the form. |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/forms/{formSlug}`
**Operation:** `updateForm`
Form Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * versionId * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * bridgedResources * ca… |
| `restorationToken` (string) | query | No | The `restorationToken` property returned by the *Search Forms* action and setting the `archived` parameter. Functions similarly to the regular *Update Form* action, except for archived (deleted) fo… |

**Request body (required):** The content for the form properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/forms/{formSlug}`
**Operation:** `deleteForm`
Form Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * versionId * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * bridgedResources * ca… |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}/workflows`
**Operation:** `retrieveFormWorkflows`
Form Workflows Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/workflows`
**Operation:** `createFormWorkflow`
Form Workflow Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `force` (boolean) | query | No | Force the overwrite of an existing workflow on import |

**Request body (required):** The content for the workflow properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}/workflows/{id}`
**Operation:** `retrieveFormWorkflow`
Form Workflow Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `id` (string) | path | Yes | The id of the workflow |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/forms/{formSlug}/workflows/{id}`
**Operation:** `updateFormWorkflow`
Form Workflow Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `id` (string) | path | Yes | The id of the workflow |

**Request body (required):** The content for the workflow properties to update


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/forms/{formSlug}/workflows/{id}`
**Operation:** `deleteFormWorkflow`
Form Workflow Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |
| `id` (string) | path | Yes | The id of the workflow |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/workflows/repair`
**Operation:** `repairFormWorkflow`
Form Workflow Repair

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `formSlug` (string) | path | Yes | The slug of the form |

**Success response:** 200

---
