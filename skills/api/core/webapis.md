<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Webapis API Reference

Source: Kinetic Core REST API v6.1

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

### `GET /webApis`
**Operation:** `listSpaceWebAPIs`
Space WebAPI List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `POST /webApis`
**Operation:** `createSpaceWebAPI`
Space WebAPI Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Request body (required):** The content for the webapi properties


**Success response:** 200

---

### `GET /webApis/{webApiSlug}`
**Operation:** `fetchSpaceWebAPI`
Space WebAPI Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `PUT /webApis/{webApiSlug}`
**Operation:** `updateSpaceWebAPI`
Space WebAPI Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Request body (required):** The content for the webapi properties to update


**Success response:** 200

---

### `DELETE /webApis/{webApiSlug}`
**Operation:** `deleteSpaceWebAPI`
Space WebAPI Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  * securityPolicies  |

**Success response:** 200

---

### `GET /webApis/{webApiSlug}/export`
**Operation:** `exportSpaceWebAPI`
Space WebAPI Export

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `webApiSlug` (string) | path | Yes | The slug of the WebAPI  |

**Success response:** 200

---
