<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Kapps API Reference

Source: Kinetic Core REST API v6.1

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

### `POST /integrations/kapps/{kappSlug}/{name}`
**Operation:** `executeKappIntegration`
Kapp Integration Execute

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the integration |

**Request body (required):** The input mapping parameter values to send to the integration


**Success response:** 200

---

### `GET /kapps`
**Operation:** `listKapps`
Kapp Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categories * categorizations * ca… |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'. |
| `limit` (integer) | query | No | Limit the number of results returned. If not provided, the server will return the default, maximum limit of `1000` results. **DEPRECATION NOTICE:** Pagination functionality was introduced in versio… |
| `orderBy` (string) | query | No | A comma separated list of any of the following kapp properties to order (sort) results by * `createdAt` * `updatedAt` * `name` * `slug` * `status` * `attributes[Attribute Name]` |
| `direction` (string) | query | No | The direction the results should be ordered by, either ascending or descending. |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page or results. |
| `q` (string) | query | No | Search qualification parameter used to find kapps within the system. #### Common Example Queries * `q=name =* "Catalog"` Returns all Kapps that have a name that begins with "Catalog". #### Operator… |

**Success response:** 200

---

### `POST /kapps`
**Operation:** `createKapp`
Kapp Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categories * categorizations * ca… |

**Request body (required):** The content for the kapp properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}`
**Operation:** `retrieveKapp`
Kapp Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categories * categorizations * ca… |
| `export` (boolean) | query | No | flag indicating the API should export all child components of the kapp. |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}`
**Operation:** `updateKapp`
Kapp Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categories * categorizations * ca… |

**Request body (required):** The content for the kapp properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}`
**Operation:** `deleteKapp`
Kapp Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categories * categorizations * ca… |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/categorizations`
**Operation:** `listCategorizations`
Categorization List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * category * form * category.{any category include property} * form.{any form include property} |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/categorizations`
**Operation:** `createCategorization`
Categorization Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * category * form * category.{any category include property} * form.{any form include property} |

**Request body (required):** The content for the categorization properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/categorizations/{categorizationName}`
**Operation:** `retrieveCategorization`
Categorization Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `categorizationName` (string) | path | Yes | Combination of the Category and Form slugs, separated by an underscore. **`category.slug_form.slug`** **`foo_bar`** |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * category * form * category.{any category include property} * form.{any form include property} |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/categorizations/{categorizationName}`
**Operation:** `updateCategorization`
Categorization Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `categorizationName` (string) | path | Yes | Combination of the Category and Form slugs, separated by an underscore. **`category.slug_form.slug`** **`foo_bar`** |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * category * form * category.{any category include property} * form.{any form include property} |

**Request body (required):** The content for the categorization properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/categorizations/{categorizationName}`
**Operation:** `deleteCategorization`
Categorization Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `categorizationName` (string) | path | Yes | Combination of the Category and Form slugs, separated by an underscore. **`category.slug_form.slug`** **`foo_bar`** |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * category * form * category.{any category include property} * form.{any form include property} |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/formTypes`
**Operation:** `listKappFormTypes`
Form Type List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * kapp * kapp.{any kapp include property} |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/formTypes`
**Operation:** `createKappFormType`
Form Type Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * kapp * kapp.{any kapp include property} |

**Request body (required):** The content for the form type properties.


**Success response:** 200

---

### `GET /kapps/{kappSlug}/formTypes/{name}`
**Operation:** `retrieveKappFormType`
Form Type Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the form type |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * kapp * kapp.{any kapp include property} |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/formTypes/{name}`
**Operation:** `updateKappFormType`
Form Type Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the form type |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * kapp * kapp.{any kapp include property} |

**Request body (required):** The content for the form type properties.

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/formTypes/{name}`
**Operation:** `deleteKappFormType`
Form Type Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the form type |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * kapp * kapp.{any kapp include property} |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/integrations`
**Operation:** `listKappIntegrations`
Kapp Integrations List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * securityPolicies |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/integrations`
**Operation:** `createKappIntegration`
Kapp Integration Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * securityPolicies |

**Request body (required):** The content for the integration properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/integrations/{name}`
**Operation:** `getKappIntegration`
Kapp Integration Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the integration |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * securityPolicies |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/integrations/{name}`
**Operation:** `updateKappIntegration`
Kapp Integration Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the integration |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * securityPolicies |

**Request body (required):** The content for the integration properties


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/integrations/{name}`
**Operation:** `deleteKappIntegration`
Kapp Integration Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the integration |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * securityPolicies |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/webApiImport`
**Operation:** `importKappWebAPI`
Kapp WebAPI Import

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * securityPolicies |
| `force` (boolean) | query | No | Force the overwrite of an existing web API on import |

**Request body (required):** The content for the webapi properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/webhookJobs`
**Operation:** `listKappWebhookJobs`
Kapp Webhook Job Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details |
| `all` (boolean) | query | No | Indicates all webhook jobs that exist within the Space should be retrieved. |
| `status` (string) | query | No | Filter the webhook jobs to optionally display only records that are failed or queued. |
| `webhook` (string) | query | No | Name of the webhook to search for. |
| `parentType` (string) | query | No | The Parent object type. |
| `parentKey` (string) | query | No | The unique key value for the specified record. The value will depend on the parentType selected. * If parentKey is `Form`, then key should be the value of the form slug * If parentKey is `Submissio… |
| `limit` (integer) | query | No | Limit the number of results returned. If not provided, the server will limit the results to 25 jobs. |
| `pageToken` (string) | query | No | The token to get the next page of results. This value is set using the nextPageToken value returned by a search with the same query to get the next page or results. |
| `start` (string) | query | No | Inclusive starting date/time boundary for when the job was scheduled at. Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'` |
| `end` (string) | query | No | Exclusive ending date/time boundary for when the job was scheduled at. Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'` |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/webhookJobs`
**Operation:** `createKappWebhookJob`
Kapp Webhook Job Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details |

**Request body (required):** The content for the webhook job properties.


**Success response:** 200

---

### `GET /kapps/{kappSlug}/webhookJobs/{id}`
**Operation:** `retrieveKappWebhookJob`
Kapp Webhook Job Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `id` (string) | path | Yes | The id of the webhook job |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/webhookJobs/{id}`
**Operation:** `updateKappWebhookJob`
Kapp Webhook Job Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `id` (string) | path | Yes | The id of the webhook job |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details |

**Request body (required):** The content for the webhook job properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/webhookJobs/{id}`
**Operation:** `deleteKappWebhookJob`
Kapp Webhook Job Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `id` (string) | path | Yes | The id of the webhook job |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/workflows`
**Operation:** `retrieveKappWorkflows`
Kapp Workflows Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/workflows`
**Operation:** `createKappWorkflow`
Kapp Workflow Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `force` (boolean) | query | No | Force the overwrite of an existing workflow on import |

**Request body (required):** The content for the workflow properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/workflows/{id}`
**Operation:** `retrieveKappWorkflow`
Kapp Workflow Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `id` (string) | path | Yes | The id of the workflow |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/workflows/{id}`
**Operation:** `updateKappWorkflow`
Kapp Workflow Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `id` (string) | path | Yes | The id of the workflow |

**Request body (required):** The content for the workflow properties to update


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/workflows/{id}`
**Operation:** `deleteKappWorkflow`
Kapp Workflow Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `id` (string) | path | Yes | The id of the workflow |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/workflows/repair`
**Operation:** `repairKappWorkflow`
Kapp Workflow Repair

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |

**Success response:** 200

---
