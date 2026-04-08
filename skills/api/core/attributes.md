<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Attributes API Reference

Source: Kinetic Core REST API v6.1

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

### `GET /spaceAttributeDefinitions`
**Operation:** `listSpaceAttributeDefinitions`
Space Attribute Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /spaceAttributeDefinitions`
**Operation:** `createSpaceAttributeDefinition`
Space Attribute Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties


**Success response:** 200

---

### `GET /spaceAttributeDefinitions/{name}`
**Operation:** `retrieveSpaceAttributeDefinition`
Space Attribute Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /spaceAttributeDefinitions/{name}`
**Operation:** `updateSpaceAttributeDefinition`
Space Attribute Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /spaceAttributeDefinitions/{name}`
**Operation:** `deleteSpaceAttributeDefinition`
Space Attribute Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /teamAttributeDefinitions`
**Operation:** `listTeamAttributeDefinitions`
Team Attribute Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /teamAttributeDefinitions`
**Operation:** `createTeamAttributeDefinition`
Team Attribute Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties


**Success response:** 200

---

### `GET /teamAttributeDefinitions/{name}`
**Operation:** `retrieveTeamAttributeDefinition`
Team Attribute Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /teamAttributeDefinitions/{name}`
**Operation:** `updateTeamAttributeDefinition`
Team Attribute Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /teamAttributeDefinitions/{name}`
**Operation:** `deleteTeamAttributeDefinition`
Team Attribute Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /userAttributeDefinitions`
**Operation:** `listUserAttributeDefinitions`
User Attribute Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /userAttributeDefinitions`
**Operation:** `createUserAttributeDefinition`
User Attribute Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties


**Success response:** 200

---

### `GET /userAttributeDefinitions/{name}`
**Operation:** `retrieveUserAttributeDefinition`
User Attribute Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /userAttributeDefinitions/{name}`
**Operation:** `updateUserAttributeDefinition`
User Attribute Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /userAttributeDefinitions/{name}`
**Operation:** `deleteUserAttributeDefinition`
User Attribute Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `GET /userProfileAttributeDefinitions`
**Operation:** `listUserProfileAttributeDefinitions`
User Profile Attribute Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /userProfileAttributeDefinitions`
**Operation:** `createUserProfileAttributeDefinition`
User Profile Attribute Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties


**Success response:** 200

---

### `GET /userProfileAttributeDefinitions/{name}`
**Operation:** `retrieveUserProfileAttributeDefinition`
User Profile Attribute Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /userProfileAttributeDefinitions/{name}`
**Operation:** `updateUserProfileAttributeDefinition`
User Profile Attribute Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the attribute definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /userProfileAttributeDefinitions/{name}`
**Operation:** `deleteUserProfileAttributeDefinition`
User Profile Attribute Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the attribute definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---
