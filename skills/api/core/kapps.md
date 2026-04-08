<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Kapps API Reference

Source: Kinetic Core REST API v6.1

### `POST /integrations/kapps/{kappSlug}/{name}`
**Operation:** `executeKappIntegration`
Kapp Integration Execute

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the integration  |

**Request body (required):** The input mapping parameter values to send to the integration


**Success response:** 200

---

### `POST /integrations/kapps/{kappSlug}/forms/{formSlug}/{name}`
**Operation:** `executeFormIntegration`
Form Integration Execute

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `name` (string) | path | Yes | The name of the integration  |

**Request body (required):** The input mapping parameter values to send to the integration


**Success response:** 200

---

### `GET /kapps`
**Operation:** `listKapps`
Kapp Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categories  * categorizations  * categoryAttributeDefinitions  * formAttributeDefinitions  * formAttributeDefinitions  * integrations  * kappAttributeDefinitions  * securityPolicyDefinitions  * securityPolicies  * webhooks  * space  * space.{any space include property}  |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'.  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will return the default, maximum limit of `1000` results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don't provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.  |
| `orderBy` (string) | query | No | A comma separated list of any of the following kapp properties to order (sort) results by  * `createdAt`  * `updatedAt`  * `name`  * `slug`  * `status`  * `attributes[Attribute Name]`  |
| `direction` (string) | query | No | The direction the results should be ordered by, either ascending or descending.  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page or results.  |
| `q` (string) | query | No | Search qualification parameter used to find kapps within the system.   #### Common Example Queries  * `q=name =* "Catalog"`      Returns all Kapps that have a name that begins with "Catalog".   #### Operators:  * `BETWEEN`      left side is between two values - first value is inclusive, second value is exclusive  * `IN`      left side is equal to one of provided items  * `=`      equal  * `=*`      starts with  * `*=*`      contains  * `>`      greater than  * `>=`      greater than or equal  * `<`      less than  * `<=`      less than or equal  * `AND`      Returns boolean true if and only if both expressions are true  * `OR`      Returns boolean true if at least one expression is true   #### Queryable Properties  ##### The following properties can be used within a search with the `=`, `IN`, `=*` (starts with), `*=*` (contains), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators.  * `createdAt`                         (The ISO 8601 time that when the kapp was created)      *Example:*                        `q=createdAt BETWEEN ("2018-04-16T18:42:56.000Z","2019-04-16T18:42:56.000Z")`  * `name`                              (Name of the kapp)      *Example:*                        `q=name="HR Approval"`  * `slug`                              (Slug of the kapp)      *Example:*                        `q=slug="hr-approval"`  * `updatedAt`                         (The ISO 8601 time that when the kapp was last updated)      *Example:*                        `q=updatedAt >= "2018-04-16T18:42:56.000Z"`  * `attributes[Attribute Name]`        (Attribute Value of a kapp)      *Example:*                        `q=attributes[Icon]="fa-comment"`   #### Pagination  The system will paginate search results based on the `limit` parameter.  If there are more results than the `limit` parameter (or more than 1000 results if the limit parameter is not provided), a `nextPageToken` will be included in the response.  The `nextPageToken` value can be passed as the `pageToken` parameter in subsequent queries to obtain the next page of results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don't provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.  Example Response with a next page token:  ```javascript {   "kapps": [{...}, {...}],   "nextPageToken": "YWJib3R0LmRldmFuQHRoaWVsLm9yZw.4wg2me95blthjyzdvkfs56oc3" } ```  |

**Success response:** 200

---

### `POST /kapps`
**Operation:** `createKapp`
Kapp Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categories  * categorizations  * categoryAttributeDefinitions  * formAttributeDefinitions  * formAttributeDefinitions  * integrations  * kappAttributeDefinitions  * securityPolicyDefinitions  * securityPolicies  * webhooks  * space  * space.{any space include property}  |

**Request body (required):** The content for the kapp properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}`
**Operation:** `retrieveKapp`
Kapp Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categories  * categorizations  * categoryAttributeDefinitions  * formAttributeDefinitions  * formAttributeDefinitions  * integrations  * kappAttributeDefinitions  * securityPolicyDefinitions  * securityPolicies  * webhooks  * space  * space.{any space include property}  |
| `export` (boolean) | query | No | flag indicating the API should export all child components of the kapp.  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}`
**Operation:** `updateKapp`
Kapp Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categories  * categorizations  * categoryAttributeDefinitions  * formAttributeDefinitions  * formAttributeDefinitions  * integrations  * kappAttributeDefinitions  * securityPolicyDefinitions  * securityPolicies  * webhooks  * space  * space.{any space include property}  |

**Request body (required):** The content for the kapp properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}`
**Operation:** `deleteKapp`
Kapp Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categories  * categorizations  * categoryAttributeDefinitions  * formAttributeDefinitions  * formAttributeDefinitions  * integrations  * kappAttributeDefinitions  * securityPolicyDefinitions  * securityPolicies  * webhooks  * space  * space.{any space include property}  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/activity`
**Operation:** `fetchKappActivityMetrics`
Kapp Submission Metrics Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `days` (integer) | query | No | Number of days to fetch activity metrics for |
| `tz` (string) | query | No | Number of days to fetch activity metrics for |

**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/activity`
**Operation:** `deleteKappActivityCache`
Kapp Submission Metrics Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/categories`
**Operation:** `listCategories`
Category List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categorizations  * kapp  * kapp.{any kapp include property}  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/categories`
**Operation:** `createCategory`
Category Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categorizations  * kapp  * kapp.{any kapp include property}  |

**Request body (required):** The content for the category properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/categories/{name}`
**Operation:** `retrieveCategory`
Category Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the Category  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categorizations  * kapp  * kapp.{any kapp include property}  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/categories/{name}`
**Operation:** `updateCategory`
Category Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the Category  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categorizations  * kapp  * kapp.{any kapp include property}  |

**Request body (required):** The content for the category properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/categories/{name}`
**Operation:** `deleteCategory`
Category Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the Category  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * categorizations  * kapp  * kapp.{any kapp include property}  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/categorizations`
**Operation:** `listCategorizations`
Categorization List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * category  * form  * category.{any category include property}  * form.{any form include property}  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/categorizations`
**Operation:** `createCategorization`
Categorization Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * category  * form  * category.{any category include property}  * form.{any form include property}  |

**Request body (required):** The content for the categorization properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/categorizations/{categorizationName}`
**Operation:** `retrieveCategorization`
Categorization Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `categorizationName` (string) | path | Yes | Combination of the Category and Form slugs, separated by an underscore.  **`category.slug_form.slug`**  **`foo_bar`**  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * category  * form  * category.{any category include property}  * form.{any form include property}  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/categorizations/{categorizationName}`
**Operation:** `updateCategorization`
Categorization Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `categorizationName` (string) | path | Yes | Combination of the Category and Form slugs, separated by an underscore.  **`category.slug_form.slug`**  **`foo_bar`**  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * category  * form  * category.{any category include property}  * form.{any form include property}  |

**Request body (required):** The content for the categorization properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/categorizations/{categorizationName}`
**Operation:** `deleteCategorization`
Categorization Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `categorizationName` (string) | path | Yes | Combination of the Category and Form slugs, separated by an underscore.  **`category.slug_form.slug`**  **`foo_bar`**  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * category  * form  * category.{any category include property}  * form.{any form include property}  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/categoryAttributeDefinitions`
**Operation:** `listCategoryAttributeDefinitions`
Kapp Category Attribute Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/categoryAttributeDefinitions`
**Operation:** `createCategoryAttributeDefinition`
Kapp Category Attribute Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/categoryAttributeDefinitions/{name}`
**Operation:** `retrieveCategoryAttributeDefinition`
Kapp Category Attribute Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/categoryAttributeDefinitions/{name}`
**Operation:** `updateCategoryAttributeDefinition`
Kapp Category Attribute Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/categoryAttributeDefinitions/{name}`
**Operation:** `deleteCategoryAttributeDefinition`
Kapp Category Attribute Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/formAttributeDefinitions`
**Operation:** `listFormAttributeDefinitions`
Kapp Form Attribute Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/formAttributeDefinitions`
**Operation:** `createFormAttributeDefinition`
Kapp Form Attribute Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/formAttributeDefinitions/{name}`
**Operation:** `retrieveFormAttributeDefinition`
Kapp Form Attribute Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/formAttributeDefinitions/{name}`
**Operation:** `updateFormAttributeDefinition`
Kapp Form Attribute Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/formAttributeDefinitions/{name}`
**Operation:** `deleteFormAttributeDefinition`
Kapp Form Attribute Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms`
**Operation:** `listForms`
Form Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * versionId  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * bridgedResources  * categorizations  * customHeadContent  * fields  * fields[FIELD NAME]  * integrations  * pages  * securityPolicies  * kapp  * kapp.{any kapp include property}  |
| `count` (boolean) | query | No | If the count query parameter is specified, the server will respond with a count and no results for improved network performance of getting 'counts'.  |
| `archived` (boolean) | query | No | Flag indicating the API should return archived (i.e. deleted) forms.  **The user must be a space admin to perform this action.**  |
| `slug` (string) | query | No | When specified, will filter out archived forms that don't match the provided slug.  **Only valid when the `archived` parameter is set to `true`.**  |
| `start` (string) | query | No | Inclusive starting date/time boundary for when the form was archived (i.e. deleted).  Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'`  **Only valid when the `archived` parameter is set to `true`.**  |
| `end` (string) | query | No | Exclusive ending date/time boundary for when the form was archived (i.e. deleted).  Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'`  **Only valid when the `archived` parameter is set to `true`.**  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will return the default, maximum limit of `1000` results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don't provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.  |
| `orderBy` (string) | query | No | A comma separated list of any of the following form properties to order (sort) results by  * `createdAt`  * `updatedAt`  * `name`  * `slug`  * `status`  * `type`  * `attributes[Attribute Name]`  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page or results.  |
| `direction` (string) | query | No | The direction the results should be ordered by, either ascending or descending.  |
| `q` (string) | query | No | Search qualification parameter used to find forms within the system.   #### Common Example Queries  * `q=status = "Active"`      Returns all active forms in the kapp.  * `q=status = "Active" AND type = "Approval"`      Returns all active forms in the kapp that are also of type Approval  * `q=status = "Active" AND type = "Approval" AND (name =* "approval" OR slug =* "approval")`      Returns all active forms in the kapp that are also of type Approval and have a name or slug that start with "approval"   #### Operators:  * `BETWEEN`      left side is between two values - first value is inclusive, second value is exclusive  * `IN`      left side is equal to one of provided items  * `=`      equal  * `=*`      starts with  * `*=*`      contains  * `>`      greater than  * `>=`      greater than or equal  * `<`      less than  * `<=`      less than or equal  * `AND`      Returns boolean true if and only if both expressions are true  * `OR`      Returns boolean true if at least one expression is true   #### Queryable Properties  ##### The following properties can be used within a search with the `=`, `IN`, `=*` (starts with), `*=*` (contains), `<`, `<=`, `>`, `>=`, and `BETWEEN` operators.  * `category`                          (Category associated with a form)      *Example:*                        `q=category =* "IT"`  * `createdAt`                         (The ISO 8601 time that when the form was created)      *Example:*                        `q=createdAt BETWEEN ("2018-04-16T18:42:56.000Z","2019-04-16T18:42:56.000Z")`  * `name`                              (Name of the form)      *Example:*                        `q=name="HR Approval"`  * `slug`                              (Slug of the form)      *Example:*                        `q=slug="hr-approval"`  * `updatedAt`                         (The ISO 8601 time that when the form was last updated)      *Example:*                        `q=updatedAt >= "2018-04-16T18:42:56.000Z"`  * `status`                            (The status of the form)      *Example:*                        `q=enabled="true"`  * `type`                              (The form type)      *Example:*                        `q=spaceAdmin="false"`  * `attributes[Attribute Name]`        (Attribute Value of a form)      *Example:*                        `q=attributes[Icon]="fa-comment"`   #### Pagination  The system will paginate search results based on the `limit` parameter.  If there are more results than the `limit` parameter (or more than 1000 results if the limit parameter is not provided), a `nextPageToken` will be included in the response.  The `nextPageToken` value can be passed as the `pageToken` parameter in subsequent queries to obtain the next page of results.  **DEPRECATION NOTICE:** Pagination functionality was introduced in version 2.4. In order to provide backwards compatibility with previous versions, if you provide the limit parameter, results will be paginated. If you don't provide the limit parameter, the full result will be returned. The ability to return the full result set will be deprecated in a later version in favor of a paginated set of results.  Example Response with a next page token:  ```javascript {   "forms": [{...}, {...}],   "nextPageToken": "YWJib3R0LmRldmFuQHRoaWVsLm9yZw.4wg2me95blthjyzdvkfs56oc3" } ```  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms`
**Operation:** `createForm`
Form Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * versionId  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * bridgedResources  * categorizations  * customHeadContent  * fields  * fields[FIELD NAME]  * integrations  * pages  * securityPolicies  * kapp  * kapp.{any kapp include property}  |

**Request body (required):** The content for the form properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}`
**Operation:** `retrieveForm`
Form Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * versionId  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * bridgedResources  * categorizations  * customHeadContent  * fields  * fields[FIELD NAME]  * integrations  * pages  * securityPolicies  * kapp  * kapp.{any kapp include property}  |
| `export` (boolean) | query | No | flag indicating the API should export all child components of the form.  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/forms/{formSlug}`
**Operation:** `updateForm`
Form Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * versionId  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * bridgedResources  * categorizations  * customHeadContent  * fields  * fields[FIELD NAME]  * integrations  * pages  * securityPolicies  * kapp  * kapp.{any kapp include property}  |
| `restorationToken` (string) | query | No | The `restorationToken` property returned by the *Search Forms* action and setting the `archived` parameter.  Functions similarly to the regular *Update Form* action, except for archived (deleted) forms.  It can be passed the same body content as a regular *Update Form* action, which is helpful if an archived form needs to be restored when there is an active form with the same slug.  This action automatically transitions the form from archived (deleted) to active.  **The user must be a space admin when using this parameter.**  |

**Request body (required):** The content for the form properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/forms/{formSlug}`
**Operation:** `deleteForm`
Form Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * versionId  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * bridgedResources  * categorizations  * customHeadContent  * fields  * fields[FIELD NAME]  * integrations  * pages  * securityPolicies  * kapp  * kapp.{any kapp include property}  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}/activity`
**Operation:** `fetchFormActivityMetrics`
Kapp Form Submission Metrics Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `days` (integer) | query | No | Number of days to fetch activity metrics for |
| `tz` (string) | query | No | Number of days to fetch activity metrics for |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `listFormSubmissions`
Submission Search (by Form)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |
| `count` (string) | query | No | Include a count of the number of submissions that match the search parameters in the result.  |
| `direction` (string) | query | No | The direction to order the results  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will limit the results to 25 submissions.  |
| `orderBy` (string) | query | No | Comma separated list of submission properties and fields to sort the response by.  The orderBy list:  * May start with any combination of zero or more items that are used in query equality subexpressions (`=` or `IN`). * May continue with the item used in the query range subexpressions (`=*`, `>`, `>=`, `<`, `<=`, `BETWEEN`).  This item is required if a range subexpression is used and any further items are added to the orderBy list. * May continue with any combination of zero or more items that are not used in the query, but are specified as index parts in the same order and after any parts used by equality or range subexpressions. * May end with a single submission timeline fields (`createdAt`, `updatedAt`, `submittedAt`, `closedAt`).  If the timeline is not specified, `createdAt` is used as the default tie breaker.  All parts of the orderBy except the optionally specified timeline must be included in all indexes used by the query.  Example: values[Make],values[Model],values[Year],updatedAt  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page of results.  The submission that matches this value will not be included in the results.  |
| `q` (string) | query | No | A custom qualification that can be constructed similar to a SQL `WHERE` clause that allows building complex expressions using logical and relational operators against submission properties and field values.  In order to execute a submission search, there must be one or more index definitions that correspond to the specified submission properties and field values.  Only a single property or field can be specified using a range subexpression.   ### Operators  * `AND`    Returns boolean true if and only if both expressions are true    Example: expression1 AND expression2  * `OR`    Returns boolean true if at least one expression is true    Example: expression1 OR expression2  * `IN` *equality subexpression*    Returns boolean true if the key matches one of the list values    Example: key IN ("Value One", "Value Two", "Value Three")  * `=` *equality subexpression*    Returns boolean true if the key is exactly equal to the value.    Example: key = "Test Value"  * `BETWEEN` *range subexpression*    left side is between two values - first value is inclusive, second value is exclusive    Example: key BETWEEN ("Value One", "Value Two")  * `=*` *range subexpression*    starts with  * `>` *range subexpression*    greater than  * `>=` *range subexpression*    greater than or equal  * `<` *range subexpression*    less than  * `<=` *range subexpression*    less than or equal  ### Expression Symbols  * `null`    Means no value    Example: key = null  * `(`    Left parentheses for logic grouping, MUST be used with right parentheses    Example: (key = "Value 1" OR key = "Value Two")  * `)`    Right parentheses for logic grouping, MUST be used with left parentheses    Example: (key = "Value 1" OR key = "Value Two")   ### Submission Properties  These are the items that can be specified in the query subexpression.  * `closedBy`    Username that closed the submission  * `coreState`    The value of the core state the submission is in ("Draft", "Submitted", or "Closed")  * `createdBy`    Username that created the submission  * `handle`    A "nearly-unique" identifier for the submission  * `sessionToken`    Used for anonymous submissions  * `submittedBy`    Username that submitted the submission  * `type`    The type of form the submission is associated to  * `updatedBy`    Username that last updated the submission  * `values`    Any field that is implemented by the Form.    Example: the field named 'Approver' would be referred as `values[Approver]`   #### Example Qualifications  ``` (values[Requested By] = "john.doe" OR values[Requested For] = "john.doe")   AND values[Status] IN ("Pending Assignment", "On Hold") ```  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `createSubmission`
Submission Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once)  |
| `page` (string) | query | No | The name of the Page being submitted.  |
| `staged` (boolean) | query | No | Indicates whether field validations and page advancement should take place.  |
| `defer` (boolean) | query | No | Indicates the submission is for a subform embedded in a parent submission.  |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `PATCH /kapps/{kappSlug}/forms/{formSlug}/submissions`
**Operation:** `patchNewSubmission`
Submission Patch (new)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submission properties


**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions-multipart`
**Operation:** `createSubmissionMultipart`
Submission Create (with Attachments)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `completed` (boolean) | query | No | signals that the submission should be completed (equivalent of submitting all of the pages at once)  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/submissions-search`
**Operation:** `listFormSubmissionsAsPost`
Submission Search (by Form as POST)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submissions search


**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}/workflows`
**Operation:** `retrieveFormWorkflows`
Form Workflows Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/workflows`
**Operation:** `createFormWorkflow`
Form Workflow Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `force` (boolean) | query | No | Force the overwrite of an existing workflow on import  |

**Request body (required):** The content for the workflow properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/forms/{formSlug}/workflows/{id}`
**Operation:** `retrieveFormWorkflow`
Form Workflow Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `id` (string) | path | Yes | The id of the workflow  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/forms/{formSlug}/workflows/{id}`
**Operation:** `updateFormWorkflow`
Form Workflow Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `id` (string) | path | Yes | The id of the workflow  |

**Request body (required):** The content for the workflow properties to update


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/forms/{formSlug}/workflows/{id}`
**Operation:** `deleteFormWorkflow`
Form Workflow Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |
| `id` (string) | path | Yes | The id of the workflow  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/forms/{formSlug}/workflows/repair`
**Operation:** `repairFormWorkflow`
Form Workflow Repair

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `formSlug` (string) | path | Yes | The slug of the form  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/formTypes`
**Operation:** `listKappFormTypes`
Form Type List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * kapp  * kapp.{any kapp include property}  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/formTypes`
**Operation:** `createKappFormType`
Form Type Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * kapp  * kapp.{any kapp include property}  |

**Request body (required):** The content for the form type properties.


**Success response:** 200

---

### `GET /kapps/{kappSlug}/formTypes/{name}`
**Operation:** `retrieveKappFormType`
Form Type Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the form type  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * kapp  * kapp.{any kapp include property}  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/formTypes/{name}`
**Operation:** `updateKappFormType`
Form Type Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the form type  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * kapp  * kapp.{any kapp include property}  |

**Request body (required):** The content for the form type properties.

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/formTypes/{name}`
**Operation:** `deleteKappFormType`
Form Type Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the form type  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * kapp  * kapp.{any kapp include property}  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/integrations`
**Operation:** `listKappIntegrations`
Kapp Integrations List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/integrations`
**Operation:** `createKappIntegration`
Kapp Integration Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Request body (required):** The content for the integration properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/integrations/{name}`
**Operation:** `getKappIntegration`
Kapp Integration Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the integration  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/integrations/{name}`
**Operation:** `updateKappIntegration`
Kapp Integration Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the integration  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Request body (required):** The content for the integration properties


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/integrations/{name}`
**Operation:** `deleteKappIntegration`
Kapp Integration Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the integration  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/kappAttributeDefinitions`
**Operation:** `listKappAttributeDefinitions`
Kapp Attribute Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/kappAttributeDefinitions`
**Operation:** `createKappAttributeDefinition`
Kapp Attribute Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/kappAttributeDefinitions/{name}`
**Operation:** `retrieveKappAttributeDefinition`
Kapp Attribute Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/kappAttributeDefinitions/{name}`
**Operation:** `updateKappAttributeDefinition`
Kapp Attribute Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/kappAttributeDefinitions/{name}`
**Operation:** `deleteKappAttributeDefinition`
Kapp Attribute Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/securityPolicyDefinitions`
**Operation:** `listKappSecurityPolicyDefinitions`
Kapp Security Policy Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/securityPolicyDefinitions`
**Operation:** `createKappSecurityPolicyDefinition`
Kapp Security Policy Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the security policy definition properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/securityPolicyDefinitions/{name}`
**Operation:** `retrieveKappSecurityPolicyDefinition`
Kapp Security Policy Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the security policy definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/securityPolicyDefinitions/{name}`
**Operation:** `updateKappSecurityPolicyDefinition`
Kapp Security Policy Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the security policy definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the security policy definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/securityPolicyDefinitions/{name}`
**Operation:** `deleteKappSecurityPolicyDefinition`
Kapp Security Policy Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the security policy definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/submissions`
**Operation:** `listKappSubmissions`
Submissions Search (by Kapp)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |
| `count` (string) | query | No | Include a count of the number of submissions that match the search parameters in the result.  |
| `direction` (string) | query | No | The direction to order the results  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will limit the results to 25 submissions.  |
| `orderBy` (string) | query | No | Comma separated list of submission properties and fields to sort the response by.  The orderBy list:  * May start with any combination of zero or more items that are used in query equality subexpressions (`=` or `IN`). * May continue with the item used in the query range subexpressions (`=*`, `>`, `>=`, `<`, `<=`, `BETWEEN`).  This item is required if a range subexpression is used and any further items are added to the orderBy list. * May continue with any combination of zero or more items that are not used in the query, but are specified as index parts in the same order and after any parts used by equality or range subexpressions. * May end with a single submission timeline fields (`createdAt`, `updatedAt`, `submittedAt`, `closedAt`).  If the timeline is not specified, `createdAt` is used as the default tie breaker.  All parts of the orderBy except the optionally specified timeline must be included in all indexes used by the query.  Example: values[Make],values[Model],values[Year],updatedAt  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page of results.  The submission that matches this value will not be included in the results.  |
| `q` (string) | query | No | A custom qualification that can be constructed similar to a SQL `WHERE` clause that allows building complex expressions using logical and relational operators against submission properties and field values.  In order to execute a submission search, there must be one or more index definitions that correspond to the specified submission properties and field values.  Only a single property or field can be specified using a range subexpression.   ### Operators  * `AND`    Returns boolean true if and only if both expressions are true    Example: expression1 AND expression2  * `OR`    Returns boolean true if at least one expression is true    Example: expression1 OR expression2  * `IN` *equality subexpression*    Returns boolean true if the key matches one of the list values    Example: key IN ("Value One", "Value Two", "Value Three")  * `=` *equality subexpression*    Returns boolean true if the key is exactly equal to the value.    Example: key = "Test Value"  * `BETWEEN` *range subexpression*    left side is between two values - first value is inclusive, second value is exclusive    Example: key BETWEEN ("Value One", "Value Two")  * `=*` *range subexpression*    starts with  * `>` *range subexpression*    greater than  * `>=` *range subexpression*    greater than or equal  * `<` *range subexpression*    less than  * `<=` *range subexpression*    less than or equal  ### Expression Symbols  * `null`    Means no value    Example: key = null  * `(`    Left parentheses for logic grouping, MUST be used with right parentheses    Example: (key = "Value 1" OR key = "Value Two")  * `)`    Right parentheses for logic grouping, MUST be used with left parentheses    Example: (key = "Value 1" OR key = "Value Two")   ### Submission Properties  These are the items that can be specified in the query subexpression.  * `closedBy`    Username that closed the submission  * `coreState`    The value of the core state the submission is in ("Draft", "Submitted", or "Closed")  * `createdBy`    Username that created the submission  * `handle`    A "nearly-unique" identifier for the submission  * `sessionToken`    Used for anonymous submissions  * `submittedBy`    Username that submitted the submission  * `type`    The type of form the submission is associated to  * `updatedBy`    Username that last updated the submission  * `values`    Any field that is implemented by the Form.    Example: the field named 'Approver' would be referred as `values[Approver]`   #### Example Qualifications  ``` (values[Requested By] = "john.doe" OR values[Requested For] = "john.doe")   AND values[Status] IN ("Pending Assignment", "On Hold") ```  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/submissions-search`
**Operation:** `listKappSubmissionsAsPost`
Submissions Search (by Kapp as POST)

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * activities  * children  * descendants  * origin  * parent  * type  * values  * values.raw  * values[FIELD NAME]  * form  * form.{any form include property}   #### `values`  Typically when retrieving submissions an include of `values` will be specified. This will return a map of field names to the values associated to that field.  ```json {   ...,   "values": {     "Checkbox Field": ["Value 1", "Value 2"],     "Text Field": "Value"   } } ```  #### `values.raw`  Specifying an include of `values.raw` is similar to specifying an include of `values`, except the values will be returned as a map of field keys to metadata about the value associated to that field.  * **isMalformed** indicates whether the value matches the expected format for the field type.  * **isUnexpected** indicates whether the value corresponds to a field key that does not exist on the form.  * **name** indicates the name of the field (if it exists on the form).  * **rawValue** is the raw string that corresponds to the value.  * **value** is the value in JSON format (if the value is not malformed).  Because the **rawValue** property is returned as a string, this include can be used to troubleshoot issues where a submission contains values in an unexpected format (such as when a field type changes).  Additionally, `values.raw` includes values for field keys that do not exist on the form (likely because the field was deleted).  This makes it possible to write scripts to access or manipulate historical values that no longer correspond to the current form.  ```json {   ...,   "valuesRaw": {     "f1": {       "isMalformed": false,       "isUnexpected": true,       "name": null,       "rawValue": "Orphaned Value",       "value": "Orphaned Value"     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Checkbox Field",       "rawValue": "[\"Value 1\", \"Value 2\"]",       "value": ["Value 1", "Value 2"]     },     "f2": {       "isMalformed": false,       "isUnexpected": false,       "name": "Text Field",       "rawValue": "Value",       "value": "Value"     }   } } ```  |

**Request body (required):** The content for the submissions search


**Success response:** 200

---

### `POST /kapps/{kappSlug}/webApiImport`
**Operation:** `importKappWebAPI`
Kapp WebAPI Import

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |
| `force` (boolean) | query | No | Force the overwrite of an existing web API on import  |

**Request body (required):** The content for the webapi properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/webApis`
**Operation:** `listKappWebAPIs`
Kapp WebAPI List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/webApis`
**Operation:** `createKappWebAPI`
Kapp WebAPI Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |

**Request body (required):** The content for the webapi properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/webApis/{webApiSlug}`
**Operation:** `fetchKappWebAPI`
Kapp WebAPI Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/webApis/{webApiSlug}`
**Operation:** `updateKappWebAPI`
Kapp WebAPI Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Request body (required):** The content for the webapi properties to update


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/webApis/{webApiSlug}`
**Operation:** `deleteKappWebAPI`
Kapp WebAPI Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/webApis/{webApiSlug}/export`
**Operation:** `exportKappWebAPI`
Kapp WebAPI Export

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/webhookJobs`
**Operation:** `listKappWebhookJobs`
Kapp Webhook Job Search

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |
| `all` (boolean) | query | No | Indicates all webhook jobs that exist within the Space should be retrieved. |
| `status` (string) | query | No | Filter the webhook jobs to optionally display only records that are failed or queued. |
| `webhook` (string) | query | No | Name of the webhook to search for.  |
| `parentType` (string) | query | No | The Parent object type.  |
| `parentKey` (string) | query | No | The unique key value for the specified record.  The value will depend on the parentType selected.  * If parentKey is `Form`, then key should be the value of the form slug  * If parentKey is `Submission`, then key should be the value of the submission id  |
| `limit` (integer) | query | No | Limit the number of results returned.  If not provided, the server will limit the results to 25 jobs.  |
| `pageToken` (string) | query | No | The token to get the next page of results.  This value is set using the nextPageToken value returned by a search with the same query to get the next page or results.  |
| `start` (string) | query | No | Inclusive starting date/time boundary for when the job was scheduled at.  Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'`  |
| `end` (string) | query | No | Exclusive ending date/time boundary for when the job was scheduled at.  Must be in the following ISO8601 format; `yyyy-MM-dd'T'HH:mm:ss'Z'`  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/webhookJobs`
**Operation:** `createKappWebhookJob`
Kapp Webhook Job Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook job properties.


**Success response:** 200

---

### `GET /kapps/{kappSlug}/webhookJobs/{id}`
**Operation:** `retrieveKappWebhookJob`
Kapp Webhook Job Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `id` (string) | path | Yes | The id of the webhook job  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/webhookJobs/{id}`
**Operation:** `updateKappWebhookJob`
Kapp Webhook Job Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `id` (string) | path | Yes | The id of the webhook job  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook job properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/webhookJobs/{id}`
**Operation:** `deleteKappWebhookJob`
Kapp Webhook Job Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `id` (string) | path | Yes | The id of the webhook job  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/webhooks`
**Operation:** `listKappWebhooks`
Kapp Webhook List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/webhooks`
**Operation:** `createKappWebhook`
Kapp Webhook Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/webhooks/{name}`
**Operation:** `retrieveKappWebhook`
Kapp Webhook Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/webhooks/{name}`
**Operation:** `updateKappWebhook`
Kapp Webhook Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the webhook properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/webhooks/{name}`
**Operation:** `deleteKappWebhook`
Kapp Webhook Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `name` (string) | path | Yes | The name of the webhook  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /kapps/{kappSlug}/workflows`
**Operation:** `retrieveKappWorkflows`
Kapp Workflows Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/workflows`
**Operation:** `createKappWorkflow`
Kapp Workflow Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `force` (boolean) | query | No | Force the overwrite of an existing workflow on import  |

**Request body (required):** The content for the workflow properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/workflows/{id}`
**Operation:** `retrieveKappWorkflow`
Kapp Workflow Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `id` (string) | path | Yes | The id of the workflow  |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/workflows/{id}`
**Operation:** `updateKappWorkflow`
Kapp Workflow Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `id` (string) | path | Yes | The id of the workflow  |

**Request body (required):** The content for the workflow properties to update


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/workflows/{id}`
**Operation:** `deleteKappWorkflow`
Kapp Workflow Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |
| `id` (string) | path | Yes | The id of the workflow  |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/workflows/repair`
**Operation:** `repairKappWorkflow`
Kapp Workflow Repair

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp  |

**Success response:** 200

---
