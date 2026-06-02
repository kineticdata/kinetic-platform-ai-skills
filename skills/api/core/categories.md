<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.mjs -->

# Categories API Reference

Source: Kinetic Core REST API v6.1

> Generated from the OpenAPI spec — endpoints + parameters only. For base URLs, authentication, pagination, `include` conventions, and worked examples see `concepts/api-basics`, `api/authentication`, and `api/using-the-api`.

### `GET /kapps/{kappSlug}/categories`
**Operation:** `listCategories`
Category List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categorizations * kapp * kapp.{an… |

**Success response:** 200

---

### `POST /kapps/{kappSlug}/categories`
**Operation:** `createCategory`
Category Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categorizations * kapp * kapp.{an… |

**Request body (required):** The content for the category properties


**Success response:** 200

---

### `GET /kapps/{kappSlug}/categories/{name}`
**Operation:** `retrieveCategory`
Category Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the Category |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categorizations * kapp * kapp.{an… |

**Success response:** 200

---

### `PUT /kapps/{kappSlug}/categories/{name}`
**Operation:** `updateCategory`
Category Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the Category |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categorizations * kapp * kapp.{an… |

**Request body (required):** The content for the category properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /kapps/{kappSlug}/categories/{name}`
**Operation:** `deleteCategory`
Category Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `kappSlug` (string) | path | Yes | The slug of the Kapp |
| `name` (string) | path | Yes | The name of the Category |
| `include` (string) | query | No | comma-separated list of properties to include in the response * details * attributes * attributes[ATTRIBUTE NAME] * attributesMap * attributesMap[ATTRIBUTE NAME] * categorizations * kapp * kapp.{an… |

**Success response:** 200

---
