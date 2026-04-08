<!-- AUTO-GENERATED from OpenAPI spec. Do not edit manually. -->
<!-- Source: oas/core.json -->
<!-- Regenerate: node scripts/generate-api-reference.js -->

# Security API Reference

Source: Kinetic Core REST API v6.1

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

### `GET /securityPolicyDefinitions`
**Operation:** `listSecurityPolicyDefinitions`
Space Security Policy Definition List

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `POST /securityPolicyDefinitions`
**Operation:** `createSecurityPolicyDefinition`
Space Security Policy Definition Create

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the security policy definition properties


**Success response:** 200

---

### `GET /securityPolicyDefinitions/{name}`
**Operation:** `retrieveSecurityPolicyDefinition`
Space Security Policy Definition Retrieve

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the security policy definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---

### `PUT /securityPolicyDefinitions/{name}`
**Operation:** `updateSecurityPolicyDefinition`
Space Security Policy Definition Update

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the security policy definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Request body (required):** The content for the security policy definition properties to update

**Only** the properties supplied will be updated.


**Success response:** 200

---

### `DELETE /securityPolicyDefinitions/{name}`
**Operation:** `deleteSecurityPolicyDefinition`
Space Security Policy Definition Delete

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `name` (string) | path | Yes | The name of the security policy definition  |
| `include` (string) | query | No | comma-separated list of properties to include in the response  * details  |

**Success response:** 200

---
