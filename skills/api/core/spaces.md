<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Spaces API Reference

Source: Kinetic Core REST API v6.1

### `GET /activity`
**Operation:** `fetchSpaceActivityMetrics`
Space Submission Metrics Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `days` (integer) | query | No | Number of days to fetch activity metrics for |
| `tz` (string) | query | No | Number of days to fetch activity metrics for |

**Success response:** 200

---

### `DELETE /activity`
**Operation:** `deleteSpaceActivityCache`
Space Submission Metrics Delete

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

### `GET /meta/webhooks/events/space`
**Operation:** `spaceWebhookEvents`
Space Webhook Event List

**Success response:** 200

---

### `GET /meta/webhooks/events/space/{type}`
**Operation:** `spaceWebhookEventsByType`
Space Webhook Event List by Type

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `type` (string) | path | Yes | The type of space webhook events to retrieve.  |

**Success response:** 200

---

### `GET /meta/webhooks/types/space`
**Operation:** `spaceWebhookTypes`
Space Webhook Type List

**Success response:** 200

---

### `GET /space`
**Operation:** `retrieveSpace`
Space Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * bridgeModels  * bridgeMappings  * filestore  * kapps  * securityPolicyDefinitions  * securityPolicies  * spaceAttributeDefinitions  * userAttributeDefinitions  * userProfileAttributeDefinitions  * webhooks  |
| `export` (boolean) | query | No | flag indicating the API should export all child components of the space.  |

**Success response:** 200

---

### `PUT /space`
**Operation:** `updateSpace`
Space Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * attributes  * attributes[ATTRIBUTE NAME]  * attributesMap  * attributesMap[ATTRIBUTE NAME]  * bridgeModels  * bridgeMappings  * filestore  * kapps  * securityPolicyDefinitions  * securityPolicies  * spaceAttributeDefinitions  * userAttributeDefinitions  * userProfileAttributeDefinitions  * webhooks  |

**Request body (required):** The content for the space properties to update

**Only** the properties supplied will be updated.


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

### `GET /submissions/{submissionId}/activities/{activityId}`
**Operation:** `retrieveSubmissionActivity`
Submission Activity Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `activityId` (string) | path | Yes | The id of the submission activity  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /submissions/{submissionId}/activities/{activityId}`
**Operation:** `updateSubmissionActivity`
Submission Activity Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `activityId` (string) | path | Yes | The id of the submission activity  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the submission activity properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /submissions/{submissionId}/activities/{activityId}`
**Operation:** `deleteSubmissionActivity`
Submission Activity Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `submissionId` (string) | path | Yes | The id of the submission  |
| `activityId` (string) | path | Yes | The id of the submission activity  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---
